/**
 * Stories review step 6 (ST7, SQ1), library docs/superpowers/specs/2026-11-09-stories-review.md · an author can edit the caption of, delete, and find
 * their own stories. Before there was no way to take a story down once it was posted to a feed guests can read.
 *
 * The rules are pure so they run as tests (this repo has no render setup); the screen wiring is a source scan and the simulator walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { canDeleteStory, canEditStory, hasUnsavedEdit, storiesPath, storyDeleteFailure, storyEditFailure, storyStatusNote } from "../storyAuthor";
import { moreUrl } from "../storyFeed";
import { story } from "./storyFixtures";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
const err = (status: number, code: string, message = "", extra: object = {}) => ({ status, data: { error: { code, message, ...extra } } });

describe("who can do what", () => {
  test("an author can edit and delete a published story of theirs", () => {
    const s = story("a", { mine: true });
    expect(canEditStory(s)).toBe(true);
    expect(canDeleteStory(s)).toBe(true);
  });
  test("a story moderation hid can be deleted but not edited (the server refuses an edit: it is under review)", () => {
    const s = story("a", { mine: true, status: "hidden" });
    expect(canEditStory(s)).toBe(false);
    expect(canDeleteStory(s)).toBe(true);
  });
  test("nobody else's story offers either", () => {
    const s = story("a", { mine: false });
    expect(canEditStory(s)).toBe(false);
    expect(canDeleteStory(s)).toBe(false);
  });
});

describe("storyStatusNote", () => {
  test("a hidden story says so on your own list, in words, and says it can still be opened", () => {
    expect(storyStatusNote(story("a", { status: "hidden" }))).toMatch(/hidden by moderation/i);
  });
  test("a published one says nothing", () => {
    expect(storyStatusNote(story("a"))).toBeNull();
  });
});

describe("storiesPath and moreUrl", () => {
  test("the wall is /stories, yours is /me/stories", () => {
    expect(storiesPath(false)).toBe("/stories");
    expect(storiesPath(true)).toBe("/me/stories");
  });
  test("later pages ask the same path with the cursor, encoded", () => {
    expect(moreUrl("a_b-c", "/me/stories")).toBe("/me/stories?cursor=a_b-c");
    expect(moreUrl("a b&c", "/me/stories")).toBe("/me/stories?cursor=a%20b%26c");
    expect(moreUrl("c1")).toBe("/stories?cursor=c1");              // the wall, unchanged
  });
});

describe("hasUnsavedEdit", () => {
  test.each([
    ["Meet Rex", "Meet Rex", false],
    ["Meet Rex  ", "Meet Rex", false],                           // trailing space is not a change: the server trims it
    ["Meet Rex, six months on", "Meet Rex", true],
    ["", "Meet Rex", true],                                       // clearing the caption is a change
    ["", "", false],
    ["  ", "", false],
  ])("now %p, was %p -> %p", (now, was, expected) => {
    expect(hasUnsavedEdit(now, was)).toBe(expected);
  });
});

describe("storyEditFailure", () => {
  test("a blocklisted caption is said under the caption, in the server's words", () => {
    const f = storyEditFailure(err(400, "invalid", "That contains language that isn't allowed on Kupkop. Please reword it and try again.", { field: "caption" }));
    expect(f.field).toBe("caption");
    expect(f.message).toMatch(/reword it/);
  });
  test("a story moderation hid (409) says so, in the server's sentence", () => {
    expect(storyEditFailure(err(409, "story_hidden", "Moderators hid this story, so it can't be edited.")))
      .toEqual({ field: null, message: "Moderators hid this story, so it can't be edited." });
  });
  test("a story that is gone (404) says so", () => {
    expect(storyEditFailure(err(404, "not_found", "No such story.")).message).toMatch(/already gone/i);
  });
  test("offline says the change is still here", () => {
    const f = storyEditFailure({ status: 0, data: { error: { code: "network_error", message: "Couldn't reach the server." } } });
    expect(f.message).toMatch(/offline|connection/i);
    expect(f.message).toMatch(/try again/i);
  });
  test.each([undefined, null, {}, { error: null }, { error: { code: 5 } }])("a reply with no usable body (%p) says it plainly and never says 'post'", (data) => {
    const f = storyEditFailure({ status: 500, data } as any);
    expect(f).toEqual({ field: null, message: "Couldn't save your change. Please try again." });
  });
});

describe("storyDeleteFailure", () => {
  test("already gone", () => expect(storyDeleteFailure(err(404, "not_found")).toLowerCase()).toContain("already gone"));
  test("offline says the story is still there", () => {
    expect(storyDeleteFailure({ status: 0, data: { error: { code: "network_error" } } })).toMatch(/still there/i);
  });
  test("anything else is plain", () => {
    expect(storyDeleteFailure({ status: 500, data: null } as any)).toBe("Couldn't delete the story. Please try again.");
  });
});

describe("the screens", () => {
  const detail = read("screens", "StoryDetailScreen.tsx");
  const compose = read("screens", "StoryComposeScreen.tsx");
  const feed = read("screens", "StoriesScreen.tsx");
  const profile = read("screens", "ProfileScreen.tsx");
  const types = read("navigation", "types.ts");

  test("the detail offers Edit and Delete only through canEditStory / canDeleteStory", () => {
    expect(detail).toContain("canEditStory(");
    expect(detail).toContain("canDeleteStory(");
    expect(detail).toContain('testID="btn.storyDetail.edit"');
    expect(detail).toContain('testID="btn.storyDetail.delete"');
  });

  test("a delete asks first, says what happens, and goes through the API once", () => {
    expect(detail).toMatch(/Alert\.alert\(\s*"Delete this story\?"/);
    expect(detail).toMatch(/api\.del\(`\/stories\/\$\{storyId\}`\)/);
    expect(detail).toMatch(/const deleting = useRef\(false\)/);
    expect(detail).toContain("storyDeleteFailure(");
  });

  test("the detail reloads when it comes back into focus, so an edit shows (the story stays on screen while it does)", () => {
    expect(detail).toContain("useFocusEffect(");
    expect(detail).not.toMatch(/useEffect\(load, \[load\]\)/);
  });

  test("compose has an edit mode: the caption only, saved with PATCH, with its own failures", () => {
    expect(compose).toContain("route.params?.edit");
    expect(compose).toContain("Save changes");
    expect(compose).toMatch(/api\.patch\(`\/stories\/\$\{edit\.storyId\}`/);
    expect(compose).toContain("storyEditFailure(");
    expect(compose).toContain("hasUnsavedEdit(");
  });

  test("an edit does not offer to change the photo", () => {
    expect(compose).toMatch(/onPress=\{edit \? undefined : addPhoto\}/);
  });

  test("the wall screen serves your stories too: the other path, its own title, and it marks a hidden story", () => {
    expect(feed).toContain("storiesPath(");
    expect(feed).toContain('"Your stories"');
    expect(feed).toContain("storyStatusNote(");
    expect(feed).toMatch(/moreUrl\(cursor, path\)/);
  });

  test("your stories do not offer + Share a second time", () => {
    expect(feed).toMatch(/mine \? null : \(\s*<TouchableOpacity/);
  });

  test("the Profile has a Your stories row that opens the list", () => {
    expect(profile).toContain('testID="row.profile.myStories"');
    expect(profile).toMatch(/navigation\.navigate\("stories", \{ mine: true \}\)/);
  });

  test("the route types carry the edit payload and the mine flag", () => {
    expect(types).toMatch(/stories: \{ mine\?: boolean \} \| undefined/);
    expect(types).toMatch(/edit\?: \{ storyId: string; caption: string; photoUrl: string \| null \}/);
  });
});
