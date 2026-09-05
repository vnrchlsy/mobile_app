/**
 * US-X1 · cache-first reads for the feeds, as one behaviour instead of four near-misses.
 *
 * The same argument as `LoadStateView`: per-screen versions drift, and the screens that
 * drift are the rarely-opened ones, where a wrong answer does the most damage.
 *
 * What it does, in order:
 *   1. serve the cached rows immediately, if there are any and they are inside the TTL;
 *   2. fire the request regardless — cache-FIRST, not cache-instead;
 *   3. on success, replace the rows and rewrite the cache;
 *   4. on failure, KEEP whatever is on screen and raise `stale`.
 *
 * ⚠️ STEP 4 IS A BUG FIX, NOT JUST CACHING. `StoriesScreen` and `RescueMapScreen` both did
 * `setRows(r.ok ? r.data.results : [])` — so a failed REFETCH replaced rows the person was
 * reading with an empty array. On the rescue map that means a list of nearby strays
 * emptying itself because a refresh on focus timed out. Track R fixed screens that
 * *rendered* a failure as empty; this is the same lie a step earlier, in the state itself.
 *
 * ⚠️ `stale` is raised ONLY when a refresh fails — never merely because rows came from the
 * cache. A banner during a refresh that is about to succeed trains people to ignore it, and
 * the one time it matters they will.
 */
import { useCallback, useState } from "react";

import { readCache, writeCache } from "./cache";
import { Apiish } from "./net";

type Api = { get: (path: string) => Promise<{ ok: boolean; status: number; data: any }> };

/**
 * The decision this hook exists to get right, as a pure function.
 *
 * Extracted so it can actually be tested: there is no react-test-renderer in this project
 * (every guard here is a source scan for that reason), so a hook's behaviour is otherwise
 * only assertable by reading it. The rule below is a data-loss rule, not a rendering
 * detail — it deserves a test that runs.
 */
export function nextFeed<T>(
  current: T[] | null, ok: boolean, fresh: T[],
): { rows: T[] | null; stale: boolean } {
  if (ok) return { rows: fresh, stale: false };
  // Keep what is on screen. `stale` is true only when there is something to BE stale —
  // a failure with nothing cached is a load state, not a stale one.
  return { rows: current, stale: current !== null };
}

export function useCachedFeed<T>(api: Api, pick: (data: any) => T[]) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [res, setRes] = useState<Apiish | null>(null);
  /** True only when a refresh failed and older rows are still on screen. */
  const [stale, setStale] = useState(false);

  const load = useCallback(
    async (path: string) => {
      setRes(null);
      setStale(false);

      // Painted before the request resolves — the entire point. Guarded on `rows === null`
      // via the functional form so a slow cache read can never clobber a fast response that
      // already landed.
      const cached = await readCache<any>(path);
      if (cached) setRows((current) => current ?? pick(cached));

      const r = await api.get(path);
      setRes({ ok: r.ok, status: r.status });
      // Decided from the CURRENT rows rather than the captured ones, because the cache read
      // above may have filled them in between.
      setRows((current) => {
        const next = nextFeed(current, r.ok, r.ok ? pick(r.data) : []);
        setStale(next.stale);
        return next.rows;
      });
      if (r.ok) await writeCache(path, r.data);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `pick` is inline at every call site
    [],
  );

  return { rows, res, stale, load };
}
