import Constants from "expo-constants";

// US-E1 · the API base comes from the resolved Expo config (app.config.ts), which REFUSES to
// build a preview or production binary without one. Reading it here rather than from
// process.env means the value the build validated is the value the app uses.
//
// The localhost fallback survives only for `expo start` against a bare checkout; it can no
// longer reach a store build, because app.config.ts throws before such a build is produced.
const BASE: string =
  (Constants.expoConfig?.extra?.apiBase as string | undefined) ??
  process.env.EXPO_PUBLIC_API_BASE ??
  "http://localhost:8000/api/v1";

type Tokens = { access: string; refresh: string } | null;
export type ApiResult<T = any> = { ok: boolean; status: number; data: T };

// US-C1 · a network/timeout/non-JSON failure returns THIS (status 0) instead of rejecting, so
// a screen's bare `await api.get(...)` never hangs or throws — callers check `res.ok` and get a
// clean falsy result to render an error/empty state. Status 0 = "never reached a real HTTP
// status" (offline, DNS, timeout, or an unparseable body).
const NETWORK_FAIL: ApiResult = {
  ok: false, status: 0,
  data: { error: { code: "network_error", message: "Couldn't reach the server." } }
};

export function createApi(getTokens: () => Tokens, setTokens: (t: Tokens) => Promise<void>) {
  async function raw(method: string, path: string, body?: any, retry = true, accessOverride?: string): Promise<ApiResult> {
    const tokens = getTokens();
    const access = accessOverride ?? tokens?.access;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (access) headers.Authorization = `Bearer ${access}`;

    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, {
        method, headers, body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      return NETWORK_FAIL;   // offline / DNS / timeout — never rejects to the caller
    }

    // A non-JSON body (an error page, a truncated response) must not throw — keep the real
    // HTTP status and fall back to empty data so `res.ok`/`res.status` stay meaningful.
    let data: any = {};
    if (res.status !== 204) {
      try {
        data = await res.json();
      } catch {
        data = {};
      }
    }

    if (res.status === 401 && retry && tokens?.refresh) {
      let r: Response;
      try {
        r = await fetch(`${BASE}/auth/refresh`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: tokens.refresh }),
        });
      } catch {
        return NETWORK_FAIL;   // can't even reach refresh — don't wipe the session on a blip
      }
      if (r.ok) {
        let rd: any;
        try {
          rd = await r.json();
        } catch {
          await setTokens(null);
          return { ok: false, status: r.status, data: {} };
        }
        await setTokens({ access: rd.access, refresh: tokens.refresh });
        return raw(method, path, body, false, rd.access);
      }
      await setTokens(null);
    }
    return { ok: res.status < 400, status: res.status, data };
  }
  return {
    get: (p: string) => raw("GET", p),
    post: (p: string, b?: any) => raw("POST", p, b),
    patch: (p: string, b?: any) => raw("PATCH", p, b),
    put: (p: string, b?: any) => raw("PUT", p, b),
    del: (p: string) => raw("DELETE", p),
  };
}
