// Notifications review step 5 (NP5, NP19) · the rules for the bell's paged list, pure so the races and the failures are tested.
//
// `GET /me/notifications` answers `{notifications, next}`; `next` is an opaque cursor handed back as `?cursor=` and never read.
// It is the stories wall's paging (src/storyFeed.ts) for a different row:
//  - One page at a time, and not after a failure: the retry is the person's tap.
//  - A failed page keeps the rows and the SAME cursor; it never turns a list that loaded into a failed load.
//  - A malformed page is a failed page, never a shorter or partly appended list.
//  - A reload of the first page starts a new generation; an answer from before it is dropped whole.
//  - A row already shown is not shown twice.
// An older server answers `{notifications}` with no `next`: that is one page, and the list simply ends.
import type { MeNotification } from "./api/types";
import { Apiish, LoadState, loadState } from "./net";

export type FeedPage = { rows: MeNotification[]; next: string | null };

function isRow(r: any): r is MeNotification {
  return !!r && typeof r === "object"
    && typeof r.notification_id === "string" && r.notification_id !== ""
    && typeof r.type === "string"
    && typeof r.read === "boolean"
    && typeof r.created_at === "string" && !Number.isNaN(Date.parse(r.created_at));
}

/** The page, or null when the body is not one. One bad row fails the page: identity is strict, as for the stories wall. */
export function parseNotificationPage(data: any): FeedPage | null {
  const list = data?.notifications;
  if (!Array.isArray(list) || !list.every(isRow)) return null;
  const next = data.next;
  return { rows: list, next: typeof next === "string" && next.length > 0 ? next : null };
}

export type NotifPaging = {
  /** Rows loaded after the first page, in order. */
  extra: MeNotification[];
  next: string | null;
  loading: boolean;
  failed: boolean;
  /** Bumped by every reload of the first page; `finishMore` ignores an answer from an older one. */
  gen: number;
};

export function pagingFrom(next: string | null, gen: number): NotifPaging {
  return { extra: [], next, loading: false, failed: false, gen };
}

/**
 * The first page was reloaded (every focus does). Keep the pages already scrolled through only when the first page still ends
 * where it did: a new notification at the top pushes the old last row onto page 2, and keeping the later pages would leave
 * that row in neither. Otherwise start again from the fresh page. Always a new generation.
 */
export function pagingAfterRefresh(
  p: NotifPaging, prevFirst: MeNotification[] | null, fresh: FeedPage, gen: number,
): NotifPaging {
  const last = (rows: MeNotification[] | null) => (rows && rows.length ? rows[rows.length - 1].notification_id : null);
  const sameBoundary = last(prevFirst) !== null && last(prevFirst) === last(fresh.rows);
  if (p.extra.length > 0 && sameBoundary) return { ...p, loading: false, gen };
  return pagingFrom(fresh.next, gen);
}

export function shouldLoadMore(p: NotifPaging): boolean {
  return p.next !== null && !p.loading && !p.failed;
}

export function beginMore(p: NotifPaging): NotifPaging {
  return { ...p, loading: true, failed: false };
}

/** Apply the answer for a page asked for under generation `gen`. Returns `p` itself when the answer belongs to an older list. */
export function finishMore(
  p: NotifPaging, gen: number, ok: boolean, data: any, shown: MeNotification[],
): { paging: NotifPaging; page: MeNotification[] } {
  if (gen !== p.gen) return { paging: p, page: [] };
  const parsed = ok ? parseNotificationPage(data) : null;
  if (!parsed) return { paging: { ...p, loading: false, failed: true }, page: [] };
  const seen = new Set([...shown, ...p.extra].map((r) => r.notification_id));
  const fresh = parsed.rows.filter((r) => !seen.has(r.notification_id));
  return { paging: { ...p, extra: [...p.extra, ...fresh], next: parsed.next, loading: false, failed: false }, page: parsed.rows };
}

export function allRows(first: MeNotification[] | null, p: NotifPaging): MeNotification[] {
  return [...(first ?? []), ...p.extra];
}

export function moreUrl(cursor: string): string {
  return `/me/notifications?cursor=${encodeURIComponent(cursor)}`;
}

/**
 * What the bell draws. The screen used to set its result to null at the start of every focus, which read as "loading" and
 * swapped the list for a spinner, losing the person's place. With rows on screen a refetch in flight leaves them there.
 */
export function notificationsViewState(res: Apiish | null | undefined, rows: MeNotification[]): LoadState {
  if ((res === null || res === undefined) && rows.length > 0) return { kind: "ready" };
  // A first-page refetch that FAILED while rows are shown keeps the rows (a stale list beats an error over a list).
  if (res && !res.ok && rows.length > 0) return { kind: "ready" };
  return loadState(res, rows.length);
}
