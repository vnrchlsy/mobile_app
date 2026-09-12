/**
 * The bottom tab bar must be the CANVAS's tab bar.
 *
 * ⚠️ WHY THIS EXISTS. Every conformance track in this sprint measured the tab bar and left it
 * alone, because it was closer to the design than anything else: height, gutter, radius, the
 * float shadow, the pill's radius and height and its exact gradient all matched. That made
 * the three places it did NOT match easy to keep excusing — the label was 12 where the canvas
 * says 11, its tracking was absent where the canvas says +0.1, and every icon was 24 where
 * the canvas draws 23. T2 held the label back from the ramp for the right reason and then had
 * no way to say what it SHOULD be. This file is that missing half.
 *
 * It asserts against `Main.dc.html` itself rather than against numbers copied out of it, so a
 * redesign of the bar shows up here as a failure rather than as a silent divergence.
 *
 * ⚠️ ONE DELIBERATE DIVERGENCE, ASSERTED AS SUCH: the canvas puts the bar at `bottom: 18px`.
 * The app uses `Math.max(insets.bottom, TAB_BAR.inset)`, which is 34 on a phone with a home
 * indicator. The artboard has no safe area — 18 is its no-indicator baseline — and the bar
 * overlapping the home indicator was a real bug reported on device and fixed earlier this
 * sprint. So the app is right to ignore the 18, and `inset` is a floor, not the design value.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

import { gradients } from "../theme/gradients";
import { typography } from "../theme/typography";
import { radii } from "../theme/radii";
import { TAB_BAR } from "../components/ui/TabBar";

function find(name: string): string | null {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const c = join(dir, "design", "mobile-v3", name);
    if (existsSync(c)) return c;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

const canvasPath = find("Main.dc.html");
const canvas = canvasPath ? readFileSync(canvasPath, "utf8") : "";
const describeParity = canvasPath ? describe : describe.skip;
if (!canvasPath) {
  // eslint-disable-next-line no-console
  console.warn("[tabbar] design/mobile-v3 not found — parity assertions skipped, not failed.");
}

const source = readFileSync(join(__dirname, "..", "components", "ui", "TabBar.tsx"), "utf8");

/** The bar itself: the one absolutely-positioned box carrying the float shadow. */
const bar = /position:\s*absolute;\s*left:\s*16px;\s*right:\s*16px;\s*bottom:\s*(\d+)px;\s*height:\s*(\d+)px;\s*border-radius:\s*(\d+)px;\s*box-shadow:\s*var\(--sh-float\)/.exec(canvas);
/** The travelling active pill. */
const pill = /top:\s*([\d.]+)px;\s*left:\s*([\d.]+)px;\s*width:\s*[\d.]+px;\s*height:\s*(\d+)px;\s*border-radius:\s*(\d+)px;\s*background:\s*linear-gradient\(160deg,\s*(#[0-9A-Fa-f]{6}),\s*(#[0-9A-Fa-f]{6})\)/.exec(canvas);
/** The label span. */
const label = /font-size:\s*(\d+)px;\s*letter-spacing:\s*\.?([\d.]+)px;\s*font-weight:\s*\{\{tab\.weight\}\}/.exec(canvas);

describeParity("the tab bar matches the canvas", () => {
  it("located the bar, the pill and the label in the artboard", () => {
    // Guard the guard: three regexes that all quietly fail to match would pass every
    // assertion below by asserting nothing at all.
    expect(bar).not.toBeNull();
    expect(pill).not.toBeNull();
    expect(label).not.toBeNull();
  });

  it("has the canvas's bar geometry", () => {
    expect(TAB_BAR.height).toBe(Number(bar![2]));
    expect(TAB_BAR.radius).toBe(Number(bar![3]));
    expect(TAB_BAR.gutter).toBe(16);
  });

  it("draws icons at the canvas's size", () => {
    // Every tab icon in the artboard is <svg width="23" height="23">.
    const sizes = new Set(
      Array.from(canvas.matchAll(/<svg width="(\d+)" height="\1"[^>]*viewBox="0 0 24 24"/g))
        .map((m) => Number(m[1]))
    );
    expect(sizes.has(TAB_BAR.iconSize)).toBe(true);
    expect(TAB_BAR.iconSize).toBe(23);
  });

  it("places the active pill where the canvas places it", () => {
    const top = Number(pill![1]);
    const inset = Number(pill![2]);
    const height = Number(pill![3]);
    expect(/top:\s*5,/.test(source)).toBe(true);
    expect(top).toBe(5);
    expect(inset).toBe(3.5);
    expect(new RegExp(`left:\\s*${inset},`).test(source)).toBe(true);
    expect(new RegExp(`right:\\s*${inset},`).test(source)).toBe(true);
    // The bar is `height` tall and the pill sits `top` from its top, so the bottom inset is
    // whatever is left over — 68 − 5 − 56 = 7. Asserted as arithmetic so it cannot drift.
    expect(new RegExp(`bottom:\\s*${TAB_BAR.height - top - height},`).test(source)).toBe(true);
    expect(radii.field).toBe(Number(pill![4]));
  });

  it("fills the active pill with the canvas's gradient", () => {
    expect([...gradients.activeTab]).toEqual([pill![5].toUpperCase(), pill![6].toUpperCase()]);
  });

  it("sets the label at the canvas's size and tracking", () => {
    expect(Number(label![1])).toBe(11);
    // The size comes from the ramp's caption step (library #12), which the panel pins at 11.
    expect(typography.caption.fontSize).toBe(Number(label![1]));
    expect(/\.\.\.typography\.caption,/.test(source)).toBe(true);
    expect(new RegExp(`letterSpacing:\\s*0?\\.${label![2].replace(/^0?\./, "")},`).test(source))
      .toBe(true);
  });

  it("switches the label weight the way the canvas does", () => {
    // The artboard computes it: `weight: on ? "800" : "600"`. The app must use the same pair,
    // which it already did — this pins it so a future "tidy-up" cannot flatten the two.
    const expr = /weight:\s*on\s*\?\s*"(\d{3})"\s*:\s*"(\d{3})"/.exec(canvas);
    expect(expr).not.toBeNull();
    expect(new RegExp(`fontWeight:\\s*"${expr![1]}"`).test(source)).toBe(true);
    expect(new RegExp(`fontWeight:\\s*"${expr![2]}"`).test(source)).toBe(true);
  });

  it("keeps the safe-area floor rather than the artboard's bottom", () => {
    // The documented divergence. 18 is the artboard's no-safe-area baseline; the app must
    // keep using the inset as a FLOOR, or the bar lands on the home indicator again.
    expect(Number(bar![1])).toBe(18);
    expect(/Math\.max\(insets\.bottom,\s*TAB_BAR\.inset\)/.test(source)).toBe(true);
  });
});
