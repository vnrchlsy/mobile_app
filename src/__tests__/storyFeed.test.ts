/**
 * Stories review step 4 (ST5), library docs/superpowers/specs/2026-11-09-stories-review.md · the Stories feed pages.
 *
 * The server now answers `{results, next}` where `next` is an opaque cursor (a keyset over
 * (created_at, story_id)). Before, the wall showed the newest 20 forever. The rules are pure so the race and the failure
 * cases run as tests (this repo has no render setup); the screen wiring is a source scan, the device walk is the proof.
 *
 *  - one page at a time; a failed page keeps the rows and the SAME cursor, for a retry in place;
 *  - a refresh drops an answer still in flight for the earlier list (it would append old rows to a new one);
 *  - a malformed page is a failed page, never a shorter or partly appended list;
 *  - a row already shown is not shown twice (a story can move between a page's request and its answer).
 */
import { readFileSync } from "fs";
import { join } from "path";

import {
  allStories, beginMore, finishMore, moreUrl, pageNext, pagingAfterRefresh, pagingFrom, shouldLoadMore, StoryPaging, storiesViewState,
} from "../storyFeed";

const row = (id: string) => ({ story_id: id, caption: id });
type Row = { story_id: string; caption: string };
const from = (data: any, gen: number) => pagingFrom<Row>(data, gen);
const page = (ids: string[], next: string | null = null) => ({ results: ids.map(row), next });

describe("pageNext", () => {
  test.each([
    [{ next: "abc" }, "abc"],
    [{ next: null }, null],
    [{}, null],
    [{ next: "" }, null],
    [{ next: 3 }, null],
    [{ next: {} }, null],
    [null, null],
    [undefined, null],
  ])("%p -> %p", (data, expected) => {
    expect(pageNext(data)).toBe(expected);
  });
});

describe("pagingFrom", () => {
  test("starts from a first page's cursor with nothing extra loaded", () => {
    expect(from(page(["a"], "c1"), 1)).toEqual({ extra: [], next: "c1", loading: false, failed: false, gen: 1 });
  });
  test("an old server (no next) has nothing more to load", () => {
    expect(from({ results: [row("a")] }, 1).next).toBeNull();
  });
});

describe("shouldLoadMore", () => {
  const base: StoryPaging<ReturnType<typeof row>> = { extra: [], next: "c1", loading: false, failed: false, gen: 1 };
  test("yes when there is a cursor and nothing is in flight", () => expect(shouldLoadMore(base)).toBe(true));
  test("not while a page is in flight (a second scroll event asks for nothing)", () =>
    expect(shouldLoadMore({ ...base, loading: true })).toBe(false));
  test("not at the end", () => expect(shouldLoadMore({ ...base, next: null })).toBe(false));
  test("not after a failure: the retry is the person's tap, so a dead server is not asked in a loop", () =>
    expect(shouldLoadMore({ ...base, failed: true })).toBe(false));
});

describe("finishMore", () => {
  const start = () => beginMore(from(page(["a", "b"], "c1"), 1));
  const first = [row("a"), row("b")];

  test("beginMore marks a page in flight and clears an earlier failure", () => {
    const failed = { ...from(page(["a"], "c1"), 1), failed: true };
    expect(beginMore(failed)).toMatchObject({ loading: true, failed: false, next: "c1" });
  });

  test("a good page appends in order and moves the cursor", () => {
    const p = finishMore(start(), 1, true, page(["c", "d"], "c2"), first);
    expect(p).toMatchObject({ loading: false, failed: false, next: "c2" });
    expect(allStories(first, p).map((r) => r.story_id)).toEqual(["a", "b", "c", "d"]);
  });

  test("the last page ends the list", () => {
    expect(finishMore(start(), 1, true, page(["c"], null), first).next).toBeNull();
  });

  test("a row already shown is not shown twice", () => {
    const p = finishMore(start(), 1, true, page(["b", "c"], null), first);
    expect(allStories(first, p).map((r) => r.story_id)).toEqual(["a", "b", "c"]);
  });

  test("an empty page with a cursor does not loop: the cursor is taken as given and nothing is appended", () => {
    const p = finishMore(start(), 1, true, page([], "c2"), first);
    expect(p.extra).toEqual([]);
    expect(p.next).toBe("c2");
  });

  test("a failed page keeps the rows and the SAME cursor, and says it failed", () => {
    const p = finishMore(start(), 1, false, null, first);
    expect(p).toMatchObject({ loading: false, failed: true, next: "c1", extra: [] });
  });

  test.each([
    ["no body", undefined],
    ["null body", null],
    ["results not an array", { results: "x", next: null }],
    ["a row without a story_id", { results: [{ caption: "x" }], next: null }],
    ["a row that is not an object", { results: [5], next: null }],
  ])("a malformed page (%s) is a failed page: nothing is appended", (_n, data) => {
    const p = finishMore(start(), 1, true, data, first);
    expect(p).toMatchObject({ failed: true, loading: false, next: "c1", extra: [] });
  });

  test("an answer from before a refresh is dropped whole", () => {
    const stale = start();                                              // gen 1 asks for a page...
    const refreshed = from(page(["x", "y"], "c9"), 2);            // ...then the list is reloaded (gen 2)
    expect(finishMore(refreshed, 1, true, page(["c"], "c2"), [row("x"), row("y")])).toBe(refreshed);
    expect(stale.gen).toBe(1);
  });

  test("a failure from before a refresh is dropped too (it must not mark the new list failed)", () => {
    const refreshed = from(page(["x"], "c9"), 2);
    expect(finishMore(refreshed, 1, false, null, [row("x")])).toBe(refreshed);
  });
});

describe("pagingAfterRefresh", () => {
  // The first page reloads on every focus (so a story just posted, or a reaction just tapped, shows). The pages already
  // scrolled through are kept only when the first page still ends where it did: a new story at the top pushes the old 20th
  // row onto page 2, and keeping the later pages would leave that row in neither.
  const shown = [row("a"), row("b")];
  const loaded = () => finishMore(beginMore(from(page(["a", "b"], "c1"), 1)), 1, true, page(["c", "d"], "c2"), shown);

  test("same boundary: the later pages and their cursor are kept, under a new generation", () => {
    const p = pagingAfterRefresh(loaded(), shown, page(["a", "b"], "c1"), 2);
    expect(p).toMatchObject({ next: "c2", gen: 2, loading: false });
    expect(p.extra.map((r) => r.story_id)).toEqual(["c", "d"]);
  });

  test("the boundary moved (a new story at the top): start again from the fresh first page", () => {
    const p = pagingAfterRefresh(loaded(), shown, page(["z", "a"], "c9"), 2);
    expect(p).toEqual({ extra: [], next: "c9", loading: false, failed: false, gen: 2 });
  });

  test("nothing loaded after the first page yet: it is just the fresh first page's cursor", () => {
    const p = pagingAfterRefresh(from(page(["a", "b"], "c1"), 1), shown, page(["a", "b"], "c5"), 2);
    expect(p).toEqual({ extra: [], next: "c5", loading: false, failed: false, gen: 2 });
  });

  test("no earlier first page (the very first load): a fresh start", () => {
    expect(pagingAfterRefresh(from({}, 0), null, page(["a"], "c1"), 1).next).toBe("c1");
  });

  test("a page in flight at the refresh is dropped by the new generation and the cursor stays where it was", () => {
    const inflight = beginMore(loaded());                                // asking for c2 under gen 1
    const p = pagingAfterRefresh(inflight, shown, page(["a", "b"], "c1"), 2);
    expect(p).toMatchObject({ loading: false, next: "c2", gen: 2 });
    expect(finishMore(p, 1, true, page(["e"], "c3"), shown)).toBe(p);    // the old answer lands and is ignored
  });

  test("an empty first page ends the list", () => {
    expect(pagingAfterRefresh(loaded(), shown, page([], null), 2)).toMatchObject({ extra: [], next: null });
  });
});

describe("storiesViewState", () => {
  // `useCachedFeed.load` sets the result to null at the start of every refetch, and `loadState(null)` is "loading". A screen
  // that draws a spinner for that swaps the list out and back on every focus, so coming back from a story (or a pull to
  // refresh) lost the person's place, and with paging that place can be 40 stories deep.
  const rows = [row("a")];
  test("rows on screen and a refetch in flight: keep showing the rows", () => {
    expect(storiesViewState(null, rows, false)).toEqual({ kind: "ready" });
  });
  test("nothing on screen yet and a load in flight: loading", () => {
    expect(storiesViewState(null, null, false)).toEqual({ kind: "loading" });
    expect(storiesViewState(null, [], false)).toEqual({ kind: "loading" });
  });
  test("an answered load behaves as before: empty, offline, error, ready", () => {
    expect(storiesViewState({ ok: true, status: 200 }, [], false)).toEqual({ kind: "empty" });
    expect(storiesViewState({ ok: true, status: 200 }, rows, false)).toEqual({ kind: "ready" });
    expect(storiesViewState({ ok: false, status: 0 }, null, false).kind).toBe("offline");
    expect(storiesViewState({ ok: false, status: 500 }, null, false).kind).toBe("error");
  });
  test("a failed refresh over rows stays ready (the stale banner says so)", () => {
    expect(storiesViewState({ ok: false, status: 0 }, rows, true)).toEqual({ kind: "ready" });
  });
});

describe("allStories", () => {
  test("before the first page there is nothing", () => {
    expect(allStories(null, from({}, 1))).toEqual([]);
  });
});

describe("moreUrl", () => {
  test("puts the cursor in the query, encoded", () => {
    expect(moreUrl("a_b-c")).toBe("/stories?cursor=a_b-c");
    expect(moreUrl("a b&c")).toBe("/stories?cursor=a%20b%26c");
  });
});

describe("the screen", () => {
  const src = readFileSync(join(__dirname, "..", "screens", "StoriesScreen.tsx"), "utf-8");

  test("the feed is a FlatList that asks for more near the end", () => {
    expect(src).toMatch(/<FlatList/);
    expect(src).toMatch(/onEndReached=\{loadMore\}/);
  });

  test("more pages are read straight from the API with the cursor and never written to the feed cache", () => {
    expect(src).toMatch(/api\.get\(moreUrl\(/);
    expect(src).not.toMatch(/loadFeed\(moreUrl/);
  });

  test("the list is not swapped for a spinner while the first page reloads", () => {
    expect(src).toContain("storiesViewState(");
    expect(src).not.toMatch(/const state = feedState\(/);
  });

  test("pull to refresh reloads the first page", () => {
    expect(src).toMatch(/<RefreshControl|refreshing=\{/);
    expect(src).toMatch(/onRefresh=\{/);
  });

  test("a failed page can be retried in place", () => {
    expect(src).toContain('testID="btn.stories.moreRetry"');
    expect(src).toMatch(/Couldn't load more/);
  });

  test("a refresh starts a new generation so an answer in flight for the old list is dropped", () => {
    expect(src).toMatch(/pagingFrom\(/);
    expect(src).toMatch(/finishMore\(/);
  });

  test("coming back from a story reloads the first page (a new story or a tapped reaction shows) but keeps the pages loaded", () => {
    expect(src).toMatch(/useFocusEffect\(\s*useCallback\(\(\) => \{ load\(\);/);
    expect(src).not.toContain("useRefreshOnFocus");
    expect(src).toContain("pagingAfterRefresh(");
  });
});
