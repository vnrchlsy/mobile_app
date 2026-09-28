/**
 * P5 Task 2 — the volunteer side matches its two new anchor artboards
 * (VolunteerHub.dc.html, ShiftDetail.dc.html) added to design/mobile-v3 in the
 * companion library PR #51 (docs/canvas-volunteer-anchors).
 *
 * Same convention as shelterShellParity.test.ts: walk up from this file looking for
 * design/mobile-v3, and describe.skip + console.warn (not fail) when it isn't there —
 * the guard is advisory until the artboards ship, never a false red for a checkout
 * (e.g. CI) that simply doesn't have the sibling library repo laid out alongside it.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

const SRC = join(__dirname, "..");

function findCanvasDir(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const c = join(dir, "design", "mobile-v3", "VolunteerHub.dc.html");
    if (existsSync(c)) return join(dir, "design", "mobile-v3");
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const canvasDir = findCanvasDir();
const readCanvas = (file: string) => readFileSync(join(canvasDir as string, file), "utf8");
const describeParity = canvasDir ? describe : describe.skip;
if (!canvasDir) {
  // eslint-disable-next-line no-console
  console.warn("[volunteerParity] design/mobile-v3 not found — parity assertions skipped, not failed.");
}

// data-fact="key" content="value" — the same marker convention across every anchor artboard.
const facts = (html: string) =>
  Object.fromEntries(
    [...html.matchAll(/data-fact="([^"]+)"\s+content="([^"]*)"/g)].map((m) => [m[1], m[2]])
  );

describeParity("the volunteer side matches its anchor artboards", () => {
  // Lazy — Jest still executes a `describe.skip` body to collect its `it`s, so a call here
  // (rather than inside each `it`) would run `readCanvas` against a null `canvasDir` even
  // when the suite is skipped. Same convention as shelterShellParity.test.ts, which reads
  // inside each `it` for the same reason.
  const hub = () => facts(readCanvas("VolunteerHub.dc.html"));
  const detail = () => facts(readCanvas("ShiftDetail.dc.html"));
  const src = (f: string) => readFileSync(join(SRC, f), "utf8");

  it("hub segments and filter labels", () => {
    const h = hub();
    expect(h.segments).toBe("Browse,My shifts");
    const screen = src("screens/KawangGawaScreen.tsx");
    expect(screen).toContain('segments={["Browse", "My shifts"]}');
    const vol = src("volunteer.ts");
    for (const label of h.filters.split(",").slice(1)) expect(vol).toContain(`"${label}"`);
  });

  it("my-shifts sections, in order", () => {
    // The artboard's `my-sections` marker names buckets (Requested/Upcoming/Past); the
    // on-V3 rule is that copy doesn't change, and MyShifts.tsx already ships the section
    // headings "Awaiting approval" / "Upcoming shifts" / "Shift history" (verified against
    // src/components/volunteer/MyShifts.tsx before writing this map) — so map bucket name
    // to shipped heading rather than asserting the marker's own words appear verbatim.
    const HEADING_FOR: Record<string, string> = {
      Requested: "Awaiting approval",
      Upcoming: "Upcoming shifts",
      Past: "Shift history",
    };
    const my = src("components/volunteer/MyShifts.tsx");
    const order = hub()["my-sections"]
      .split(",")
      .map((bucket: string) => my.indexOf(HEADING_FOR[bucket]));
    expect(order.every((i: number) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("every status chip uses the artboard's tone", () => {
    const vol = src("volunteer.ts");
    for (const pair of hub()["status-chips"].split(",")) {
      const [label, tone] = pair.split(":");
      expect(vol).toMatch(new RegExp(`label: "${label}", tone: "${tone}"`));
    }
  });

  it("detail sections and consents", () => {
    const d = detail();
    const screen = src("screens/KawangGawaDetailScreen.tsx");
    for (const title of d.sections.split(",")) expect(screen).toContain(title);
    expect(d.consents).toBe("waiver:required,contact:optional");
    expect(screen).toContain("Optional.");
  });

  // P5 Task 3 · the six screens are on ScreenBackdrop and off elevation.soft — flipped
  // back from it.failing now that the conversion has landed.
  it("the volunteer screens are on V3 surfaces", () => {
    for (const f of ["KawangGawaScreen", "KawangGawaDetailScreen", "KawangGawaRequestedScreen",
                     "KawangGawaCancelScreen", "KawangGawaCheckinScreen", "WaiverScreen"]) {
      const s = src(`screens/${f}.tsx`);
      expect(s).toContain("<ScreenBackdrop");
      expect(s).not.toMatch(/elevation\.soft/);
    }
  });
});
