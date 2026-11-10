import { readFileSync } from "fs";
import { join } from "path";
import { MAX_EDGE, STORAGE_TIMEOUT_MS, filePart, postToStorage, resizeTarget, uploadErrorMessage, uploadImage } from "../upload";
import { REQUEST_TIMEOUT_MS, createApi } from "../api/client";

const PRESIGN = {
  upload_url: "https://bucket.s3.example.com/",
  fields: { key: "stray_photo/a/b", "Content-Type": "image/jpeg", policy: "p" },
  file_url: "https://bucket/stray_photo/a/b",
};

function deps(over: Partial<Parameters<typeof uploadImage>[0]> = {}) {
  return {
    process: jest.fn().mockResolvedValue("file:///processed.jpg"),
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

    expect(appended.length).toBeGreaterThan(1);                       // the scan found the form's parts
    expect(appended[appended.length - 1]).toBe("file");
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

// Run 12 · R12-F3: on a device the file part built from `(await fetch(uri)).blob()` reached the receiver as 0 bytes
// (the blob's own size was 391,292), while a React Native file descriptor sent all of it.
describe("the file part is a React Native file descriptor, not a fetched blob (R12-F3)", () => {
  it("names the processed file's uri, as JPEG, with a file name", () => {
    expect(filePart("file:///cache/ImageManipulator/abc.jpg")).toEqual(
      { uri: "file:///cache/ImageManipulator/abc.jpg", type: "image/jpeg", name: "photo.jpg" });
  });
  it("uploads without reading the file into a blob first", async () => {
    const d = deps();
    const result = await uploadImage(d, "stray_photo", image);
    expect(result).toEqual({ ok: true, fileUrl: PRESIGN.file_url });
    expect(d.putToStorage).toHaveBeenCalledTimes(1);
  });
  it("neither the uploader nor its wiring builds a blob for the form", () => {
    const up = readFileSync(join(__dirname, "..", "upload.ts"), "utf8");
    const wire = readFileSync(join(__dirname, "..", "media/pickAndUpload.ts"), "utf8");
    expect(up).toContain('form.append("file", filePart(processedUri) as any)');
    expect(up).not.toMatch(/deps\.toBlob|toBlob:|await fetch\(/);
    expect(wire).not.toMatch(/toBlob|await fetch\(uri\)/);
  });
});


// ---- stories test plan I1 · a storage or presign endpoint that hangs ------------------------------------------------------------------
describe("a hung upload never leaves the screen waiting", () => {
  const hang = (_url: any, init?: any) => new Promise<Response>((_res, rej) => {
    init?.signal?.addEventListener("abort", () => rej(new Error("aborted")));      // a fetch that honours abort; some never answer at all
  });

  it("the presign call is the API client's: it times out as status 0 and the upload says the connection is the problem", async () => {
    jest.useFakeTimers();
    try {
      global.fetch = jest.fn(hang) as any;
      const api = createApi(() => null, async () => {});
      const run = uploadImage(deps({ post: (path: string, body: unknown) => api.post(path, body as any) }), "story_photo", image);
      await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
      const out = await run;
      expect(out).toMatchObject({ ok: false, reason: "offline" });
    } finally {
      jest.useRealTimers();
    }
  });

  it("the storage POST gives up after STORAGE_TIMEOUT_MS as status 0, even from a fetch that never answers and ignores abort", async () => {
    jest.useFakeTimers();
    try {
      const never = jest.fn(() => new Promise<Response>(() => {}));
      const run = postToStorage(never as any, "https://bucket.s3.example.com/", new FormData());
      await jest.advanceTimersByTimeAsync(STORAGE_TIMEOUT_MS);
      await expect(run).resolves.toEqual({ ok: false, status: 0 });
    } finally {
      jest.useRealTimers();
    }
  });

  it("a hung storage POST aborts its request, so the socket is released", async () => {
    jest.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      const f = jest.fn((_u: any, init: any) => { signal = init.signal; return hang(_u, init); });
      const run = postToStorage(f as any, "https://bucket.s3.example.com/", new FormData());
      await jest.advanceTimersByTimeAsync(STORAGE_TIMEOUT_MS);
      await run;
      expect(signal?.aborted).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it("a hung storage POST inside uploadImage is the same message as being offline, and nothing is returned as uploaded", async () => {
    jest.useFakeTimers();
    try {
      const never = jest.fn(() => new Promise<Response>(() => {}));
      const run = uploadImage(deps({ putToStorage: (url: string, form: FormData) => postToStorage(never as any, url, form) }), "story_photo", image);
      await jest.advanceTimersByTimeAsync(STORAGE_TIMEOUT_MS);
      const out = await run;
      expect(out).toMatchObject({ ok: false, reason: "offline" });
      expect(uploadErrorMessage((out as any).reason)).toMatch(/offline/i);
    } finally {
      jest.useRealTimers();
    }
  });

  it("a fast answer is passed through and its timer is cleared", async () => {
    jest.useFakeTimers();
    try {
      const f = jest.fn().mockResolvedValue({ ok: true, status: 204 });
      await expect(postToStorage(f as any, "https://bucket.s3.example.com/", new FormData())).resolves.toEqual({ ok: true, status: 204 });
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it("a rejected fetch (offline, DNS) is status 0, as before", async () => {
    const f = jest.fn().mockRejectedValue(new Error("Network request failed"));
    await expect(postToStorage(f as any, "https://bucket.s3.example.com/", new FormData())).resolves.toEqual({ ok: false, status: 0 });
  });

  it("the adapter uses it, so the screen's 'Adding…' cannot outlive the limit", () => {
    const src = readFileSync(join(__dirname, "..", "media", "pickAndUpload.ts"), "utf8");
    expect(src.length).toBeGreaterThan(500);
    expect(src).toContain("postToStorage(fetch,");
    expect(src.includes("await fetch(url, { method")).toBe(false);
  });
});
