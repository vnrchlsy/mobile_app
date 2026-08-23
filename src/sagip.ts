import { OfferListStatus, OfferType, StrayStatus } from "./api/types";

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
