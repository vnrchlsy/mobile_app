/**
 * The type ramp must be the CANVAS's ramp — no richer, no poorer.
 *
 * ⚠️ WHY THIS EXISTS. `typography.ts` assigned a lineHeight to all eight steps. The approved
 * canvas names one: body, "15 / 400 / 21". The other seven were this file's own invention, and
 * they mattered because 719 of the app's 839 text styles set no lineHeight at all — so
 * "adopt the ramp" would silently have meant "adopt seven line heights nobody designed",
 * opening line spacing on every screen.
 *
 * Same rule colors.ts applies to hexes: the design source wins over the token, even when the
 * token is the thing everyone would have reached for.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

import { typography } from "../theme/typography";

function findCanvas(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const c = join(dir, "design", "mobile-v3", "Components.dc.html");
    if (existsSync(c)) return c;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const canvasPath = findCanvas();
const canvas = canvasPath ? readFileSync(canvasPath, "utf8") : "";
const describeParity = canvasPath ? describe : describe.skip;
if (!canvasPath) {
  // eslint-disable-next-line no-console
  console.warn("[type] design/mobile-v3 not found — parity assertions skipped, not failed.");
}

const STEPS = Object.entries(typography) as Array<[string, Record<string, unknown>]>;

describe("the type ramp", () => {
  it("has the canvas's ten sizes — fifteen and eleven twice each, once closed and once open", () => {
    expect(STEPS.map(([, s]) => s.fontSize)).toEqual([27, 25, 21, 19, 17, 15, 15, 13, 11, 11]);
  });

  it("names a lineHeight on body and nowhere else", () => {
    const withLH = STEPS.filter(([, s]) => s.lineHeight !== undefined).map(([n]) => n);
    expect(withLH).toEqual(["body"]);
    expect(typography.body.lineHeight).toBe(21);
  });
});

describeParity("parity with the approved canvas", () => {
  it("found the canvas", () => expect(canvas.length).toBeGreaterThan(1000));

  it("carries the canvas's one line-height label, and only one", () => {
    // The Type ramp panel labels steps "27 / 800 / -0.6" etc.; only body reads "15 / 400 / 21".
    const ramp = canvas.slice(canvas.indexOf("Type ramp"), canvas.indexOf("Type ramp") + 2600);
    expect(ramp).toContain("15 / 400 / 21");
    // No other step label ends in a third numeric field that is a line height (>= 24).
    const labels = [...ramp.matchAll(/class="mono"[^>]*>([^<]+)/g)].map((m) => m[1].trim());
    const withLineHeight = labels.filter((l) => /^\d+ \/ \d+ \/ \d\d+$/.test(l));
    expect(withLineHeight).toEqual(["15 / 400 / 21"]);
  });

  it.each([["27", "-0.6"], ["25", "-0.5"], ["21", "-0.4"], ["19", "-0.3"]])(
    "the canvas tracks %spt at %s", (size, ls) => {
      expect(canvas).toContain(`${size} / 800 / ${ls}`);
    });

  it("declares 17, 15 and 13 as weight RANGES, and gives none a tracking value", () => {
    // "Card title, button, field | 17 / 700-800", "Label, small button | 15 / 700-800" and
    // "Meta, helper, chip | 13 / 400-800". Three fields would mean a tracking value; these
    // have two, and the second is a range.
    expect(canvas).toContain("17 / 700-800");
    expect(canvas).toContain("15 / 700-800");
    expect(canvas).toContain("13 / 400-800");
    expect(canvas).toContain("11 / 600-800");
    expect(canvas).not.toContain("17 / 700 / -0.2");
  });

  it("spells the field label uppercase", () => {
    expect(canvas).toContain("11 / 800 / +0.8 / upper");
  });
});

describe("the four range steps", () => {
  /**
   * ⚠️ A RANGE CANNOT BE PINNED. Collapsing "13 / 400-800" to 400 picked the weight the app
   * uses least — 800x44 and 700x39 against 400x25 — so spreading the token would have
   * de-bolded the majority. Size only; the caller brings the weight.
   */
  it.each(["subtitle", "strong", "meta", "caption"] as const)("%s names no fontWeight", (step) => {
    expect(typography[step]).not.toHaveProperty("fontWeight");
  });

  it("gives subtitle and strong no letterSpacing — the panel names none at 17 or bold 15", () => {
    expect(typography.subtitle).not.toHaveProperty("letterSpacing");
    expect(typography.strong).not.toHaveProperty("letterSpacing");
    // ...and no lineHeight either: a bound label stays on RN's default leading, as it rendered.
    expect(typography.strong).not.toHaveProperty("lineHeight");
    expect(typography.caption).not.toHaveProperty("letterSpacing");
    expect(typography.caption).not.toHaveProperty("lineHeight");
  });

  it("still pins a weight on the six steps the panel pins", () => {
    const pinned = STEPS.filter(([, s]) => s.fontWeight !== undefined).map(([n]) => n);
    expect(pinned).toEqual(["display", "hero", "title", "section", "body", "label"]);
  });
});
