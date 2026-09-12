/**
 * US-CH2 · one ScreenHeader, one BackButton, and a ratchet on the rest.
 *
 * ⚠️ THE NUMBER THIS FILE EXISTS TO HOLD DOWN. Before this story the app drew 59 hand-rolled
 * headers. Forty-five of them opened with `paddingTop: 58` and four with `64` — a magic number
 * tuned to one device's notch. NONE of the 59 called useSafeAreaInsets, and none used a
 * SafeAreaView. That is not a style complaint: the V2 pass shipped a Home whose greeting sat
 * under the Dynamic Island for a full release for exactly this reason, and this sprint found
 * the same shape again in three screens' failure branches (issue #38).
 *
 * ⚠️ THIS STORY DID NOT CONVERT ALL 59, AND SAYS SO RATHER THAN IMPLYING OTHERWISE. The plan
 * opens by warning that "convert the rest" is the story that has already burned this project.
 * What landed is the two shared auth headers (15 screens from one file) and the 8 hand-rolled
 * screens an e2e flow actually walks — the ones a conversion can be checked against. The
 * remaining 51 are enumerated below BY NAME, and the ratchet makes sure that list only ever
 * gets shorter.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const UI = join(__dirname, "..", "components", "ui");
const files = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx"));
const read = (f: string) => readFileSync(join(SCREENS, f), "utf8");
/** Comments quote the historical values on purpose, so scans must not read them. */
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/**
 * A screen whose header comes from the shared component, directly or via the auth kit.
 *
 * ⚠️ Computed over ALL screens, not over the back-affordance list — because a converted screen
 * NO LONGER CONTAINS one. The back button moved into ScreenHeader, so `testID="btn.back"` is
 * not in the screen file any more. Filtering the one list by the other made this count 2
 * instead of 23 on the first attempt.
 */
const SHARED = files.filter((f) => /<ScreenHeader|<SimpleHeader|<AuthHeader/.test(stripComments(read(f))));
/** A screen still drawing its own back affordance. */
// Not `testID="btn.back"`: three screens put that id on a "Wrong email? Change it" link or a
// "Keep my account" button so a flow can leave the screen, and neither is a header.
const HAND_ROLLED_RE = /styles\.backGlyph|accessibilityLabel="Go back"/;
// ⚠️ HAND-ROLLED FIRST. ListingForm rendered ScreenHeader in its loading branch and its own
// header everywhere else, and a "shared wins" classifier called the file converted for two
// PRs. A file that draws its own back glyph anywhere is hand-rolled, whatever else it renders.
const classify = (src: string) =>
  HAND_ROLLED_RE.test(src) ? "HAND_ROLLED" : /<ScreenHeader|<SimpleHeader|<AuthHeader/.test(src) ? "SHARED" : "NONE";
const HAND_ROLLED = files.filter((f) => classify(stripComments(read(f))) === "HAND_ROLLED");

/**
 * ⚠️ A RATCHET, NOT A TARGET. It fails if the count goes UP, which is the thing worth
 * preventing: a new screen copy-pasting the old header. It also fails if the count goes DOWN
 * without this number being updated — deliberately, so that finishing the job is recorded here
 * rather than silently absorbed. Lower it when you convert more; never raise it.
 */
// 51 -> 50: MyInquiriesScreen moved to ScreenHeader when its list was extracted so
// Adopt's segmented control could render the same list in place.
//
// 50 -> 6: the conversion this file's header warned about, done the way the warning asked —
// mechanically where the shape was mechanical, and by name where it was not. Forty screens
// drew the identical header (a styles.header row, a goBack chevron, a title beside it,
// nothing else) and were converted by a codemod that refused any other shape. Three
// carried a right-side action and one had a bare Text for its back control — those four by
// hand, the action moving into ScreenHeader's `right`. Checked on device for the thing that
// burned this project: the title now clears the Dynamic Island on every converted screen,
// because ScreenHeader pads by the inset rather than 58.
//
// ZERO, AND A FLAT RULE FROM HERE. The last six were the ShelterVolunteer screens, which #69
// left behind with the note that their `styles.header` "wraps far more than a header — a
// stats block, a calendar strip". Read again, it did not: five were a back button, a centred
// title and a spacer, and Requests added a subtitle line, which ScreenHeader's `children`
// slot carries under the row. The note was wrong and the conversion was a header swap after
// all. The ratchet is now the flat rule it was always meant to become: no screen draws its own.
const REMAINING_HAND_ROLLED = 0;

describe("the header primitives", () => {
  it("pads by the safe-area inset rather than a magic number", () => {
    const src = stripComments(readFileSync(join(UI, "ScreenHeader.tsx"), "utf8"));
    expect(src).toMatch(/useSafeAreaInsets\(\)/);
    expect(src).toMatch(/paddingTop:\s*insets\.top/);
    // The specific number this replaced. If it reappears in CODE, the fix has been undone —
    // the docstring names it deliberately, which is why comments are stripped first.
    expect(src).not.toMatch(/paddingTop:\s*58\b/);
  });

  it("gives the back button a 44 pt target and the shared slop token", () => {
    const src = stripComments(readFileSync(join(UI, "ScreenHeader.tsx"), "utf8"));
    expect(src).toMatch(/BACK_BUTTON_SIZE\s*=\s*44/);
    // The auth kit's copy was 42x42 with a bespoke hitSlop of 14. Both are gone.
    expect(src).toMatch(/hitSlop=\{TAP_SLOP\}/);
    expect(src).not.toMatch(/hitSlop=\{\{/);
  });
});

describe("no screen draws chrome the OS already draws", () => {
  // The plan's wording: "No fake status bar and no fake keyboard, anywhere. The real ones draw
  // over the layout." This was already true on main; the assertion keeps it true.
  it.each(files)("%s draws no fake status bar or keyboard", (f) => {
    expect(stripComments(read(f))).not.toMatch(/fakeStatus|FakeStatus|fakeKeyboard|FakeKeyboard|mockKeyboard|statusBarFake/);
  });
});

describe("the hand-rolled header ratchet", () => {
  it("found screens to classify", () => {
    // Guard the guard: a broken scan would make every count below meaningless. This repo has
    // had a selector scan report 0 and another report 128 phantoms; assert the scope first.
    expect(SHARED.length).toBeGreaterThanOrEqual(23);
    // The scan must still SEE a hand-rolled header when one exists: feed it the shape.
    expect(classify("<Text testID=\"btn.back\" style={styles.backGlyph}>‹</Text>")).toBe("HAND_ROLLED");
  });

  it("has not grown a new hand-rolled header", () => {
    expect(HAND_ROLLED.length).toBeLessThanOrEqual(REMAINING_HAND_ROLLED);
  });

  it("records the remaining count honestly", () => {
    // Fails if someone converts more without lowering the number, so the deferred list in
    // dev/HANDOFF.md and this file cannot drift apart.
    expect(HAND_ROLLED.length).toBe(REMAINING_HAND_ROLLED);
  });

  it("keeps every converted screen converted", () => {
    // The 8 flow-walked screens this story converted, by name. A regression here means a
    // screen went back to drawing its own header.
    const converted = [
      "ExportDataScreen.tsx", "KawangGawaDetailScreen.tsx", "ListingDetailScreen.tsx",
      "MyReportsScreen.tsx", "ReportStrayScreen.tsx", "RescueMapScreen.tsx",
      "SettingsPrivacyScreen.tsx", "SettingsScreen.tsx"
    ];
    converted.forEach((f) => expect(read(f)).toMatch(/<ScreenHeader/));
  });

  it("names none still hand-rolled — the list got shorter until it was empty", () => {
    expect(HAND_ROLLED.sort()).toEqual([]);
  });
});
