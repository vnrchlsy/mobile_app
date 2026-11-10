// The real Expo modules behind `registerPushToken` (src/push.ts), shared by PushBridge (silent registration at sign-in) and
// PushPromptHost (registration right after the person says yes). Kept out of push.ts so that file stays testable without Expo.
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerPushToken, RegisterDeps } from "../push";
import { OsPermission } from "../pushPrompt";
import { saveRegisteredPushToken } from "./pushTokenStore";

export async function currentPermission(): Promise<OsPermission> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as OsPermission;
}

export async function requestPermission(): Promise<OsPermission> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status as OsPermission;
}

type Api = { post: RegisterDeps["post"] };

export function pushDeps(api: Api): RegisterDeps {
  return {
    getPermission: currentPermission,
    requestPermission,
    getToken: async () => {
      try {
        const t = await Notifications.getExpoPushTokenAsync();
        return t.data;
      } catch {
        // No Expo project / APNs credentials configured yet: expected until push is switched on, and not a reason to show anything.
        return null;
      }
    },
    post: (path, body) => api.post(path, body),
    isDevice: Device.isDevice,
  };
}

/**
 * Register this install and remember the server's id for it (so sign-out can drop exactly this device, NP2).
 * `mayAsk` false = never show the system prompt: register only if permission is already granted.
 */
export async function registerAndStore(api: Api, mayAsk: boolean): Promise<void> {
  const result = await registerPushToken(pushDeps(api), Platform.OS, mayAsk);
  if (result.status === "registered" && result.tokenId) {
    await saveRegisteredPushToken({ tokenId: result.tokenId, token: result.token });
  }
}
