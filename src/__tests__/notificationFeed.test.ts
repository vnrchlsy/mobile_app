/**
 * Notifications review step 5 (NP5, NP19) · the bell pages. These pin the race and failure rules of the pure module; the
 * screen wiring is a source scan at the end (no render setup in this repo).
 */
import { readFileSync } from "fs";
import { join } from "path";

import {
  allRows, beginMore, finishMore, moreUrl, notificationsViewState, pagingAfterRefresh, pagingFrom, parseNotificationPage,
  shouldLoadMore
} from "../notificationFeed";

const row = (id: string, over: Record<string, unknown> = {}) => ({
  notification_id: id, type: "badge_earned", title: "t", body: null, data: null, read: false,
  created_at: "2026-11-10T08:00:00+00:00", ...over,
});
const page = (ids: string[], next: string | null = null) => ({ notifications: ids.map((i) => row(i)), next });

describe("parseNotificationPage", () => {
  it("reads a page and its cursor", () => {
    const p = parseNotificationPage(page(["a", "b"], "CUR"));
    expect(p?.rows.map((r) => r.notification_id)).toEqual(["a", "b"]);
    expect(p?.next).toBe("CUR");
  });

  it("an older server (no next) is one page that ends", () => {
    expect(parseNotificationPage({ notifications: [row("a")] })?.next).toBeNull();
    expect(parseNotificationPage({ notifications: [], next: "" })?.next).toBeNull();
  });

  it("one bad row, or anything that is not a page, is invalid, never a shorter list", () => {
    const bad = [null, undefined, {}, [], "x", { notifications: "x" }, { notifications: [null] },
      { notifications: [row("a"), row("b", { read: "no" })] }, { notifications: [row("a", { notification_id: "" })] },
      { notifications: [row("a", { created_at: "soon" })] }, { notifications: [row("a", { type: 5 })] }];
    for (const b of bad) expect(parseNotificationPage(b)).toBeNull();
  });
});

describe("paging state machine", () => {
  const first = parseNotificationPage(page(["a", "b"], "C1"))!;

  it("loads one page at a time and not after a failure", () => {
    const p = pagingFrom("C1", 1);
    expect(shouldLoadMore(p)).toBe(true);
    expect(shouldLoadMore(beginMore(p))).toBe(false);
    expect(shouldLoadMore(pagingFrom(null, 1))).toBe(false);
    const failed = finishMore(beginMore(p), 1, false, null, first.rows).paging;
    expect(failed.failed).toBe(true);
    expect(shouldLoadMore(failed)).toBe(false);
  });

  it("a failed page keeps the rows and the same cursor", () => {
    const p = { ...pagingFrom("C1", 1), extra: [row("c")] };
    const out = finishMore(beginMore(p), 1, false, null, first.rows).paging;
    expect(out.extra.map((r) => r.notification_id)).toEqual(["c"]);
    expect(out.next).toBe("C1");
  });

  it("a malformed page is a failed page, nothing appended", () => {
    const out = finishMore(beginMore(pagingFrom("C1", 1)), 1, true, { notifications: [row("c"), { x: 1 }] }, first.rows).paging;
    expect(out.failed).toBe(true);
    expect(out.extra).toEqual([]);
  });

  it("appends in order, takes the next cursor, and drops a row already shown", () => {
    const out = finishMore(beginMore(pagingFrom("C1", 1)), 1, true, page(["b", "c", "d"], "C2"), first.rows);
    expect(out.paging.extra.map((r) => r.notification_id)).toEqual(["c", "d"]);
    expect(out.paging.next).toBe("C2");
    expect(out.page.map((r) => r.notification_id)).toEqual(["b", "c", "d"]);      // the page as served, for mark-read
    expect(allRows(first.rows, out.paging).map((r) => r.notification_id)).toEqual(["a", "b", "c", "d"]);
  });

  it("the last page ends the list", () => {
    const out = finishMore(beginMore(pagingFrom("C1", 1)), 1, true, page(["c"], null), first.rows).paging;
    expect(out.next).toBeNull();
    expect(shouldLoadMore(out)).toBe(false);
  });

  it("an answer from before a reload is dropped whole (same object, nothing to mark)", () => {
    const p = beginMore(pagingFrom("C1", 2));
    const out = finishMore(p, 1, true, page(["c"], "C9"), first.rows);
    expect(out.paging).toBe(p);
    expect(out.page).toEqual([]);
  });

  it("a reload keeps scrolled pages only when the first page still ends where it did", () => {
    const scrolled = { ...pagingFrom("C2", 1), extra: [row("c"), row("d")] };
    const same = pagingAfterRefresh(scrolled, first.rows, { rows: first.rows, next: "C1" }, 2);
    expect(same.extra.map((r) => r.notification_id)).toEqual(["c", "d"]);
    expect(same.gen).toBe(2);
    expect(same.next).toBe("C2");
    // a new notification at the top pushed "b" onto page 2: the later pages would lose it, so start again
    const shifted = pagingAfterRefresh(scrolled, first.rows, { rows: [row("n"), row("a")], next: "CX" }, 2);
    expect(shifted.extra).toEqual([]);
    expect(shifted.next).toBe("CX");
  });

  it("a reload mid-request cancels the loading flag so the next scroll asks again", () => {
    const inFlight = beginMore(pagingFrom("C1", 1));
    expect(pagingAfterRefresh(inFlight, first.rows, first, 2).loading).toBe(false);
  });

  it("builds the next-page URL with the cursor encoded", () => {
    expect(moreUrl("a b/c=")).toBe("/me/notifications?cursor=a%20b%2Fc%3D");
  });
});

describe("notificationsViewState (no spinner swap on a reload)", () => {
  const rows = [row("a")];
  it("rows on screen stay while a refetch is in flight or has failed", () => {
    expect(notificationsViewState(null, rows).kind).toBe("ready");
    expect(notificationsViewState({ ok: false, status: 500 }, rows).kind).toBe("ready");
    expect(notificationsViewState({ ok: false, status: 0 }, rows).kind).toBe("ready");
  });
  it("without rows it is the load state as before", () => {
    expect(notificationsViewState(null, []).kind).toBe("loading");
    expect(notificationsViewState({ ok: true, status: 200 }, []).kind).toBe("empty");
    expect(notificationsViewState({ ok: false, status: 500 }, []).kind).toBe("error");
    expect(notificationsViewState({ ok: false, status: 0 }, []).kind).toBe("offline");
    expect(notificationsViewState({ ok: true, status: 200 }, rows).kind).toBe("ready");
  });
});

describe("screen wiring (source scan)", () => {
  const src = readFileSync(join(__dirname, "..", "screens", "NotificationsScreen.tsx"), "utf8");
  it("is a FlatList that asks for more, with a retry, pull to refresh and a failed-load guard", () => {
    expect(src).toMatch(/<FlatList/);
    expect(src).not.toMatch(/<ScrollView/);
    expect(src).toMatch(/onEndReached=/);
    expect(src).toMatch(/onRefresh=\{load\}/);
    expect(src).toMatch(/btn\.notifications\.moreRetry/);
    expect(src).toMatch(/parseNotificationPage\(r\.data\)/);
  });
  it("marks each page as it is shown, not once for the first", () => {
    expect(src.match(/markShown\(/g)?.length).toBeGreaterThanOrEqual(3);   // definition + first page + later pages
  });
  it("does not blank the list on a reload", () => {
    expect(src).toMatch(/if \(firstRef\.current\.length === 0\) setRes\(null\)/);
  });
});
