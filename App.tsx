import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "./src/auth/AuthContext";
import { SessionGuard } from "./src/auth/SessionGuard";
import { OfflineBanner } from "./src/components/OfflineBanner";
import { ConnectivityProvider } from "./src/net/ConnectivityProvider";
import { OutboxProvider } from "./src/outbox/OutboxProvider";
import { initErrorReporting } from "./src/observability";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { PushBridge } from "./src/push/PushBridge";
import type { RootStackParamList } from "./src/navigation/types";

// US-E2 · started at module scope, before the first render, so a crash during startup is
// still captured. No-op until a DSN is configured.
initErrorReporting();

export default function App() {
  const navRef = useNavigationContainerRef<RootStackParamList>();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        {/* US-O1 · one connectivity source, above the navigator so every screen and the
            report outbox (US-O3) can read it and hook the reconnect transition. */}
        <ConnectivityProvider>
        {/* US-O3 · inside ConnectivityProvider (it hooks the reconnect transition) and
            inside AuthProvider (it needs a token to send). */}
        <OutboxProvider>
        <NavigationContainer ref={navRef}>
          <StatusBar hidden />
          <SessionGuard navRef={navRef} />
          {/* US-E4 · registers this install's push token and routes a tapped
              notification through the type whitelist. Renders nothing. */}
          <PushBridge navRef={navRef} />
          <RootNavigator />
          {/* Above the floating tab bar, never covering a primary action. */}
          <OfflineBanner />
        </NavigationContainer>
        </OutboxProvider>
        </ConnectivityProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
