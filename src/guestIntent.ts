// US-A1b — a tiny module-singleton (not React state/context) so the intent survives the guest
// -> accountType -> signup -> otp -> signupSuccess -> home navigation chain without needing to be
// threaded through every route's params, and without persisting to SecureStore (it's meant to be
// resumed once, this session, then forgotten — a stale intent surviving an app relaunch would be
// surprising). HomeScreen's focus effect calls takeIntent() once it lands after signup.
export type GuestIntentAction = "adopt" | "report" | "volunteer" | "react" | "donate" | "share_story" | "account";

let pendingIntent: GuestIntentAction | null = null;

export function setIntent(action: GuestIntentAction) {
  pendingIntent = action;
}

// Read-and-clear: resuming an intent is a one-shot action, so a second read (e.g. a later
// focus of Home) must not re-surface the same toast.
export function takeIntent(): GuestIntentAction | null {
  const intent = pendingIntent;
  pendingIntent = null;
  return intent;
}
