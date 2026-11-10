/**
 * Screens take depth from `src/theme/elevation.ts`, not from a shadow they typed themselves.
 *
 * ⚠️ WHAT MADE THIS TRACK SAFE TO RUN AS A MECHANICAL BIND. Unlike the type ramp, the
 * elevation token needed no correction first: its three steps translate the canvas honestly.
 * The canvas layers TWO shadows per surface (`--sh-soft: 0 1px 2px rgba(31,58,95,.04),
 * 0 4px 10px -3px rgba(31,58,95,.10)`), React Native gives a View exactly one, and the token
 * says so in its own header rather than pretending otherwise — it keeps the ambient half and
 * drops the contact half. The offsets carry straight across (4 / 10 / 16), the cast colour is
 * the canvas's rgba(31,58,95) exactly, and blur and opacity are scaled consistently because
 * CSS's negative spread has no RN equivalent. So a bind here reproduces what already renders.
 *
 * The guard resolves each shadow rather than matching text, for the same reason the type one
 * does: `shadowColor: colors.shadowCast` and `shadowColor: "#1F3A5F"` are the same pixel, and
 * a scan that compares source strings would call 62 sites conforming and 32 not.
 *
 * A RATCHET, in the shape of themeAdoption.test.ts.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { colors, elevation } from "../theme";

const SRC = join(__dirname, "..");
const STEPS = elevation as Record<
  string,
  { shadowColor: string; shadowOffset: { width: number; height: number };
    shadowOpacity: number; shadowRadius: number; elevation: number }
>;
const KEYS = ["shadowColor", "shadowOffset", "shadowOpacity", "shadowRadius", "elevation"];

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "__tests__" && entry !== "node_modules") sources(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      // A token file defines the steps; it does not bind to them. Without this the binder
      // rewrote elevation.ts into `soft: { ...elevation.soft }` and TypeScript reported a
      // block-scoped variable used before its own declaration.
      if (full !== join(SRC, "theme", "elevation.ts")) out.push(full);
    }
  }
  return out;
}

/** Comments and double-quoted strings blanked inside one object; see typeRampAdoption. */
function maskBlock(text: string, lo: number, hi: number): string {
  const out = text.split("");
  const blank = (a: number, b: number) => {
    for (let k = a; k < b; k++) if (out[k] !== "\n") out[k] = " ";
  };
  let i = lo;
  const n = hi + 1;
  while (i < n) {
    const c = text[i];
    const nx = i + 1 < n ? text[i + 1] : "";
    if (c === "/" && nx === "/") {
      let j = text.indexOf("\n", i);
      if (j === -1 || j > n) j = n;
      blank(i, j); i = j;
    } else if (c === "/" && nx === "*") {
      let j = text.indexOf("*/", i + 2);
      j = j === -1 || j + 2 > n ? n : j + 2;
      blank(i, j); i = j;
    } else if (c === '"') {
      let j = i + 1;
      while (j < n && text[j] !== '"') {
        if (text[j] === "\\") j++;
        j++;
      }
      blank(i, Math.min(j + 1, n)); i = Math.min(j + 1, n);
    } else i++;
  }
  return out.join("");
}

function enclosingBlock(text: string, idx: number): [number, number] | null {
  let depth = 0;
  let start = -1;
  for (let i = idx; i >= 0; i--) {
    const c = text[i];
    if (c === "}") depth++;
    else if (c === "{") {
      if (depth === 0) { start = i; break; }
      depth--;
    }
  }
  if (start < 0) return null;
  depth = 0;
  for (let j = start; j < text.length; j++) {
    if (text[j] === "{") depth++;
    else if (text[j] === "}") {
      depth--;
      if (depth === 0) return [start, j];
    }
  }
  return null;
}

type Shadow = {
  color: string | null; dy: number | null; opacity: number | null;
  radius: number | null; android: number | null;
};

/** Resolve to rendered values: the token alias and the literal are the same pixel. */
function readShadow(text: string, lo: number, hi: number): { s: Shadow; spread: string | null } {
  const masked = maskBlock(text, lo, hi);
  let depth = 0;
  const cuts: number[] = [];
  for (let i = lo; i <= hi; i++) {
    const c = masked[i];
    if (c === "{" || c === "[" || c === "(") depth++;
    else if (c === "}" || c === "]" || c === ")") depth--;
    else if (c === "," && depth === 1) cuts.push(i);
  }
  const props: Record<string, string> = {};
  let spread: string | null = null;
  let prev = lo + 1;
  for (const cut of [...cuts, hi]) {
    const segM = masked.slice(prev, cut);
    if (segM.trim()) {
      const sp = /\.\.\.\s*elevation\s*\.\s*(\w+)/.exec(segM);
      if (sp && STEPS[sp[1]]) {
        spread = sp[1];
        const t = STEPS[sp[1]];
        props.shadowColor = t.shadowColor;
        props.shadowOffset = `height: ${t.shadowOffset.height}`;
        props.shadowOpacity = String(t.shadowOpacity);
        props.shadowRadius = String(t.shadowRadius);
        props.elevation = String(t.elevation);
      } else {
        const mm = new RegExp(`(?:["']?)(${KEYS.join("|")})(?:["']?)\\s*:`).exec(segM);
        if (mm) {
          let v = prev + mm.index + mm[0].length;
          while (v < cut && (text[v] === " " || text[v] === "\t")) v++;
          props[mm[1]] = text.slice(v, cut).replace(/\/\/.*$/gm, "").trim();
        }
      }
    }
    prev = cut + 1;
  }
  const numOf = (v?: string) => {
    if (v === undefined) return null;
    return /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : null;
  };
  const colorOf = (v?: string) => {
    if (v === undefined) return null;
    const s = v.trim();
    if (s === "colors.shadowCast" || s === colors.shadowCast) return colors.shadowCast;
    const m = /^"(#[0-9A-Fa-f]{6})"$/.exec(s);
    return m ? m[1].toUpperCase() : s;
  };
  const dy = props.shadowOffset ? /height\s*:\s*(-?[\d.]+)/.exec(props.shadowOffset) : null;
  return {
    spread,
    s: {
      color: colorOf(props.shadowColor),
      dy: dy ? Number(dy[1]) : null,
      opacity: numOf(props.shadowOpacity),
      radius: numOf(props.shadowRadius),
      android: numOf(props.elevation)
    }
  };
}

/** The step this shadow reproduces exactly, if any. */
function stepFor(s: Shadow): string | null {
  if (s.color !== colors.shadowCast) return null;
  for (const [name, t] of Object.entries(STEPS)) {
    if (s.dy === t.shadowOffset.height && s.opacity === t.shadowOpacity &&
        s.radius === t.shadowRadius && s.android === t.elevation) {
      return name;
    }
  }
  return null;
}

const bound: string[] = [];
const handRolled: string[] = [];
const suppressions: string[] = [];
const reproducesAStep: string[] = [];

for (const file of sources(SRC)) {
  const text = readFileSync(file, "utf8");
  const seen = new Set<number>();
  const re = /\bshadow(?:Color|Opacity|Radius)\s*:|\.\.\.\s*elevation\s*\./g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const blk = enclosingBlock(text, m.index);
    if (!blk || seen.has(blk[0])) continue;
    seen.add(blk[0]);
    const { s, spread } = readShadow(text, blk[0], blk[1]);
    if (spread) { bound.push(`${file}:${spread}`); continue; }
    if (s.color === null && s.opacity === null && s.radius === null) continue;
    // A suppression — `shadowOpacity: 0` with nothing else — turns a token's shadow OFF on a
    // dimmed or disabled state. It names no depth of its own and is not a one-off.
    if (s.opacity === 0 && s.color === null && s.radius === null) { suppressions.push(file); continue; }
    handRolled.push(file);
    const step = stepFor(s);
    if (step) reproducesAStep.push(`${file} -> ${step} ${JSON.stringify(s)}`);
  }
}

/**
 * ⚠️ THESE TWELVE ARE NOT A BACKLOG OF THE SAME THING. Every shadow that reproduced a step
 * is bound; what is left genuinely differs, and one of them differs by almost nothing:
 *
 *   · (Resolved.) WelcomeScreen `secondary` was `soft` in every value except the cast colour —
 *     #12213A where the rest of the app casts #1F3A5F. It went with the lone "Continue with
 *     Google" button it styled, replaced by the shared SocialSignIn row, which uses the token.
 *     Thirteen became twelve by deletion, not by absorption.
 *   · ProfileScreen `card` is `card` except `elevation: 4` against the step's 6 — an
 *     Android-only difference, invisible on iOS, which is why it survived this long.
 *
 * Two more are shared pairs that could earn a step if the design wants them: AccountType and
 * ShelterTier both use (0,4)/.06/10, and SignupSuccess and PasswordChanged both use
 * (0,3)/.05/8. Two are deliberate suppressions (`shadowOpacity: 0`) and are correct as they
 * are. The rest are single-use. Absorbing any of them is a design call, not a bind.
 *
 * It may fall. It may not rise: a new screen typing its own shadow is the drift the token
 * exists to end.
 *
 * TEN, DOWN FROM TWELVE, AGAIN BY DELETION. Welcome's `primaryWrap` (0,4)/.14/7 and
 * VerifyResubmit's `submit` (0,4)/.12/8 were the shadows two hand-rolled primary buttons
 * cast. Both buttons are now `<Button>`, which draws the canvas's `.cta` — no shadow — so
 * there is nothing left to bind or to absorb.
 *
 * ZERO, AND A FLAT RULE FROM HERE. The ten were decided, not absorbed:
 *   · Welcome's logo tile — `#0B1F2A / (0,10) / .18 / 16` — was the right instinct with the
 *     wrong numbers. SignIn.dc.html draws the BRAND TILE with a shadow of its own, cast in
 *     forest and deeper than a card, and `elevation.brand` is that shadow, converted the way
 *     `deck` was. (The same artboard draws the tile at the squircle rule, which is why its
 *     radius left radiusAdoption's exemption list in the same change.)
 *   · ProfileScreen `card` was `card` except an Android-only elevation; it is `card`.
 *   · AccountType and ShelterTier's option rows, SignupSuccess and PasswordChanged's notice
 *     bars, the auth kit's input and AdjustPin's card were all lighter-than-`soft` variations
 *     on the same idea — (0,2–4) / .05–.12 / 6–10 — on exactly the elements the panel files
 *     under "inputs, chips, pills, small raised controls". They are `soft`.
 *   · Field's and Impact's `shadowOpacity: 0` are suppressions, not shadows, and are now
 *     recognised as such by rule (see the loop) rather than tolerated by count.
 */
const ONE_OFFS = 0;

describe("screens take depth from the theme", () => {
  it("found shadows to classify", () => {
    // Guard the guard: scans in this repo have reported a plausible smaller number more
    // than once, and a guard that matches nothing passes forever.
    // Floors, not targets: hand-rolled fields and buttons carried their own `...card` and
    // `...elevation.soft` until they became Field and Button, which shadow once each.
    // 79, DOWN FROM 80 — A3 removed the local `const card = { ...elevation.soft }` object
    // DonateScreen, DonatePledgeScreen and MyDonationsScreen each spread into a View style;
    // their surfaces are <Card> now, which owns elevation.card internally, off this scan.
    // Each removed local `...elevation.soft` spread was itself a "bound" site, so `bound`
    // drops by 3. The floor moves down with them.
    // 2026-09-15 — A4 (shelter volunteer) removed nine more local `const card = { ...elevation.soft }`
    // objects, one per ShelterVolunteerScreen/Create/Edit/Detail/Requests/Attendance/Calendar/
    // Activity/Cancel: each screen's list-row or summary surface is <Card> now (Create's and
    // Edit's small 48pt activity-type filter chip kept its flat white pill styling instead —
    // Card's own padding/radius don't fit a fixed-height selector control, so it just lost its
    // shadow rather than becoming <Card>). 79 -> 70. Both floors below move down with it.
    // 2026-09-15 — A6 (Sagip rescuer, the last A-story) removed five more local
    // `const card = { ...elevation.soft }` objects: MyRescuesScreen, MyOffersScreen,
    // RescueMapScreen, RescueOfferScreen and RescueUpdateScreen — each screen's list-row or
    // option-row surface is <Card> now. 70 -> 62 (bound). The floor below moves down with it.
    // P5 Task 3 (K24/K26) removed four more: KawangGawaScreen, KawangGawaDetailScreen,
    // KawangGawaCheckinScreen and WaiverScreen — each screen's list-row/hero/facts/notice
    // surface is <Card> now (KawangGawaCancelScreen and KawangGawaRequestedScreen had none
    // to remove). 60 -> 56. Both floors below move down with them.
    // 2026-11-10 — Stories review step 12 removed StoriesScreen's local `const card = { ...elevation.soft }` (its cards are <Card> now). 52 -> 51; both floors move down with it.
    expect(bound.length).toBeGreaterThan(50);
    // 2026-11-05 — Impact & badges review step 10 removed two more local `const card = { ...elevation.soft }` objects:
    // ImpactScreen's and BadgeDetailScreen's, whose surfaces are <Card> now. 55 -> 53; the floor moves down with them.
    expect(bound.length + handRolled.length).toBeGreaterThan(50);
  });

  it("leaves no hand-rolled shadow that reproduces a step exactly", () => {
    expect(reproducesAStep).toEqual([]);
  });

  it("has not grown a new one-off shadow", () => {
    expect(handRolled.length).toBeLessThanOrEqual(ONE_OFFS);
  });

  it("records the remaining one-offs rather than absorbing them", () => {
    expect(handRolled.length).toBe(ONE_OFFS);
  });

  it("sees the one suppression as a suppression, and no more than one", () => {
    // 2026-11-05 — Impact review step 7 (V7): ImpactScreen's flat grey unearned tile (`badgeTileDim`, `shadowOpacity: 0`) is
    // gone. Unearned badges are now the near-win card and the Keep going rows, so the screen has no suppression left.
    // 2 -> 1; the floor moves with what was removed.
    expect(suppressions.map((f) => f.replace(/^.*\/src\//, "src/")).sort()).toEqual([
      "src/components/ui/Field.tsx"
    ]);
  });

  it("counts the call, not the import", () => {
    // ⚠️ Two guards this sprint passed on an unused import.
    const importOnly =
      'import { elevation } from "../theme";\nconst s = { shadowOpacity: 0.08 };';
    const blk = enclosingBlock(importOnly, importOnly.indexOf("shadowOpacity"))!;
    expect(readShadow(importOnly, blk[0], blk[1]).spread).toBeNull();
  });

  it("reads the alias and the literal as the same pixel", () => {
    const viaToken = '{ shadowColor: colors.shadowCast, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 7, elevation: 2 }';
    const viaHex = '{ shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 7, elevation: 2 }';
    const read = (src: string) => {
      const blk = enclosingBlock(src, src.indexOf("shadowColor"))!;
      return readShadow(src, blk[0], blk[1]).s;
    };
    expect(read(viaToken)).toEqual(read(viaHex));
    expect(stepFor(read(viaHex))).toBe("soft");
  });

  it("does not mistake a near miss for the step", () => {
    // ProfileScreen's card: right on iOS, one step off on Android. A textual scan that
    // ignored `elevation` would have bound it and changed how it renders on Android.
    const near = '{ shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 }';
    const blk = enclosingBlock(near, near.indexOf("shadowColor"))!;
    expect(stepFor(readShadow(near, blk[0], blk[1]).s)).toBeNull();
  });
});
