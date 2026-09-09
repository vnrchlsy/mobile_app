// US-V8 volunteer display logic + types. Pure and unit-tested (like adoption.ts / sagip.ts).
// Types mirror backend GET /me/signups and GET /shifts by hand (no shared package).

export type ShiftType = "walking" | "feeding" | "visitor" | "event" | "facility" | "transport";
export type SignupStatus = "requested" | "approved" | "declined" | "cancelled" | "completed" | "no_show";

// The /me/signups embedded-shift shape (backend `_my_shift_repr`): carries `org_name` but no
// `slots_left`. Distinct from `BrowseShift` below (the GET /shifts and GET /shifts/{id} shape,
// `_shift_repr`), which has both `org_name` and `slots_left`. Keep this name — `MySignupItem.shift`
// references it.
export type ShiftSummary = {
  shift_id: string; type: ShiftType; org_name: string;
  starts_at: string; ends_at: string; status: "open" | "full" | "closed"; capacity: number;
};
// The GET /shifts (browse) and GET /shifts/{id} (detail) shape (backend `_shift_repr`).
export type BrowseShift = {
  shift_id: string; type: ShiftType; org_name: string; starts_at: string; ends_at: string;
  capacity: number; status: "open" | "full" | "closed"; slots_left: number;
};
export type MySignupItem = {
  signup_id: string; status: SignupStatus; cancelled_at: string | null; was_late: boolean;
  check_in_at: string | null; check_out_at: string | null; hours: number | null; shift: ShiftSummary;
};
export type Reliability = {
  shifts_completed: number; no_shows: number; consecutive_no_shows: number;
  needs_reapproval: boolean; is_reliable: boolean;
};
export type MySignups = { requested: MySignupItem[]; upcoming: MySignupItem[]; history: MySignupItem[]; reliability: Reliability };

const TYPE_LABEL: Record<ShiftType, string> = {
  walking: "Dog walking", feeding: "Feeding", visitor: "Visitor",
  event: "Event", facility: "Facility care", transport: "Transport",
};
export const shiftTypeLabel = (t: ShiftType): string => TYPE_LABEL[t] ?? t;

export type StrayTone = "amber" | "teal" | "green" | "grey";
export type CardTone = "done" | "danger" | "muted" | "active";
export function signupStatusCard(s: SignupStatus): { label: string; tone: CardTone } {
  switch (s) {
    case "completed": return { label: "Completed", tone: "done" };
    case "no_show":   return { label: "No-show", tone: "danger" };
    case "cancelled": return { label: "Cancelled", tone: "muted" };
    case "declined":  return { label: "Declined", tone: "muted" };
    case "approved":  return { label: "Confirmed", tone: "active" };
    default:          return { label: "Requested", tone: "muted" };
  }
}
export const historyHours = (i: { hours: number | null }): string => i.hours == null ? "—" : `${i.hours} h`;
export const lateCancelCopy = (wasLate: boolean): string =>
  wasLate ? "You're cancelling less than 12 hours before the shift. This will be recorded."
          : "You're cancelling with more than 12 hours' notice — this is free.";

// ── Kawang-Gawa hub display logic (US-V8 redesign, 2026-09-09) ──────────────────────────
// The hub was a filter row over a flat list: type, org, time, "5 of 5 slots left". It said
// nothing about who a shift helps, how long it takes, whether it is nearly gone, or what the
// volunteer had already done — so there was nothing on it to bring anyone back.
//
// ⚠️ WHAT IS NOT AVAILABLE. `_shift_repr` (volunteer/views.py) returns type, org_name,
// starts_at, ends_at, capacity, status and slots_left — no location, no description, no
// photo. Anything about distance, "shelters near you", or imagery needs the backend first.
// Everything below is derived from what the two existing endpoints already return.

/** Plain totals for the hub's impact strip. */
export type VolunteerTotals = { shifts: number; hours: number };

export function volunteerTotals(signups: MySignups | null): VolunteerTotals | null {
  if (!signups) return null;
  // Hours are summed over COMPLETED history only, to agree with `shifts_completed`. A
  // cancelled or no-show signup carries no hours, and counting its row would make the two
  // halves of the line contradict each other.
  const hours = signups.history
    .filter((i) => i.status === "completed")
    .reduce((total, i) => total + (i.hours ?? 0), 0);
  return { shifts: signups.reliability.shifts_completed, hours };
}

/** "6 shifts · 14 hours given" — null when there is nothing yet to report.
 *
 *  ⚠️ Returns null at zero rather than "0 shifts · 0 hours given". The strip exists to give
 *  a returning volunteer a reason to come back; rendering a row of zeroes at someone who has
 *  not started yet is the opposite of that, so the screen shows an invitation instead. */
export function volunteerTotalsLabel(totals: VolunteerTotals | null): string | null {
  if (!totals || totals.shifts <= 0) return null;
  const shifts = `${totals.shifts} ${totals.shifts === 1 ? "shift" : "shifts"}`;
  const hours = Math.round(totals.hours * 10) / 10;
  if (hours <= 0) return shifts;
  return `${shifts} · ${hours} ${hours === 1 ? "hour" : "hours"} given`;
}

/** The soonest shift the volunteer is actually booked on, or null.
 *
 *  ⚠️ `approved` only. A `requested` signup is not a commitment either side has made yet —
 *  putting it under "Next" would tell someone they have a shift when a shelter has not said
 *  yes. Their pending requests are on My schedule, which says so plainly. */
export function nextBookedShift(signups: MySignups | null, nowMs: number = Date.now()): MySignupItem | null {
  if (!signups) return null;
  const booked = signups.upcoming
    .filter((i) => i.status === "approved")
    .filter((i) => new Date(i.shift.starts_at).getTime() >= nowMs)
    .sort((a, b) => new Date(a.shift.starts_at).getTime() - new Date(b.shift.starts_at).getTime());
  return booked[0] ?? null;
}

/** "Today" · "Tomorrow" · "Saturday" · "Sat, Sep 20" — the section head a shift sits under. */
export function shiftDayLabel(startsAt: string, nowMs: number = Date.now()): string {
  const start = new Date(startsAt);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const now = new Date(nowMs);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((startDay - today) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return start.toLocaleDateString(undefined, { weekday: "long" });
  return start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/** "9:00–11:00 AM" — the clock range alone.
 *
 *  Shared by the hub and the shift detail deliberately: they each had their own local
 *  formatter, which is how the two screens ended up describing one shift's slots two
 *  different ways in the first place. */
export function shiftTimeRange(startsAt: string, endsAt: string): string {
  const opts = { hour: "numeric", minute: "2-digit" } as const;
  const start = new Date(startsAt).toLocaleTimeString(undefined, opts);
  const end = new Date(endsAt).toLocaleTimeString(undefined, opts);
  return `${start}–${end}`;
}

/** "2 hours" / "90 min" — how much of someone's day a shift actually asks for. */
export function shiftDurationLabel(startsAt: string, endsAt: string): string {
  const mins = Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.round((mins / 60) * 10) / 10;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** Scarcity, as a toned chip.
 *
 *  ⚠️ Replaces "5 of 5 slots left", which reads as "5 of 5 taken" at a glance and gave a
 *  nearly-gone shift exactly the same weight as an empty one. Amber is this app's "someone
 *  must still act" colour (see sagip.ts) and the last slot is precisely that. */
export function shiftSlotsChip(slotsLeft: number, capacity: number): { label: string; tone: StrayTone } {
  if (slotsLeft <= 0) return { label: "Full", tone: "grey" };
  if (slotsLeft === 1) return { label: "1 slot left", tone: "amber" };
  // ⚠️ An untouched shift says how big it is ("5 slots"), not "5 of 5 left" — that phrasing
  // is the very ambiguity this replaced, and it reads as "5 of 5 taken" at a glance. Once
  // someone has joined, the number that matters is what is still going.
  if (slotsLeft >= capacity) return { label: `${capacity} slots`, tone: "teal" };
  return { label: `${slotsLeft} left`, tone: "teal" };
}

export type ShiftGroup = { label: string; shifts: BrowseShift[] };

/** Shifts split into day sections, in the order they should be offered.
 *
 *  Chronological (which is already the server's order), but a FULL shift sinks below the
 *  available ones inside its own day: browse deliberately returns `full` shifts because a
 *  cancellation reopens them, yet a volunteer scanning the hub wants the ones they can
 *  actually take. It also keeps `card.kawanggawa.0` — the card e2e flow 30 taps and then
 *  requests — on an actionable shift whenever one exists that day. */
export function groupShiftsByDay(shifts: BrowseShift[], nowMs: number = Date.now()): ShiftGroup[] {
  const ordered = [...shifts].sort((a, b) => {
    const byStart = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    const dayA = shiftDayLabel(a.starts_at, nowMs);
    const dayB = shiftDayLabel(b.starts_at, nowMs);
    if (dayA === dayB) {
      const fullA = a.slots_left <= 0 ? 1 : 0;
      const fullB = b.slots_left <= 0 ? 1 : 0;
      if (fullA !== fullB) return fullA - fullB;
    }
    return byStart;
  });
  const groups: ShiftGroup[] = [];
  for (const shift of ordered) {
    const label = shiftDayLabel(shift.starts_at, nowMs);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.shifts.push(shift);
    else groups.push({ label, shifts: [shift] });
  }
  return groups;
}
