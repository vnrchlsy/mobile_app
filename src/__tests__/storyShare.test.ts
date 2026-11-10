/**
 * Stories review step 11 (ST19, SQ5), library docs/superpowers/specs/2026-11-09-stories-review.md · sharing a story, a link that opens it, and the posting prompts.
 *
 *  - SQ5 (owner): "share" is the phone's share sheet with the caption and an app link. No public web page exists, so the link is `kupkop://stories/{id}`, and the app now routes it
 *    (it had the scheme registered and no routing: a shared link would have opened the app on whatever screen it was on).
 *  - Spec §5.7: "on a completed adoption or resolved rescue, the app gently prompts the user to post a story". Only the adopter was prompted. Now the poster or shelter of an
 *    adopted listing and the claimer of a resolved rescue are, with the same persistent button the adopter has (an alert is gone the moment it is dismissed).
 *
 * The rules are pure so they run as tests (no render setup here); the wiring is a source scan; the simulator walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

import {
  canShareStory, composeForAdoptionPoster, composeForRescue, storyIdFromUrl, storyLinkUrl, storyShareContent,
} from "../storyShare";
import { STORY_SOURCES } from "../storyCompose";
import { story } from "./storyFixtures";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
const ID = "6e001113-7d21-4e1b-a933-dcc8b267f1d9";

describe("storyLinkUrl / storyIdFromUrl", () => {
  test("a story's link, and back", () => {
    expect(storyLinkUrl(ID)).toBe(`kupkop://stories/${ID}`);
    expect(storyIdFromUrl(storyLinkUrl(ID))).toBe(ID);
  });
  test.each([
    [`kupkop://stories/${ID}/`, ID],
    [`kupkop://stories/${ID}?utm=x`, ID],
    [`kupkop://stories/${ID}#top`, ID],
    [`kupkop://stories/${ID.toUpperCase()}`, ID],
  ])("%s -> %s", (url, expected) => expect(storyIdFromUrl(url)).toBe(expected));
  test.each([
    ["another scheme", `https://kupkop.ph/stories/${ID}`],
    ["Google's return scheme", `com.googleusercontent.apps.123:/stories/${ID}`],
    ["the app's bundle scheme", `ph.kupkop.app://stories/${ID}`],
    ["another host", `kupkop://listings/${ID}`],
    ["not a uuid", "kupkop://stories/not-a-uuid"],
    ["an id with something after it", `kupkop://stories/${ID}/reactions`],
    ["an id with a prefix", `kupkop://stories/x${ID}`],
    ["no id", "kupkop://stories"],
    ["an empty id", "kupkop://stories/"],
    ["a path trick", `kupkop://stories/../${ID}`],
    ["whitespace", ` kupkop://stories/${ID}`],
  ])("%s is not a story link", (_n, url) => expect(storyIdFromUrl(url)).toBeNull());
  test.each([null, undefined, 5, {}, [], ""])("%p is not a link", (v) => expect(storyIdFromUrl(v as any)).toBeNull());
});

describe("canShareStory", () => {
  test("a published story, yours or not", () => {
    expect(canShareStory(story(ID))).toBe(true);
    expect(canShareStory(story(ID, { mine: true }))).toBe(true);
  });
  test("not one moderation hid (only its author can see it), and the id must be usable", () => {
    expect(canShareStory(story(ID, { status: "hidden", mine: true }))).toBe(false);
    expect(canShareStory(story("not-a-uuid"))).toBe(false);
  });
});

describe("storyShareContent", () => {
  test("the caption, then the link", () => {
    const c = storyShareContent(story(ID, { caption: "Rex on his first day home." }));
    expect(c.message).toBe(`Rex on his first day home.\n\nSee it on Kupkop PH: kupkop://stories/${ID}`);
  });
  test("a story with no caption still says something", () => {
    expect(storyShareContent(story(ID, { caption: "  " })).message).toMatch(/^A happy ending on Kupkop PH\./);
  });
  test("a long caption is cut, with an ellipsis, so a message is not a wall of text; the link is never cut", () => {
    const c = storyShareContent(story(ID, { caption: "word ".repeat(400) }));
    expect(c.message.split("\n\n")[0].length).toBeLessThanOrEqual(281);
    expect(c.message.split("\n\n")[0].endsWith("…")).toBe(true);
    expect(c.message.endsWith(`kupkop://stories/${ID}`)).toBe(true);
  });
  test("an emoji at the cut is not split in half", () => {
    const c = storyShareContent(story(ID, { caption: "🐶".repeat(400) }));
    expect(c.message.split("\n\n")[0]).toMatch(/^(🐶)+…$/u);
  });
  test("nothing identifying is added: not the author's name, email or city", () => {
    const c = storyShareContent(story(ID, { author: { name: "Ana Poster", city: "Marikina" } }));
    expect(c.message).not.toMatch(/Ana|Marikina/);
  });
});

describe("the posting prompts", () => {
  test("a poster or shelter of an adopted listing is offered the story, as the poster prompt", () => {
    expect(composeForAdoptionPoster({ status: "adopted", listing: { listing_id: "L1" } } as any))
      .toEqual({ adoptionListingId: "L1", source: "poster_prompt" });
  });
  test("not while the adoption is still going, or when the row cannot say which listing", () => {
    expect(composeForAdoptionPoster({ status: "active", listing: { listing_id: "L1" } } as any)).toBeNull();
    expect(composeForAdoptionPoster({ status: "adopted", listing: undefined } as any)).toBeNull();
    expect(composeForAdoptionPoster({ status: "adopted", listing: { listing_id: "" } } as any)).toBeNull();
  });
  test("a claimer of a resolved rescue is offered the story, as the rescue prompt", () => {
    expect(composeForRescue({ status: "resolved", my_case: { case_id: "C1" } } as any)).toEqual({ rescueCaseId: "C1", source: "rescue_prompt" });
  });
  test("not before it is resolved, and not for someone with no case of their own (a lapsed or released claim)", () => {
    expect(composeForRescue({ status: "rescued", my_case: { case_id: "C1" } } as any)).toBeNull();
    expect(composeForRescue({ status: "resolved" } as any)).toBeNull();
    expect(composeForRescue({ status: "resolved", my_case: { case_id: "" } } as any)).toBeNull();
  });
  test("both prompts use sources the server knows", () => {
    expect([...STORY_SOURCES]).toEqual(expect.arrayContaining(["poster_prompt", "rescue_prompt"]));
  });
});

describe("the screens", () => {
  const detail = read("screens", "StoryDetailScreen.tsx");
  const compose = read("screens", "StoryComposeScreen.tsx");
  const applicant = read("screens", "ApplicantScreen.tsx");
  const rescue = read("screens", "RescueUpdateScreen.tsx");
  const app = readFileSync(join(__dirname, "..", "..", "App.tsx"), "utf-8");
  const types = read("navigation", "types.ts");

  test("the detail shares through the OS share sheet, behind canShareStory, with a testID", () => {
    expect(detail).toContain("Share.share(");
    expect(detail).toContain("canShareStory(");
    expect(detail).toContain("storyShareContent(");
    expect(detail).toContain('testID="btn.storyDetail.share"');
  });
  test("a share that fails or is dismissed never shows an error (cancel is a choice)", () => {
    expect(detail).toMatch(/try \{[\s\S]*Share\.share\([\s\S]*\} catch/);
  });
  test("the app routes a story link: a handler is mounted in App and it uses the pure parser", () => {
    expect(app).toContain("<LinkBridge");
    expect(read("navigation", "LinkBridge.tsx")).toContain("storyIdFromUrl(");
    expect(read("navigation", "LinkBridge.tsx")).toMatch(/Linking\.addEventListener\("url"/);
    expect(read("navigation", "LinkBridge.tsx")).toContain("Linking.getInitialURL()");
  });
  test("a poster is offered the story on an adopted applicant, a rescuer on a resolved case", () => {
    expect(applicant).toContain("composeForAdoptionPoster(");
    expect(applicant).toContain('testID="btn.applicant.shareStory"');
    expect(rescue).toContain("composeForRescue(");
    expect(rescue).toContain('testID="btn.rescueUpdate.shareStory"');
  });
  test("compose takes a rescue case, tags it, and posts it", () => {
    expect(compose).toContain("route.params?.rescueCaseId");
    expect(compose).toMatch(/body\.rescue_case_id = prefillCase/);
    expect(compose).toContain("Tagged as a Rescue story");
  });
  test("the route types carry the rescue case", () => {
    expect(types).toMatch(/storyCompose: \{[^}]*rescueCaseId\?: string/);
  });
});
