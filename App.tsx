import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "./src/auth/AuthContext";
import { SessionGuard } from "./src/auth/SessionGuard";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { PushBridge } from "./src/push/PushBridge";
import type { RootStackParamList } from "./src/navigation/types";

export default function App() {
  const navRef = useNavigationContainerRef<RootStackParamList>();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={navRef}>
          <StatusBar hidden />
          <SessionGuard navRef={navRef} />
          {/* US-E4 · registers this install's push token and routes a tapped
              notification through the type whitelist. Renders nothing. */}
          <PushBridge navRef={navRef} />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
