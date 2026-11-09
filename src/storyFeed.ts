// Stories review step 4 (ST5) · the rules for paging the Stories wall, pure so the race and the failures are tested.
//
// `GET /stories` answers `{results, next}`; `next` is an opaque cursor the app hands back as `?cursor=` and never reads.
// The FIRST page still comes through `useCachedFeed` (cache-first, stale banner); later pages are read straight from the
// API and kept only in memory, since the feed cache holds one body per path and a half-scrolled list is not what to show
// the next time the screen opens.
//
//  - One page at a time, and not after a failure: the retry is the person's tap, so a dead server is not asked in a loop.
//  - A failed page keeps the rows and the SAME cursor; it never turns a list that loaded into a failed load.
//  - A malformed page is a failed page, never a shorter or partly appended list (the rule `parseImpact` applies).
//  - A reload of the first page starts a new generation, and an answer from before it is dropped whole.
//  - A row already shown is not shown twice: a story can move between a page's request and its answer.
import { parseStoryPage, Story } from "./community";
import { Apiish, LoadState } from "./net";
import { feedState } from "./useCachedFeed";

export type StoryPaging<T> = {
  /** Rows loaded after the first page, in order. */
  extra: T[];
  /** The cursor for the next page, or null at the end. */
  next: string | null;
  loading: boolean;
  failed: boolean;
  /** Bumped by every `pagingFrom` (a reload of the first page); `finishMore` ignores an answer from an older one. */
  gen: number;
};

type HasId = { story_id: string };

export function pageNext(data: any): string | null {
  const next = data?.next;
  return typeof next === "string" && next.length > 0 ? next : null;
}

/** A fresh paging state from a first page (cached or fetched). */
export function pagingFrom<T>(data: any, gen: number): StoryPaging<T> {
  return { extra: [], next: pageNext(data), loading: false, failed: false, gen };
}

/**
 * The first page was reloaded (every focus does, so a story just posted or a reaction just tapped shows). Keep the pages
 * already scrolled through only when the first page still ends where it did: a new story at the top pushes the old 20th row
 * onto page 2, and keeping the later pages would leave that row in neither. Otherwise start again from the fresh page.
 *
 * Always a new generation, so a page still in flight for the old list is dropped when it lands; its cursor was not taken, so
 * `next` stays where it was and the next scroll asks for it again.
 */
export function pagingAfterRefresh<T extends HasId>(
  p: StoryPaging<T>, prevFirst: T[] | null, data: any, gen: number,
): StoryPaging<T> {
  const fresh: HasId[] = Array.isArray(data?.results) ? data.results : [];
  const sameBoundary = !!prevFirst && prevFirst.length > 0 && fresh.length > 0
    && prevFirst[prevFirst.length - 1].story_id === fresh[fresh.length - 1]?.story_id;
  if (p.extra.length > 0 && sameBoundary) return { ...p, loading: false, gen };
  return pagingFrom(data, gen);
}

export function shouldLoadMore<T>(p: StoryPaging<T>): boolean {
  return p.next !== null && !p.loading && !p.failed;
}

export function beginMore<T>(p: StoryPaging<T>): StoryPaging<T> {
  return { ...p, loading: true, failed: false };
}

/**
 * Apply the answer for a page asked for under generation `gen`. `shown` is the first page's rows, for the dedupe.
 * Returns `p` itself (same object) when the answer belongs to an older list.
 */
export function finishMore(
  p: StoryPaging<Story>, gen: number, ok: boolean, data: any, shown: Story[],
): StoryPaging<Story> {
  if (gen !== p.gen) return p;
  // The same check as the first page (src/community.ts parseStoryPage): one bad story is a failed page, never a partly appended one.
  const page = ok ? parseStoryPage(data) : null;
  if (!page) return { ...p, loading: false, failed: true };
  const seen = new Set([...shown, ...p.extra].map((r) => r.story_id));
  const fresh = page.results.filter((r) => !seen.has(r.story_id));
  return { ...p, extra: [...p.extra, ...fresh], next: page.next, loading: false, failed: false };
}

export function allStories<T>(first: T[] | null, p: StoryPaging<T>): T[] {
  return [...(first ?? []), ...p.extra];
}

export function moreUrl(cursor: string): string {
  return `/stories?cursor=${encodeURIComponent(cursor)}`;
}

/**
 * What the Stories screen draws. `useCachedFeed.load` sets the result to null at the start of every refetch, and that reads
 * as "loading": a screen that drew a spinner for it swapped the list out and back on every focus, so coming back from a story
 * (or a pull to refresh) lost the person's place, and with paging that place can be dozens of stories deep. With rows on
 * screen a refetch in flight leaves them there; everything else is `feedState`, unchanged.
 */
export function storiesViewState<T>(res: Apiish | null | undefined, rows: T[] | null, stale: boolean): LoadState {
  if ((res === null || res === undefined) && rows && rows.length > 0) return { kind: "ready" };
  return feedState(res, rows, stale);
}

/**
 * An api whose `GET`s of the wall are checked against the contract: a 200 that is not a page becomes a 502, so the feed hook treats it as a failed
 * load (error with a retry, the rows already shown kept) and never as an empty or shorter wall. Everything else passes through as it was.
 */
export function withStoryContract<R extends { ok: boolean; status: number; data: any }>(
  api: { get: (path: string) => Promise<R> },
): { get: (path: string) => Promise<R> } {
  return {
    get: async (path) => {
      const r = await api.get(path);
      return r.ok && !parseStoryPage(r.data) ? { ...r, ok: false, status: 502 } : r;
    },
  };
}
