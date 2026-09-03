// US-E4 · the runtime half of push: registers this install's token, and routes a tapped
// notification to the right screen.
//
// The pure rules live in `src/push.ts` (tested); this component is the thin layer that hands
// them the real Expo modules and the navigation ref.
//
// ⚠️ ROUTING GOES THROUGH THE TYPE WHITELIST, NEVER A URL. `notificationTarget()` maps a
// notification's `type` + `data` onto a known screen, and anything unrecognised goes nowhere.
// That is the Sprint 5 rule and it matters here more than anywhere else: a push payload is
// attacker-influenceable in a way an in-app list is not, so a payload must never be able to
// name its own destination.
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { notificationTarget } from "../notifications";
import { registerPushToken } from "../push";

// A notification arriving while the app is open should be visible but not disruptive — the
// in-app bell is the primary surface, and a banner over a rescue map is an interruption.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function currentPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  return status as "granted" | "denied" | "undetermined";
}

export function PushBridge({ navRef }: { navRef: any }) {
  const api = useApi();
  const { tokens } = useAuth();
  const registered = useRef(false);

  // Register once per signed-in session. Re-running on every render would re-POST the same
  // token; re-running on sign-in is correct, because the backend upserts and RE-HOMES the
  // token to the new account — the shared-device fix from Sprint 5.
  useEffect(() => {
    if (!tokens || registered.current) return;
    registered.current = true;

    void registerPushToken(
      {
        getPermission: currentPermission,
        requestPermission: async () => {
          const { status } = await Notifications.requestPermissionsAsync();
          return status as "granted" | "denied" | "undetermined";
        },
        getToken: async () => {
          try {
            const t = await Notifications.getExpoPushTokenAsync();
            return t.data;
          } catch {
            // No FCM/APNs credentials configured yet (US-D1) — expected today, and not a
            // reason to surface anything to the user.
            return null;
          }
        },
        post: (path, body) => api.post(path, body),
        isDevice: Device.isDevice,
      },
      Platform.OS,
    );
  }, [tokens, api]);

  // Reset the guard on sign-out so the next person to sign in on this device registers
  // their own token rather than inheriting the previous session's.
  useEffect(() => {
    if (!tokens) registered.current = false;
  }, [tokens]);

  // A tap on a notification, whether the app was backgrounded or cold-started.
  useEffect(() => {
    function go(response: Notifications.NotificationResponse) {
      const content = response?.notification?.request?.content;
      const data = (content?.data ?? {}) as Record<string, any>;
      // The backend puts the notification `type` in the payload; without it there is no
      // destination, and guessing one from a URL is exactly what this avoids.
      const target = notificationTarget({ type: String(data.type ?? ""), data });
      if (!target || !navRef?.isReady?.()) return;

      const { screen, ...params } = target as any;
      navRef.navigate(screen, Object.keys(params).length ? params : undefined);
    }

    const sub = Notifications.addNotificationResponseReceivedListener(go);
    // Cold start: the tap that launched the app is not delivered to the listener above.
    void Notifications.getLastNotificationResponseAsync().then((r) => { if (r) go(r); });
    return () => sub.remove();
  }, [navRef]);

  return null;
}
