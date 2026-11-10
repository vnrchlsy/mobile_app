/** Notifications review steps 15, 17, 18 (NP15, V6, NP22) on the app side. */
import { readFileSync } from "fs";
import { join } from "path";

import { parseNotification, parseNotificationPage } from "../notificationFeed";
import { relTime as relTimeShared } from "../dates";
import { relTime as relTimeFromSagip } from "../sagip";
import { badgeFor } from "../push/badge";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf8");
const row = (over: Record<string, unknown> = {}) => ({
  notification_id: "n1", type: "badge_earned", title: null, body: null, data: null, read: false, created_at: "2026-11-10T08:00:00+00:00", ...over,
});

describe("parseNotification (NP15): one notification as the server declares it", () => {
  it("accepts a well-formed row, with null title, body and data", () => {
    expect(parseNotification(row())).toEqual(row());
  });

  it("refuses anything else: a missing id, a non-boolean read, an unparseable date, a non-object", () => {
    for (const bad of [null, undefined, 5, "x", [], {}, row({ notification_id: "" }), row({ read: "no" }), row({ created_at: "soon" }), row({ type: 3 })]) {
      expect(parseNotification(bad)).toBeNull();
    }
  });

  it("is what the page parser is made of: one bad row fails the page", () => {
    expect(parseNotificationPage({ notifications: [row(), row({ read: 1 })], next: null })).toBeNull();
    expect(parseNotificationPage({ notifications: [row(), row({ notification_id: "n2" })], next: "C" })?.rows).toHaveLength(2);
  });
});

describe("relTime (V6) lives in the shared date module", () => {
  it("is the same function from both places, so no importer broke", () => {
    expect(relTimeFromSagip).toBe(relTimeShared);
  });

  it("says what it said before", () => {
    const now = Date.parse("2026-08-15T10:00:00Z");
    expect(relTimeShared("2026-08-15T09:40:00Z", now)).toBe("20 min ago");
    expect(relTimeShared("2026-08-15T07:00:00Z", now)).toBe("3 h ago");
    expect(relTimeShared("2026-08-15T09:59:40Z", now)).toBe("just now");
  });

  it("the bell takes its time from dates, not from the rescue module", () => {
    expect(read("notificationRows.ts")).toMatch(/from "\.\/dates"/);
    expect(read("screens", "NotificationsScreen.tsx")).toMatch(/from "\.\.\/dates"/);
    expect(read("screens", "NotificationsScreen.tsx")).not.toMatch(/from "\.\.\/sagip"/);
  });
});

describe("badgeFor (NP22): the app icon's number", () => {
  it("is the unread count, whole, never negative, capped", () => {
    expect(badgeFor(3)).toBe(3);
    expect(badgeFor(0)).toBe(0);
    expect(badgeFor(2.9)).toBe(2);
    expect(badgeFor(-4)).toBe(0);
    expect(badgeFor(10_000_000)).toBe(99_999);
  });

  it("is 0 for anything that is not a number, so a bad answer never puts a number on the icon", () => {
    for (const v of [undefined, null, "7", NaN, Infinity, {}, []]) expect(badgeFor(v)).toBe(0);
  });
});

describe("the badge is kept true (source scan)", () => {
  it("both Homes set it from the unread count they already fetch", () => {
    expect(read("screens", "HomeScreen.tsx")).toMatch(/setAppBadge\(r\.data\?\.unread\)/);
    expect(read("screens", "ShelterDashboardScreen.tsx")).toMatch(/setAppBadge\(r\.data\?\.unread\)/);
  });

  it("the bell re-reads the count after it marks a page read and sets the icon to what is STILL unread", () => {
    const src = read("screens", "NotificationsScreen.tsx");
    expect(src).toMatch(/\/me\/notifications\/unread-count/);
    expect(src).toMatch(/setAppBadge\(r\.data\?\.unread\)/);
  });

  it("a session ending clears it, on every path (the same hook that clears the city and the cache)", () => {
    const src = read("auth", "AuthContext.tsx");
    expect(src.indexOf("clearStepUpCache()")).toBeGreaterThan(-1);
    expect(src.indexOf("void clearAppBadge()")).toBeGreaterThan(src.indexOf("clearStepUpCache()"));
  });

  it("never lets the native call break anything", () => {
    expect(read("push", "badge.ts")).toMatch(/catch \{/);
  });
});
