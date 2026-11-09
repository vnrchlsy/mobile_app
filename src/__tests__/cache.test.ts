/**
 * US-X1 · the read cache, and §12.5.
 *
 * The behaviour tests matter, but the §12.5 block is the reason this file is not optional:
 * a mistake there writes an animal's real location — and the home of whoever reported it —
 * to unencrypted disk, where it survives sign-out and outlives the session that made it.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  CACHEABLE_PATHS, CACHE_TTL_MS, cacheKeyPath, clearCache, isCacheable, readCache, writeCache,
} from "../cache";

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useRealTimers();
});

describe("§12.5 · what may go on disk", () => {
  it("caches the coarsened map feed", () => {
    // ~500m grid (sagip.geo.coarsen_point), never the real point.
    expect(isCacheable("/reports/map?city=Marikina&radius_km=10")).toBe(true);
  });

  it("NEVER caches a report detail, which carries precise_location", () => {
    // ⚠️ THE TRAP THIS WHOLE DESIGN IS SHAPED AROUND. `/reports/map` and `/reports/{id}`
    // differ by one path segment, and the detail route returns the real coordinates to the
    // reporter and the active claimer (US-SEC1). Allowlisting the RESOURCE `/reports` and
    // matching by prefix — the obvious implementation — writes an animal's exact location,
    // and the home of whoever reported it, to unencrypted disk.
    //
    // Verified by mutation, and worth knowing which test does what, because it is not this
    // one alone: prefix matching by itself is caught by "refuses a path that merely starts
    // with a cacheable one"; adding `/reports` by itself is caught by "keeps the allowlist
    // small and deliberate"; and the two TOGETHER — the actual mistake — fail this one.
    expect(isCacheable("/reports/3f2b1c4d-0000-4000-8000-000000000000")).toBe(false);
    expect(isCacheable("/reports/abc/matches")).toBe(false);
  });

  it("NEVER caches /me, which carries the account's phone number", () => {
    // Also: caching identity is how a screen shows a stale verification badge — the exact
    // failure US-R1 fixed on ProfileScreen.
    expect(isCacheable("/me")).toBe(false);
    expect(isCacheable("/me/notifications")).toBe(false);
    expect(isCacheable("/me/inquiries")).toBe(false);
  });

  it("refuses a path that merely starts with a cacheable one", () => {
    // `/listings` is cacheable; `/listings/<id>/inquiries` is a different resource, and the
    // allowlist must not leak from one to the other.
    expect(isCacheable("/listings")).toBe(true);
    expect(isCacheable("/listings/abc")).toBe(false);
    expect(isCacheable("/listingsomething")).toBe(false);
  });

  it("keeps the allowlist small and deliberate", () => {
    // Not a style rule. Every entry is a §12.5 decision, and a list that grows without
    // anyone noticing is how the first bad one gets in.
    expect(CACHEABLE_PATHS.length).toBeLessThanOrEqual(6);
    expect([...CACHEABLE_PATHS].sort()).toEqual(
      ["/listings", "/reports/map", "/shifts", "/stories"]);
  });

  it("writing a non-cacheable path is a silent no-op, not a stored value", () => {
    // The important half: a caller that gets this wrong must not succeed anyway.
    return writeCache("/reports/abc", { precise_location: { lat: 14.65, lng: 121.10 } })
      .then(() => AsyncStorage.getAllKeys())
      .then((keys) => expect(keys.filter((k) => k.includes("reports"))).toEqual([]));
  });
});

describe("round trip", () => {
  it("returns what was written, for a cacheable path", async () => {
    await writeCache("/stories", { results: [{ story_id: "s1" }] });
    expect(await readCache("/stories")).toEqual({ results: [{ story_id: "s1" }] });
  });

  it("keys on the full path including the query string", async () => {
    // Two cities are two different answers; serving one for the other would show a person
    // strays from a place they are not in.
    await writeCache("/reports/map?city=Marikina", { reports: [1] });
    await writeCache("/reports/map?city=Pasig", { reports: [2, 3] });
    expect(await readCache("/reports/map?city=Marikina")).toEqual({ reports: [1] });
    expect(await readCache("/reports/map?city=Pasig")).toEqual({ reports: [2, 3] });
    // ...while the ALLOWLIST is still checked against the path alone.
    expect(cacheKeyPath("/reports/map?city=Pasig")).toBe("/reports/map");
  });

  it("misses on an empty cache", async () => {
    expect(await readCache("/stories")).toBeNull();
  });

  it("treats an expired entry as absent", async () => {
    const now = Date.now();
    jest.spyOn(Date, "now").mockReturnValue(now);
    await writeCache("/stories", { results: [] });
    jest.spyOn(Date, "now").mockReturnValue(now + CACHE_TTL_MS + 1);
    expect(await readCache("/stories")).toBeNull();
    jest.restoreAllMocks();
  });

  it("treats a corrupt entry as absent rather than throwing", async () => {
    // A cache that can crash a screen is worse than no cache.
    await AsyncStorage.setItem("kupkop.cache./stories", "{not json");
    expect(await readCache("/stories")).toBeNull();
  });
});

describe("clearing on session end", () => {
  it("drops cached feeds", async () => {
    await writeCache("/stories", { results: [{ story_id: "s1" }] });
    await writeCache("/listings", { results: [{ listing_id: "l1" }] });
    await clearCache();
    expect(await readCache("/stories")).toBeNull();
    expect(await readCache("/listings")).toBeNull();
  });

  it("leaves other libraries' keys alone", async () => {
    // AsyncStorage is a shared store. A blanket clear() on every session end would take
    // whatever else lives in it.
    await AsyncStorage.setItem("someOtherLibrary.state", "keep me");
    await writeCache("/stories", { results: [] });
    await clearCache();
    expect(await AsyncStorage.getItem("someOtherLibrary.state")).toBe("keep me");
  });
});

describe("US-X1 · a failed refresh must not empty the screen", () => {
  // ⚠️ THIS IS THE BUG FIX, NOT THE CACHING. StoriesScreen and RescueMapScreen both did
  // `setRows(r.ok ? r.data.results : [])`, so a failed REFETCH replaced rows the person was
  // reading with an empty array. On the rescue map that is a list of nearby strays emptying
  // itself because a refresh on focus timed out — the same lie Track R spent five stories
  // removing, one step earlier, in the state rather than the render.
  const { nextFeed } = require("../useCachedFeed");

  it("replaces the rows on success", () => {
    expect(nextFeed(["old"], true, ["new"])).toEqual({ rows: ["new"], stale: false });
  });

  it("KEEPS the rows on failure, and marks them stale", () => {
    expect(nextFeed(["old"], false, [])).toEqual({ rows: ["old"], stale: true });
  });

  it("stays null on failure when nothing was loaded", () => {
    // Nothing to be stale about — this is a load state, and LoadStateView owns it. Marking
    // it stale would put "showing what we saved earlier" above an empty screen.
    expect(nextFeed(null, false, [])).toEqual({ rows: null, stale: false });
  });

  it("a genuinely empty success is still empty, not stale", () => {
    // The distinction Track R exists for: the server said "none", and that is an answer.
    expect(nextFeed(["old"], true, [])).toEqual({ rows: [], stale: false });
  });
});

describe("F-R3-1 · a failed refresh with rows on screen still SHOWS them", () => {
  // `nextFeed` kept the rows and raised `stale` — and every feed screen then threw both
  // away, because it branched on `loadState(res, n).kind !== "ready"`, and `loadState`
  // answers `offline`/`error` for a failed response before it ever looks at the count. So
  // the cached rows were replaced by "You're offline" and the StaleBanner branch was dead
  // code on all four screens. Found live on a device (Run 3, VB-N3).
  const { feedState } = require("../useCachedFeed");
  const offline = { ok: false, status: 0 };
  const serverError = { ok: false, status: 503 };

  it("renders the rows when a refresh failed but rows are cached", () => {
    expect(feedState(offline, ["old"], true)).toEqual({ kind: "ready" });
    expect(feedState(serverError, ["old"], true)).toEqual({ kind: "ready" });
  });

  it("leaves a failure with nothing to show to LoadStateView", () => {
    expect(feedState(offline, null, false)).toEqual({ kind: "offline" });
    expect(feedState(serverError, null, false)).toEqual({ kind: "error", retryable: true });
    // A cached EMPTY list that failed to refresh has nothing to be stale about on screen —
    // "showing what we saved earlier" above nothing is the offline state with extra words.
    expect(feedState(offline, [], true)).toEqual({ kind: "offline" });
  });

  it("is loadState everywhere else", () => {
    expect(feedState(null, ["old"], false)).toEqual({ kind: "loading" });
    expect(feedState({ ok: true, status: 200 }, [], false)).toEqual({ kind: "empty" });
    expect(feedState({ ok: true, status: 200 }, ["new"], false)).toEqual({ kind: "ready" });
  });

  describe("no feed screen gates its rows on loadState alone", () => {
    // The pure test above proves the helper; this proves the screens use it. The bug was not
    // in any one screen — it was the same line hand-written into four — so the guard scans
    // every screen on the shared hook rather than a list that the fifth one will miss.
    const { readdirSync, readFileSync } = require("fs");
    const { join } = require("path");
    const SCREENS = join(__dirname, "..", "screens");
    const code = (f: string) => readFileSync(join(SCREENS, f), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const FEEDS: string[] = readdirSync(SCREENS)
      .filter((f: string) => f.endsWith(".tsx") && /useCachedFeed</.test(code(f)));

    it("finds the feed screens it is guarding", () => {
      // A scan that matches nothing passes everything. Four today; more is fine.
      expect(FEEDS.length).toBeGreaterThanOrEqual(4);
    });

    it.each(FEEDS)("%s decides its render with feedState", (file) => {
      const src = code(file);
      // Stories review step 4 · StoriesScreen goes through `storiesViewState` (src/storyFeed.ts), which IS `feedState` plus one
      // rule: rows on screen stay while a refetch is in flight, so the list is not swapped for a spinner on every focus.
      expect(src).toMatch(/(feedState|storiesViewState)\(\s*res\s*,/);
      // Whatever `loadState` is still used for (a count badge, say), it must not be what
      // decides between rows and LoadStateView.
      expect(src).not.toMatch(/loadState\([^)]*\)\.kind\s*!==\s*"ready"/);
    });
  });
});
