import { platformFor, registerPushToken, shouldAsk, unregisterPushToken } from "../push";

const ok = (data: any = {}) => ({ ok: true, status: 201, data });

function deps(over: Partial<Parameters<typeof registerPushToken>[0]> = {}) {
  return {
    getPermission: jest.fn().mockResolvedValue("undetermined" as const),
    requestPermission: jest.fn().mockResolvedValue("granted" as const),
    getToken: jest.fn().mockResolvedValue("ExponentPushToken[abc]"),
    post: jest.fn().mockResolvedValue(ok({ token_id: "tok-1" })),
    isDevice: true,
    ...over,
  };
}

describe("shouldAsk", () => {
  it("does not re-prompt once the OS has an answer", () => {
    // iOS gives an app ONE chance. Asking again is not just useless, it is impossible —
    // the dialog never reappears — so the code must not behave as though it might.
    expect(shouldAsk("granted", true)).toBe(false);
    expect(shouldAsk("denied", true)).toBe(false);
  });

  it("waits for the user to do something that makes push obviously useful", () => {
    expect(shouldAsk("undetermined", false)).toBe(false);
    expect(shouldAsk("undetermined", true)).toBe(true);
  });
});

describe("platformFor", () => {
  it("maps to the two platforms the backend column accepts", () => {
    expect(platformFor("ios")).toBe("ios");
    expect(platformFor("android")).toBe("android");
    expect(platformFor("web")).toBeNull();
  });
});

describe("registerPushToken", () => {
  it("registers the token against the signed-in account", async () => {
    const d = deps();
    const result = await registerPushToken(d, "ios");

    expect(result).toEqual({ status: "registered", tokenId: "tok-1" });
    expect(d.post).toHaveBeenCalledWith("/me/device-tokens", {
      fcm_token: "ExponentPushToken[abc]", platform: "ios",
    });
  });

  it("does not prompt when permission was already granted", async () => {
    const d = deps({ getPermission: jest.fn().mockResolvedValue("granted" as const) });
    await registerPushToken(d, "ios");
    expect(d.requestPermission).not.toHaveBeenCalled();
  });

  it("reports denial without registering anything", async () => {
    const d = deps({
      getPermission: jest.fn().mockResolvedValue("denied" as const),
      requestPermission: jest.fn(),
    });

    expect(await registerPushToken(d, "ios")).toEqual({ status: "denied" });
    expect(d.post).not.toHaveBeenCalled();
  });

  it("skips a simulator instead of failing on it", async () => {
    // A simulator has no APNs registration; asking yields a confusing error, not a token.
    const d = deps({ isDevice: false });
    expect(await registerPushToken(d, "ios")).toEqual({ status: "unsupported", reason: "simulator" });
    expect(d.post).not.toHaveBeenCalled();
  });

  it("never throws when the network is down", async () => {
    // Push registration failing must not break the screen that triggered it.
    const d = deps({ post: jest.fn().mockResolvedValue({ ok: false, status: 0, data: {} }) });
    expect(await registerPushToken(d, "ios")).toEqual({ status: "failed", reason: "offline" });
  });

  it("reports a server refusal distinctly from being offline", async () => {
    const d = deps({ post: jest.fn().mockResolvedValue({ ok: false, status: 422, data: {} }) });
    expect(await registerPushToken(d, "ios")).toEqual({ status: "failed", reason: "server" });
  });

  it("handles the OS returning no token", async () => {
    const d = deps({ getToken: jest.fn().mockResolvedValue(null) });
    expect(await registerPushToken(d, "ios")).toEqual({ status: "failed", reason: "no_token" });
  });

  it("refuses a platform the backend registry does not model", async () => {
    const d = deps();
    expect(await registerPushToken(d, "web")).toEqual({ status: "unsupported", reason: "platform" });
    expect(d.post).not.toHaveBeenCalled();
  });
});

describe("unregisterPushToken", () => {
  it("drops the token so a shared phone stops delivering the last person's notifications", async () => {
    const del = jest.fn().mockResolvedValue({ ok: true, status: 204 });
    expect(await unregisterPushToken(del, "tok-1")).toBe(true);
    expect(del).toHaveBeenCalledWith("/me/device-tokens/tok-1");
  });

  it("treats an already-deleted token as success", async () => {
    const del = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    expect(await unregisterPushToken(del, "tok-1")).toBe(true);
  });

  it("is a no-op when this install never registered", async () => {
    const del = jest.fn();
    expect(await unregisterPushToken(del, null)).toBe(false);
    expect(del).not.toHaveBeenCalled();
  });
});
