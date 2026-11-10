/**
 * Stories review step 12 (V1 to V4, SQ6) · the wall and the compose form on the V3 surface, drawn on
 * `design/mobile-v3/Stories.dc.html` (approved 2026-11-10). No render-test setup exists in this repo, so the screens are
 * covered by pure helpers and source scans, the way the moderation step's were.
 *
 * ⚠️ The project's rule for a source scan: assert it READ something before it asserts anything was or was not there.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { initials } from "../initials";
import { storyCardLabel, storyChipTone } from "../storyFeed";
import { V3_EXCLUDED, V3_SCOPE } from "./v3Scope";
import { story } from "./storyFixtures";

const read = (rel: string) => {
  const text = readFileSync(join(__dirname, "..", rel), "utf8");
  expect(text.length).toBeGreaterThan(500);
  return text;
};

describe("storyCardLabel: what a screen reader says for one wall card (V4)", () => {
  const ana = { name: "Ana Reyes", city: "Marikina" };
  it("names the author, the kind of story, the city and the reactions", () => {
    expect(storyCardLabel(story("1", { author: ana, story_type: "adoption", reaction_count: 3 })))
      .toBe("Ana Reyes's adoption story, Marikina, 3 reactions");
    expect(storyCardLabel(story("1", { author: ana, story_type: "rescue", reaction_count: 12 })))
      .toBe("Ana Reyes's rescue story, Marikina, 12 reactions");
  });
  it("says a general story is just a story", () => {
    expect(storyCardLabel(story("1", { author: ana, story_type: "general", reaction_count: 2 })))
      .toBe("Ana Reyes's story, Marikina, 2 reactions");
  });
  it("is singular for one reaction and says none for zero", () => {
    expect(storyCardLabel(story("1", { author: ana, reaction_count: 1 }))).toBe("Ana Reyes's story, Marikina, 1 reaction");
    expect(storyCardLabel(story("1", { author: ana, reaction_count: 0 }))).toBe("Ana Reyes's story, Marikina, no reactions yet");
  });
  it("leaves the city out when the author has none, and says when the viewer reacted", () => {
    expect(storyCardLabel(story("1", { author: { name: "Ana Reyes", city: "" }, reaction_count: 2 })))
      .toBe("Ana Reyes's story, 2 reactions");
    expect(storyCardLabel(story("1", { author: ana, reaction_count: 2, my_reaction: true })))
      .toBe("Ana Reyes's story, Marikina, 2 reactions, you reacted");
  });
});

describe("storyChipTone: the story types speak the shared status vocabulary (V6 prep, V5)", () => {
  it("maps each tone the type chip names onto a Chip tone", () => {
    expect(storyChipTone("ok")).toBe("success");
    expect(storyChipTone("teal")).toBe("info");
    expect(storyChipTone("muted")).toBe("neutral");
  });
});

describe("the two screens are in V3 scope", () => {
  it("scope names both and the exclusion list no longer does", () => {
    expect(V3_SCOPE.length).toBeGreaterThan(50);
    for (const n of ["StoriesScreen", "StoryComposeScreen"]) {
      expect(V3_SCOPE).toContain(n);
      expect(V3_EXCLUDED).not.toContain(n);
    }
  });
});

describe.each([["screens/StoriesScreen.tsx"], ["screens/StoryComposeScreen.tsx"]])("%s is V3", (file) => {
  const src = read(file);
  it("sits on the backdrop once and presses controls IN, not by fading them", () => {
    expect(src.split("<ScreenBackdrop />").length - 1).toBe(1);
    expect(src).toContain("<PressScale");
    expect(src.includes("TouchableOpacity")).toBe(false);
  });
  it("uses a Card for its surfaces, not a hand-spread shadow", () => {
    expect(src).toContain("<Card");
    expect(src.includes("...elevation")).toBe(false);
  });
  it("has no eyeballed colour", () => {
    expect(src.match(/#[0-9A-Fa-f]{6}\b/g)).toBeNull();
    expect(src.includes("const colors = {")).toBe(false);
  });
});

describe("the wall", () => {
  const src = read("screens/StoriesScreen.tsx");
  it("draws a card as ONE button with one label, from the pure helper", () => {
    expect(src).toContain("accessibilityLabel={storyCardLabel(s)}");
    expect(src).toContain('testID={`btn.stories.card.${s.story_id}`}');
  });
  it("draws the heart as a count, not a control, and the chip through the one StoryTypeChip", () => {
    expect(src).toContain("<StoryTypeChip");
    expect(src.includes("const CHIP")).toBe(false);
    expect(src.includes("storyTypeChip(")).toBe(false);
    expect(src).toContain('accessibilityElementsHidden');
  });
  it("keeps + Share off Your stories and keeps the guest wall", () => {
    expect(src).toMatch(/mine \? null : \(/);
    expect(src).toContain("<SignupWall");
  });
});

describe("compose", () => {
  const src = read("screens/StoryComposeScreen.tsx");
  const scrollEnd = src.indexOf("</ScrollView>");
  it("pins the Post / Save button below the scroll, so a long caption never pushes it off screen", () => {
    expect(scrollEnd).toBeGreaterThan(0);
    expect(src.indexOf("<Button", scrollEnd)).toBeGreaterThan(scrollEnd);
    expect(src.slice(0, scrollEnd).includes("<Button")).toBe(false);
  });
  it("lets the keyboard cover the pinned button rather than squeeze the caption (walked: lifting it left the field a sliver), and drag dismisses the keyboard", () => {
    expect(src.includes("KeyboardAvoidingView")).toBe(false);
    expect(src).toContain('keyboardDismissMode="on-drag"');
  });
  it("says what is shown with the story, on a new story and an edit alike", () => {
    expect(src).toContain("Shown with your city");
  });
  it("draws the tag on the shared success tone", () => {
    expect(src).toContain('tone="success"');
  });
  it("draws the cover and the strip inside a Card, dimmed on an edit", () => {
    expect(src).toContain('testID="btn.storyCompose.addPhoto"');
    expect(src).toContain('testID="btn.storyCompose.addPhotoSlot"');
    expect(src).toMatch(/opacity: edit \? 0\.6 : 1|edit && styles\.dim/);
  });
});

// ---- step 13 (ST17, V5, V6) · the shared bits ---------------------------------------------------------------------------------
describe("initials: the one helper (ST17)", () => {
  it("takes the first letter of the first two words, upper-cased", () => {
    expect(initials("Ana Reyes")).toBe("AR");
    expect(initials("ana maria dela cruz")).toBe("AM");
    expect(initials("  jun  ")).toBe("J");
  });
  it("says ? for nothing, so an avatar is never empty", () => {
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});

describe("the story screens share one StoryTypeChip and one initials", () => {
  const wall = read("screens/StoriesScreen.tsx");
  const detail = read("screens/StoryDetailScreen.tsx");
  const chip = read("components/StoryTypeChip.tsx");
  it("neither screen draws its own chip or its own initials", () => {
    for (const src of [wall, detail]) {
      expect(src).toContain("<StoryTypeChip");
      expect(src).toContain('from "../initials"');
      expect(src.includes("function initials")).toBe(false);
      expect(src.includes("const CHIP")).toBe(false);
      expect(src.includes("chipText")).toBe(false);
    }
  });
  it("the component is the type's label on the shared Chip tone", () => {
    expect(chip).toContain("storyTypeChip(");
    expect(chip).toContain("storyChipTone(");
    expect(chip).toContain("<Chip");
  });
  it("the wall has no unused style left (ST17)", () => {
    expect(wall.includes("  empty: {")).toBe(false);
  });
});
