// US-O1 · one connectivity source for the whole app (§13.3).
//
// Exposes whether the device is online, and a subscribe hook for "we just came back" — which
// is what lets a foregrounded screen refetch and the report outbox (US-O3) flush, instead of
// each of them polling or waiting for the user to pull down.
import NetInfo from "@react-native-community/netinfo";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { isConnected } from "../net";

type Value = {
  online: boolean;
  /** Run `fn` the next time the device transitions offline → online. Returns an unsubscribe. */
  onReconnect: (fn: () => void) => () => void;
};

const ConnectivityContext = createContext<Value>({ online: true, onReconnect: () => () => {} });

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const listeners = useRef(new Set<() => void>());
  const wasOnline = useRef(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const next = isConnected(state);
      setOnline(next);
      // Fire only on the TRANSITION back, not on every event — NetInfo emits repeatedly while
      // a connection settles, and a refetch storm on a flaky link is the opposite of helpful.
      if (next && !wasOnline.current) {
        listeners.current.forEach((fn) => {
          // One listener throwing must not stop the others; a failed refetch is not a reason
          // for the outbox never to flush.
          try { fn(); } catch { /* ignore */ }
        });
      }
      wasOnline.current = next;
    });
    return unsubscribe;
  }, []);

  const onReconnect = useCallback((fn: () => void) => {
    listeners.current.add(fn);
    return () => { listeners.current.delete(fn); };
  }, []);

  return (
    <ConnectivityContext.Provider value={{ online, onReconnect }}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  return useContext(ConnectivityContext);
}
