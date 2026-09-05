/**
 * US-O1 · screens that fetch must distinguish "failed" from "empty".
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
 * ⚠️ US-G1 · THIS FILE'S SCOPE IS DERIVED, NEVER HAND-WRITTEN, AND THAT IS THE POINT.
 *
 * The first version carried a hand-typed `REMAINING` array written from memory. It listed
 * SIX screens, one of which (`AdoptBrowseScreen.tsx`) did not exist — and its `catch`
 * silently swallowed that. The real number was FORTY-TWO. Sprint 7 planned against 5 and
 * Sprint 8 had to re-plan against 42, because the guard everyone trusted was reporting an
 * eighth of the truth.
 *
 * It also closed with `expect(unconverted.length).toBeLessThanOrEqual(REMAINING.length)` —
 * an assertion that compares a filtered subset against the array it was filtered from. It
 * could not fail. A green tautology reads exactly like a green check.
 *
 * So: every list below comes from a directory walk, the enforced set is derived by
 * SUBTRACTION (converting a screen moves it automatically and nobody edits a list), and
 * the meta-assertions at the top exist because a walk that silently matches nothing passes
 * every per-file assertion underneath it.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");

/**
 * Read a screen with its comments removed.
 *
 * Necessary, not fussy: an early version of this scan failed on the very fix it was
 * written to enforce, because `RescueMapScreen`'s comment *quotes* the old
 * `r.ok && setReports(...)` line while explaining why it was wrong. A guard that punishes
 * you for documenting the bug teaches people to delete the explanation.
 */
function readCode(file: string): string {
  return readFileSync(join(SCREENS, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")   // block comments, including JSX {/* … */} bodies
    .replace(/^\s*\/\/.*$/gm, "");      // whole-line // comments
}

/** Every screen on disk. The one source of truth for scope. */
const ALL = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx"));

/** Screens that talk to the API — the only ones that can have this bug. */
const FETCHING = ALL.filter((f) => readCode(f).includes("api.get("));

/** Derived by subtraction: converting a screen moves it here with no edit to this file. */
const CONVERTED = FETCHING.filter((f) => readCode(f).includes("LoadStateView"));
const REMAINING = FETCHING.filter((f) => !readCode(f).includes("LoadStateView"));

/** `r.ok && setX(...)` — the exact shape of the rescue-map bug. */
const DISCARDS = /\br\.ok\s*&&\s*set[A-Z]/g;

/**
 * THE RATCHET. US-R1 drives this to zero; until then it may only ever go DOWN.
 *
 * Seven live sites across six files as of 2026-09-05 — four of them `GET /me`, where a
 * failed identity call leaves the screen rendering with `me = null` (blank fields, or a
 * crash on first property access; they are different bugs and at least one may be live).
 *
 * ⚠️ NEVER RAISE THIS NUMBER to make a build green. Lowering it is the whole point;
 * raising it means a new screen just acquired the bug this file exists to prevent.
 */
const MAX_DISCARDS = 7;

// ── meta: the scan found something ──────────────────────────────────────────────────
// Without these, a broken path or a renamed directory leaves every assertion below
// iterating an empty array — and the suite goes green having checked nothing at all.
describe("the scan has a scope", () => {
  it("found screen files", () => {
    expect(ALL.length).toBeGreaterThan(30);
  });

  it("found screens that fetch", () => {
    expect(FETCHING.length).toBeGreaterThan(10);
  });

  it("found at least one converted screen to enforce against", () => {
    // `describe.each([])` produces no tests and passes. This is the assertion that stops
    // "nothing is enforced" from looking identical to "everything passed".
    expect(CONVERTED.length).toBeGreaterThan(0);
  });
});

// ── enforced: converted screens must stay converted ─────────────────────────────────
describe.each(CONVERTED)("%s distinguishes offline from empty", (file) => {
  const src = readCode(file);

  it("renders the shared LoadStateView", () => {
    // One component, not a bespoke state per screen — the per-screen version drifts, and
    // the screens that drift are the rarely-seen ones, where a wrong empty state does the
    // most damage.
    expect(src).toContain("LoadStateView");
  });

  it("keeps the request RESULT, not just the rows", () => {
    expect(src).not.toMatch(DISCARDS);
  });

  it("does not initialise its list to [] (that is indistinguishable from 'loaded, empty')", () => {
    // `useState<T[]>([])` means the first paint is a confident empty state. `null` means
    // "not loaded yet", which `loadState()` renders as loading and never as empty.
    expect(src).not.toMatch(/useState<[^>]*\[\]>\(\[\]\)/);
  });
});

// ── ratcheted: the dangerous pattern, app-wide ──────────────────────────────────────
it("no new screen acquires the discard-the-failure pattern", () => {
  const sites = FETCHING.flatMap((f) =>
    (readCode(f).match(DISCARDS) ?? []).map(() => f));
  const byFile = [...new Set(sites)].sort();
  // eslint-disable-next-line no-console
  console.log(
    `[US-O1] r.ok && setX sites: ${sites.length} across ${byFile.length} file(s)` +
    (byFile.length ? ` — ${byFile.join(", ")}` : ""));
  expect(sites.length).toBeLessThanOrEqual(MAX_DISCARDS);
});

// ── informational: the countdown, derived ───────────────────────────────────────────
it("reports how many fetching screens still collapse a failure into an empty state", () => {
  // eslint-disable-next-line no-console
  console.log(
    `[US-O1] fetching screens: ${FETCHING.length} · converted: ${CONVERTED.length} · ` +
    `REMAINING: ${REMAINING.length}`);
  // Deliberately not an assertion. The number is large and goes down over Sprint 8's
  // Track R; failing the build on it today would just get the file deleted. The ratchet
  // above is where the enforcement lives.
  expect(CONVERTED.length + REMAINING.length).toBe(FETCHING.length);
});
