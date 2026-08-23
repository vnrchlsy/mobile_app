import { createApi } from "../client";

function mockFetchSequence(responses: Array<{ status: number; body: any }>) {
  let i = 0;
  global.fetch = jest.fn(async () => {
    const r = responses[i++];
    return { status: r.status, ok: r.status < 400, json: async () => r.body } as Response;
  });
}

test("post returns parsed data on 200", async () => {
  mockFetchSequence([{ status: 200, body: { access: "a", refresh: "b" } }]);
  const api = createApi(() => null, async () => {});
  const res = await api.post("/auth/login", { email: "x", password: "y" });
  expect(res.ok).toBe(true);
  expect(res.data.access).toBe("a");
});

test("del sends DELETE and treats 204 as an empty-body success (US-O2 withdraw)", async () => {
  let method: string | undefined;
  global.fetch = jest.fn(async (_url: any, init: any) => {
    method = init?.method;
    return { status: 204, ok: true, json: async () => { throw new Error("204 must not be parsed"); } } as unknown as Response;
  });
  const api = createApi(() => null, async () => {});
  const res = await api.del("/reports/r1/offers/o1");
  expect(method).toBe("DELETE");
  expect(res.ok).toBe(true);
  expect(res.data).toEqual({});
});

test("refreshes once on 401 then retries with the refreshed access token", async () => {
  const responses = [
    { status: 401, body: { error: { code: "token_not_valid" } } },
    { status: 200, body: { access: "new" } },            // refresh call
    { status: 200, body: { ok: true } },                 // retried original
  ];
  const authHeaders: Array<string | undefined> = [];
  let i = 0;
  global.fetch = jest.fn(async (_url: any, init: any) => {
    authHeaders.push(init?.headers?.Authorization);
    const r = responses[i++];
    return { status: r.status, ok: r.status < 400, json: async () => r.body } as Response;
  });
  const setTokens = jest.fn(async () => {});
  const api = createApi(() => ({ access: "old", refresh: "r" }), setTokens);
  const res = await api.get("/me");
  expect(res.ok).toBe(true);
  expect(setTokens).toHaveBeenCalledWith({ access: "new", refresh: "r" });
  // 1st call: original request with the stale token; 3rd call: retried request must carry the
  // freshly-refreshed token, not the stale one still sitting in the (unchanged) getTokens() closure.
  expect(authHeaders[0]).toBe("Bearer old");
  expect(authHeaders[2]).toBe("Bearer new");
});
