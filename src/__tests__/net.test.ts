import { isConnected, isOffline, loadState, loadStateCopy } from "../net";

describe("isOffline", () => {
  it("recognises client.ts's network sentinel", () => {
    expect(isOffline({ ok: false, status: 0 })).toBe(true);
  });

  it("does not mistake a server refusal for a network failure", () => {
    // The distinction is the whole point: a 403 is the server saying no, and telling the
    // person they are offline would send them to check their wifi over a permissions problem.
    expect(isOffline({ ok: false, status: 403 })).toBe(false);
    expect(isOffline({ ok: false, status: 500 })).toBe(false);
    expect(isOffline({ ok: true, status: 200 })).toBe(false);
    expect(isOffline(null)).toBe(false);
  });
});

describe("loadState", () => {
  it("is loading until a result arrives", () => {
    expect(loadState(null)).toEqual({ kind: "loading" });
    expect(loadState(undefined)).toEqual({ kind: "loading" });
  });

  it("separates offline from server error", () => {
    expect(loadState({ ok: false, status: 0 })).toEqual({ kind: "offline" });
    expect(loadState({ ok: false, status: 500 })).toEqual({ kind: "error", retryable: true });
    expect(loadState({ ok: false, status: 404 })).toEqual({ kind: "error", retryable: false });
  });

  it("treats a successful empty response as empty, not as a failure", () => {
    // The bug this prevents: an owner who has not filed a report yet was shown an error for
    // the perfectly ordinary state of having nothing.
    expect(loadState({ ok: true, status: 200 }, 0)).toEqual({ kind: "empty" });
    expect(loadState({ ok: true, status: 200 }, 3)).toEqual({ kind: "ready" });
  });

  it("is ready when a detail load succeeds with no count to check", () => {
    expect(loadState({ ok: true, status: 200 })).toEqual({ kind: "ready" });
  });
});

describe("loadStateCopy", () => {
  it("says you're offline, and offers a retry", () => {
    const copy = loadStateCopy({ kind: "offline" });
    expect(copy.title).toMatch(/offline/i);
    expect(copy.retry).toBe(true);
  });

  it("does not offer a retry for an empty list", () => {
    // Retrying an empty list produces the same empty list; the button would be a lie.
    const copy = loadStateCopy({ kind: "empty" }, "No reports yet", "File one from Home.");
    expect(copy.title).toBe("No reports yet");
    expect(copy.retry).toBe(false);
  });

  it("distinguishes our fault from yours", () => {
    expect(loadStateCopy({ kind: "error", retryable: true }).body).toMatch(/our end/i);
    expect(loadStateCopy({ kind: "error", retryable: false }).body).toMatch(/try again/i);
  });
});

describe("isConnected", () => {
  it("believes the OS when it says the network is gone", () => {
    expect(isConnected({ isConnected: false, isInternetReachable: false })).toBe(false);
    expect(isConnected({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it("treats 'still probing' as online so the banner does not flash on every cold start", () => {
    // A banner that appears for a moment on every launch is a banner people learn to ignore,
    // and then it is worthless on the day it matters.
    expect(isConnected({ isConnected: true, isInternetReachable: null })).toBe(true);
    expect(isConnected(null)).toBe(true);
  });

  it("is online when the OS says so", () => {
    expect(isConnected({ isConnected: true, isInternetReachable: true })).toBe(true);
  });
});
