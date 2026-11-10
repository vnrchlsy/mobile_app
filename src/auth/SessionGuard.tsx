// Bounces an authed user back to `welcome` when their session ends mid-use (refresh failure or
// any other tokens -> null transition — see the comment in AuthContext.setTokens). The single
// -stack navigator (RootNavigator) only gates auth at initialRouteName on mount, so without this
// a user stranded on Home/Profile/etc. after a silent session expiry stays there with every API
// call failing until they relaunch the app. Screens that legitimately run with tokens === null
// (guest browsing, the signup/signin/recovery flow) are excluded so this doesn't interrupt them.
import { useEffect } from "react";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";

import { useAuth } from "./AuthContext";
import type { RootStackParamList } from "../navigation/types";

// LEAF route names (`getCurrentRoute()` returns the focused leaf, which inside a tab navigator is the tab's own name).
// `homeGuest` and `kawanggawa` are NOT here any more: they are tabs of the guest shell, so `sessionEndAction` decides them by
// the focused ROOT route (`guestTabs`), because a member's `kawanggawa` tab has the same leaf name as a guest's.
const AUTH_SCREENS: string[] = [
  "welcome",
  "signin",
  "signup",
  "accountType",
  "otp",
  "otpLocked",
  "restoreAccount",   // AS1 · tokens are null while the offer is on screen
  "forgotPassword",
  "resetOtp",
  "resetPassword",
  "passwordChanged",
  "support",
  // G15 (from library/dev/test-plan-guest.md Run 3): guest-accessible read-only surfaces.
  // A signed-in user whose session expires while on one of these should STAY on the
  // current screen, not bounce to Welcome — the screen is legitimately viewable as a
  // guest, so the tokens transition is silent to them and the API calls (which are
  // AllowAny reads on the backend) keep succeeding. Without these entries the guard
  // resets to Welcome and forces them to re-navigate through homeGuest.
  "stories",
  "storyDetail",
  "rescueMap",
  // G13: guests may browse the Kawang-Gawa hub, a shift's detail and the waiver read-only —
  // Request is the gated action (it opens the SignupWall), not the screens themselves. The hub itself, `kawanggawa`, is a tab
  // of the guest shell (see `sessionEndAction`); its detail and the waiver are stack screens, listed here.
  "kawanggawaDetail",
  "waiver",
];

/** Step 8 · is the focused leaf screen part of the sign-in / sign-up / recovery flow (which is about to reset the stack)? */
export function isAuthFlowRoute(leaf: string | undefined): boolean {
  return !!leaf && AUTH_SCREENS.includes(leaf);
}

export type SessionEnd = "stay" | "welcome" | "guestVolunteer";

/**
 * What to do when the session ends (tokens -> null), from the focused ROOT route and the focused LEAF route.
 * - the guest shell is viewable signed out: stay;
 * - a member on the Volunteer hub (leaf `kawanggawa` inside `ownerTabs`): the hub is viewable as a guest, but the member shell's
 *   bar and tabs are not, so move to the guest shell on the same hub ("guestVolunteer");
 * - any other leaf in AUTH_SCREENS: stay (the sign-in flow, recovery, a guest-viewable stack screen);
 * - anything else (a member's Home, Adopt, You, a pushed member screen): back to Welcome.
 * A leaf-only rule cannot tell a member's `kawanggawa` from a guest's; that is why the root route is read.
 */
export function sessionEndAction(rootRoute: string | undefined, leafRoute: string | undefined): SessionEnd {
  if (rootRoute === "guestTabs") return "stay";
  if (rootRoute === "ownerTabs" && leafRoute === "kawanggawa") return "guestVolunteer";
  if (!leafRoute || AUTH_SCREENS.includes(leafRoute)) return "stay";
  return "welcome";
}

type Props = {
  navRef: NavigationContainerRefWithCurrent<RootStackParamList>;
};

export function SessionGuard({ navRef }: Props) {
  const { tokens, isReady } = useAuth();

  useEffect(() => {
    if (!isReady || tokens !== null || !navRef.isReady()) return;
    const root = navRef.getRootState();
    const rootRoute = root?.routes[root.index ?? 0]?.name;
    const action = sessionEndAction(rootRoute, navRef.getCurrentRoute()?.name);
    if (action === "welcome") navRef.reset({ index: 0, routes: [{ name: "welcome" }] });
    else if (action === "guestVolunteer") navRef.reset({ index: 0, routes: [{ name: "guestTabs", params: { screen: "kawanggawa" } }] });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navRef is a stable ref object
  }, [tokens, isReady]);

  return null;
}
