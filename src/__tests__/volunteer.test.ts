import {
  BrowseShift, MySignupItem, MySignups, groupShiftsByDay, historyHours, lateCancelCopy,
  nextBookedShift, shiftDayLabel, shiftDurationLabel, shiftSlotsChip, shiftTypeLabel,
  shiftTimeRange, signupStatusCard, volunteerTotals, volunteerTotalsLabel
} from "../volunteer";

test("shiftTypeLabel maps the six enum values", () => {
  expect(shiftTypeLabel("walking")).toBe("Dog walking");
  expect(shiftTypeLabel("feeding")).toBe("Feeding");
});

test("signupStatusCard maps status to label + tone", () => {
  expect(signupStatusCard("completed")).toEqual({ label: "Completed", tone: "done" });
  expect(signupStatusCard("no_show")).toEqual({ label: "No-show", tone: "danger" });
  expect(signupStatusCard("cancelled")).toEqual({ label: "Cancelled", tone: "muted" });
});

test("historyHours formats the derived hours or a dash", () => {
  expect(historyHours({ hours: 2.5 } as any)).toBe("2.5 h");
  expect(historyHours({ hours: null } as any)).toBe("—");
});

test("lateCancelCopy is driven by the server's was_late, not a clock", () => {
  expect(lateCancelCopy(true)).toMatch(/less than 12 hours/i);
  expect(lateCancelCopy(false)).toMatch(/free/i);
});

// ── Kawang-Gawa hub (US-V8 redesign) ────────────────────────────────────────────────
const NOW = new Date("2026-09-09T09:00:00").getTime();
const at = (iso: string) => new Date(iso).toISOString();

function shift(over: Partial<BrowseShift> = {}): BrowseShift {
  return {
    shift_id: "s1", type: "walking", org_name: "E2E shelter",
    starts_at: at("2026-09-09T14:00:00"), ends_at: at("2026-09-09T16:00:00"),
    capacity: 4, status: "open", slots_left: 2, ...over
  };
}
function signups(over: Partial<MySignups> = {}): MySignups {
  return {
    requested: [], upcoming: [], history: [],
    reliability: { shifts_completed: 0, no_shows: 0, consecutive_no_shows: 0,
                   needs_reapproval: false, is_reliable: true },
    ...over
  };
}
function item(over: Partial<MySignupItem> = {}): MySignupItem {
  return {
    signup_id: "g1", status: "completed", cancelled_at: null, was_late: false,
    check_in_at: null, check_out_at: null, hours: 2,
    shift: { shift_id: "s9", type: "feeding", org_name: "E2E shelter",
             starts_at: at("2026-09-12T09:00:00"), ends_at: at("2026-09-12T11:00:00"),
             status: "open", capacity: 4 },
    ...over
  };
}

test("volunteerTotals counts only completed history, so the two halves agree", () => {
  const s = signups({
    reliability: { shifts_completed: 2, no_shows: 1, consecutive_no_shows: 0,
                   needs_reapproval: false, is_reliable: true },
    history: [item({ hours: 2 }), item({ hours: 3 }),
              item({ status: "no_show", hours: 9 }),      // must not be counted
              item({ status: "cancelled", hours: null })]
  });
  expect(volunteerTotals(s)).toEqual({ shifts: 2, hours: 5 });
});

test("volunteerTotalsLabel stays silent for a first-time volunteer", () => {
  // A row of zeroes at someone who has not started is the opposite of encouraging.
  expect(volunteerTotalsLabel({ shifts: 0, hours: 0 })).toBeNull();
  expect(volunteerTotalsLabel(null)).toBeNull();
});

test("volunteerTotalsLabel reads as plain totals, singular and plural", () => {
  expect(volunteerTotalsLabel({ shifts: 6, hours: 14 })).toBe("6 shifts · 14 hours given");
  expect(volunteerTotalsLabel({ shifts: 1, hours: 1 })).toBe("1 shift · 1 hour given");
  // Checked in but never checked out — report the shift, don't invent hours.
  expect(volunteerTotalsLabel({ shifts: 3, hours: 0 })).toBe("3 shifts");
});

test("nextBookedShift ignores a request a shelter has not approved", () => {
  // Showing a pending request under "Next" would tell someone they have a shift.
  const pending = signups({ upcoming: [item({ status: "requested" })] });
  expect(nextBookedShift(pending, NOW)).toBeNull();
  const booked = signups({ upcoming: [item({ status: "approved" })] });
  expect(nextBookedShift(booked, NOW)?.signup_id).toBe("g1");
});

test("nextBookedShift takes the soonest, and skips one already past", () => {
  const s = signups({ upcoming: [
    item({ signup_id: "later", status: "approved",
           shift: { ...item().shift, starts_at: at("2026-09-20T09:00:00") } }),
    item({ signup_id: "soon", status: "approved",
           shift: { ...item().shift, starts_at: at("2026-09-10T09:00:00") } }),
    item({ signup_id: "past", status: "approved",
           shift: { ...item().shift, starts_at: at("2026-09-01T09:00:00") } })
  ] });
  expect(nextBookedShift(s, NOW)?.signup_id).toBe("soon");
});

test("shiftDayLabel names the near days and dates the far ones", () => {
  expect(shiftDayLabel(at("2026-09-09T18:00:00"), NOW)).toBe("Today");
  expect(shiftDayLabel(at("2026-09-10T06:00:00"), NOW)).toBe("Tomorrow");
  expect(shiftDayLabel(at("2026-09-12T06:00:00"), NOW)).toBe("Saturday");
  expect(shiftDayLabel(at("2026-09-30T06:00:00"), NOW)).toContain("Sep");
});

test("shiftDayLabel is about the calendar day, not 24-hour spans", () => {
  // 23:00 today and 01:00 tomorrow are two hours apart and must not share a heading.
  expect(shiftDayLabel(at("2026-09-09T23:00:00"), NOW)).toBe("Today");
  expect(shiftDayLabel(at("2026-09-10T01:00:00"), NOW)).toBe("Tomorrow");
});

test("shiftTimeRange is the clock range only — the day is carried elsewhere", () => {
  // Locale-independent assertions: two times joined by an en dash, and no date in it.
  const range = shiftTimeRange(at("2026-09-09T14:00:00"), at("2026-09-09T16:00:00"));
  expect(range.split("–")).toHaveLength(2);
  expect(range).not.toMatch(/Sep|2026|\b9\b/);
});

test("shiftDurationLabel says what the shift actually asks for", () => {
  expect(shiftDurationLabel(at("2026-09-09T14:00:00"), at("2026-09-09T16:00:00"))).toBe("2 hours");
  expect(shiftDurationLabel(at("2026-09-09T14:00:00"), at("2026-09-09T15:00:00"))).toBe("1 hour");
  expect(shiftDurationLabel(at("2026-09-09T14:00:00"), at("2026-09-09T14:45:00"))).toBe("45 min");
});

test("shiftSlotsChip never repeats the 'N of N' shape that reads as 'N of N taken'", () => {
  // An untouched shift describes its size; a partly-filled one describes what is left.
  expect(shiftSlotsChip(5, 5)).toEqual({ label: "5 slots", tone: "teal" });
  expect(shiftSlotsChip(3, 4)).toEqual({ label: "3 left", tone: "teal" });
  expect(shiftSlotsChip(1, 4)).toEqual({ label: "1 slot left", tone: "amber" });
  expect(shiftSlotsChip(0, 4)).toEqual({ label: "Full", tone: "grey" });
  for (const [left, cap] of [[5, 5], [3, 4], [1, 4], [0, 4]] as const) {
    expect(shiftSlotsChip(left, cap).label).not.toMatch(/\d+ of \d+/);
  }
});

test("groupShiftsByDay splits into day sections in chronological order", () => {
  const groups = groupShiftsByDay([
    shift({ shift_id: "sat", starts_at: at("2026-09-12T09:00:00"), ends_at: at("2026-09-12T11:00:00") }),
    shift({ shift_id: "today", starts_at: at("2026-09-09T14:00:00"), ends_at: at("2026-09-09T16:00:00") })
  ], NOW);
  expect(groups.map((g) => g.label)).toEqual(["Today", "Saturday"]);
  expect(groups[0].shifts[0].shift_id).toBe("today");
});

test("a full shift sinks below the takeable ones inside its own day", () => {
  // Browse returns `full` shifts on purpose (a cancellation reopens them), but the first
  // card is the one a volunteer reaches for — and the one e2e flow 30 taps and requests.
  const groups = groupShiftsByDay([
    shift({ shift_id: "full", slots_left: 0, starts_at: at("2026-09-09T10:00:00"), ends_at: at("2026-09-09T12:00:00") }),
    shift({ shift_id: "open", slots_left: 2, starts_at: at("2026-09-09T15:00:00"), ends_at: at("2026-09-09T17:00:00") })
  ], NOW);
  expect(groups[0].shifts.map((s) => s.shift_id)).toEqual(["open", "full"]);
});

test("a full shift does not jump into an earlier day", () => {
  const groups = groupShiftsByDay([
    shift({ shift_id: "tomorrowOpen", slots_left: 2, starts_at: at("2026-09-10T09:00:00"), ends_at: at("2026-09-10T11:00:00") }),
    shift({ shift_id: "todayFull", slots_left: 0, starts_at: at("2026-09-09T15:00:00"), ends_at: at("2026-09-09T17:00:00") })
  ], NOW);
  expect(groups.map((g) => g.label)).toEqual(["Today", "Tomorrow"]);
  expect(groups[0].shifts[0].shift_id).toBe("todayFull");
});
