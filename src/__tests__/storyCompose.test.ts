/**
 * Stories review step 7 (ST11, ST12, ST13), library docs/superpowers/specs/2026-11-09-stories-review.md.
 *
 *  - ST11 · backing out of the photo picker is not a failure.
 *  - ST12 · every answer of `POST /stories` is said as what it is. Before, every 422 read "A story needs at least one
 *    photo", a blocklisted caption (400) and the hourly limit (429) both read "Couldn't post your story. Please try again",
 *    so the person retried the same caption forever.
 *  - ST13 · the photo is shown, a typed caption is not thrown away by a stray back, a double tap posts once, and a guest's
 *    "+ Share" opens the sign-up wall instead of walking into a presign that refuses them.
 *
 * Behaviour tests for the pure rules; the screen wiring is a source scan in the style of donateRetryGuest.test.ts (the repo
 * has no component-render setup). The device walk is the proof of the rest.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { THUMB_SIZE, removeHitRect, acquire, hasUnsavedStory, photoPickOutcome, storyPostFailure } from "../storyCompose";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
const err = (status: number, code: string, message = "", extra: object = {}) =>
  ({ ok: false, status, data: { error: { code, message, ...extra } } });

describe("storyPostFailure", () => {
  test("a missing photo (422 photo_required) points at the photo", () => {
    const f = storyPostFailure(err(422, "photo_required", "A story needs at least one photo."));
    expect(f).toEqual({ field: "photo", message: "A story needs at least one photo." });
  });

  test("a blocklisted caption (400 on caption) says so, under the caption, in the server's words", () => {
    const f = storyPostFailure(err(400, "invalid", "That contains language that isn't allowed on Kupkop. Please reword it and try again.",
      { field: "caption" }));
    expect(f.field).toBe("caption");
    expect(f.message).toMatch(/reword it/);
  });

  test("a refused photo (400 on photos) points at the photo and asks for another", () => {
    const f = storyPostFailure(err(400, "invalid", "That photo was not uploaded for this account.", { field: "photos" }));
    expect(f.field).toBe("photo");
    expect(f.message).toMatch(/photo/i);
  });

  test("the hourly limit (429) says when, from retry_after", () => {
    const f = storyPostFailure(err(429, "throttled", "", { details: { retry_after: 1800 } }));
    expect(f.field).toBeNull();
    expect(f.message).toMatch(/30 minutes/);
  });

  test("the hourly limit without a wait still says it is the limit", () => {
    const f = storyPostFailure(err(429, "throttled"));
    expect(f.message).toMatch(/lot of stories/i);
    expect(f.message).not.toMatch(/undefined|NaN/);
  });

  test("a wait of an hour or more is said in hours, a minute or less as a minute", () => {
    expect(storyPostFailure(err(429, "throttled", "", { details: { retry_after: 3600 } })).message).toMatch(/1 hour/);
    expect(storyPostFailure(err(429, "throttled", "", { details: { retry_after: 20 } })).message).toMatch(/1 minute/);
  });

  test.each(["link_not_found", "link_not_eligible", "one_link_only", "link_required"])(
    "%s (422) shows the server's sentence", (code) => {
      const f = storyPostFailure(err(422, code, "You can share this story once the adoption is complete."));
      expect(f).toEqual({ field: null, message: "You can share this story once the adoption is complete." });
    });

  test("not_your_story (403) shows the server's sentence", () => {
    const f = storyPostFailure(err(403, "not_your_story", "Only the people in an adoption can share its story."));
    expect(f.message).toBe("Only the people in an adoption can share its story.");
  });

  test("story_exists (409) is said here, and promises nothing the app does not have yet", () => {
    const f = storyPostFailure(err(409, "story_exists", "You've already shared a story about this. You can open it from your stories."));
    expect(f.message).toBe("You've already shared a story about this.");
  });

  test("offline (status 0) says the story is still here", () => {
    const f = storyPostFailure({ status: 0, data: { error: { code: "network_error", message: "Couldn't reach the server." } } });
    expect(f.message).toMatch(/offline|connection/i);
    expect(f.message).toMatch(/try again/i);
  });

  test("a timeout and a server error each say try again", () => {
    expect(storyPostFailure(err(0, "timeout", "The server took too long to answer.")).message).toMatch(/too long/i);
    expect(storyPostFailure(err(500, "error")).message).toBe("Couldn't post your story. Please try again.");
  });

  test.each([undefined, null, {}, { error: null }, { error: { code: 5 } }])(
    "a reply with no usable body (%p) never throws and never blames the photo", (data) => {
      const f = storyPostFailure({ ok: false, status: 500, data } as any);
      expect(f.field).toBeNull();
      expect(f.message).toBe("Couldn't post your story. Please try again.");
    });

  test("an unknown 422 does not borrow the photo message", () => {
    const f = storyPostFailure(err(422, "something_new", "Something specific."));
    expect(f.field).toBeNull();
    expect(f.message).toBe("Something specific.");
  });
});

describe("photoPickOutcome", () => {
  test("null (the person backed out, or declined access) is a cancel, not an error", () => {
    expect(photoPickOutcome(null)).toEqual({ kind: "cancelled" });
  });
  test("an upload that worked hands back the URL", () => {
    expect(photoPickOutcome({ ok: true, fileUrl: "https://b/story_photo/a/b" })).toEqual({ kind: "added", url: "https://b/story_photo/a/b" });
  });
  test("an upload that failed says why, in the upload's own words", () => {
    const o = photoPickOutcome({ ok: false, reason: "too_large" });
    expect(o).toEqual({ kind: "failed", message: "That photo is too large. Try another one." });
  });
});

describe("hasUnsavedStory", () => {
  test.each([
    ["", [], false],
    ["   \n ", [], false],
    ["Meet Rex", [], true],
    ["", ["https://b/story_photo/a/b"], true],
    ["Meet Rex", ["https://b/story_photo/a/b", "https://b/story_photo/a/c"], true],
  ])("caption %p, photos %p -> %p", (caption, photos, expected) => {
    expect(hasUnsavedStory(caption, photos)).toBe(expected);
  });
});

describe("the screens", () => {
  const compose = read("screens", "StoryComposeScreen.tsx");
  const feed = read("screens", "StoriesScreen.tsx");

  test("compose: a cancelled picker does not alert", () => {
    expect(compose).toContain("photoPickOutcome(");
    expect(compose).not.toMatch(/Alert\.alert\(\s*"Couldn't add photo"/);
  });

  test("compose: errors are mapped by storyPostFailure, not by status alone", () => {
    expect(compose).toContain("storyPostFailure(res)");
    expect(compose).not.toMatch(/res\.status === 422\s*\)\s*setError/);
  });

  test("compose: picking a photo again clears the last post error (walked: two stacked messages for two attempts)", () => {
    const addPhoto = /async function addPhoto\(\) \{([\s\S]*?)\n  \}/.exec(compose);
    expect(addPhoto).not.toBeNull();
    expect((addPhoto as RegExpExecArray)[1]).toContain("setError(null)");
    expect((addPhoto as RegExpExecArray)[1]).toContain("setPhotoError(null)");
  });

  test("compose: the caption error is shown on the caption field", () => {
    expect(compose).toMatch(/<Field[\s\S]*?error=\{captionError\b/);
  });

  test("compose: the picked photo is drawn", () => {
    expect(compose).toMatch(/<Image[^>]*source=\{\{ uri: photoUrls\[0\] \}\}/);
  });

  test("compose: leaving with something typed asks first, and a posted story does not", () => {
    expect(compose).toMatch(/addListener\("beforeRemove"/);
    expect(compose).toContain("hasUnsavedStory(");
    expect(compose).toMatch(/posted\.current\s*=\s*true/);
  });

  test("compose: a second tap while posting is ignored by a ref, not only by state", () => {
    expect(compose).toMatch(/const posting = useRef\(false\)/);
    expect(compose).toMatch(/if \(!acquire\(posting\)\) return/);
    expect(compose).toMatch(/if \(!edit \|\| !acquire\(posting\)\) return/);
    expect(compose.includes("posting.current = true")).toBe(false);      // taking it is `acquire`'s one synchronous step, not a read and a later write
  });

  test("feed: a guest's + Share opens the wall with the share_story intent", () => {
    expect(feed).toMatch(/const isGuest = tokens === null/);
    expect(feed).toMatch(/isGuest \? setWallOpen\(true\) : navigation\.navigate\("storyCompose"/);
    expect(feed).toContain('action="share_story"');
    expect(feed).toContain('setIntent("share_story")');
  });

  test("the intent has copy on the wall and a toast on Home", () => {
    expect(read("guestIntent.ts")).toContain('"share_story"');
    expect(read("components", "SignupWall.tsx")).toContain('case "share_story"');
    expect(read("screens", "HomeScreen.tsx")).toContain('case "share_story"');
  });
});


// ---- stories test plan U16 · two taps in the SAME frame ---------------------------------------------------------------------------------
describe("acquire: the one-at-a-time latch behind Post and Save", () => {
  test("the first call takes it and the second, in the same tick, does not", () => {
    const latch = { current: false };
    expect([acquire(latch), acquire(latch), acquire(latch)]).toEqual([true, false, false]);
  });

  test("after the holder lets go, the next call takes it again", () => {
    const latch = { current: false };
    acquire(latch);
    latch.current = false;
    expect(acquire(latch)).toBe(true);
  });

  test("two presses started in one tick send ONE request, however long it takes", async () => {
    const latch = { current: false };
    const send = jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 10)));
    async function press() {
      if (!acquire(latch)) return "ignored";
      try { await send(); return "sent"; } finally { latch.current = false; }
    }
    jest.useFakeTimers();
    try {
      const both = Promise.all([press(), press(), press()]);
      await jest.advanceTimersByTimeAsync(10);
      expect(await both).toEqual(["sent", "ignored", "ignored"]);
      expect(send).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});


// ---- found walking the cover swap (2026-11-10) · the remove button's hit area must not cover the photo it sits on ---------------------------------
describe("the remove (×) hit area on a photo thumbnail", () => {
  const rect = removeHitRect();
  const inside = (x: number, y: number) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  test("the middle of the thumbnail is NOT in it: a tap there makes the photo the cover (the shared slop put it inside, and a tap removed the photo)", () => {
    expect(inside(THUMB_SIZE / 2, THUMB_SIZE / 2)).toBe(false);
  });
  test("the lower half and the left half of the thumbnail are not in it either", () => {
    for (const [x, y] of [[8, 30], [8, 40], [20, 40], [THUMB_SIZE / 2, THUMB_SIZE - 6]]) expect(inside(x, y)).toBe(false);
  });
  test("the cross itself, and the corner it sits on, are", () => {
    expect(inside(THUMB_SIZE + 5, -5)).toBe(true);
    expect(inside(THUMB_SIZE - 2, 2)).toBe(true);
  });
  test("the screen uses it, not the shared slop, on that button", () => {
    const src = readFileSync(join(__dirname, "..", "screens", "StoryComposeScreen.tsx"), "utf8");
    expect(src.length).toBeGreaterThan(500);
    expect(src).toMatch(/hitSlop=\{THUMB_X_SLOP\} style=\{styles\.thumbX\}/);
  });
});
