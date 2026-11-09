// Stories review step 6 (ST7, SQ1) · what an author can do with their own story, and what to say when it does not go to plan. Pure, so the rules
// are tested without a screen (the screens only draw what these return).
import type { Story } from "./community";

/** Where the wall and "your stories" are read from. Yours is never cached on the phone (it is not in the feed cache's allow-list). */
export function storiesPath(mine: boolean): string {
  return mine ? "/me/stories" : "/stories";
}

/** Only the caption of a story that is live can be edited: one moderation hid is under review, and the server refuses (409). */
export function canEditStory(s: Story): boolean {
  return s.mine && s.status === "published";
}

/** An author can delete their own story, a hidden one included (the row stays as evidence for 30 days either way). */
export function canDeleteStory(s: Story): boolean {
  return s.mine;
}

/** What "your stories" says about a story that is not on the wall. */
export function storyStatusNote(s: Story): string | null {
  return s.status === "hidden" ? "Hidden by moderation. Only you can see it." : null;
}

/** The caption now differs from the one being edited (the server trims it, so trailing space is not a change). */
export function hasUnsavedEdit(now: string, was: string): boolean {
  return now.trim() !== was.trim();
}

const OFFLINE = "You're offline, or the connection dropped.";

/** Why saving a caption failed, said as what it was, and where it belongs (under the caption, or with the button). */
export function storyEditFailure(res: { status: number; data?: any }): { message: string; field: "caption" | null } {
  const error = res.data?.error;
  const code = typeof error?.code === "string" ? error.code : "";
  const field = typeof error?.field === "string" ? error.field : "";
  const sentence = typeof error?.message === "string" && error.message.trim() ? error.message : "";
  if (res.status === 0 || code === "network_error") return { field: null, message: `${OFFLINE} Your change is still here, so try again.` };
  if (code === "timeout") return { field: null, message: "That took too long. Your change is still here, so try again." };
  if (res.status === 404) return { field: null, message: "This story is already gone." };
  if (res.status === 400 && field === "caption") return { field: "caption", message: sentence || "Please reword your caption." };
  if ((res.status === 400 || res.status === 409) && sentence) return { field: null, message: sentence };
  return { field: null, message: "Couldn't save your change. Please try again." };
}

export function storyDeleteFailure(res: { status: number; data?: any }): string {
  const code = typeof res.data?.error?.code === "string" ? res.data.error.code : "";
  if (res.status === 0 || code === "network_error") return `${OFFLINE} The story is still there, so try again.`;
  if (code === "timeout") return "That took too long. The story is still there, so try again.";
  if (res.status === 404) return "This story is already gone.";
  return "Couldn't delete the story. Please try again.";
}
