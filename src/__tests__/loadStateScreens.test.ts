/**
 * US-O1 · screens that fetch a list must distinguish "failed" from "empty".
 *
 * WHY THIS IS A TEST AND NOT A CODE REVIEW NOTE. The 2026-09-04 device walk found the
 * rescue map — the screen a person opens *because they think an animal needs help* —
 * telling them "No strays reported near Marikina right now." while the backend was
 * unreachable and the database held eight reports within 10 km. Nothing was broken in a
 * way a reviewer would notice: the code read `r.ok && setReports(...)`, which looks like
 * ordinary defensive style and silently throws the failure away.
 *
 * The two halves of that bug are what this file checks for, because both are invisible:
 *   1. the result is DISCARDED, so nothing downstream can know the request failed;
 *   2. the list is initialised to `[]`, so "never loaded" is indistinguishable from
 *      "loaded, and genuinely empty" — and the screen confidently renders the empty copy.
 *
 * A source scan rather than a render test, matching `accessibility.test.ts`: the same
 * trade-off applies (no RNTL dependency, and it reads the code a person would review).
 */
import { readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");

/** Enforced. Converted, and must stay converted. */
const CRITICAL = ["StoriesScreen.tsx", "RescueMapScreen.tsx"];

/** Known-unconverted (US-O1 remainder). Reported every run so the number goes down, not up. */
const REMAINING = [
  "AdoptBrowseScreen.tsx", "NotificationsScreen.tsx", "MyDonationsScreen.tsx",
  "ShelterNeedsScreen.tsx", "ImpactScreen.tsx", "MyReportsScreen.tsx",
];

/**
 * Read a screen with its comments removed.
 *
 * Necessary, not fussy: the first version of this scan failed on the very fix it was
 * written to enforce, because `RescueMapScreen`'s new comment *quotes* the old
 * `r.ok && setReports(...)` line while explaining why it was wrong. A guard that punishes
 * you for documenting the bug teaches people to delete the explanation.
 */
function readCode(f: string): string {
  return readFileSync(join(SCREENS, f), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")   // block comments, including JSX {/* … */} bodies
    .replace(/^\s*\/\/.*$/gm, "");        // whole-line // comments
}

const read = (f: string) => readFileSync(join(SCREENS, f), "utf8");

describe.each(CRITICAL)("%s distinguishes offline from empty", (file) => {
  const src = readCode(file);

  it("renders the shared LoadStateView", () => {
    // One component, not a bespoke state per screen — the per-screen version drifts, and
    // the screens that drift are the rarely-seen ones, where a wrong empty state does the
    // most damage.
    expect(src).toContain("LoadStateView");
  });

  it("keeps the request RESULT, not just the rows", () => {
    // `r.ok && setRows(...)` is the exact shape of the rescue-map bug: on failure it
    // evaluates to false and nothing at all is recorded, so the screen cannot tell that
    // anything went wrong. It reads like defensive code, which is why it survived review.
    expect(src).not.toMatch(/\br\.ok\s*&&\s*set[A-Z]/);
  });

  it("does not initialise its list to [] (that is indistinguishable from 'loaded, empty')", () => {
    // `useState<T[]>([])` means the first paint is a confident empty state. `null` means
    // "not loaded yet", which `loadState()` renders as loading and never as empty.
    expect(src).not.toMatch(/useState<[^>]*\[\]>\(\[\]\)/);
  });
});

it("reports how many list screens still collapse a failure into an empty list", () => {
  const unconverted = REMAINING.filter((f) => {
    try {
      return !read(f).includes("LoadStateView");
    } catch {
      return false; // renamed or gone — not this test's business
    }
  });
  // Informational, like the accessibility guard's counter: the point is that the number is
  // visible on every run and only ever goes down.
  console.log(`[US-O1] list screens still collapsing failure into empty: ${unconverted.length}` +
    (unconverted.length ? ` — ${unconverted.join(", ")}` : ""));
  expect(unconverted.length).toBeLessThanOrEqual(REMAINING.length);
});
