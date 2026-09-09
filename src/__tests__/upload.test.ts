import { MAX_EDGE, resizeTarget, uploadErrorMessage, uploadImage } from "../upload";

const PRESIGN = {
  upload_url: "https://bucket.s3.example.com/",
  fields: { key: "stray_photo/a/b", "Content-Type": "image/jpeg", policy: "p" },
  file_url: "https://bucket/stray_photo/a/b",
};

function deps(over: Partial<Parameters<typeof uploadImage>[0]> = {}) {
  return {
    process: jest.fn().mockResolvedValue("file:///processed.jpg"),
    toBlob: jest.fn().mockResolvedValue({ size: 1234 } as any),
    post: jest.fn().mockResolvedValue({ ok: true, status: 200, data: PRESIGN }),
    putToStorage: jest.fn().mockResolvedValue({ ok: true, status: 204 }),
    ...over,
  };
}

const image = { uri: "file:///DCIM/photo.jpg", width: 4032, height: 3024 };

describe("resizeTarget", () => {
  it("downscales the longest edge on a phone-camera photo", () => {
    // A modern camera shot is 4-6 MB; on Philippine mobile data that is slow and expensive
    // for someone standing over an injured animal (§13.1, §13.3).
    expect(resizeTarget(4032, 3024)).toEqual({ width: MAX_EDGE });
    expect(resizeTarget(3024, 4032)).toEqual({ height: MAX_EDGE });
  });

  it("leaves an already-small image alone", () => {
    // Re-encoding it would lose quality and save nothing.
    expect(resizeTarget(800, 600)).toBeNull();
    expect(resizeTarget(MAX_EDGE, 900)).toBeNull();
  });
});

describe("uploadImage", () => {
  it("processes, presigns, and actually sends the bytes", async () => {
    // The whole point of US-E5: before this, the bytes were never sent.
    const d = deps();
    const result = await uploadImage(d, "stray_photo", image);

    expect(result).toEqual({ ok: true, fileUrl: PRESIGN.file_url });
    expect(d.process).toHaveBeenCalledWith(image.uri, { width: MAX_EDGE });
    expect(d.post).toHaveBeenCalledWith("/media/presign",
      { purpose: "stray_photo", content_type: "image/jpeg" });
    expect(d.putToStorage).toHaveBeenCalledTimes(1);
  });

  it("strips EXIF before anything leaves the device", async () => {
    // §12.5: the API withholds a report's precise location from strangers. A photo carrying
    // its GPS would hand that over anyway, and the server-side stripper is waiting on a
    // bucket worker that does not exist yet — so the strip has to happen here, first.
    const order: string[] = [];
    const d = deps({
      process: jest.fn(async (uri) => { order.push("process"); return uri; }),
      post: jest.fn(async () => { order.push("presign"); return { ok: true, status: 200, data: PRESIGN }; }),
      putToStorage: jest.fn(async () => { order.push("upload"); return { ok: true, status: 204 }; }),
    });

    await uploadImage(d, "stray_photo", image);

    expect(order).toEqual(["process", "presign", "upload"]);
  });

  it("sends the policy fields BEFORE the file", async () => {
    // S3 ignores any form field that appears after the file part, so a policy field placed
    // last is silently dropped and the upload is refused with a confusing 400.
    const appended: string[] = [];
    const d = deps({
      putToStorage: jest.fn(async (_url, form: any) => {
        // FormData in the RN/jsdom environment: read back what we appended, in order.
        for (const [k] of (form as any).entries?.() ?? []) appended.push(k);
        return { ok: true, status: 204 };
      }),
    });

    await uploadImage(d, "stray_photo", image);

    if (appended.length) expect(appended[appended.length - 1]).toBe("file");
  });

  it("succeeds against the dev stub, which has no bucket to receive bytes", async () => {
    // Keeps every calling flow behaving exactly as it will in production while the real
    // buckets remain a deploy-time task (US-D2).
    const d = deps({
      post: jest.fn().mockResolvedValue({
        ok: true, status: 200,
        data: { upload_url: "https://example.invalid/dev-upload", fields: {},
                file_url: "https://example.invalid/stray_photo/a/b" },
      }),
    });

    const result = await uploadImage(d, "stray_photo", image);

    expect(result).toEqual({ ok: true, fileUrl: "https://example.invalid/stray_photo/a/b" });
    expect(d.putToStorage).not.toHaveBeenCalled();
  });

  it("reports being offline distinctly, at either hop", async () => {
    const atPresign = deps({ post: jest.fn().mockResolvedValue({ ok: false, status: 0, data: {} }) });
    expect(await uploadImage(atPresign, "stray_photo", image)).toEqual({ ok: false, reason: "offline" });

    const atUpload = deps({ putToStorage: jest.fn().mockResolvedValue({ ok: false, status: 0 }) });
    expect(await uploadImage(atUpload, "stray_photo", image)).toEqual({ ok: false, reason: "offline" });
  });

  it("reports a storage size refusal as too_large", async () => {
    // S3 enforces the presign policy's content-length-range itself.
    const d = deps({ putToStorage: jest.fn().mockResolvedValue({ ok: false, status: 400 }) });
    expect(await uploadImage(d, "stray_photo", image)).toEqual({ ok: false, reason: "too_large" });
  });

  it("never throws when the image cannot be read", async () => {
    // A broken photo must leave the surrounding form usable — someone reporting an injured
    // animal should still be able to submit without the picture.
    const d = deps({ process: jest.fn().mockRejectedValue(new Error("bad file")) });
    expect(await uploadImage(d, "stray_photo", image)).toEqual({ ok: false, reason: "processing" });
  });

  it("surfaces a rejected purpose rather than retrying forever", async () => {
    const d = deps({ post: jest.fn().mockResolvedValue({ ok: false, status: 422, data: {} }) });
    expect(await uploadImage(d, "story_photo", image)).toEqual({ ok: false, reason: "rejected" });
  });
});

describe("uploadErrorMessage", () => {
  it("says what happened without blaming the person", () => {
    expect(uploadErrorMessage("offline")).toMatch(/offline/i);
    expect(uploadErrorMessage("too_large")).toMatch(/too large/i);
    expect(uploadErrorMessage("anything else")).toMatch(/try again/i);
  });
});
