// Stories review step 7 (ST11, ST12, ST13) · what the compose screen says when something does not go to plan.
// Pure, so the rules are tested without a screen (the screen only draws what these return).
import { UploadResult, uploadErrorMessage } from "./upload";

/** `field` says where the message belongs: under the photo, under the caption, or (null) with the Post button. */
export type StoryPostFailure = { message: string; field: "photo" | "caption" | null };

const GENERIC = "Couldn't post your story. Please try again.";

function waitText(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/**
 * Why `POST /stories` failed, said as what it was. Before, every 422 read "A story needs at least one photo" and
 * everything else "Couldn't post your story", so a blocklisted caption and the hourly limit both read as a glitch to
 * retry. A server sentence is used as it stands where the server's wording is already the right one (the caption
 * wording, the link rules); the rest is said here.
 */
export function storyPostFailure(res: { status: number; data?: any }): StoryPostFailure {
  const error = res.data?.error;
  const code = typeof error?.code === "string" ? error.code : "";
  const field = typeof error?.field === "string" ? error.field : "";
  const sentence = typeof error?.message === "string" && error.message.trim() ? error.message : "";

  if (code === "timeout") return { field: null, message: "That took too long. Your story is still here, so try again." };
  if (res.status === 0 || code === "network_error") {
    return { field: null, message: "You're offline, or the connection dropped. Your story is still here, so try again." };
  }
  if (res.status === 429 || code === "throttled") {
    const wait = Number(error?.details?.retry_after);
    return {
      field: null,
      message: wait > 0
        ? `You've shared a lot of stories this hour. You can share another in about ${waitText(wait)}.`
        : "You've shared a lot of stories this hour. Please try again later.",
    };
  }
  // Said here, not the server's: its sentence points at "your stories", which the app does not have yet.
  if (code === "story_exists") return { field: null, message: "You've already shared a story about this." };
  if (code === "photo_required") return { field: "photo", message: "A story needs at least one photo." };
  if (res.status === 400 && field === "photos") {
    return { field: "photo", message: sentence || "Couldn't use that photo. Please add it again." };
  }
  if (res.status === 400 && field === "caption") return { field: "caption", message: sentence || "Please reword your caption." };
  if ((res.status === 403 || res.status === 409 || res.status === 422) && sentence) return { field: null, message: sentence };
  return { field: null, message: GENERIC };
}

export type PhotoPickOutcome =
  | { kind: "cancelled" }
  | { kind: "added"; url: string }
  | { kind: "failed"; message: string };

/** `pickAndUpload` answers null when the person backs out of the picker or declines access: that is an ordinary choice,
 *  not a failure, so it says nothing (ST11). */
export function photoPickOutcome(res: UploadResult | null): PhotoPickOutcome {
  if (res === null) return { kind: "cancelled" };
  if (res.ok) return { kind: "added", url: res.fileUrl };
  return { kind: "failed", message: uploadErrorMessage(res.reason) };
}

/** Something has been typed or picked that a stray back would throw away. */
export function hasUnsavedStory(caption: string, photoUrls: string[]): boolean {
  return caption.trim().length > 0 || photoUrls.length > 0;
}

// Stories review step 10 (ST18) · which entry point opened compose, sent with a new story so the server can count where posts come from. A closed list
// (the server maps anything else to "unknown"); add a value here in the same change that adds the entry point that sends it.
export const STORY_SOURCES = ["feed", "adoption_cta", "poster_prompt", "rescue_prompt"] as const;
export type StorySource = (typeof STORY_SOURCES)[number];

// Stories review step 8 (ST8, SQ4) · the server's limits, and the photo list the compose screen keeps. The FIRST photo is the cover (what the wall shows); the
// rest follow in the order they were added. All pure, so the rules run as tests and the screen only draws the list.
export const MAX_PHOTOS = 6;
export const MAX_CAPTION = 2000;

export function canAddPhoto(urls: string[]): boolean {
  return urls.length < MAX_PHOTOS;
}

/** The list with `url` added at the end, unless it is full or the photo is already in (the server refuses a duplicate). */
export function withPhoto(urls: string[], url: string): string[] {
  return canAddPhoto(urls) && !urls.includes(url) ? [...urls, url] : urls;
}

/** The list without the photo at `index`; when the cover goes, the next one becomes the cover. */
export function withoutPhoto(urls: string[], index: number): string[] {
  return index >= 0 && index < urls.length ? urls.filter((_, i) => i !== index) : urls;
}

/** The list with the photo at `index` moved to the front, to be the cover. */
export function withCover(urls: string[], index: number): string[] {
  if (index <= 0 || index >= urls.length) return urls;
  return [urls[index], ...urls.filter((_, i) => i !== index)];
}

/** The `photos` the server takes: every photo in order, exactly the first marked primary. */
export function photosBody(urls: string[]): { file_url: string; is_primary: boolean }[] {
  return urls.map((file_url, i) => ({ file_url, is_primary: i === 0 }));
}

/** "1,701 / 2,000" once the caption is within 300 of the limit, else null (a counter that is always there is noise). Characters, as the server counts them. */
export function captionCount(caption: string): string | null {
  const n = [...caption].length;
  return n > MAX_CAPTION - 300 ? `${n.toLocaleString("en-US")} / ${MAX_CAPTION.toLocaleString("en-US")}` : null;
}


/**
 * Stories test plan U16 · take the one-at-a-time latch behind Post and Save. True for the caller that got it, false for any other call while it is held (the holder lets go
 * by writing `latch.current = false`). A `useRef`, not state, because two taps in one frame both read the same state; and taking it is this one synchronous
 * step, so there is no gap between "is it free?" and "it is mine" for a second tap to slip through.
 */
export function acquire(latch: { current: boolean }): boolean {
  if (latch.current) return false;
  latch.current = true;
  return true;
}


// Found walking the cover swap: the photo thumbnails are 46 pt and the remove cross is a 24 pt disc over their top-right corner. With the shared TAP_SLOP (12 above and below, 8 each
// side) the cross's touch area reached the thumbnail's middle, and the cross is the later sibling, so it won: tapping a photo to make it the cover REMOVED it. The cross gets slop only
// where there is no photo under it (above and to the right), and `removeHitRect` states the area so a test can hold the middle of the photo outside it.
export const THUMB_SIZE = 46;
export const THUMB_X_SIZE = 24;
export const THUMB_X_OFFSET = -7;                       // the disc sits this far past the thumbnail's top and right edges
export const THUMB_X_SLOP = { top: 10, right: 10, bottom: 0, left: 0 } as const;

/** The cross's touch area, in the thumbnail's own coordinates (0,0 is its top-left corner). */
export function removeHitRect(): { left: number; right: number; top: number; bottom: number } {
  const right = THUMB_SIZE - THUMB_X_OFFSET;            // the disc's right edge
  const top = THUMB_X_OFFSET;
  return {
    left: right - THUMB_X_SIZE - THUMB_X_SLOP.left, right: right + THUMB_X_SLOP.right,
    top: top - THUMB_X_SLOP.top, bottom: top + THUMB_X_SIZE + THUMB_X_SLOP.bottom
  };
}


// Found on an iPhone SE: with the keyboard up the big cover preview (176 pt) and its card pushed the caption down until only its first line showed above the keyboard, and
// every line typed after it was behind it. On a short screen the preview gives way while the keyboard is up (the thumbnails and the label stay); a taller screen already has room.
export const SHORT_SCREEN = 720;     // points: an iPhone SE is 667, an iPhone 13 mini 812 (which has room)

export function compactPreview(keyboardUp: boolean, windowHeight: number): boolean {
  return keyboardUp && windowHeight > 0 && windowHeight < SHORT_SCREEN;
}
