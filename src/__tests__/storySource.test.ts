/**
 * Stories review step 10 (ST18), library docs/superpowers/specs/2026-11-09-stories-review.md · compose tells the server which entry point opened it, so the conversion of the
 * prompts in the spec (§5.7: "on a completed adoption, the app gently prompts the user to post a story") can be measured server-side. There is no client analytics SDK
 * (D-S7-3 leaves it to Phase 2), so this is one field on the post the person is already making: no new request, no identifier, and a value from a closed list.
 *
 * A source scan, as elsewhere here (no render setup); the simulator walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { STORY_SOURCES } from "../storyCompose";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");

describe("story sources", () => {
  test("the closed list is the one the server knows", () => {
    expect([...STORY_SOURCES].sort()).toEqual(["adoption_cta", "feed", "poster_prompt", "rescue_prompt"]);
  });

  test("the types carry it", () => {
    expect(read("navigation", "types.ts")).toMatch(/storyCompose: \{[^}]*source\?: StorySource/);
  });

  test("the feed's + Share opens compose as `feed`", () => {
    expect(read("screens", "StoriesScreen.tsx")).toMatch(/navigate\("storyCompose", \{ source: "feed" \}\)/);
  });

  test("the adopted-inquiry prompt opens compose as `adoption_cta`", () => {
    expect(read("components", "InquiryList.tsx")).toMatch(/source: "adoption_cta"/);
  });

  test("compose sends it with a new story, and never with an edit", () => {
    const compose = read("screens", "StoryComposeScreen.tsx");
    expect(compose).toMatch(/if \(source\) body\.source = source/);
    const save = /async function save\(\) \{([\s\S]*?)\n  \}/.exec(compose);
    expect(save).not.toBeNull();
    expect((save as RegExpExecArray)[1]).not.toContain("source");
  });
});
