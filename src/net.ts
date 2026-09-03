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
export function loadState(res: Apiish | null | undefined, count?: number): LoadState {
  if (res === null || res === undefined) return { kind: "loading" };
  if (isOffline(res)) return { kind: "offline" };
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
): { title: string; body: string; retry: boolean } {
  switch (state.kind) {
    case "offline":
      return {
        title: "You're offline",
        body: "Showing what we have. Reconnect to see the latest.",
        retry: true,
      };
    case "error":
      return {
        title: "Couldn't load that",
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
