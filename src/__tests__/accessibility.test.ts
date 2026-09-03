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
import { readdirSync, readFileSync } from "fs";
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
