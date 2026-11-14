import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { LogBox } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppLockGate } from "./src/auth/AppLockGate";
import { AuthProvider } from "./src/auth/AuthContext";
import { SessionGuard } from "./src/auth/SessionGuard";
import { StartupGate } from "./src/auth/StartupGate";
import { TermsGate } from "./src/auth/TermsGate";
import { OfflineBanner } from "./src/components/OfflineBanner";
import { ConnectivityProvider } from "./src/net/ConnectivityProvider";
import { OutboxProvider } from "./src/outbox/OutboxProvider";
import { initErrorReporting } from "./src/observability";
import { LinkBridge } from "./src/navigation/LinkBridge";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { PushBridge } from "./src/push/PushBridge";
import type { RootStackParamList } from "./src/navigation/types";

// LogBox targeted ignore (from library/dev/test-plan-guest.md Run 7's "LogBox ergonomic"
// finding). RN's own Animated internals warn "Sending onAnimatedValueUpdate with no
// listeners registered" during ordinary tab-bar/screen transitions — nothing we can fix
// at this level and nothing a developer needs to see. Keeping every other warning
// unmuted so a genuine yellow-box still surfaces. Dev-only; releases have LogBox off
// entirely per the RN default. Fixes the ergonomic issue where the yellow banner
// overlapped the F19 dev chip on SignupWall and other bottom-of-screen affordances
// during Maestro / MCP walks.
if (__DEV__) LogBox.ignoreLogs([/onAnimatedValueUpdate/]);

// US-E2 · started at module scope, before the first render, so a crash during startup is
// still captured. No-op until a DSN is configured.
initErrorReporting();

export default function App() {
  const navRef = useNavigationContainerRef<RootStackParamList>();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        {/* Launch screen (logo + loading bar) until the saved session is read. Everything
            below reads tokens on mount, so none of it mounts before that. */}
        <StartupGate>
        {/* US-O1 · one connectivity source, above the navigator so every screen and the
            report outbox (US-O3) can read it and hook the reconnect transition. */}
        <ConnectivityProvider>
        {/* US-O3 · inside ConnectivityProvider (it hooks the reconnect transition) and
            inside AuthProvider (it needs a token to send). */}
        <OutboxProvider>
        <NavigationContainer ref={navRef}>
          {/* The REAL status bar. It was hidden app-wide so that screens could draw their
              own — a mockup's hard-coded "9:41" and a hand-drawn battery, shipped to users
              who have a real clock and a real battery, both of which they would rather see.
              `dark` because the app is a light surface; the two screens with a dark strip at
              the top (welcome, profile) override it locally. */}
          <StatusBar style="dark" />
          <SessionGuard navRef={navRef} />
          <TermsGate navRef={navRef} />
          {/* US-E4 · registers this install's push token and routes a tapped
              notification through the type whitelist. Renders nothing. */}
          <PushBridge navRef={navRef} />
          {/* Stories review step 11 · a shared story link opens the story. */}
          <LinkBridge navRef={navRef} />
          {/* Plan Task 14b · the opt-in biometric lock; above every screen, inert for a guest. */}
          <AppLockGate>
            <RootNavigator />
          </AppLockGate>
          {/* Above the floating tab bar, never covering a primary action. */}
          <OfflineBanner />
        </NavigationContainer>
        </OutboxProvider>
        </ConnectivityProvider>
        </StartupGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
