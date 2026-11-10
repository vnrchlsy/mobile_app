// Stories review step 11 (ST19, SQ5) · sharing a story, a link that opens it, and the posting prompts. Pure, so the rules run as tests.
//
// SQ5 (owner): "share" is the phone's share sheet with the caption and an app link. There is no public web page for a story, so the link is the app's own scheme,
// `kupkop://stories/{id}`; the app routes it (navigation/LinkBridge.tsx). It opens for someone who has the app; there is no store link to offer until there is a launch.
import type { PosterInquiry, ReportDetail } from "./api/types";
import type { Story } from "./community";
import type { StorySource } from "./storyCompose";

const SCHEME = "kupkop";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SHARED_CAPTION = 280;

export function storyLinkUrl(storyId: string): string {
  return `${SCHEME}://stories/${storyId}`;
}

/**
 * The story id in a `kupkop://stories/{id}` link, or null. Strict on purpose: the app's other schemes (the bundle id, Google's return scheme) are not ours to route, and
 * anything but a bare id (a prefix, extra path, a trick like `..`) is not a story link. A query or fragment is ignored. The id is lowercased.
 */
export function storyIdFromUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const m = /^kupkop:\/\/stories\/([^/?#]*)\/?(?:[?#].*)?$/.exec(url);
  return m && UUID.test(m[1]) ? m[1].toLowerCase() : null;
}

/** A story one moderation hid can only be seen by its author, so there is nothing to share. */
export function canShareStory(s: Story): boolean {
  return s.status === "published" && UUID.test(s.story_id);
}

/** What the share sheet is given: the caption (cut, so a message is not a wall of text), then the link. Nothing identifying is added. */
export function storyShareContent(s: Story): { message: string } {
  const chars = [...s.caption.trim()];
  const text = chars.length === 0 ? "A happy ending on Kupkop PH." : chars.length > MAX_SHARED_CAPTION ? `${chars.slice(0, MAX_SHARED_CAPTION).join("").trimEnd()}…` : chars.join("");
  return { message: `${text}\n\nSee it on Kupkop PH: ${storyLinkUrl(s.story_id)}` };
}

/** Compose params for the poster or shelter of an ADOPTED listing, or null (§5.7: a completed adoption prompts a story, not only for the adopter). */
export function composeForAdoptionPoster(row: Pick<PosterInquiry, "status" | "listing">): { adoptionListingId: string; source: StorySource } | null {
  const id = row.listing?.listing_id;
  return row.status === "adopted" && typeof id === "string" && id ? { adoptionListingId: id, source: "poster_prompt" } : null;
}

/** Compose params for the claimer of a RESOLVED rescue, or null: no case of their own (a lapsed or released claim) means no story to claim. */
export function composeForRescue(report: Pick<ReportDetail, "status" | "my_case">): { rescueCaseId: string; source: StorySource } | null {
  const id = report.my_case?.case_id;
  return report.status === "resolved" && typeof id === "string" && id ? { rescueCaseId: id, source: "rescue_prompt" } : null;
}
