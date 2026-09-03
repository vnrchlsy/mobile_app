// US-E5 · the adapter that hands `src/upload.ts`'s rules the real Expo modules.
//
// Split out so the rules (resize target, field ordering, error mapping, the EXIF-before-
// anything-leaves ordering) stay testable without a device, and this file holds only the
// module wiring — which is what changes when an Expo SDK moves.
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { PickedImage, UploadPurpose, UploadResult, uploadImage } from "../upload";

type Api = { post: (p: string, b?: any) => Promise<{ ok: boolean; status: number; data: any }> };

/**
 * Ask for a photo. Returns null when the person cancels or declines — both are ordinary
 * outcomes, not errors, and neither should produce a message.
 */
export async function pickImage(source: "library" | "camera" = "library"): Promise<PickedImage | null> {
  const permission = source === "camera"
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = source === "camera"
    ? await ImagePicker.launchCameraAsync({ quality: 1, exif: false })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], quality: 1, exif: false,
      });
  // `exif: false` asks the picker not to hand us the metadata; it is NOT a guarantee the
  // file lacks it, which is why the re-encode below is the actual control.
  if (result.canceled || !result.assets?.length) return null;

  const a = result.assets[0];
  return { uri: a.uri, width: a.width ?? 0, height: a.height ?? 0 };
}

/** Pick, strip, compress and upload in one call. */
export async function pickAndUpload(
  api: Api, purpose: UploadPurpose, source: "library" | "camera" = "library",
): Promise<UploadResult | null> {
  const image = await pickImage(source);
  if (!image) return null;

  return uploadImage(
    {
      // THE PRIVACY CONTROL. Re-encoding through the manipulator rebuilds the file from
      // decoded pixels, so EXIF — including the GPS tag that would leak a report's precise
      // location past §12.5 — cannot survive. Compression is the same operation's by-product.
      process: async (uri, resize) => {
        const context = ImageManipulator.ImageManipulator.manipulate(uri);
        if (resize) context.resize(resize);
        const rendered = await context.renderAsync();
        const saved = await rendered.saveAsync({
          compress: 0.7, format: ImageManipulator.SaveFormat.JPEG,
        });
        return saved.uri;
      },
      toBlob: async (uri) => (await fetch(uri)).blob(),
      post: (path, body) => api.post(path, body),
      // A raw fetch, deliberately NOT the API client: this goes to S3, a different host with
      // no bearer token, and sending our JWT to a storage endpoint would leak it.
      putToStorage: async (url, form) => {
        try {
          const res = await fetch(url, { method: "POST", body: form });
          return { ok: res.ok, status: res.status };
        } catch {
          return { ok: false, status: 0 };
        }
      },
    },
    purpose,
    image,
  );
}
