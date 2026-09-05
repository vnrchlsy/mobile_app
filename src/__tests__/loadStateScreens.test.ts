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

/**
 * Modules OUTSIDE screens/ that fetch on a screen's behalf — `useCachedFeed` and anything
 * like it. Derived by reading them, never named here.
 *
 * ⚠️ US-X1 IS WHY THIS EXISTS, AND IT IS THE NASTIEST UNDER-REPORT THIS GUARD HAS HAD.
 *
 * Moving three feeds' `api.get(` into a shared hook dropped all three out of `FETCHING`,
 * because scope was detected by the literal string. The screens still fetched; the guard
 * simply stopped watching them, and enforced nothing on them from then on.
 *
 * What makes it worse than the earlier three misses is the direction: the printed count went
 * from 44 to 41. A number going DOWN in a cleanup sprint reads as progress, so nothing about
 * it invites a second look. Refactoring toward a shared component — the thing every other
 * part of this sprint asks for — was silently shrinking the guard's reach.
 */
const FETCH_HELPERS = (() => {
  const dir = join(__dirname, "..");
  const names: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) continue;
    const src = readFileSync(join(dir, entry.name), "utf8");
    if (src.includes("api.get(")) names.push(entry.name.replace(/\.tsx?$/, ""));
  }
  return names;
})();

/**
 * Screens that talk to the API — directly, or through one of those helpers. A screen counts
 * if it imports the helper by name, which is how these are always used.
 */
const FETCHING = ALL.filter((f) => {
  const src = readCode(f);
  return src.includes("api.get(") || FETCH_HELPERS.some((h) => src.includes(`from "../${h}"`));
});

/**
 * Screens that opt OUT of conversion, by carrying `@loadStateExempt` FOLLOWED BY A REASON.
 *
 * US-R4 needed this because two of the files the scan matches are not screen loads at all:
 * ExportDataScreen's `api.get` is what its button does, and ShelterContactScreen's is form
 * prefill. Without a way to say so, the countdown below bottoms out at a permanent non-zero
 * number and reads as unfinished work forever — which is how a countdown stops being read.
 *
 * ⚠️ AN UNCAPPED OPT-OUT IS HOW A GUARD DIES. It is the one edit that makes a red build green
 * without changing any behaviour, so it is deliberately the most awkward thing here: the
 * marker lives in the source (never in a list in this file), it must carry a reason on the
 * same line, and the count is ratcheted like MAX_DISCARDS. Read from RAW text, because
 * readCode() strips exactly the comments the marker lives in.
 */
const EXEMPT_MARK = "@loadStateExempt";
const EXEMPT = FETCHING.filter((f) => readFileSync(join(SCREENS, f), "utf8").includes(EXEMPT_MARK));

/** ⚠️ NEVER RAISE THIS to make a build green — see MAX_DISCARDS. */
const MAX_EXEMPT = 2;

/**
 * ⚠️ THERE ARE TWO SHARED TREATMENTS, NOT ONE, and counting only the first under-reports.
 *
 * US-R5 walked into this: a form converted correctly renders `PrefillWarning`, never
 * `LoadStateView` — because a full-screen error state on a form throws away whatever the
 * person has already typed. So both properly-fixed forms were still being counted as
 * REMAINING, and the countdown would have bottomed out at 2 with the work actually done.
 * Same failure as the exemptions, one story later: the guard describing the fix too
 * narrowly, and the number quietly meaning something other than what it says.
 */
const USES_VIEW = FETCHING.filter((f) => readCode(f).includes("LoadStateView"));
const USES_WARNING = FETCHING.filter(
  (f) => readCode(f).includes("PrefillWarning") && !readCode(f).includes("LoadStateView"));

/** Derived by subtraction: converting a screen moves it here with no edit to this file. */
const CONVERTED = [...USES_VIEW, ...USES_WARNING];
const REMAINING = FETCHING.filter((f) => !CONVERTED.includes(f) && !EXEMPT.includes(f));

/** `r.ok && setX(...)` — the exact shape of the rescue-map bug. */
const DISCARDS = /\br\.ok\s*&&\s*set[A-Z]/g;

/**
 * THE RATCHET, now at ZERO — US-R1 killed all seven sites (2026-09-05).
 *
 * ⚠️ NEVER RAISE THIS NUMBER to make a build green. At zero it is no longer a countdown
 * but a prohibition: any non-zero value means a screen just re-acquired the bug that made
 * the rescue map announce "No strays reported near Marikina right now" while eight reports
 * sat within 10 km of the person reading it.
 *
 * What the seven actually did, checked before converting rather than assumed — none of
 * them crashed, and every one of them stated something false instead:
 *   NeedFormScreen        POSTed to /shelters/null/needs, then blamed the user's network
 *   ProfileScreen         showed a Verified Member their own account as unverified
 *   ShelterProfileScreen  showed a verified shelter as unverified AND gated, counts zeroed
 *   ShelterDashboardScreen "0 listings, 0 adopted, 0 donations", stated as fact
 *   StoryDetailScreen     spun forever (§13.3: "no infinite spinners")
 */
const MAX_DISCARDS = 0;

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
describe.each(USES_VIEW)("%s distinguishes offline from empty", (file) => {
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

  it("can tell 'not loaded yet' from 'loaded and genuinely empty'", () => {
    // ⚠️ THIS ASSERTION WAS WEAKER THAN IT LOOKED, and US-R3 is what exposed it.
    //
    // It used to forbid `useState<T[]>([])` outright, on the reasoning that an empty array
    // makes the first paint a confident empty state. That was true when nothing else
    // tracked load status — but it is a PROXY for the real invariant, not the invariant.
    //
    // A screen that keeps the request result renders `loading` on first paint regardless of
    // how its list is initialised, because `loadState(null)` is `{kind:"loading"}`. Forcing
    // those screens to `T[] | null` as well would sprinkle `?? []` through every `.map()`
    // for no safety gain — churn that buys nothing and makes the guard look arbitrary.
    //
    // So this checks the invariant directly: the screen must be able to distinguish the two
    // states, EITHER by initialising the list to null, OR by tracking the result. What must
    // still fail is the genuinely dangerous shape — an empty-array init with nothing at all
    // recording whether the request came back.
    const nullInitList = /useState<[^>]*\[\][^>]*\|\s*null>\(null\)/.test(src);
    const tracksResult = /useState<\{\s*ok:\s*boolean;\s*status:\s*number\s*\}\s*\|\s*null>\(null\)/.test(src);
    // A screen on the shared cache hook satisfies this through the hook, which holds both
    // the rows (null until loaded) and the result. Accepting it here rather than forcing the
    // state back into the screen — the point of a shared hook is that it cannot be got wrong
    // per-screen, which is strictly better than each screen proving it separately.
    const usesFeedHook = /useCachedFeed</.test(src);
    expect(nullInitList || tracksResult || usesFeedHook).toBe(true);
  });
});

// ── enforced: forms, which are converted differently on purpose ─────────────────────
describe.each(USES_WARNING.length ? USES_WARNING : ["(none)"])(
  "%s warns inline instead of replacing itself", (file) => {
    it("keeps the request RESULT, not just the rows", () => {
      if (file === "(none)") return;
      expect(readCode(file)).not.toMatch(DISCARDS);
    });

    it("does not also render a full-screen state over the fields", () => {
      if (file === "(none)") return;
      // The two treatments are alternatives, not layers. A form that renders both has a
      // path where the full-screen view wins and the typed work is gone anyway.
      expect(readCode(file)).not.toContain("LoadStateView");
    });

    // The rest of the form contract — rule 3, refusing to submit — is enforced in
    // prefillGuards.test.ts, because it lives inside submit() and needs a real brace match.
  });

// ── ratcheted: the opt-out ─────────────────────────────────────────────────────────
describe("opting out is possible, awkward, and capped", () => {
  it("stays at or under the exemption ratchet", () => {
    // eslint-disable-next-line no-console
    console.log(`[US-O1] exempt: ${EXEMPT.length} — ${EXEMPT.join(", ") || "none"}`);
    expect(EXEMPT.length).toBeLessThanOrEqual(MAX_EXEMPT);
  });

  it.each(EXEMPT.length ? EXEMPT : ["(none)"])("%s gives a reason for opting out", (file) => {
    if (file === "(none)") return;
    const line = readFileSync(join(SCREENS, file), "utf8")
      .split("\n").find((l) => l.includes(EXEMPT_MARK)) ?? "";
    // A bare marker is a silent exemption. The reason is the whole cost of opting out.
    expect(line.slice(line.indexOf(EXEMPT_MARK) + EXEMPT_MARK.length).trim().length)
      .toBeGreaterThan(20);
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

// ── enforced: the countdown, derived — AT ZERO SINCE US-R5 ──────────────────────────
it("no fetching screen collapses a failure into an empty state", () => {
  // eslint-disable-next-line no-console
  console.log(
    `[US-O1] fetching screens: ${FETCHING.length} ` +
    `(via helpers: ${FETCH_HELPERS.join(", ") || "none"}) · converted: ${CONVERTED.length} · ` +
    `(view: ${USES_VIEW.length}, form-warning: ${USES_WARNING.length}) · ` +
    `exempt: ${EXEMPT.length} · REMAINING: ${REMAINING.length}`);
  // ⚠️ THIS USED TO BE INFORMATIONAL, ON PURPOSE, AND THAT REASONING HAS NOW EXPIRED.
  //
  // It said: "the number is large and goes down over Sprint 8's Track R; failing the build
  // on it today would just get the file deleted." That was right at 42. At ZERO the same
  // argument flips — there is nothing left to grind down, so a non-zero value no longer
  // means "work in progress", it means a NEW screen shipped with the rescue-map bug. That
  // is the moment a countdown should become a prohibition, exactly as MAX_DISCARDS did.
  //
  // A screen that genuinely should not convert has a documented, capped, reasoned way to
  // say so above. Raising this number is not it.
  expect(REMAINING).toEqual([]);

  // Every fetching screen is accounted for in exactly one bucket — the arithmetic is what
  // stops a screen from quietly falling out of all three.
  expect(CONVERTED.length + REMAINING.length + EXEMPT.length).toBe(FETCHING.length);
});
