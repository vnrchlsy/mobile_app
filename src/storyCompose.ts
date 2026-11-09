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
export function hasUnsavedStory(caption: string, photoUrl: string | null): boolean {
  return caption.trim().length > 0 || photoUrl !== null;
}
