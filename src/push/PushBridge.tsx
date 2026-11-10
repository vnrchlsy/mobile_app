// US-E4 · the runtime half of push: registers this install's token, and routes a tapped
// notification to the right screen.
//
// The pure rules live in `src/push.ts` (tested); this component is the thin layer that hands
// them the real Expo modules and the navigation ref.
//
// A tap is KEPT until the app can act on it (step 8): on a cold start it arrives before the session is read and before the
// navigator exists, and while signed out it waits for the sign-in. `src/pushTap.ts` decides when. Registration at sign-in never
// shows the system permission prompt (step 9): it registers only if the person already allowed it; the ask happens after a
// first meaningful action (`src/push/PushPromptHost.tsx`).
//
// ⚠️ ROUTING GOES THROUGH THE TYPE WHITELIST, NEVER A URL. `notificationTarget()` maps a
// notification's `type` + `data` onto a known screen, and anything unrecognised goes nowhere.
// That is the Sprint 5 rule and it matters here more than anywhere else: a push payload is
// attacker-influenceable in a way an in-app list is not, so a payload must never be able to
// name its own destination.
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { isAuthFlowRoute } from "../auth/SessionGuard";
import { NotificationTarget, notificationTarget, pushNotificationId } from "../notifications";
import { tapPlan } from "../pushTap";
import { openOwnerTab, ownerTabKeyForRoute } from "../appTabs";
import { openShelterTab, shelterTabKeyForRoute } from "../shelterTabs";
import { PushPromptHost } from "./PushPromptHost";
import { registerAndStore } from "./registerDevice";

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

type PendingTap = { target: NotificationTarget | null; notificationId: string | null; at: number };

function openTarget(navRef: any, target: NotificationTarget) {
  const { screen, ...params } = target as any;
  // SQ5 · a shelter tab is entered through the one helper, not by name (the switch PR makes it a nested navigate).
  const key = shelterTabKeyForRoute(screen);
  if (key) { openShelterTab(navRef, key); return; }
  // SQ5 follow-up · same for a member tab (a volunteer notification opens the Kawang-Gawa hub): a root-level
  // `navigate("kawanggawa")` does not reach a screen inside a tab navigator.
  const ownerKey = ownerTabKeyForRoute(screen);
  if (ownerKey) { openOwnerTab(navRef, ownerKey, Object.keys(params).length ? params : undefined); return; }
  navRef.navigate(screen, Object.keys(params).length ? params : undefined);
}

export function PushBridge({ navRef }: { navRef: any }) {
  const api = useApi();
  const { tokens, isReady } = useAuth();
  const registered = useRef(false);
  // The tap listener below lives for the whole app, so it reads the session and api through refs.
  const signedIn = useRef(false);
  signedIn.current = !!tokens;
  const authReady = useRef(false);
  authReady.current = isReady;
  const apiRef = useRef(api);
  apiRef.current = api;
  const pending = useRef<PendingTap | null>(null);

  // Act on a kept tap if the app can now (src/pushTap.ts decides); called whenever any of the conditions may have changed.
  const flush = useRef(() => {
    const p = pending.current;
    const navReady = !!navRef?.isReady?.();
    const plan = tapPlan({
      pending: !!p, at: p?.at ?? 0, now: Date.now(), authReady: authReady.current, navReady,
      signedIn: signedIn.current,
      inAuthFlow: navReady ? isAuthFlowRoute(navRef.getCurrentRoute?.()?.name) : false,
    });
    if (plan === "drop") pending.current = null;
    if (plan !== "route" || !p) return;
    pending.current = null;
    // NP8 / NQ3 · a tapped push is read: mark ITS row, whether or not it has a destination.
    if (p.notificationId) void apiRef.current.post(`/me/notifications/${p.notificationId}/read`, { via: "push" });
    if (p.target) openTarget(navRef, p.target);
  });

  // Register once per signed-in session. Re-running on every render would re-POST the same token; re-running on sign-in is
  // correct, because the backend upserts and RE-HOMES the token to the new account — the shared-device fix from Sprint 5.
  // NP10 · `mayAsk` is false: this never shows the system prompt (that waits for a first meaningful action, PushPromptHost).
  useEffect(() => {
    if (!tokens || registered.current) return;
    registered.current = true;
    void registerAndStore(api, false);
  }, [tokens, api]);

  // Reset the guard on sign-out so the next person to sign in on this device registers
  // their own token rather than inheriting the previous session's.
  useEffect(() => {
    if (!tokens) registered.current = false;
  }, [tokens]);

  // The session was read, or a sign-in happened: a kept tap may now be actionable.
  useEffect(() => { flush.current(); }, [tokens, isReady]);

  // A tap on a notification, whether the app was backgrounded or cold-started.
  useEffect(() => {
    function go(response: Notifications.NotificationResponse) {
      const content = response?.notification?.request?.content;
      const data = (content?.data ?? {}) as Record<string, any>;
      // The backend puts the notification `type` in the payload; without it there is no
      // destination, and guessing one from a URL is exactly what this avoids.
      const target = notificationTarget({ type: String(data.type ?? ""), data });
      const notificationId = pushNotificationId(data);
      if (!target && !notificationId) return;
      pending.current = { target, notificationId, at: Date.now() };
      flush.current();
    }

    const sub = Notifications.addNotificationResponseReceivedListener(go);
    // Cold start: the tap that launched the app is not delivered to the listener above.
    void Notifications.getLastNotificationResponseAsync().then((r) => { if (r) go(r); });
    // The navigator may not exist yet, or may still be inside the sign-in flow: try again on every navigation state change.
    const off = navRef?.addListener?.("state", () => flush.current());
    return () => { sub.remove(); if (typeof off === "function") off(); };
  }, [navRef]);

  return <PushPromptHost />;
}
