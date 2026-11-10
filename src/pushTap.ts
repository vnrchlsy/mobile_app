// Notifications review step 8 (NP9) · when a tapped push may be acted on. Pure, so the cases are tested.
//
// A tap can arrive before the app can use it: on a cold start the listener fires while the session is still being read from
// SecureStore and before the navigator exists (`navRef.isReady()` false), and the old code simply dropped it, so the person landed
// on Home instead of the rescue. Or the person is signed out (the app opens on Welcome) and signs in a moment later. The tap is
// kept, and acted on at the first moment all of these hold; it is dropped if that takes too long (a push from earlier whose
// context is gone, or from a different account the person might sign in as).
export const TAP_TTL_MS = 10 * 60 * 1000;

export type TapState = {
  /** There is a tap waiting. */
  pending: boolean;
  /** When it arrived and now (ms). */
  at: number;
  now: number;
  /** The session has been read from storage (AuthContext.isReady). */
  authReady: boolean;
  /** The navigator exists and has a state. */
  navReady: boolean;
  signedIn: boolean;
  /** The focused screen is part of the sign-in / sign-up / recovery flow, which is about to reset the stack. */
  inAuthFlow: boolean;
};

export type TapPlan = "none" | "wait" | "drop" | "route";

export function tapPlan(s: TapState): TapPlan {
  if (!s.pending) return "none";
  if (s.now - s.at > TAP_TTL_MS) return "drop";
  if (!s.authReady || !s.navReady) return "wait";
  // Signed out: keep it for the sign-in that may follow. Still inside the sign-in flow after signing in: wait, because that flow
  // resets the stack to Home and would overwrite a screen pushed now.
  if (!s.signedIn || s.inAuthFlow) return "wait";
  return "route";
}
