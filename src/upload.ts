// US-E5 · finishing the media upload.
//
// Every photo path in this app called `POST /media/presign`, kept the `file_url` it returned,
// and **never sent the bytes** — an explicit dev stub ("no real picker in Expo Go") that
// shipped through four sprints. Reports, listings, rescue outcomes, donation QRs, stories and
// verification documents all reference objects that do not exist. For a pet-rescue app whose
// whole premise is "here is a picture of the animal", that is not a polish item.
//
// ⚠️ THE EXIF DECISION, and why it is here rather than server-side.
//
// `common/media.py::strip_exif` is a real, tested transform — but its own docstring says it
// is "the transform a post-upload worker/Lambda calls once a real bucket exists", and that
// worker does not exist. So until it does, an uploaded photo would carry its GPS coordinates
// straight past §12.5's coarsening rule: the API deliberately withholds a report's precise
// location from strangers, and the photo would hand it over anyway.
//
// Rather than ship the picker and wait for infrastructure, the strip happens ON DEVICE,
// before the bytes ever leave. `expo-image-manipulator` re-encodes from raw pixels, which
// drops EXIF entirely — the same mechanism, one hop earlier. When the bucket worker lands it
// becomes a belt-and-braces second pass, not a duplicate.

export type PickedImage = { uri: string; width: number; height: number };
export type Presign = { upload_url: string; fields: Record<string, string>; file_url: string };

/** Longest edge for an uploaded photo. */
export const MAX_EDGE = 1600;
/** JPEG quality. 0.7 is the knee: below it artefacts show on fur, above it barely shrinks. */
export const QUALITY = 0.7;

/**
 * Target dimensions for a picked image.
 *
 * §13.1 asks for client-side compression before upload, and §13.3 for respecting limited
 * data plans — a modern phone camera produces 4-6 MB per shot, which on Philippine mobile
 * data is both slow and expensive for the person trying to help an animal. Downscaling the
 * longest edge to 1600px keeps an animal recognisable (the only thing the photo is for)
 * while cutting the payload by roughly an order of magnitude.
 *
 * Returns null when the image is already small enough — re-encoding it would lose quality
 * for nothing.
 */
export function resizeTarget(width: number, height: number): { width: number } | { height: number } | null {
  const longest = Math.max(width, height);
  if (longest <= MAX_EDGE) return null;
  return width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE };
}

/** Presign `purpose` for each upload site, so a typo is a compile error rather than a 422. */
export type UploadPurpose =
  | "stray_photo" | "listing_photo" | "rescue_outcome_photo"
  | "donation_qr" | "verification_doc" | "story_photo"
  // Plan Task 9 · a shelter's logo, shown to donors on its public wishlist (backend#113 added the purpose).
  | "shelter_logo"
  // A person's own avatar, shown to others on stories and comments.
  | "profile_photo";

/**
 * Stories test plan I1 · how long the multipart POST to storage may take before the upload gives up. The presign call already has the API client's 20 s limit; this
 * POST is a RAW fetch (a different host, no bearer token) and had none, so a storage endpoint that accepted the connection and then stalled left "Adding…" on screen
 * for good. A photo is bigger than any JSON body, so the limit is longer than the client's.
 */
export const STORAGE_TIMEOUT_MS = 60000;

/**
 * The POST to storage, under a limit. A timeout is status 0, which `uploadImage` already says as "offline" (it cannot tell a dead connection from a stalled one, and
 * the advice is the same: try again with a connection). It aborts the request, and does not trust the fetch to honour the abort: the race is what guarantees it settles.
 */
export async function postToStorage(
  fetchFn: (url: string, init: { method: string; body: FormData; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number }>,
  url: string, form: FormData, timeoutMs: number = STORAGE_TIMEOUT_MS,
): Promise<{ ok: boolean; status: number }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<{ ok: boolean; status: number }>((resolve) => {
    timer = setTimeout(() => { controller.abort(); resolve({ ok: false, status: 0 }); }, timeoutMs);
  });
  try {
    const sent = fetchFn(url, { method: "POST", body: form, signal: controller.signal })
      .then((res) => ({ ok: res.ok, status: res.status }), () => ({ ok: false, status: 0 }));
    return await Promise.race([sent, timedOut]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export type UploadDeps = {
  /** Strip EXIF + downscale. Returns the processed file's uri. */
  process: (uri: string, resize: { width: number } | { height: number } | null) => Promise<string>;
  post: (path: string, body: unknown) => Promise<{ ok: boolean; status: number; data: any }>;
  /** Raw multipart POST to S3's presigned endpoint (NOT the API client — different host). */
  putToStorage: (url: string, form: FormData) => Promise<{ ok: boolean; status: number }>;
};

/**
 * The multipart `file` part, as React Native's FormData wants it: a descriptor of the file on disk, which the
 * networking layer streams. R12-F3 · reading the file into a Blob first instead reached a receiver as a
 * 0-byte part on a device (the blob's own size was 391,292), which S3's `content-length-range 0..max` would accept.
 */
export function filePart(uri: string): { uri: string; type: string; name: string } {
  return { uri, type: "image/jpeg", name: "photo.jpg" };
}

export type UploadResult =
  | { ok: true; fileUrl: string }
  | { ok: false; reason: "offline" | "too_large" | "rejected" | "storage" | "processing" };

/**
 * The whole path: process → presign → upload the bytes → hand back the URL to reference.
 *
 * Never throws. A failed photo must leave the surrounding form usable — someone reporting an
 * injured animal should still be able to submit the report without the picture.
 */
export async function uploadImage(
  deps: UploadDeps, purpose: UploadPurpose, image: PickedImage,
): Promise<UploadResult> {
  let processedUri: string;
  try {
    processedUri = await deps.process(image.uri, resizeTarget(image.width, image.height));
  } catch {
    return { ok: false, reason: "processing" };
  }

  const presigned = await deps.post("/media/presign", {
    purpose, content_type: "image/jpeg",
  });
  if (!presigned.ok) {
    if (presigned.status === 0) return { ok: false, reason: "offline" };
    return { ok: false, reason: "rejected" };
  }
  const { upload_url, fields, file_url } = presigned.data as Presign;

  // The dev stub returns an example.invalid placeholder with no fields — there is no bucket
  // to POST to yet. Report success with the placeholder so the surrounding flows behave
  // exactly as they will in production; the bytes simply have nowhere to go until a bucket
  // is configured (US-D2's deploy-time task).
  if (!upload_url || upload_url.includes("example.invalid")) {
    return { ok: true, fileUrl: file_url };
  }

  // S3 presigned POST: every policy field first, the file LAST — S3 ignores anything after
  // the file part, so a field placed after it is silently dropped and the upload is refused.
  const form = new FormData();
  Object.entries(fields ?? {}).forEach(([k, v]) => form.append(k, v));
  form.append("file", filePart(processedUri) as any);

  const res = await deps.putToStorage(upload_url, form);
  if (!res.ok) {
    if (res.status === 0) return { ok: false, reason: "offline" };
    // S3 enforces the size range from the presign policy as a POST condition, so an
    // oversized file is refused by storage itself, not by us.
    if (res.status === 413 || res.status === 400) return { ok: false, reason: "too_large" };
    return { ok: false, reason: "storage" };
  }
  return { ok: true, fileUrl: file_url };
}

/** What to show the person when an upload fails. Plain, and never blames them. */
export function uploadErrorMessage(reason: UploadResult extends { ok: false } ? never : string): string {
  switch (reason) {
    case "offline": return "You're offline — the photo will need a connection.";
    case "too_large": return "That photo is too large. Try another one.";
    case "processing": return "Couldn't read that photo. Try another one.";
    case "rejected": return "That photo type isn't supported.";
    default: return "Couldn't upload the photo. Try again.";
  }
}
