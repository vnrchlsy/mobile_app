import { MyReport, OfferListStatus, OfferType, RescueCaseSummary, RescuePerson, ReportDetail, StrayStatus } from "./api/types";
import type { CaseHandoff } from "./api/types";

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

// C13 · a report moderation removed says so, in place of whatever status it had.
export function myReportChip(r: Pick<MyReport, "status" | "hidden">): { label: string; tone: StrayTone } {
  return r.hidden ? { label: "Removed by moderation", tone: "grey" } : strayChip(r.status);
}

// P2 · the load of a report that moderation removed answers its ex-claimer 410 report_removed
// (strangers still get 404). It must read as "removed", not as LoadStateView's "gone".
export function isReportRemoved(res: { ok: boolean; status: number } | null | undefined, code: string | undefined): boolean {
  return !!res && !res.ok && res.status === 410 && code === "report_removed";
}

// P2 · a My-rescues row whose report was removed. `hidden` can be true on a case that is still
// ACTIVE, so this is only the chip — the row stays tappable and the case actions stay.
export function rescueRowChip(c: Pick<RescueCaseSummary, "hidden" | "expired_at" | "status">): { label: string; tone: StrayTone } {
  if (c.hidden) return { label: "Removed", tone: "grey" };
  if (c.expired_at) return { label: "Expired", tone: "grey" };
  return strayChip(c.status);
}

// P2 · the reporter's detail shows the same grey chip as their list does (myReportChip) in place
// of the kind/status chip — and the screen drops the ladder, which would still say "Claimed".
export function reporterDetailChip(
  r: { report_type: string | undefined; status: StrayStatus; hidden?: boolean }
): { label: string; tone: StrayTone } {
  return r.hidden ? myReportChip({ status: r.status, hidden: true }) : reportKindChip(r.report_type, r.status);
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

// C11 · the case screen is about YOUR claim. A lapsed or released claimer (no `my_case`) must not
// see "resolved" (the report is open again) or someone else's case with actions that 403.
export type CaseScreenState = "active" | "custody" | "ended" | "resolved";
export function caseScreenState(r: Pick<ReportDetail, "status" | "my_case">): CaseScreenState {
  if (!r.my_case) return "ended";
  if (r.status === "resolved") return "resolved";
  return r.status === "claimed" ? "active" : "custody";
}

// C11 · PR3-F6 · what the ended card says became of the report once your claim is gone.
export function endedCaseLine(status: StrayStatus): string {
  if (status === "resolved") return "This report has been closed.";
  if (status === "reported") return "It's back on the map. If you can go now, you can claim it again from the report.";
  return "Another rescuer has it now.";
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

import { relTime } from "./dates";
export { relTime };

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

// ── Sagip loop closure (dev/sagip-build-review.md) ────────────────────────────────────

function duration(mins: number): string {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// S9 · an unposted claim reopens when its window passes (and since D3 a claimer can also
// release it). The claimer is told when, in time left rather than a clock time
// (the server sends the instant; "within 2 h" needs no time-zone guess). Urgent inside the
// last 90 minutes: the backend's hourly sweep warns at 75% of the window, so this is the
// stretch where a push has already gone out.
export function claimDeadline(
  claimDueAt: string | null | undefined, nowMs: number = Date.now()
): { text: string; short: string; urgent: boolean } | null {
  if (!claimDueAt) return null;
  const mins = Math.floor((new Date(claimDueAt).getTime() - nowMs) / 60000);
  if (mins <= 0) {
    return {
      text: "The update window has passed — this may reopen for another rescuer any moment.",
      short: "Update overdue", urgent: true
    };
  }
  return {
    text: `Post an update within ${duration(mins)} or it reopens for another rescuer.`,
    short: `Update within ${duration(mins)}`, urgent: mins <= 90
  };
}

// S5 · D2 · the waiting card used to say "partner shelters notified" at level 2 whether or
// not a single partner existed. These lines only claim what the server counted. `at_report`
// is the report-time alert (D2): null when the policy sends nothing (a healthy stray), which
// is different from 0 (it tried, and no one verified is in the city). An older server without
// the counts gets neutral words.
export function escalationLines(
  level: number | undefined,
  notified: {
    level_1: number; level_2: number; at_report?: number | null; reopened?: number | null;
    at_report_held?: "phone_unverified" | "reporter_cap" | null;
  } | undefined
): string[] {
  const lines: string[] = [];
  const people = (n: number) => (n === 1 ? "rescuer or shelter" : "rescuers and shelters");
  const atReport = notified?.at_report;
  // C12 · a held report-time alert says why, instead of "no one in your city".
  const held = notified?.at_report_held;
  if (held === "phone_unverified") {
    lines.push("Nearby rescuers weren't alerted right away — verify your phone number so your urgent reports alert them. They'll still be asked if no one claims it soon.");
  } else if (held === "reporter_cap") {
    lines.push("You've sent several urgent reports today, so this one wasn't sent as an alert. Rescuers can still see it on the map, and they'll be asked if no one claims it soon.");
  } else if (atReport != null) {
    lines.push(atReport > 0
      ? `${atReport} verified ${people(atReport)} nearby ${atReport === 1 ? "was" : "were"} alerted right away.`
      : "No verified rescuers or shelters in your city to alert yet.");
  }
  // Re-alert · a claimed report that went back on the map paged the people not yet asked.
  // Only a positive count is said: 0 can't tell "never reopened" from "no one left to ask".
  const reopened = notified?.reopened ?? 0;
  if (reopened > 0) {
    lines.push(`It reopened · ${reopened} more verified ${people(reopened)} alerted.`);
  }
  if (!level) return lines;
  if (!notified) {
    lines.push("Widened to your city.");
    if (level >= 2) lines.push("Widened further.");
    return lines;
  }
  const n1 = notified.level_1, n2 = notified.level_2;
  const more = atReport ? "more " : "";
  lines.push(n1 > 0
    ? `Widened to your city · ${n1} ${more}verified ${people(n1)} alerted.`
    : atReport
      ? "Widened to your city · everyone there was already alerted."
      : "Widened to your city · no verified rescuers or shelters there to alert yet.");
  if (level >= 2) {
    lines.push(n2 > 0
      ? `Widened further · ${n2} partner ${n2 === 1 ? "shelter" : "shelters"} nearby alerted.`
      : "Widened further · no partner shelter nearby to alert yet.");
  }
  return lines;
}

// S8 · "Open in Maps" from the case screen, to the exact point the claimer is entitled to.
export function directionsUrl(lat: number, lng: number, os: string): string {
  return os === "ios"
    ? `http://maps.apple.com/?daddr=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// S11 · the reasons a reporter may close their own report — the backend's
// ReportCloseSerializer accepts exactly these keys.
export type CloseReason = "gone" | "duplicate" | "handled_myself" | "mistake" | "reunited";
export const CLOSE_REASONS: { key: CloseReason | "reunited"; label: string }[] = [
  { key: "gone", label: "The animal is gone" },
  { key: "duplicate", label: "Someone already reported it" },
  { key: "handled_myself", label: "I took care of it myself" },
  { key: "mistake", label: "I reported it by mistake" }
];
const CLOSE_NOTE_PREFIX = "closed_by_reporter:";

// D3 · why a claimer let go, in their own words — the backend's ClaimReleaseSerializer accepts
// exactly these keys and stamps the reopen row's note `released_by_claimer:<key>`.
export type ReleaseReason = "cant_get_there" | "cant_find" | "no_capacity" | "something_came_up";
export const RELEASE_REASONS: { key: ReleaseReason; label: string }[] = [
  { key: "cant_get_there", label: "I can't get there" },
  { key: "cant_find", label: "I couldn't find the animal" },
  { key: "no_capacity", label: "I can't take the animal in" },
  { key: "something_came_up", label: "Something came up" }
];
const RELEASE_NOTE_PREFIX = "released_by_claimer:";
// P2 · written to a report's history when staff restore it after a moderation removal.
const RESTORE_NOTE = "restored_by_moderation";

/** A status-history note in the reporter's words: their own close named, a claimer's release
 *  explained (D3), others as written. */
export function historyNote(note: string | undefined): string | null {
  if (!note) return null;
  if (note === RESTORE_NOTE) return "Restored by moderation";
  if (note.startsWith(RELEASE_NOTE_PREFIX)) {
    const reason = RELEASE_REASONS.find((r) => r.key === note.slice(RELEASE_NOTE_PREFIX.length));
    return reason ? `The rescuer couldn't make it · ${reason.label}` : "The rescuer couldn't make it";
  }
  if (note.startsWith(CLOSE_NOTE_PREFIX)) {
    const key = note.slice(CLOSE_NOTE_PREFIX.length);
    const reason = [...CLOSE_REASONS, ...LOST_CLOSE_REASONS].find((r) => r.key === key);
    return `Closed by you · ${reason ? reason.label : key}`;
  }
  return note;
}

// ── D1 + D8 · the people on a rescue ──────────────────────────────────────────────────

/** How a person on a rescue is described to the viewer. `noContact` is what to say when they
 *  haven't shared contact details — null for an anonymous reporter, who can't (D8). */
export function personSummary(p: RescuePerson): { title: string; detail: string; noContact: string | null } {
  if (p.anonymous) {
    return { title: p.role === "finder" ? "The finder" : "The reporter",
             detail: "Chose to stay anonymous", noContact: null };
  }
  const title = p.display_name ?? "Someone";
  const noContact = "Hasn't shared contact details.";
  if (p.role === "claimer") return { title, detail: "Claimed this rescue", noContact };
  if (p.role === "reporter") return { title, detail: "Reported this", noContact };
  if (p.role === "finder") return { title, detail: "Says they've seen your pet", noContact };
  if (p.role === "owner") return { title, detail: "Owner of the lost pet", noContact };
  const offered = p.offer_type ? `Offered ${OFFER_TYPE_LABEL[p.offer_type].toLowerCase()}` : "Offered to help";
  return { title, detail: p.note ? `${offered} · “${p.note}”` : offered, noContact };
}

/** A helper's one switch covers all their offers on a report: on only when every one shares. */
export function offersShareContact(offers: { contact_shared: boolean }[]): boolean {
  return offers.length > 0 && offers.every((o) => o.contact_shared);
}

// ── D6 · lost pets ────────────────────────────────────────────────────────────────────
export type ReportMode = "stray" | "lost" | "found";

/** A report's headline. A lost pet is named ("Lost: Bruno") — its owner published that to be
 *  recognised; a found animal says so; a stray keeps "Dog · Injured". */
export function reportTitle(r: { report_type?: string; species: string; condition: string; pet_name?: string }): string {
  if (r.report_type === "lost") return r.pet_name ? `Lost: ${r.pet_name}` : `Lost ${r.species}`;
  if (r.report_type === "found") return `Found ${r.species} · ${cap(r.condition)}`;
  return sagipTitle(r.species, r.condition);
}

/** A lost pet is never "Reported / Claimed / Rescued" — nobody claims it. Open, it asks the
 *  world to look (amber: someone must act); resolved, it's home. */
export function reportKindChip(reportType: string | undefined, status: StrayStatus): { label: string; tone: StrayTone } {
  if (reportType === "lost") {
    return status === "resolved" ? { label: "Home again", tone: "grey" } : { label: "Lost pet", tone: "amber" };
  }
  return strayChip(status);
}

// "reunited" is how an owner closes a lost report (backend ReportCloseSerializer accepts it).
export const LOST_CLOSE_REASONS: { key: CloseReason; label: string }[] = [
  { key: "reunited", label: "We're back together" },
  { key: "mistake", label: "I reported it by mistake" }
];

export function closeReasonsFor(reportType: string | undefined) {
  return reportType === "lost" ? LOST_CLOSE_REASONS : CLOSE_REASONS;
}

/** The POST /reports body for each kind of report (S12). A stray's body is exactly what it was
 *  before lost/found existed; a lost pet carries its pet and no condition or anonymity (its
 *  owner must be findable); a sighting is a found report pointing at the lost one. */
export function reportBody(f: {
  mode: ReportMode; species: string; condition: string; notes: string; anonymous: boolean;
  shareContact: boolean; coords: { lat: number; lng: number }; locationText: string; city: string;
  photoUrl: string | null; idempotencyKey: string;
  petId?: string | null; breed?: string; colorMarkings?: string; sightingOf?: string;
}): Record<string, unknown> {
  const anonymous = f.mode !== "lost" && f.anonymous;
  const body: Record<string, unknown> = {
    species: f.species, notes: f.notes.trim() || undefined,
    contact_share_consent: f.shareContact && !anonymous,
    lat: f.coords.lat, lng: f.coords.lng, location_text: f.locationText || undefined,
    city: f.city || undefined,
    photos: f.photoUrl ? [{ file_url: f.photoUrl }] : [],
    idempotency_key: f.idempotencyKey
  };
  if (f.mode !== "lost") {
    body.condition = f.condition;
    body.is_anonymous = anonymous;
  }
  if (f.mode !== "stray") {
    body.report_type = f.mode;
    if (f.colorMarkings?.trim()) body.color_markings = f.colorMarkings.trim();
  }
  if (f.mode === "lost") {
    if (f.petId) body.pet_id = f.petId;
    if (f.breed?.trim()) body.breed = f.breed.trim();
  }
  if (f.mode === "found" && f.sightingOf) body.sighting_of = f.sightingOf;
  return body;
}

// C24 · expo-location has no timeout; a phone indoors can wait for a fix forever.
export const GPS_TIMEOUT_MS = 15000;
// PR3-F3 · the last-known fallback only counts if it is recent and reasonably precise; anything
// older or vaguer would file the report where the reporter was, not where the animal is. With no
// qualifying fix the form offers the pin instead.
export const LAST_KNOWN_MAX_AGE_MS = 5 * 60_000;
export const LAST_KNOWN_MAX_ACCURACY_M = 200;
// PR3-F2 · why a report went to the outbox. "offline" = no answer at all; "server" = the phone
// is online but Kupkop isn't answering (a C17 timeout, or a 502/503/504 from the gateway).
export type QueuedReason = "offline" | "server";
export function queuedReason(status: number, errorCode: string | undefined): QueuedReason {
  return status !== 0 || errorCode === "timeout" ? "server" : "offline";
}
export function queuedReportLine(reason: QueuedReason | undefined): string {
  return reason === "server"
    ? "Couldn't reach Kupkop right now — this sends by itself shortly."
    : "You're offline. This sends by itself the moment you're back.";
}
// C18 · the report limit is per day (ReportCreateThrottle, 20/day); "try again shortly" was wrong.
export function throttledReportMessage(retryAfterSeconds: number | undefined): string {
  const base = "You've sent 20 reports today — the most one account can send.";
  if (!retryAfterSeconds) return `${base} Try again later today.`;
  return `${base} You can send more in about ${Math.max(1, Math.ceil(retryAfterSeconds / 3600))} h.`;
}

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, () => { clearTimeout(t); resolve(null); });
  });
}

// C24 · a pin the person dropped wins over a late GPS fix (or the stale last-known fallback,
// or a "denied" verdict): once pinned, or once the screen is gone, a location result is dropped.
export function gpsMayApply(pinned: boolean, cancelled: boolean): boolean {
  return !pinned && !cancelled;
}

// C14 · the refusals of POST /cases/{id}/handoff/cancel, in words.
export function handoffCancelMessage(code: string | undefined): string {
  switch (code) {
    case "has_active_inquiries": return "People have asked about this animal, so it can't be taken down from here.";
    case "already_adopted": return "This animal already has a home.";
    case "no_handoff": return "There's nothing to take back — they aren't listed or offered to anyone.";
    case "case_expired": return "This claim has lapsed — it's back on the map for someone else to claim.";
    default: return "Couldn't take that back. Try again.";
  }
}

// D15 · Take back on a listing people have asked about: the server answers 409
// has_active_inquiries with details.active_inquiries = N, and the rescuer must confirm before
// the listing comes down and those N people are told. Copy lives here so it is tested.
const peopleHave = (n: number) => `${n} ${n === 1 ? "person has" : "people have"}`;
const peopleWere = (n: number) => `${n} ${n === 1 ? "person was" : "people were"}`;

export function closeInquiriesPrompt(n: number): { title: string; body: string; keep: string; confirm: string } {
  return {
    title: "People have asked about them",
    body: `${peopleHave(n)} asked about this animal. Taking the listing down tells them it's no longer available.`,
    keep: "Keep it listed",
    confirm: "Take it down"
  };
}

export function closedInquiriesDone(n: number): { title: string; body: string } {
  return { title: "Taken back", body: `The listing is down, and ${peopleWere(n)} told.` };
}

// C14/C15 · what List and Place do with a 409. `already_handed_off` carries the existing
// listing in `details`: an unfinished DRAFT is reopened (it is the rescuer's own work in
// progress), anything else means "take that back first". `null` = not one of these conflicts,
// so the screen keeps its own mapping (fee_over_cap, case_not_safe, ...).
export type HandoffConflictAction =
  | { kind: "openDraft"; listingId: string }
  | { kind: "message"; text: string };

export function handoffConflictAction(
  error: { code?: string; details?: { listing_id?: string; listing_status?: string } } | undefined
): HandoffConflictAction | null {
  if (error?.code === "case_expired") {
    return { kind: "message", text: "This claim has lapsed — it's back on the map for someone else to claim." };
  }
  if (error?.code !== "already_handed_off") return null;
  const d = error.details;
  if (d?.listing_status === "draft" && d.listing_id) return { kind: "openDraft", listingId: d.listing_id };
  if (d?.listing_status === "adopted") return { kind: "message", text: "This animal already has a home." };
  return { kind: "message", text: "This animal is already listed or offered to someone — take that back first." };
}


// AD20 · the case screen's handoff card: where the animal's handoff stands, in words, and where a tap
// on it goes. `null` handoff = nothing listed or offered, so the List / Place buttons stay.
export type HandoffCard = { title: string; line: string; opensListing: boolean };

export function handoffCard(h: CaseHandoff | null | undefined): HandoffCard | null {
  if (!h) return null;
  if (h.kind === "placement") {
    return h.status === "adopted"
      ? { title: "Placed", line: `${h.recipient ?? "They"} accepted. The animal has a new home.`, opensListing: false }
      : { title: "Placed", line: `Waiting for ${h.recipient ?? "them"} to answer.`, opensListing: false };
  }
  const n = h.open_inquiries;
  const asked = n === 0 ? "no inquiries yet" : n === 1 ? "1 inquiry" : `${n} inquiries`;
  switch (h.status) {
    case "draft": return { title: "Draft listing", line: "Finish it and publish when you are ready.", opensListing: true };
    case "available": return { title: "Listed", line: `Live on the Adopt feed · ${asked}`, opensListing: true };
    case "pending": return { title: "Listed", line: `Reserved for an applicant · ${asked}`, opensListing: true };
    case "adopted": return { title: "Adopted", line: "This animal has a new home.", opensListing: true };
    default: return null;
  }
}
