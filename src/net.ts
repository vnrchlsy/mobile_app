// US-O1 · connectivity rules (§13.3 "Offline & poor-connectivity — the PH mobile reality").
//
// §13.3's requirement is not "handle offline" in the abstract. It is: **degrade gracefully,
// never fail, and never silently lose a user's report.** Filipino users run on intermittent
// mobile data, and the app's most important action — reporting an animal in trouble — is
// exactly the one most likely to be attempted from a patchy connection on the street.
//
// The primitive already existed: `client.ts` returns `{ok: false, status: 0}` for a network
// failure instead of throwing (US-C1, Sprint 6), so nothing hangs. What was missing is that
// **no screen distinguishes that from a 500** — so a person offline sees "something went
// wrong", which is both untrue and unactionable. These helpers are that distinction, kept
// pure so every screen can share one behaviour instead of inventing 85 of them.

/** The sentinel `client.ts` returns when the request never reached an HTTP status. */
export const NETWORK_STATUS = 0;

export type Apiish = { ok: boolean; status: number };

/** Did this fail because the network is unreachable, rather than because the server said no? */
export function isOffline(res: Apiish | null | undefined): boolean {
  return !!res && !res.ok && res.status === NETWORK_STATUS;
}

export type LoadState =
  | { kind: "loading" }
  | { kind: "offline" }
  // US-R2 · 404/403 on a DETAIL route. Distinct from `error` because it is not a fault and
  // not retryable: the row was deleted, or the viewer's access ended (an expired claim,
  // §12.5). Telling someone to "try again" for either is a lie they can act on forever.
  | { kind: "gone" }
  | { kind: "error"; retryable: boolean }
  | { kind: "empty" }
  | { kind: "ready" };

/**
 * What a list or detail screen should render, from the API result and what came back.
 *
 * The four outcomes are deliberately distinct, because they need different words and
 * different affordances:
 *   offline — "you're offline", retry is worth offering
 *   error   — the server refused; retry only helps if it was a 5xx
 *   empty   — the request SUCCEEDED and there is genuinely nothing, which is not a failure
 *   ready   — render the data
 *
 * Collapsing empty into error is the bug this prevents: an owner with no reports yet was
 * being shown a failure for the perfectly ordinary state of not having filed one.
 */
/**
 * US-R2 · THE RULE FOR SCREENS THAT FETCH MORE THAN ONCE.
 *
 * `ShelterDashboardScreen` and `ShelterProfileScreen` each issue two or three GETs, so
 * PARTIAL failure is a real outcome and "did it load?" has no single answer. The decision,
 * so US-R5's conversions do not each invent one:
 *
 *   PRIMARY fetch fails  -> whole-screen state. The screen is *about* that data; rendering
 *                           a shell around a hole is worse than saying it didn't load.
 *   SECONDARY fetch fails -> leave the rest of the screen alone and degrade that panel
 *                           only. Blanking a shelter's whole dashboard because one counter
 *                           timed out throws away the parts that did arrive.
 *
 * Deciding which is which is a per-screen judgement, and it is the ONLY judgement a
 * converter should have to make: on the dashboards, `/shelter/dashboard` is primary and
 * `/me` is secondary (it supplies the name and tier, not the substance).
 *
 * ⚠️ The failure mode this exists to prevent is the opposite of the rescue map's: not a
 * confident empty state, but a confident PARTIAL one — a dashboard showing three real
 * counters and one fabricated zero, with nothing to say which is which.
 */
export function loadState(res: Apiish | null | undefined, count?: number): LoadState {
  if (res === null || res === undefined) return { kind: "loading" };
  // ⚠️ ORDER MATTERS. `client.ts` returns status 0 for a network failure, which is also
  // `!ok` — so the offline check must come before any status branch below, or every
  // offline request would be classified as "gone" and the user told their report was
  // deleted when the phone simply had no signal.
  if (isOffline(res)) return { kind: "offline" };
  if (res.status === 404 || res.status === 403) return { kind: "gone" };
  if (!res.ok) return { kind: "error", retryable: res.status >= 500 };
  if (count === 0) return { kind: "empty" };
  return { kind: "ready" };
}

/**
 * Copy for a non-ready state. Plain, specific, and never blames the person — §13.3's "clear
 * connectivity feedback" means the user can tell whose problem it is and what to do next.
 */
export function loadStateCopy(
  state: LoadState, emptyTitle = "Nothing here yet", emptyBody = "",
  /**
   * US-R2 · the thing this screen is about — "listing", "report", "story". Detail routes
   * pass it so the copy names what failed; list screens pass nothing and read exactly as
   * they did before. Bare noun, no article: the sentences add "this".
   */
  subject?: string,
): { title: string; body: string; retry: boolean } {
  switch (state.kind) {
    case "offline":
      // ⚠️ US-X1 FOUND THIS COMPONENT TELLING THE LIE IT WAS BUILT TO PREVENT.
      //
      // The body used to read "Showing what we have. Reconnect to see the latest." —
      // unconditionally. But LoadStateView REPLACES the content, so on every screen without
      // a cache it announced that it was showing what we have while showing nothing at all.
      // Exactly the class of confident-false-statement Track R spent five stories removing,
      // sitting inside Track R's own shared component.
      //
      // It is now true by construction: a screen with cached rows never reaches this branch
      // (it renders the rows, with `StaleBanner` above them), and a screen without one says
      // what is actually the case.
      return {
        title: "You're offline",
        body: "We couldn't reach the server. Reconnect to see the latest.",
        retry: true,
      };
    case "gone":
      // No retry. That is the whole difference from `error` — the affordance would be a
      // promise the app cannot keep.
      return {
        title: subject ? `This ${subject} is no longer available` : "This is no longer available",
        body: "It may have been removed, or you no longer have access to it.",
        retry: false,
      };
    case "error":
      return {
        title: subject ? `Couldn't load this ${subject}` : "Couldn't load that",
        body: state.retryable ? "Something went wrong on our end." : "Please try again.",
        retry: true,
      };
    case "empty":
      return { title: emptyTitle, body: emptyBody, retry: false };
    default:
      return { title: "", body: "", retry: false };
  }
}

/**
 * NetInfo reports `isInternetReachable` as `null` while it is still probing.
 *
 * Treating "unknown" as offline would flash the banner on every cold start, which trains
 * people to ignore it — so the app is considered ONLINE until the OS actually says otherwise.
 * A false negative here costs a failed request that the screens already handle; a false
 * positive costs the banner's credibility.
 */
export function isConnected(
  state: { isConnected?: boolean | null; isInternetReachable?: boolean | null } | null,
): boolean {
  if (!state) return true;
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}
