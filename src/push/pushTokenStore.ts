// Push review NP2 · remembers which push token THIS install registered and the server's id for it, so
// sign-out can ask the server to drop exactly that device. Without it the app threw away the `token_id`
// it was given and a shared phone kept delivering the last person's notifications after they signed out.
//
// The pair is not a secret on its own (it names a device, it signs nothing), but it sits beside the session
// tokens in SecureStore so the two are cleared by the same hand. Every call is best-effort and never throws:
// a storage failure must not stop a person signing out.
import * as SecureStore from "expo-secure-store";

const KEY = "kupkop.push.registered";

export type RegisteredPushToken = { tokenId: string; token: string };

function isPair(v: unknown): v is RegisteredPushToken {
  const o = v as RegisteredPushToken | null;
  return !!o && typeof o.tokenId === "string" && o.tokenId !== "" && typeof o.token === "string" && o.token !== "";
}

export async function saveRegisteredPushToken(pair: RegisteredPushToken): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(pair));
  } catch {
    /* best-effort */
  }
}

export async function loadRegisteredPushToken(): Promise<RegisteredPushToken | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isPair(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearRegisteredPushToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* best-effort */
  }
}
