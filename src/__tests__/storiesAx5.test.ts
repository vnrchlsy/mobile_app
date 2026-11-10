/**
 * The stories screens at AX5 (static risk from `dev/handoff-ax5.md`; the list's empty state and the compose form walked where the PR says, the story card and detail NOT: the walk had no stories): a story card and the
 * detail put a 46-50 pt avatar | `flex: 1` author name | type chip in one row and truncate the caption to two lines; the "+ Share" button, the React / Flag buttons, the "Tagged as an Adoption story" pill and the
 * dashed photo tile are fixed heights (38 / 44 / 32 / 150); the compose headline is an uncapped `hero`.
 *
 * The same fixes as the rest of the AX5 work, above `fontScale > 1.5` only: the author row stacks, cancelling the surviving `flex: 1` with `flex: 0` (#189); the caption is not truncated; the action row wraps;
 * fixed heights become `minHeight` + padding; the headline is capped (`maxFontScale.title`). Default-size layout is unchanged.
 *
 * A source scan in the style of homeAx5.test.ts. Written in the same step as its fix (never seen red).
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (f: string) => readFileSync(join(__dirname, "..", "screens", f), "utf-8");
const stories = read("StoriesScreen.tsx");
const detail = read("StoryDetailScreen.tsx");
const compose = read("StoryComposeScreen.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;

describe.each([["StoriesScreen", stories], ["StoryDetailScreen", detail]])("%s", (_n, src) => {
  test("the author row stacks at large text and cancels the surviving flex: 1", () => {
    expect(src).toMatch(/useLargeText\(\)/);
    expect(body(src, "authorRowLarge")).toMatch(/flexDirection\s*:\s*"column"/);
    expect(body(src, "authorRowLarge")).toMatch(/alignItems\s*:\s*"flex-start"/);
    const c = body(src, "authorCopyLarge") as string;
    expect(c).toMatch(/\bflex\s*:\s*0\b/);
    expect(c).toMatch(/alignSelf\s*:\s*"stretch"/);
    expect(c).toMatch(/flexGrow\s*:\s*0/);
    expect(c).toMatch(/flexBasis\s*:\s*"auto"/);
    expect(src).toMatch(/styles\.authorRow, large && styles\.authorRowLarge/);
    expect(src).toMatch(/large \? styles\.authorCopyLarge : styles\.authorCopy/);
  });
});

test("the list caption is not truncated at large text and the Share button grows", () => {
  expect(stories).toMatch(/styles\.caption\}[^>]*numberOfLines=\{large \? undefined : 2\}/);
  const b = body(stories, "share") as string;
  expect(b).not.toMatch(fixedHeight);
  expect(b).toMatch(/minHeight\s*:/);
  expect(b).toMatch(/paddingVertical\s*:/);
});

test("the detail's React / Flag buttons grow and their row wraps", () => {
  for (const n of ["reactBtn", "flagBtn"]) {
    const b = body(detail, n) as string;
    expect(b).not.toMatch(fixedHeight);
    expect(b).toMatch(/minHeight\s*:\s*44/);
    expect(b).toMatch(/paddingVertical\s*:/);
  }
  expect(body(detail, "actionRow")).toMatch(/flexWrap\s*:\s*"wrap"/);
});

test("the compose headline is capped, the tile has no fixed height, and the tag is the shared Chip that grows", () => {
  expect(compose).toMatch(/styles\.h1\}[^>]*maxFontSizeMultiplier=\{maxFontScale\.title\}/);
  // Stories review step 12 · the dashed fixed-height tile and the hand-drawn pill are gone: the tile is a pressable around a 176 pt photo and its label (which wraps),
  // and the "Tagged as" pill is <Chip>, whose minHeight and wrapping label are the R6-F4 fix.
  const b = body(compose, "photoTile") as string;
  expect(b).not.toBeNull();
  expect(b).not.toMatch(fixedHeight);
  expect(compose).toContain("<Chip label=");
  expect(body(compose, "linkedPill")).not.toMatch(fixedHeight);
});
