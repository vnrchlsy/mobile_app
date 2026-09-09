import { MyReport, OfferListStatus, OfferType, RescueCaseSummary, StrayStatus } from "./api/types";

// Sagip's shared display logic, unit-tested (like shelterDashboard.ts / verifications.ts).

// Rule 5: only unclaimed is amber. Reported (amber = someone must still act) · Claimed
// (teal, being helped) · Rescued/Safe (green, resolved-ish) · Resolved (grey).
export type StrayTone = "amber" | "teal" | "green" | "grey";

export function strayChip(status: StrayStatus): { label: string; tone: StrayTone } {
  switch (status) {
    case "reported":
      return { label: "Reported", tone: "amber" };
    case "claimed":
      return { label: "Claimed", tone: "teal" };
    case "rescued":
      return { label: "Rescued", tone: "green" };
    case "safe":
      return { label: "Safe", tone: "green" };
    default:
      return { label: "Resolved", tone: "grey" };
  }
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function sagipTitle(species: string, condition: string): string {
  return `${cap(species)} · ${cap(condition)}`;
}

// Track K (US-K2) — a case can move forward only (never back), and the backend allows
// skipping ahead (e.g. claimed -> safe in one call) rather than forcing one step at a
// time, so this returns every status still reachable, not just the next one.
const CASE_ORDER: StrayStatus[] = ["claimed", "rescued", "safe", "resolved"];

export function advanceableStatuses(current: StrayStatus): StrayStatus[] {
  const idx = CASE_ORDER.indexOf(current);
  if (idx === -1) return []; // 'reported' (not yet claimed) or an unknown value
  return CASE_ORDER.slice(idx + 1);
}

// Track O (US-O1) — the three offer types. Centralised so the offer sheet, the offer
// list and my-offers can't drift on labels the way HANDOFF's OFFERS map does on web.
export const OFFER_TYPES: OfferType[] = ["transport", "vet_costs", "supplies"];
export const OFFER_TYPE_LABEL: Record<OfferType, string> = {
  transport: "Transport", vet_costs: "Vet costs", supplies: "Supplies"
};
export const OFFER_TYPE_HINT: Record<OfferType, string> = {
  transport: "Drive the animal to safety or to a vet",
  vet_costs: "Help cover a vet bill",
  supplies: "Food, a carrier, or other supplies"
};

// Decision 14 — no amber among offer states: amber means "someone must still act", and a
// live offer needs nothing from anyone. The unclaimed REPORT is what still does.
export function offerStatusChip(status: OfferListStatus): { label: string; tone: StrayTone } {
  switch (status) {
    case "open":
      return { label: "Open", tone: "teal" };
    case "matched":
      return { label: "Matched", tone: "green" };
    default:
      return { label: "Expired", tone: "grey" };
  }
}

export function relTime(iso: string, nowMs: number = Date.now()): string {
  const mins = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Home's spotlight (US-X1 redesign, 2026-09-09) ────────────────────────────────────
// Home used to carry a list of four links to the caller's own Sagip screens. A list is the
// same on the day you report your first stray and on the day nothing is open — so it told
// nobody anything. This picks the ONE thing that is actually waiting on them, and Home
// renders that instead.
//
// ⚠️ RANKING. Your own claimed case outranks your own unclaimed report: the case is work you
// owe an animal you took custody of (a claim is binding — see the decision in gen-screens.js),
// whereas an unclaimed report is you waiting on someone else. Within each group, most recent
// first.
//
// ⚠️ THE ONE THING THIS MUST NEVER DO is speak when it does not know. It returns null both
// for "nothing is open" and for "we could not tell", and Home renders NOTHING in either case
// — never a reassuring "you're all clear". That sentence, rendered while a fetch had failed,
// is exactly the 2026-09-04 bug the rescue map and Home's own empty copy were caught in.
export type Spotlight = {
  kind: "case" | "report";
  /** `case` → rescueUpdate needs both ids; `report` → reportDetail needs the report id. */
  caseId: string | null;
  reportId: string;
  title: string;
  city: string | null;
  chip: { label: string; tone: StrayTone };
  /** Relative time for the event that put this in the spotlight (claim, or report). */
  since: string;
  /** The eyebrow above the title — says which of your two piles this came from. */
  eyebrow: string;
  /** What happens next, in the user's terms. Never a feature name. */
  nextStep: string;
};

/** An expired claim is not work you owe any more — the animal went back to the pool. */
function isActiveCase(c: RescueCaseSummary): boolean {
  return c.expired_at === null && c.status !== "resolved";
}

function byNewest(a: string, b: string): number {
  return new Date(b).getTime() - new Date(a).getTime();
}

export function pickSpotlight(
  cases: RescueCaseSummary[],
  reports: MyReport[],
  nowMs: number = Date.now()
): Spotlight | null {
  const active = cases.filter(isActiveCase).sort((a, b) => byNewest(a.claimed_at, b.claimed_at));
  if (active.length > 0) {
    const c = active[0];
    return {
      kind: "case",
      caseId: c.case_id,
      reportId: c.report.report_id,
      title: sagipTitle(c.report.species, c.report.condition),
      city: c.report.city,
      chip: strayChip(c.status),
      since: `claimed ${relTime(c.claimed_at, nowMs)}`,
      eyebrow: "Your open case",
      // `safe` is the point the handoff opens up (US-H1 list / US-H2 place), and both live
      // behind rescueUpdate — so the copy names the real next move rather than the screen.
      nextStep: c.status === "safe" ? "Find them a home" : "Post an update"
    };
  }

  const open = reports
    .filter((r) => r.status !== "resolved")
    // An unclaimed report is the one still waiting on a human, so it sorts ahead of a
    // report someone has already picked up.
    .sort((a, b) =>
      (a.status === "reported" ? 0 : 1) - (b.status === "reported" ? 0 : 1) ||
      byNewest(a.created_at, b.created_at));
  if (open.length > 0) {
    const r = open[0];
    return {
      kind: "report",
      caseId: null,
      reportId: r.report_id,
      title: sagipTitle(r.species, r.condition),
      city: r.city,
      chip: strayChip(r.status),
      since: `reported ${relTime(r.created_at, nowMs)}`,
      eyebrow: "Your report",
      nextStep:
        r.status === "reported" ? "No one has claimed this yet"
          : r.status === "claimed" ? "A rescuer is on the way"
          : "They're safe now"
    };
  }

  return null;
}
