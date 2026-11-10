/**
 * Notifications review NP4 / NP8 / NQ3 · the bell marked EVERYTHING read after fetching the list, so a rescue page that
 * arrived in between was marked read unseen. It now sends the newest `created_at` it showed; a tapped row or push marks
 * its own row.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { markReadBody, pushNotificationId } from "../notifications";

const row = (read: boolean, created_at: string) => ({ read, created_at });

describe("markReadBody", () => {
  it("sends the newest created_at shown, as the original string", () => {
    const list = [row(false, "2026-11-10T08:00:00.123456+00:00"), row(true, "2026-11-09T08:00:00+00:00")];
    expect(markReadBody(list)).toEqual({ up_to: "2026-11-10T08:00:00.123456+00:00" });
  });

  it("finds the newest whatever the order, and across offsets", () => {
    const list = [row(false, "2026-11-10T10:00:00+08:00"), row(false, "2026-11-10T03:00:00+00:00")];
    expect(markReadBody(list)).toEqual({ up_to: "2026-11-10T03:00:00+00:00" });   // 03:00Z is after 02:00Z
  });

  it("makes no request when nothing shown is unread", () => {
    expect(markReadBody([])).toBeNull();
    expect(markReadBody([row(true, "2026-11-10T08:00:00+00:00")])).toBeNull();
  });

  it("never falls back to mark-all: no usable timestamp means no request", () => {
    expect(markReadBody([row(false, "garbage"), row(false, "")])).toBeNull();
  });

  it("skips an unusable timestamp but still uses the others", () => {
    expect(markReadBody([row(false, "garbage"), row(false, "2026-11-10T08:00:00+00:00")]))
      .toEqual({ up_to: "2026-11-10T08:00:00+00:00" });
  });
});

describe("pushNotificationId", () => {
  const ID = "9f381db7-8198-479a-98c6-06b1b91a95f3";
  it("returns a UUID string and nothing else", () => {
    expect(pushNotificationId({ notification_id: ID })).toBe(ID);
    for (const bad of [undefined, null, {}, { notification_id: 5 }, { notification_id: "" },
      { notification_id: "../me" }, { notification_id: `${ID}/x` }, { notification_id: "x?y=1" }, "str"]) {
      expect(pushNotificationId(bad)).toBeNull();
    }
  });
});

describe("wiring (source scan)", () => {
  const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf8");

  it("the bell posts the body, never a bare mark-all", () => {
    const src = read("screens", "NotificationsScreen.tsx");
    expect(src).toMatch(/markReadBody\(list\)/);
    expect(src).toMatch(/api\.post\("\/me\/notifications\/read", body\)/);
    expect(src).not.toMatch(/api\.post\("\/me\/notifications\/read"\);/);
  });

  it("a tapped row marks itself read, once", () => {
    const src = read("screens", "NotificationsScreen.tsx");
    expect(src).toMatch(/\/me\/notifications\/\$\{n\.notification_id\}\/read/);
    expect(src).toMatch(/tappedRef/);
  });

  it("a tapped push marks its own row read, before the destination check, only when signed in", () => {
    const src = read("push", "PushBridge.tsx");
    expect(src.indexOf("pushNotificationId(data)")).toBeGreaterThan(-1);
    expect(src.indexOf("pushNotificationId(data)")).toBeLessThan(src.indexOf("const target = notificationTarget"));
    expect(src).toMatch(/signedIn\.current/);
  });
});
