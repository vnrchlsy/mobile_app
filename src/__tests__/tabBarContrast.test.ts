// The bottom tab bar's inactive icons were #C9CEC7 on white — 1.60:1, against a 3:1 minimum
// for non-text UI. The label directly beneath each icon was 6.49:1, so the two halves of the
// same control disagreed by a factor of four: the word was legible, the glyph identifying it
// was barely there. A contrast figure is exactly the kind of thing that gets nudged back
// toward "prettier" later, so it is measured here rather than left to the eye.
import { TAB_COLORS } from "../components/OwnerTabs";
import { SHELTER_TAB_COLORS } from "../components/ShelterTabs";
import { GUEST_TAB_COLORS } from "../screens/HomeGuestScreen";

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const channels = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG 1.4.11: non-text content that conveys meaning needs 3:1. A tab icon is the only thing
 *  distinguishing one tab from another at a glance, so it plainly conveys meaning. */
const MIN_NON_TEXT = 3;

/**
 * ALL THREE tab bars, not just the owner one. The app has three shells — owner, guest and
 * shelter — and each renders its own bar from its own private copy of these colours. Fixing
 * only the owner's would have left the guest bar (the screen a signed-out user actually lands
 * on) still at 1.6:1, and the shelter bar at its own separate pale grey. Enumerating them here
 * is what makes "the tab icons are visible" a claim about the app rather than about one file.
 */
const BARS = [
  { name: "owner", ...TAB_COLORS },
  { name: "guest", ...GUEST_TAB_COLORS },
  { name: "shelter", ...SHELTER_TAB_COLORS }
];

describe("bottom tab bar contrast", () => {
  // Guard the guard: a typo'd import or a renamed export would otherwise leave this suite
  // quietly measuring nothing and still reporting green.
  it("is actually checking every tab bar in the app", () => {
    expect(BARS).toHaveLength(3);
    BARS.forEach((bar) => expect(bar.inactive).toMatch(/^#[0-9A-Fa-f]{6}$/));
  });

  it.each(BARS)("makes $name's inactive icon visible against its bar", (bar) => {
    expect(contrast(bar.inactive, bar.bar)).toBeGreaterThanOrEqual(MIN_NON_TEXT);
  });

  it.each(BARS)("draws $name's icon and label in the same colour, as one control", (bar) => {
    // Not merely "both pass" — a glyph noticeably fainter than the word under it is what the
    // original bug looked like, and two separately-passing values can drift back into it.
    expect(bar.inactive).toBe(bar.muted);
  });

  it("keeps the owner bar's active icon legible on its tinted pill", () => {
    expect(contrast(TAB_COLORS.teal, TAB_COLORS.soft)).toBeGreaterThanOrEqual(MIN_NON_TEXT);
  });
});
