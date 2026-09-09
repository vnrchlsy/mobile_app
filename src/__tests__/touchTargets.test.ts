/**
 * §13.4 / design-system non-negotiable · every control is at least 44 pt tall.
 *
 * FOUND BY FAILING TO PRESS THEM. During the 2026-09-04 exit-criteria device walk,
 * "Browse as a guest" on the welcome screen took four attempts, and Home's "See nearby
 * strays" registered at y=344 and missed at y=349. Both are a bare <Text> inside a
 * TouchableOpacity with no hitSlop, no minHeight and no vertical padding — roughly 17–21 pt
 * of target against a 44 pt minimum.
 *
 * ⚠️ WHY US-U1's GUARD COULD NOT CATCH THIS. `accessibility.test.ts` scans for a missing
 * `accessibilityLabel`. Every control here is perfectly labelled. **A control can be
 * perfectly labelled and still be too small to press** — they are independent failures, and
 * a screen reader user relying on direct touch is hit by both at once.
 *
 * The check is STRUCTURAL rather than pixel-arithmetic: a text-only touchable must DECLARE
 * an adequate target — `hitSlop`, or a `minHeight`/`height` of 44+, or enough vertical
 * padding. Estimating rendered text height from fontSize would be fragile and would argue
 * about 43 vs 44; requiring an explicit declaration is what a reviewer would ask for anyway.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SRC = join(__dirname, "..");
const MIN_TARGET = 44;
/** Half the shortfall on each side is enough: ~18 pt of text + 2×13 clears 44. */
const MIN_SLOP = 12;

/**
 * A text-only touchable: the shape that renders no box of its own, so it gets no size.
 *
 * ⚠️ TWO THINGS THIS REGEX HAD TO LEARN, and the first one is a repeat offence in this
 * codebase (see US-U1: "never regex JSX"):
 *
 *   `(?:=>|[^>])` — an attribute list cannot be `[^>]*`, because `onPress={() => …}`
 *   contains a `>`. A naive matcher ends the tag at the arrow and silently matches nothing
 *   for the majority of controls. The first version of THIS FILE missed both of the
 *   controls that motivated it, and reported a tidy 8 failures instead of the real number.
 *
 *   `[^<]*` for the label — the text is usually `{copy.thing}`, not a literal, so excluding
 *   `{` excluded most real buttons.
 *
 * A scan that under-reports is worse than no scan: it produces a short, credible list and
 * an impression of coverage.
 */
const TEXT_ONLY_TOUCHABLE =
  /<(TouchableOpacity|Pressable)\b((?:=>|[^>])*?)>\s*<Text\b((?:=>|[^>])*)>[^<]*<\/Text>\s*<\/(?:TouchableOpacity|Pressable)>/gs;

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** The numeric value of `key` inside the `styles.<name>` object, if declared. */
function styleNumber(src: string, styleName: string, key: string): number | null {
  const block = new RegExp(`\\b${styleName}\\s*:\\s*\\{([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)\\}`, "s")
    .exec(src);
  if (!block) return null;
  const m = new RegExp(`\\b${key}\\s*:\\s*(\\d+(?:\\.\\d+)?)`).exec(block[1]);
  return m ? parseFloat(m[1]) : null;
}

/**
 * Does this touchable declare a target a thumb can actually hit?
 *
 * Three outcomes, and the middle one matters: this codebase sizes most controls with a
 * COMPUTED value (`height: sy(86)`), which a static scan cannot evaluate. Treating that as
 * a failure would bury the real defects under dozens of false alarms and the check would be
 * deleted within a week. So:
 *
 *   declared numerically and >= 44 (or padding/hitSlop enough)  -> pass
 *   declared but computed (`sy(...)`, a variable)               -> pass, assumed deliberate
 *   declared numerically and < 44                               -> FAIL (e.g. a 34x34 icon)
 *   nothing declared at all                                     -> FAIL (the real bug here:
 *       a bare <Text> in a TouchableOpacity is exactly as tall as its line, ~17-21 pt)
 */
function declaresAdequateTarget(src: string, attrs: string): boolean {
  const slop = /hitSlop\s*=\s*\{\s*(\d+)/.exec(attrs)
    ?? /hitSlop\s*=\s*\{\{[^}]*?(?:vertical|top)\s*:\s*(\d+)/.exec(attrs);
  if (slop) return parseFloat(slop[1]) >= MIN_SLOP;
  if (/hitSlop/.test(attrs)) return true;              // computed slop — assume deliberate

  // Every style source that applies to this element: the inline object(s) in the JSX, plus
  // the body of each `styles.X` it references.
  const bodies: string[] = [attrs];
  for (const ref of attrs.matchAll(/styles\.([A-Za-z0-9_]+)/g)) {
    const block = new RegExp(`\\b${ref[1]}\\s*:\\s*\\{([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)\\}`, "s")
      .exec(src);
    if (block) bodies.push(block[1]);
  }

  let declared = false;
  for (const body of bodies) {
    for (const key of ["minHeight", "height", "paddingVertical", "padding"]) {
      const m = new RegExp(`\\b${key}\\s*:\\s*([^,}\\n]+)`).exec(body);
      if (!m) continue;
      declared = true;
      const n = parseFloat(m[1]);
      if (Number.isNaN(n)) return true;                // computed — cannot judge, allow
      const floor = key.startsWith("padding") ? MIN_SLOP : MIN_TARGET;
      if (n >= floor) return true;
    }
  }
  // Either nothing was declared (a bare <Text> is as tall as its line, ~17-21 pt) or every
  // declared value was numerically too small (e.g. a 34x34 icon button). Both fail.
  void declared;
  return false;
}

function offenders(file: string): number {
  const raw = readFileSync(file, "utf8");
  const src = stripComments(raw);
  let n = 0;
  for (const m of src.matchAll(TEXT_ONLY_TOUCHABLE)) {
    if (!declaresAdequateTarget(src, m[2])) n++;
  }
  return n;
}

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : tsxFiles(full);
    return e.isFile() && e.name.endsWith(".tsx") ? [full] : [];
  });
}

const FILES = tsxFiles(SRC);

describe("every text-only control declares a 44 pt target", () => {
  it("finds files to scan", () => {
    // Without this, a broken directory walk would scan nothing and the suite would pass
    // empty — the same silent-coverage failure this file exists to prevent elsewhere.
    expect(FILES.length).toBeGreaterThan(20);
  });

  it.each(FILES)("%s", (file: string) => {
    expect(offenders(file)).toBe(0);
  });
});
