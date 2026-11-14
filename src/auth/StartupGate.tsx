import { BootSplash } from "../components/BootSplash";
import { useAuth } from "./AuthContext";

/**
 * Holds the app on the launch screen until AuthProvider has read the saved session. Everything
 * below it (connectivity, the outbox, the navigator, SessionGuard) reads tokens on mount, so
 * none of it should run against a session that has not been restored yet.
 */
export function StartupGate({ children }: { children: React.ReactNode }) {
  const { isReady } = useAuth();
  if (!isReady) return <BootSplash />;
  return <>{children}</>;
}
