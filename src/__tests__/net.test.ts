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
    // ⚠️ 404 MOVED to `gone` in US-R2 (2026-09-05); it used to assert
    // `{ kind: "error", retryable: false }` here. The old classification was not wrong so
    // much as unfinished: it correctly refused to promise a retry, but the copy still read
    // "Couldn't load that — please try again", which is the promise it had just withheld.
    // See the "gone is not error" block below for the replacement.
    expect(loadState({ ok: false, status: 404 })).toEqual({ kind: "gone" });
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


// ── US-R2 · what a NON-LIST failure looks like ──────────────────────────────────────
// `LoadStateView` was built for lists, and Sprint 8's Track R has to convert ~15 detail
// routes and ~5 forms with it. These are the decisions that make R3–R5 mechanical instead
// of 28 separate arguments.
describe("US-R2 · detail routes: gone is not error", () => {
  it("a 404 is `gone`, not a retryable error", () => {
    // THE POINT. A detail route reached from a deep link or a push can fail because the row
    // was deleted — not because the network is bad. Rendering "Please try again" for that
    // invites someone to retry forever a request that can never succeed, which is the same
    // shape of lie as the rescue map's "No strays reported near Marikina right now".
    expect(loadState({ ok: false, status: 404 })).toEqual({ kind: "gone" });
  });

  it("a 403 is `gone` too — access ended, and the row may still exist", () => {
    // §12.5: a rescuer's claim expires and the precise-location detail closes to them. From
    // the phone that is indistinguishable from deletion, and "no longer available" is true
    // for both. Saying "something went wrong on our end" would be false.
    expect(loadState({ ok: false, status: 403 })).toEqual({ kind: "gone" });
  });

  it("a 500 is still a retryable error", () => {
    expect(loadState({ ok: false, status: 500 })).toEqual({ kind: "error", retryable: true });
  });

  it("gone never offers retry", () => {
    expect(loadStateCopy({ kind: "gone" }).retry).toBe(false);
  });

  it("offline still wins over gone — the status is meaningless if nothing arrived", () => {
    // `client.ts` returns status 0 for a network failure. Checking `!ok` first would
    // classify every offline request as `gone` and tell the user their report was deleted.
    expect(loadState({ ok: false, status: 0 })).toEqual({ kind: "offline" });
  });
});

describe("US-R2 · detail routes name what failed", () => {
  it("without a subject the copy is unchanged — existing list callers are untouched", () => {
    expect(loadStateCopy({ kind: "error", retryable: false }).title).toBe("Couldn't load that");
  });

  it("with a subject an error names it", () => {
    expect(loadStateCopy({ kind: "error", retryable: false }, undefined, undefined, "listing").title)
      .toBe("Couldn't load this listing");
  });

  it("with a subject `gone` names it", () => {
    expect(loadStateCopy({ kind: "gone" }, undefined, undefined, "report").title)
      .toBe("This report is no longer available");
  });

  it("`empty` ignores the subject — a detail route never reaches it", () => {
    // `loadState` only returns `empty` when a count was passed, and detail screens pass
    // none. Belt and braces: "No listings yet" on a page about one listing is the exact
    // nonsense US-R2 exists to prevent.
    expect(loadStateCopy({ kind: "empty" }, "No stories yet", "", "story").title)
      .toBe("No stories yet");
  });
});
