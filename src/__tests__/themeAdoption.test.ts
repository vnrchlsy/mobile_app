/**
 * Screens take colour from `src/theme`, not from a table of their own.
 *
 * ⚠️ THE NUMBER THIS HOLDS DOWN. `colors.ts` was written from measurement — `pnpm surface`
 * counted 77 distinct hex literals across 1,117 occurrences — and it says plainly of itself:
 * "NO SCREEN IS CONVERTED BY THIS FILE." For a whole sprint that stayed true. The design audit
 * against the approved canvas measured the result: 41 screens still declaring their own
 * `const colors`, against 31 importing the theme.
 *
 * This guard is a RATCHET, like the header one. It fails if the count goes UP — a new screen
 * copy-pasting a palette — and also if it falls without the number here being updated, so
 * finishing the job is recorded rather than silently absorbed.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const files = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx"));
const read = (f: string) => readFileSync(join(SCREENS, f), "utf8");

/**
 * ⚠️ THE `m` FLAG WITHOUT ANCHORING THE CLOSE, because two screens wrote the whole table on ONE
 * line — `const colors = { ink: "#12213A", ... };` — and a pattern that required `^\};` missed
 * both. They were absent from the migration's own survey for exactly that reason, and only
 * turned up when the remaining count was listed by name. A scan that cannot see a shape cannot
 * report it.
 */
const OWN_TABLE = /^const colors\s*[:=]/m;

const HOLDOUTS = files.filter((f) => OWN_TABLE.test(read(f)));
const IMPORTERS = files.filter((f) => /from "\.\.\/theme"/.test(read(f)));

/**
 * ⚠️ ZERO, AND IT IS NO LONGER A RATCHET. Every screen now takes colour from the theme, so
 * this stops being "how many are left" and becomes a flat rule: a screen may not declare its
 * own palette. Raising this number is not "recording progress" — it is reintroducing the drift
 * `colors.ts` was written to end.
 *
 * The last seven each held a grey with no token. Six were within a few units of an existing
 * one and were absorbed; one — the photo placeholder — earned a token of its own. Three of
 * those greys turned out not to be a naming problem at all: they were text and meaningful
 * glyphs below the contrast floor. See the commit.
 */
const REMAINING = 0;

describe("screens take colour from the theme", () => {
  it("found screens to classify", () => {
    // Guard the guard: this repo's scans have reported a plausible smaller number more than once.
    expect(files.length).toBeGreaterThan(80);
    expect(IMPORTERS.length).toBeGreaterThan(60);
  });

  it("has not grown a new private palette", () => {
    expect(HOLDOUTS.length).toBeLessThanOrEqual(REMAINING);
  });

  it("has no screen left holding its own palette", () => {
    expect(HOLDOUTS).toEqual([]);
  });

  it("sees a single-line table as well as a block one", () => {
    // The shape that was invisible to the migration's first survey.
    expect(OWN_TABLE.test('const colors = { ink: "#12213A" };')).toBe(true);
    expect(OWN_TABLE.test('const colors = {\n  ink: "#12213A"\n};')).toBe(true);
  });
});

/**
 * P5 · Task 4 — `ConfirmModal` is a shared component, not a screen, so the scan above never
 * saw its own `const colors = {...}`. This is the same rule applied directly to it.
 */
describe("ConfirmModal takes colour from the theme", () => {
  it("does not declare its own colour table", () => {
    const src = readFileSync(join(__dirname, "..", "components", "ConfirmModal.tsx"), "utf8");
    expect(OWN_TABLE.test(src)).toBe(false);
  });
});

/**
 * SH19 / V4 (shelter home review, step 11) · the scan above passes as long as no screen declares
 * `const colors = {`. It never saw a raw hex written straight into a style or an icon's `color=` prop:
 * the shelter Dashboard held 12 and You 4 while this file reported zero holdouts. Same habit as everywhere
 * else in this repo: the guard under-reported.
 *
 * A RATCHET per file. A screen not named below may hold no hex literal at all; a named one may not gain any.
 * Lowering a number (or removing a screen) when you convert it is the point; raising one is not allowed.
 */
const HEX_LITERAL =
  /\b(?:color|backgroundColor|borderColor|borderTopColor|borderBottomColor|tintColor|shadowColor)\s*[:=]\s*\{?\s*["']#[0-9A-Fa-f]{3,8}["']/g;

const HEX_HOLDOUTS: Record<string, number> = {
  "AccountTypeScreen.tsx": 2, "AuthFormKit.tsx": 5, "ForgotPasswordScreen.tsx": 1, "HomeScreen.tsx": 5,
  "ImpactScreen.tsx": 1, "KawangGawaDetailScreen.tsx": 3, "KawangGawaScreen.tsx": 1, "MyDonationsScreen.tsx": 1,
  "NotificationsScreen.tsx": 1, "OtpLockedScreen.tsx": 5, "OtpScreen.tsx": 9, "PasswordChangedScreen.tsx": 5,
  "ProfileScreen.tsx": 6, "ResetOtpScreen.tsx": 5, "ResetPasswordScreen.tsx": 4, "ShelterPhoneVerifyScreen.tsx": 3,
  "ShelterSetupScreen.tsx": 2, "ShelterTierScreen.tsx": 1, "ShelterVerifyNgoScreen.tsx": 11,
  "ShelterVerifyScreen.tsx": 8, "SignupScreen.tsx": 2, "SignupSuccessScreen.tsx": 7, "StoryDetailScreen.tsx": 3, "VerifyDocumentsScreen.tsx": 5,
  "VerifyPhoneScreen.tsx": 3, "VerifyResubmitScreen.tsx": 4
};

const hexCount = (f: string) => (read(f).match(HEX_LITERAL) ?? []).length;

describe("screens write no raw hex into styles or icon props", () => {
  it("sees the shapes it is meant to see", () => {
    expect('color: "#FFFFFF"'.match(HEX_LITERAL)).toHaveLength(1);
    expect('<CheckIcon color="#FFFFFF" size={10} />'.match(HEX_LITERAL)).toHaveLength(1);
    expect('backgroundColor: "#F3E1BE"'.match(HEX_LITERAL)).toHaveLength(1);
    expect("color: colors.white".match(HEX_LITERAL)).toBeNull();
    // Guard the guard: the holdouts are real, so the scan must find them.
    expect(files.reduce((n, f) => n + hexCount(f), 0)).toBeGreaterThan(80);
  });

  it("no screen outside the holdouts holds one, and no holdout gains one", () => {
    const over = files
      .map((f) => [f, hexCount(f), HEX_HOLDOUTS[f] ?? 0] as const)
      .filter(([, n, allowed]) => n > allowed);
    expect(over).toEqual([]);
  });

  it("the shelter A1 roots are converted (SH19)", () => {
    expect(hexCount("ShelterDashboardScreen.tsx")).toBe(0);
    expect(hexCount("ShelterProfileScreen.tsx")).toBe(0);
    expect(HEX_HOLDOUTS["ShelterDashboardScreen.tsx"]).toBeUndefined();
  });
});
