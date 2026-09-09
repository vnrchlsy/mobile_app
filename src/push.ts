// US-E4 · the push client half.
//
// The backend has had a complete push pipeline since Sprint 5 — a `device_token` registry
// with shared-device re-homing, a notification registry that says which types push, a
// post-commit fan-out, mute handling and stale-token pruning. **No client has ever written
// to it.** Push was described as "credential-blocked", and it was, but it was also
// code-blocked: the table had no writers.
//
// This module is the missing half. Everything here is verifiable WITHOUT FCM credentials —
// permission states, token registration, deregistration, and deep-link routing all work
// against the local backend. Only the final hop (FCM actually delivering) stays blocked on
// US-D1's credentials.
//
// Kept as pure-ish functions with the Expo modules injected, so the rules can be tested
// without a device (see `src/__tests__/push.test.ts`).

export type PushPermission = "granted" | "denied" | "undetermined";

export type RegisterDeps = {
  /** Current OS permission, without prompting. */
  getPermission: () => Promise<PushPermission>;
  /** Prompt. Only ever called when `shouldAsk` says so. */
  requestPermission: () => Promise<PushPermission>;
  /** The Expo/FCM token for this install. */
  getToken: () => Promise<string | null>;
  /** POST /me/device-tokens */
  post: (path: string, body: unknown) => Promise<{ ok: boolean; status: number; data: any }>;
  /** Whether this is a real device — a simulator cannot receive push. */
  isDevice: boolean;
};

export type RegisterResult =
  | { status: "registered"; tokenId: string }
  | { status: "denied" }
  | { status: "unsupported"; reason: string }
  | { status: "failed"; reason: string };

/**
 * Should we PROMPT for notification permission right now?
 *
 * iOS gives an app exactly one chance to ask: once denied, the dialog never appears again
 * and the user has to find it in Settings. So the prompt is spent deliberately — after the
 * person has done something that makes a notification obviously useful (filed a report,
 * signed up for a shift), never at cold start when it reads as a demand from a stranger.
 */
export function shouldAsk(permission: PushPermission, hasDoneSomething: boolean): boolean {
  if (permission === "granted" || permission === "denied") return false;
  return hasDoneSomething;
}

/** The platform string the backend's `device_token.platform` column accepts. */
export function platformFor(os: string): "ios" | "android" | null {
  if (os === "ios") return "ios";
  if (os === "android") return "android";
  return null;   // web/unknown — the registry models two platforms, deliberately
}

/**
 * Register this install's push token against the signed-in account.
 *
 * Never throws: a failure to register push must not break the screen that triggered it.
 * The backend upserts on the token, re-homing it to the caller — that is the shared-device
 * fix from Sprint 5, and it is why re-registering after a different person signs in is
 * correct rather than duplicative.
 */
export async function registerPushToken(
  deps: RegisterDeps, os: string, hasDoneSomething = true,
): Promise<RegisterResult> {
  const platform = platformFor(os);
  if (!platform) return { status: "unsupported", reason: "platform" };
  // A simulator has no APNs/FCM registration to hand out; asking produces a confusing error
  // rather than a token.
  if (!deps.isDevice) return { status: "unsupported", reason: "simulator" };

  let permission = await deps.getPermission();
  if (shouldAsk(permission, hasDoneSomething)) permission = await deps.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const token = await deps.getToken();
  if (!token) return { status: "failed", reason: "no_token" };

  const res = await deps.post("/me/device-tokens", { fcm_token: token, platform });
  if (!res.ok) return { status: "failed", reason: res.status === 0 ? "offline" : "server" };
  return { status: "registered", tokenId: res.data?.token_id };
}

/**
 * Drop this install's token on sign-out.
 *
 * ⚠️ Not cosmetic. Without it, a shared phone keeps delivering the previous person's rescue
 * and adoption notifications to whoever holds it next — the exact leak the backend's
 * re-homing upsert was written to prevent, left half-open by having no client side.
 * `DELETE /me` does this server-side too (US-N1); this covers ordinary sign-out.
 */
export async function unregisterPushToken(
  del: (path: string) => Promise<{ ok: boolean; status: number }>, tokenId: string | null,
): Promise<boolean> {
  if (!tokenId) return false;
  const res = await del(`/me/device-tokens/${tokenId}`);
  return res.ok || res.status === 404;   // already gone is success, not an error
}
