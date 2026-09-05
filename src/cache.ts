/**
 * US-X1 · a small typed read cache with per-key TTL (Sprint 7's US-O2, D-S7-4).
 *
 * Deliberately NOT React Query. The need is "show the last answer while the new one loads,
 * and survive a dead connection" on a handful of feeds — not a data layer. A migration would
 * touch every screen Track R just finished touching.
 *
 * ⚠️ SEQUENCING, AND WHY THIS COULD NOT HAVE SHIPPED EARLIER. Caching a screen that cannot
 * tell a failure from an empty result means caching the wrong answer and then showing it
 * confidently for a TTL. The rescue map's "No strays reported near Marikina right now" would
 * have become a *persisted* claim. That is why US-X1 was sequenced after Track R.
 *
 * ══ §12.5 — WHAT MAY GO ON DISK ══════════════════════════════════════════════════════════
 *
 * The rule is: never a precise coordinate, never another person's contact details. Two design
 * choices carry it, and both are about what happens when someone adds an endpoint later.
 *
 *   1. AN ALLOWLIST, NOT A DENYLIST. A new endpoint is uncached until somebody decides
 *      otherwise. With a denylist the default is "cached", and the failure is silent — the
 *      data is on disk before anyone notices it should not be.
 *
 *   2. EXACT PATHS, NEVER PREFIXES, and this is the specific trap here: `/reports/map` is
 *      coarsened to a ~500m grid and is safe, while `/reports/{id}` returns `precise_location`
 *      to the reporter and the active claimer (US-SEC1). A `startsWith("/reports")` allowlist
 *      — the obvious implementation — would write the real location of an animal, and the
 *      home of whoever reported it, to unencrypted disk. The two paths differ by one segment.
 *
 * `/me` is deliberately absent even though it is the most-fetched endpoint in the app. It
 * carries the account's phone number, and caching identity is how a screen ends up showing a
 * stale verification badge — the exact failure US-R1 fixed on ProfileScreen.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

/** How long a cached body may be served before it is treated as absent. */
const TTL_MS = 10 * 60 * 1000;

/**
 * The paths whose responses may be written to disk, matched EXACTLY against the path with
 * its query string removed. Adding a line here is a §12.5 decision — read the header first.
 */
const CACHEABLE = new Set([
  "/listings",      // public adoption listings; no contact details until an inquiry is accepted
  "/stories",       // public community feed
  "/shifts",        // open volunteer shifts; org name and place, no personal contacts
  "/reports/map",   // ⚠️ coarsened only — see the header on why /reports/{id} is NOT here
]);

const PREFIX = "kupkop.cache.";

/** The path with any query string removed — the part the allowlist is written against. */
export function cacheKeyPath(path: string): string {
  const q = path.indexOf("?");
  return q === -1 ? path : path.slice(0, q);
}

export function isCacheable(path: string): boolean {
  return CACHEABLE.has(cacheKeyPath(path));
}

type Entry<T> = { storedAt: number; value: T };

/**
 * Read a cached body, or null when there is none, it has expired, or the path is not
 * cacheable. Never throws: a cache that can crash a screen is worse than no cache.
 */
export async function readCache<T = unknown>(path: string): Promise<T | null> {
  if (!isCacheable(path)) return null;
  try {
    const raw = await AsyncStorage.getItem(PREFIX + path);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (typeof entry?.storedAt !== "number") return null;
    if (Date.now() - entry.storedAt > TTL_MS) return null;
    return entry.value;
  } catch {
    // Corrupt entry, quota error, storage unavailable — behave exactly as a cache miss.
    return null;
  }
}

/** Write a body. A non-cacheable path is a silent no-op, never an error the caller can skip. */
export async function writeCache(path: string, value: unknown): Promise<void> {
  if (!isCacheable(path)) return;
  try {
    const entry: Entry<unknown> = { storedAt: Date.now(), value };
    await AsyncStorage.setItem(PREFIX + path, JSON.stringify(entry));
  } catch {
    // Full disk, quota — losing a cache write is not worth failing a screen over.
  }
}

/**
 * Drop everything.
 *
 * ⚠️ Called on ANY tokens → null transition, not just an explicit sign-out. The API client's
 * 401/refresh-failure branch calls `setTokens(null)` directly on silent session expiry,
 * bypassing signOut() — the same leak the cached city had, and closed the same way. Without
 * it, the next person to sign in on a shared phone sees the previous account's feeds.
 */
export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    // `removeMany` over our own prefix, never `clear()`. AsyncStorage is a shared store —
    // any library can put a key in it — and a blanket wipe on every session end would take
    // theirs too. (The unsent-report outbox is safe either way: it uses SecureStore on
    // purpose, because a queued report holds the animal's precise location.)
    if (ours.length) await AsyncStorage.removeMany(ours);
  } catch {
    // Nothing useful to do — and throwing here would break sign-out itself.
  }
}

/** Exposed for the §12.5 guard, so the test asserts against the real list. */
export const CACHEABLE_PATHS: readonly string[] = [...CACHEABLE];
export const CACHE_TTL_MS = TTL_MS;
