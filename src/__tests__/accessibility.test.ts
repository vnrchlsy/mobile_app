// US-U1 · the accessibility regression net (§13.4).
//
// WHY A SOURCE SCAN RATHER THAN RENDERED ASSERTIONS. React Native already derives an
// accessibility label from a touchable's child `<Text>`, so a button reading "Send report" is
// announced correctly with no extra props. The real gap — and the one this project actually
// had — is **icon-only controls**: a floating circle whose only content is a "‹" glyph is
// announced as nothing, or as "left single quotation mark". That was the primary way back out
// of 49 screens.
//
// A renderer-based test would cover a handful of screens deeply. This covers EVERY screen for
// the one defect that matters, needs no new dependency, and cannot rot: a new icon-only
// button without a label fails here the moment it is written.
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const COMPONENTS = join(__dirname, "..", "components");

/** Glyph characters used as icons. None of these means anything read aloud. */
const GLYPHS = /[‹›×✓✕→←·⌄⌃…]/gu;

type Control = { file: string; snippet: string; hasLabel: boolean; hasWords: boolean };

/**
 * Pull out every `<TouchableOpacity …>…</TouchableOpacity>` (and Pressable) with its body.
 * Deliberately simple: nested touchables are rare here and a missed one only costs coverage,
 * never a false failure.
 */
function controlsIn(file: string, source: string): Control[] {
  const out: Control[] = [];
  const open = /<(TouchableOpacity|Pressable)\b/g;
  let m: RegExpExecArray | null;
  while ((m = open.exec(source))) {
    const tag = m[1];
    const close = source.indexOf(`</${tag}>`, m.index);
    const selfClose = source.indexOf("/>", m.index);
    const end = close === -1 ? (selfClose === -1 ? source.length : selfClose) : close;
    const block = source.slice(m.index, end);

    const hasLabel = /accessibilityLabel[=\s]/.test(block);
    // Does any child <Text> carry real words? Strip glyphs first, then look for two or more
    // letters — "›" and "✓" are not words, and neither is a single letter.
    const texts = [...block.matchAll(/<Text\b[^>]*>([\s\S]*?)<\/Text>/g)].map((t) => t[1]);
    // A control can also get its words from a child COMPONENT that renders them — e.g.
    // `<Row label="Donation QR" …/>`. React Native still derives the announcement from the
    // text that component renders, so treating these as unlabeled would be a false alarm
    // that pushes people to add redundant props.
    const componentLabels = [...block.matchAll(/\blabel=(?:"([^"]+)"|\{`([^`]+)`\})/g)]
      .map((m2) => m2[1] ?? m2[2] ?? "");
    const words = [...texts, ...componentLabels].join(" ").replace(GLYPHS, " ");
    const hasWords = /[A-Za-z]{2,}/.test(words);

    out.push({ file, snippet: block.slice(0, 90).replace(/\s+/g, " "), hasLabel, hasWords });
  }
  return out;
}

function scan(dir: string): Control[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".tsx"))
    .flatMap((f) => controlsIn(f, readFileSync(join(dir, f), "utf8")));
}

/**
 * D-S7-5 · the accessibility pass is depth-first on the welfare-critical paths, not
 * breadth-first across every screen. These are the files that gate is enforced on; the rest
 * are reported (below) but do not fail the build, so the gate stays honest about its own
 * scope instead of pretending the whole app is covered.
 */
const CRITICAL = [
  "ReportStrayScreen.tsx",       // file a report — the welfare-critical write
  "AdjustPinScreen.tsx",         // the precise-pin exception (§12.5)
  "ReportSentScreen.tsx",
  "MyReportsScreen.tsx",         // where a queued report is retried or discarded (US-O3)
  "ReportDetailScreen.tsx",
  "RescueOfferScreen.tsx",       // the commitment ladder
  "SettingsScreen.tsx",          // the §12.6 data rights
  "SettingsPrivacyScreen.tsx",
  "DeleteAccountScreen.tsx",
  "ExportDataScreen.tsx",
  "WaiverScreen.tsx",            // consent before a volunteer shift
];

/**
 * US-G1 · the scan has a scope, and the scope is real.
 *
 * Neither of these existed until Sprint 8, and both close a way this file could pass while
 * checking nothing:
 *
 *   `scan()` returning [] — a moved directory or a changed extension leaves every
 *   assertion below filtering an empty array. Vacuously green.
 *
 *   A GHOST NAME in CRITICAL — `it.each` still runs for a file that no longer exists,
 *   `screens.filter(c => c.file === file)` returns [], and the test passes having checked
 *   a file that isn't there. This is not hypothetical: `loadStateScreens.test.ts` carried
 *   exactly that bug (a hand-typed "AdoptBrowseScreen.tsx" that never existed) and its
 *   remainder count was wrong by 8x for a whole sprint as a result.
 *
 * ⚠️ CRITICAL stays hand-written ON PURPOSE — D-S7-5 makes this gate depth-first on the
 * welfare-critical paths rather than breadth-first across the app, and that scope is a
 * decision, not an oversight. What was missing is any check that the decision still points
 * at real files.
 */
describe("the scan has a scope", () => {
  it("found controls to check", () => {
    expect(scan(SCREENS).length).toBeGreaterThan(50);
    expect(scan(COMPONENTS).length).toBeGreaterThan(0);
  });

  it("every CRITICAL screen still exists", () => {
    const ghosts = CRITICAL.filter((f) => !existsSync(join(SCREENS, f)));
    expect(ghosts).toEqual([]);
  });
});

describe("icon-only controls are announced", () => {
  const screens = scan(SCREENS);
  const components = scan(COMPONENTS);

  it.each(CRITICAL)("%s labels every icon-only control", (file) => {
    const unlabeled = screens.filter(
      (c) => c.file === file && !c.hasLabel && !c.hasWords);
    expect(unlabeled.map((c) => c.snippet)).toEqual([]);
  });

  it("the shared components label theirs — they are on every screen at once", () => {
    const unlabeled = components.filter((c) => !c.hasLabel && !c.hasWords);
    expect(unlabeled.map((c) => `${c.file}: ${c.snippet}`)).toEqual([]);
  });

  it("the back button is labelled wherever a screen draws its own", () => {
    // 49 screens shared one copy-pasted floating "‹" circle — the single most repeated
    // unusable control in the app.
    //
    // Screens that delegate back to a shared header (AuthHeader / SimpleHeader) are covered
    // by that component instead, and are excluded: requiring the literal string in every
    // file would reward copy-paste over reuse, which is the opposite of the point.
    const files = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx"));
    const missing = files.filter((f) => {
      const src = readFileSync(join(SCREENS, f), "utf8");
      const drawsItsOwn = /onPress=\{\(\) => navigation\.goBack\(\)\}[^\n]*style=/.test(src);
      return drawsItsOwn && !src.includes('accessibilityLabel="Go back"');
    });
    expect(missing).toEqual([]);
  });
});

describe("coverage report (informational, never fails)", () => {
  it("reports how much of the app is still unlabeled", () => {
    const all = [...scan(SCREENS), ...scan(COMPONENTS)];
    const iconOnly = all.filter((c) => !c.hasWords);
    const unlabeled = iconOnly.filter((c) => !c.hasLabel);
    // Printed so the number is visible in CI and the next person can see the remainder
    // shrinking, rather than discovering the scope of it from scratch.
    // eslint-disable-next-line no-console
    console.log(
      `[a11y] icon-only controls: ${iconOnly.length}, still unlabeled: ${unlabeled.length}` +
      ` (${all.length} controls total)`);
    expect(all.length).toBeGreaterThan(0);
  });
});

// ── US-W1 · an action nested inside an accessible container must be reachable ────────
//
// iOS FLATTENS an accessible container into a single element. So a card that carries
// `accessibilityRole="button"` and contains a second tappable thing does not present two
// actions to VoiceOver — it presents one, and the inner action is not merely awkward to
// reach, it is ABSENT. On the Kawang-Gawa schedule that was the Cancel link: a volunteer
// using a screen reader could open a shift and had no way to cancel one.
//
// `labelled ≠ navigable` is the whole point of US-W1, and this is the one part of it a
// machine can check. It cannot tell you whether the reading order makes sense or whether a
// modal traps focus — a person still has to walk it.
//
// ⚠️ THIS SCAN MISSED THE ONE SITE IT WAS WRITTEN FOR, TWICE, BEFORE IT WORKED.
//   1. It matched only literal <TouchableOpacity>; the real site nests <CancelLink/>, a
//      custom component. Fixed by looking for a nested `onPress` rather than a nested tag.
//   2. It found the tag's closing `>` with indexOf, which stops at the `>` inside
//      `onPress={() => nav()}` — truncating the attributes before `accessibilityLabel`, so
//      the container read as non-accessible and the site was skipped. NEVER REGEX JSX; the
//      tag end has to be found at brace depth 0.
// Both times the scan reported ZERO and looked like good news.
describe("nested actions inside an accessible container", () => {
  const OPEN = /<(TouchableOpacity|TouchableHighlight|Pressable)\b/g;
  const CLOSE = /<\/(TouchableOpacity|TouchableHighlight|Pressable)>/g;

  /** Index of the `>` that ends this tag, ignoring any inside `{...}`. */
  function tagEnd(src: string, i: number): number {
    let depth = 0;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) return i;
    }
    return -1;
  }

  function containers(src: string): Array<{ attrs: string; inner: string }> {
    const out: Array<{ attrs: string; inner: string }> = [];
    for (const m of src.matchAll(OPEN)) {
      const gt = tagEnd(src, m.index! + m[0].length);
      if (gt === -1) continue;
      const attrs = src.slice(m.index! + m[0].length, gt);
      if (attrs.trimEnd().endsWith("/")) continue;      // self-closing: no children
      let depth = 1;
      let i = gt + 1;
      while (depth > 0 && i < src.length) {
        OPEN.lastIndex = i; CLOSE.lastIndex = i;
        const o = OPEN.exec(src); const c = CLOSE.exec(src);
        if (!c) break;
        if (o && o.index < c.index) {
          const g2 = tagEnd(src, o.index + o[0].length);
          if (g2 !== -1 && !src.slice(o.index + o[0].length, g2).trimEnd().endsWith("/")) depth++;
          i = o.index + o[0].length;
        } else {
          depth--; i = c.index + c[0].length;
        }
      }
      out.push({ attrs, inner: src.slice(gt + 1, i) });
    }
    return out;
  }

  /** Every .tsx under screens/ and components/, with comments stripped. */
  const files: Array<{ name: string; src: string }> = [SCREENS, COMPONENTS].flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => ({
        name: f,
        src: readFileSync(join(dir, f), "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, ""),
      })));

  it("has files to scan", () => {
    // The scan below returned zero twice while being wrong. A zero that means "found
    // nothing to look at" must never be able to pass as "found nothing wrong".
    expect(files.length).toBeGreaterThan(50);
  });

  it("finds accessible containers at all", () => {
    // The second failure mode specifically: brace-blind tag parsing made every container
    // with an inline arrow handler look non-accessible, so the whole scan silently emptied.
    const accessible = files.flatMap(({ src }) => containers(src)).filter(
      ({ attrs }) =>
        attrs.includes("accessibilityLabel") || attrs.includes('accessibilityRole="button"'));
    expect(accessible.length).toBeGreaterThan(30);
  });

  it("exposes every nested action through accessibilityActions", () => {
    const offenders: string[] = [];
    for (const { name: file, src } of files) {
      for (const { attrs, inner } of containers(src)) {
        const accessible =
          attrs.includes("accessibilityLabel") || attrs.includes('accessibilityRole="button"');
        if (!accessible || attrs.includes("accessibilityActions")) continue;
        if (/\bonPress[=\s]*[={]/.test(inner)) offenders.push(file);
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });
});
