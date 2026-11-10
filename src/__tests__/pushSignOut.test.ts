/**
 * Notifications review NP2 · signing out must drop THIS phone's push token. The server already deletes a
 * token named in the /auth/logout body; the app never sent it and threw the registration away, so a shared
 * phone kept delivering the previous person's pushes.
 */
import { signOutWithRevoke } from "../auth/logout";

const TOKENS = { access: "acc-1", refresh: "ref-1" };
const PAIR = { tokenId: "tok-1", token: "ExponentPushToken[abc]" };

function captureFetch() {
  const calls: { url: string; body: any }[] = [];
  global.fetch = jest.fn(async (url: any, init: any) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : undefined });
    return { status: 204, ok: true, json: async () => ({}) } as unknown as Response;
  });
  return calls;
}

test("sign-out sends the registered push token with the revoke, then clears it and wipes", async () => {
  const calls = captureFetch();
  const order: string[] = [];
  await signOutWithRevoke(
    TOKENS,
    async () => { order.push("wipe"); },
    async () => PAIR,
    async () => { order.push("clear"); },
  );
  expect(calls).toHaveLength(1);
  expect(calls[0].url).toMatch(/\/auth\/logout$/);
  expect(calls[0].body).toEqual({ refresh: "ref-1", fcm_token: "ExponentPushToken[abc]" });
  expect(order).toEqual(["clear", "wipe"]);
});

test("an install that never registered sends only the refresh", async () => {
  const calls = captureFetch();
  await signOutWithRevoke(TOKENS, async () => {}, async () => null, async () => {});
  expect(calls[0].body).toEqual({ refresh: "ref-1" });
});

test("a failing storage read or clear never blocks sign-out", async () => {
  const calls = captureFetch();
  const wipe = jest.fn(async () => {});
  await signOutWithRevoke(
    TOKENS, wipe,
    async () => { throw new Error("keychain locked"); },
    async () => { throw new Error("keychain locked"); },
  );
  expect(calls[0].body).toEqual({ refresh: "ref-1" });
  expect(wipe).toHaveBeenCalledTimes(1);
});

test("offline: the stored registration is still cleared and the wipe still runs", async () => {
  global.fetch = jest.fn(async () => { throw new TypeError("Network request failed"); });
  const clear = jest.fn(async () => {});
  const wipe = jest.fn(async () => {});
  await signOutWithRevoke(TOKENS, wipe, async () => PAIR, clear);
  expect(clear).toHaveBeenCalledTimes(1);
  expect(wipe).toHaveBeenCalledTimes(1);
});

test("no session: no request, nothing read", async () => {
  const calls = captureFetch();
  const load = jest.fn(async () => PAIR);
  await signOutWithRevoke(null, async () => {}, load, async () => {});
  expect(calls).toHaveLength(0);
  expect(load).not.toHaveBeenCalled();
});

test("the registration is stored where both the silent and the explained paths go through", () => {
  const read = (...p: string[]) => require("fs").readFileSync(require("path").join(__dirname, "..", ...p), "utf8");
  expect(read("push", "registerDevice.ts")).toMatch(/saveRegisteredPushToken\(/);
  expect(read("push", "PushBridge.tsx")).toMatch(/registerAndStore\(/);
  expect(read("push", "PushPromptHost.tsx")).toMatch(/registerAndStore\(/);
});
