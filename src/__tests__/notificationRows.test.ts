/** Notifications review step 14 (V3) · what the bell's rows say and how they group, from the approved artboard. */
import type { MeNotification } from "../api/types";
import { bellItems, isInformationOnly, notificationRowLabel } from "../notificationRows";

const NOW = Date.parse("2026-11-10T08:00:00+00:00");
const iso = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString();
const n = (id: string, over: Partial<MeNotification> = {}): MeNotification => ({
  notification_id: id, type: "report_claimed", title: "Your report was claimed", body: "Juan is on the way.",
  data: { report_id: "r1" }, read: false, created_at: iso(60), ...over,
});

describe("notificationRowLabel: ONE label a screen reader hears per row", () => {
  it("says what happened, the detail, when, and that it is unread", () => {
    expect(notificationRowLabel(n("1", { created_at: iso(120) }), NOW)).toBe("Your report was claimed. Juan is on the way. 2 h ago. Unread.");
  });

  it("drops 'Unread' once it is read", () => {
    expect(notificationRowLabel(n("1", { read: true }), NOW)).not.toMatch(/Unread/);
  });

  it("does not double the punctuation a title or body already ends with", () => {
    const label = notificationRowLabel(n("1", { title: "New badge!", body: "You earned “First rescue”.", read: true }), NOW);
    expect(label).toBe("New badge! You earned “First rescue”. 1 h ago.");
    expect(label).not.toMatch(/[.!?]\./);
  });

  it("copes with a missing body or title", () => {
    expect(notificationRowLabel(n("1", { body: null as any, read: true }), NOW)).toBe("Your report was claimed. 1 h ago.");
    expect(notificationRowLabel(n("1", { title: null as any, body: "", read: true }), NOW)).toBe("Update. 1 h ago.");
    expect(notificationRowLabel(n("1", { title: "  ", body: " ", read: true }), NOW)).toBe("Update. 1 h ago.");   // blank is not a title
  });
});

describe("isInformationOnly: a row that goes nowhere is not a button", () => {
  it("is true for the two deliberate no-ops", () => {
    expect(isInformationOnly({ type: "report_reviewed", data: { flag_id: "f" } })).toBe(true);
    expect(isInformationOnly({ type: "account_warned", data: { warning_id: "w" } })).toBe(true);
  });

  it("is true for a type that needs an id it does not have, or one nobody knows", () => {
    expect(isInformationOnly({ type: "report_claimed", data: {} })).toBe(true);
    expect(isInformationOnly({ type: "report_claimed", data: null })).toBe(true);
    expect(isInformationOnly({ type: "something_new", data: { report_id: "r" } })).toBe(true);
  });

  it("is false for a row with somewhere to go", () => {
    expect(isInformationOnly({ type: "report_claimed", data: { report_id: "r1" } })).toBe(false);
    expect(isInformationOnly({ type: "donation_qr_decided", data: null })).toBe(false);
  });
});

describe("bellItems: New, then Earlier, by read state", () => {
  const kinds = (rows: MeNotification[]) => bellItems(rows).map((i) => (i.kind === "row" ? `row:${i.n.notification_id}` : i.kind === "header" ? i.name : i.kind));

  it("puts unread under New and read under Earlier, keeping the server's order inside each", () => {
    expect(kinds([n("a"), n("b", { read: true }), n("c"), n("d", { read: true })]))
      .toEqual(["New", "row:a", "row:c", "Earlier", "row:b", "row:d"]);
  });

  it("with nothing unread has no New and leads with the caught-up notice", () => {
    expect(kinds([n("a", { read: true }), n("b", { read: true })])).toEqual(["caughtUp", "Earlier", "row:a", "row:b"]);
  });

  it("with nothing read has no Earlier and no notice", () => {
    expect(kinds([n("a"), n("b")])).toEqual(["New", "row:a", "row:b"]);
  });

  it("draws nothing for an empty list (that is the empty state's job)", () => {
    expect(bellItems([])).toEqual([]);
  });

  it("gives every item a distinct key", () => {
    const keys = bellItems([n("a"), n("b", { read: true }), n("c")]).map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps a row the bell just marked read under New for this viewing (the row object still says unread)", () => {
    const shown = [n("a")];
    expect(kinds(shown)).toEqual(["New", "row:a"]);
  });
});
