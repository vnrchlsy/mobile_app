/**
 * US-X2 · every selector the Maestro flows use must exist in the app.
 *
 * WHY THIS EXISTS. The E2E suite runs pre-release, on a simulator, against a real backend —
 * so between one release and the next NOTHING checks it. A renamed testID, a deleted button,
 * a screen that stopped being reachable: all of them sit green in every PR and surface as a
 * pile of failures on the day someone is trying to ship. That is the failure mode that gets
 * an E2E suite deleted rather than fixed.
 *
 * This runs in the normal unit suite, in milliseconds, with no simulator, and catches the
 * single most common way these suites rot: the flows and the app drifting apart.
 *
 * ⚠️ WHAT THIS IS NOT. It does NOT prove the flows pass, that the screens are reachable in
 * the order the flow assumes, or that the app works at all. It proves the flows are talking
 * about controls that exist. Reading it as "E2E is covered" would be exactly the
 * over-claiming this sprint keeps finding — say "the selectors are wired", nothing more.
 */
import { readdirSync, readFileSync } from "fs";
import { loadAll } from "js-yaml";
import { join } from "path";

const SRC = join(__dirname, "..");
const FLOWS = join(SRC, "..", "e2e", "flows");

/** Every .yaml flow on disk — derived, never a list in this file (US-G1). */
const FLOW_FILES = readdirSync(FLOWS).filter((f) => f.endsWith(".yaml"));

/** Every source file that could carry a testID. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(join(dir, e.name))
      : e.name.endsWith(".tsx") || e.name.endsWith(".ts") ? [join(dir, e.name)]
      : []);
}
const SOURCE = sourceFiles(SRC).map((f) => readFileSync(f, "utf8")).join("\n");

/**
 * testIDs the app defines. Two shapes, and the second is the one a naive scan misses:
 * a literal `testID="screen.home"`, and a template `testID={`card.adopt.${i}`}` whose value
 * is only known at runtime. For templates we keep the static prefix and match on that, or
 * an indexed card selector would look undefined and this guard would cry wolf on every run
 * until someone switched it off.
 */
const LITERALS = new Set(
  [...SOURCE.matchAll(/testID="([^"]+)"/g)].map((m) => m[1]));
const PREFIXES = [...SOURCE.matchAll(/testID=\{`([^`$]*)\$\{/g)].map((m) => m[1]);

function isDefined(selector: string): boolean {
  return LITERALS.has(selector) || PREFIXES.some((p) => p !== "" && selector.startsWith(p));
}

/** Every `id: "..."` a flow refers to, with the flow it came from. */
const REFERENCES: Array<{ flow: string; id: string }> = FLOW_FILES.flatMap((flow) =>
  [...readFileSync(join(FLOWS, flow), "utf8").matchAll(/^\s*id:\s*"([^"]+)"/gm)]
    .map((m) => ({ flow, id: m[1] })));

describe("the scan has a scope", () => {
  it("found flow files", () => {
    expect(FLOW_FILES.length).toBeGreaterThan(0);
  });

  it("found selectors inside them", () => {
    // A flow rewritten to select purely by visible text would empty this array and leave
    // every assertion below passing over nothing.
    expect(REFERENCES.length).toBeGreaterThan(10);
  });

  it("found testIDs in the app to match against", () => {
    expect(LITERALS.size).toBeGreaterThan(20);
  });
});

describe("every flow is valid YAML", () => {
  it.each(FLOW_FILES)("%s parses", (flow) => {
    // The selector scan below is regex-based and would happily read ids out of a file
    // Maestro cannot parse at all — so a broken flow would sit green here and fail in the
    // pre-release gate, which is precisely the ship-day pile this guard exists to prevent.
    expect(() => loadAll(readFileSync(join(FLOWS, flow), "utf8"))).not.toThrow();
  });
});

describe("every flow selector exists in the app", () => {
  it.each(REFERENCES)("$flow → $id", ({ id }) => {
    expect(isDefined(id)).toBe(true);
  });
});

describe("the flows reference every screen anchor they need", () => {
  it("names each anchor as screen.<route>, matching the navigator", () => {
    // The anchor doubles as documentation of which route you are on, so a mismatch between
    // the anchor and the Stack.Screen name makes a failing flow point at the wrong screen.
    const routes = new Set(
      [...readFileSync(join(SRC, "navigation", "RootNavigator.tsx"), "utf8")
        .matchAll(/name="([a-zA-Z]+)"/g)].map((m) => m[1]));
    const anchors = [...LITERALS].filter((id) => id.startsWith("screen."));
    expect(anchors.length).toBeGreaterThan(10);
    const unknown = anchors.filter((a) => !routes.has(a.slice("screen.".length)));
    expect(unknown).toEqual([]);
  });
});

describe("no credential is committed in a flow", () => {
  it.each(FLOW_FILES)("%s passes secrets by environment variable only", (flow) => {
    const src = readFileSync(join(FLOWS, flow), "utf8");
    // `inputText` lines that feed a password or email field must interpolate, never inline.
    // A real credential committed here would be a leak that outlives the branch it was on,
    // and the reason it would happen is convenience during a debugging session.
    const inputs = [...src.matchAll(/^\s*-?\s*inputText:\s*(.+)$/gm)].map((m) => m[1].trim());
    // An interpolated `${VAR}` is the correct shape and is never suspicious — the first
    // version of this flagged `${MAESTRO_PASSWORD}` itself, which would have taught the
    // next person that the guard cries wolf. Only a LITERAL value can be a leak.
    const suspicious = inputs.filter(
      (v) => !v.startsWith("${") && (/@/.test(v) || /pass|pwd|secret|token/i.test(v)));
    expect(suspicious).toEqual([]);
  });
});
