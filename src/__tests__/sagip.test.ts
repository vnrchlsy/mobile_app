import { MyReport, RescueCaseSummary } from "../api/types";
import { advanceableStatuses, offerStatusChip, pickSpotlight, relTime, sagipTitle, strayChip } from "../sagip";

describe("strayChip (only unclaimed is amber — the app's 'someone must act' colour)", () => {
  it("maps each status to a labelled tone", () => {
    expect(strayChip("reported")).toEqual({ label: "Reported", tone: "amber" });
    expect(strayChip("claimed")).toEqual({ label: "Claimed", tone: "teal" });
    expect(strayChip("rescued").tone).toBe("green");
    expect(strayChip("safe").tone).toBe("green");
    expect(strayChip("resolved").tone).toBe("grey");
  });
});

describe("sagipTitle", () => {
  it("formats species and condition into the card title", () => {
    expect(sagipTitle("dog", "injured")).toBe("Dog · Injured");
    expect(sagipTitle("cat", "pregnant")).toBe("Cat · Pregnant");
  });
});

describe("advanceableStatuses (US-K2 — forward-only, but not one-step-only)", () => {
  it("offers every remaining forward status, not just the next one", () => {
    expect(advanceableStatuses("claimed")).toEqual(["rescued", "safe", "resolved"]);
    expect(advanceableStatuses("rescued")).toEqual(["safe", "resolved"]);
    expect(advanceableStatuses("safe")).toEqual(["resolved"]);
  });

  it("resolved is terminal — nothing left to advance to", () => {
    expect(advanceableStatuses("resolved")).toEqual([]);
  });

  it("a report that was never claimed has no case to advance", () => {
    expect(advanceableStatuses("reported")).toEqual([]);
  });
});

describe("offerStatusChip (decision 14 — no amber; that's the report's job, not an offer's)", () => {
  it("maps each offer status to a labelled, never-amber tone", () => {
    expect(offerStatusChip("open")).toEqual({ label: "Open", tone: "teal" });
    expect(offerStatusChip("matched")).toEqual({ label: "Matched", tone: "green" });
    expect(offerStatusChip("expired")).toEqual({ label: "Expired", tone: "grey" });
  });
});

describe("relTime", () => {
  const now = new Date("2026-08-15T10:00:00Z").getTime();
  it("formats minutes, hours, and just-now", () => {
    expect(relTime("2026-08-15T09:40:00Z", now)).toBe("20 min ago");
    expect(relTime("2026-08-15T07:00:00Z", now)).toBe("3 h ago");
    expect(relTime("2026-08-15T09:59:40Z", now)).toBe("just now");
  });
});

// ── Home's spotlight ────────────────────────────────────────────────────────────────
const T0 = new Date("2026-09-09T12:00:00Z").getTime();
const iso = (hoursAgo: number) => new Date(T0 - hoursAgo * 3600_000).toISOString();

function aCase(over: Partial<RescueCaseSummary> = {}): RescueCaseSummary {
  return {
    case_id: "c1",
    report: { report_id: "r1", species: "dog", condition: "injured", city: "Marikina" },
    status: "claimed", claimed_at: iso(2), expired_at: null, ...over
  };
}
function aReport(over: Partial<MyReport> = {}): MyReport {
  return {
    report_id: "r9", species: "cat", condition: "healthy",
    status: "reported", city: "Marikina", created_at: iso(3), ...over
  };
}

describe("pickSpotlight — the one thing waiting on you", () => {
  it("returns null when there is genuinely nothing open", () => {
    expect(pickSpotlight([], [])).toBeNull();
  });

  it("prefers your own claimed case over your own unclaimed report", () => {
    // The case is work you owe an animal you took custody of; the report is you waiting
    // on someone else. Even when the report is NEWER, the case wins.
    const s = pickSpotlight([aCase({ claimed_at: iso(48) })], [aReport({ created_at: iso(1) })]);
    expect(s?.kind).toBe("case");
    expect(s?.eyebrow).toBe("Your open case");
  });

  it("ignores an expired claim — that animal went back to the pool", () => {
    const s = pickSpotlight([aCase({ expired_at: iso(1) })], [aReport()]);
    expect(s?.kind).toBe("report");
  });

  it("ignores a resolved case", () => {
    expect(pickSpotlight([aCase({ status: "resolved" })], [])).toBeNull();
  });

  it("takes the most recently claimed of several active cases", () => {
    const s = pickSpotlight(
      [aCase({ case_id: "old", claimed_at: iso(50) }), aCase({ case_id: "new", claimed_at: iso(4) })], []);
    expect(s?.caseId).toBe("new");
  });

  it("names the handoff, not the screen, once a case is safe", () => {
    expect(pickSpotlight([aCase({ status: "safe" })], [])?.nextStep).toBe("Find them a home");
    expect(pickSpotlight([aCase({ status: "claimed" })], [])?.nextStep).toBe("Post an update");
  });

  it("sorts an unclaimed report ahead of an older-but-claimed one, whatever the dates", () => {
    const s = pickSpotlight([], [
      aReport({ report_id: "claimed", status: "claimed", created_at: iso(1) }),
      aReport({ report_id: "unclaimed", status: "reported", created_at: iso(30) })
    ]);
    expect(s?.reportId).toBe("unclaimed");
    expect(s?.nextStep).toBe("No one has claimed this yet");
  });

  it("drops resolved reports", () => {
    expect(pickSpotlight([], [aReport({ status: "resolved" })])).toBeNull();
  });

  it("carries a chip and a relative time the card can render as-is", () => {
    const s = pickSpotlight([aCase({ claimed_at: iso(3) })], [], T0);
    expect(s?.chip).toEqual({ label: "Claimed", tone: "teal" });
    expect(s?.since).toBe("claimed 3 h ago");
    expect(s?.title).toBe("Dog · Injured");
  });
});
