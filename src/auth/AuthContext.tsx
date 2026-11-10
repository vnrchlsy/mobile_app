import * as SecureStore from "expo-secure-store";

import { clearCache } from "../cache";
import { clearStepUpCache } from "../stepUpCache";
import { type AccountType, clearAccountType, loadAccountType, saveAccountType } from "./accountTypeStore";
import { clearAppLockPreference } from "./appLockStore";
import { signOutWithRevoke } from "./logout";
import { clearAppBadge } from "../push/badge";
import { createContext, useContext, useEffect, useState } from "react";

type Tokens = { access: string; refresh: string } | null;
type AuthValue = {
  tokens: Tokens;
  isReady: boolean;
  setTokens: (t: Tokens) => Promise<void>;
  signOut: () => Promise<void>;
  // City has no GET endpoint (only PUT /me/location) — M5 caches the last value the user picked
  // here, alongside tokens, so Home/Profile can both read it without re-deriving it from /me.
  city: string | null;
  setCity: (c: string | null) => Promise<void>;
  // Who the signed-in person is, remembered so a cold start opens the right shell before (or without) /me.
  // Spec 2026-11-04-account-aware-first-screen-design.md; null = not known yet.
  accountType: AccountType | null;
  setAccountType: (t: AccountType) => Promise<void>;
};

const KEY = "kupkop.tokens";
const CITY_KEY = "kupkop.city";
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokensState] = useState<Tokens>(null);
  const [city, setCityState] = useState<string | null>(null);
  const [accountType, setAccountTypeState] = useState<AccountType | null>(null);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    Promise.all([SecureStore.getItemAsync(KEY), SecureStore.getItemAsync(CITY_KEY), loadAccountType()])
      .then(([rawTokens, rawCity, rawType]) => {
        try {
          if (rawTokens) {
            setTokensState(JSON.parse(rawTokens));
            // The remembered type belongs to the signed-in session: restored only together with parseable tokens.
            if (rawType) setAccountTypeState(rawType);
          }
        } catch {
          // corrupt entry — treat as signed out, and forget whose shell it was
          void clearAccountType();
        }
        if (rawCity) setCityState(rawCity);
      })
      .finally(() => setReady(true));
  }, []);

  async function setTokens(t: Tokens) {
    setTokensState(t);
    if (t) {
      await SecureStore.setItemAsync(KEY, JSON.stringify(t));
    } else {
      // First, so a later step that throws cannot leave the previous account's shell choice behind for the next sign-in.
      setAccountTypeState(null);
      await clearAccountType();
      await SecureStore.deleteItemAsync(KEY);
      // Any tokens -> null transition ends the session — not just explicit signOut(). The API
      // client's own 401/refresh-failure branch (src/api/client.ts) calls this setTokens(null)
      // directly on silent session expiry, bypassing signOut(). Clearing the cached city here
      // too (rather than only in signOut()) closes that leak: without it, a second person
      // signing in on the same device after a silent expiry would see the previous account's
      // city until they manually changed it.
      setCityState(null);
      await SecureStore.deleteItemAsync(CITY_KEY);
      // US-X1 · the read cache goes the same way, and for the same reason. It holds the
      // previous account's listings, stories, shifts and nearby reports; on a shared phone
      // the next person to sign in would open the app to someone else's feeds. Hooked HERE
      // rather than in signOut() because the silent expiry path bypasses signOut entirely.
      await clearCache();
      // Plan Task 14b · the app-lock preference is per signed-in account on this phone: forgotten here for the
      // same reason as the city and the cache (a silent expiry bypasses signOut).
      await clearAppLockPreference();
      // N5 · a remembered step-up proof is as personal as the app-lock preference: gone on any session end.
      clearStepUpCache();
      // NP22 · the icon's unread number belongs to the account that just left.
      void clearAppBadge();
    }
  }

  async function setCity(c: string | null) {
    setCityState(c);
    if (c) await SecureStore.setItemAsync(CITY_KEY, c);
    else await SecureStore.deleteItemAsync(CITY_KEY);
  }

  async function setAccountType(t: AccountType) {
    setAccountTypeState(t);
    await saveAccountType(t);
  }

  async function signOut() {
    // F15 · revoke the refresh token server-side first (bounded, best-effort — see
    // ./logout.ts), THEN wipe. setTokens(null) also clears the cached city and the read
    // cache — see the comment in setTokens().
    await signOutWithRevoke(tokens, () => setTokens(null));
  }

  return (
    <AuthContext.Provider value={{ tokens, isReady, setTokens, signOut, city, setCity, accountType, setAccountType }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
