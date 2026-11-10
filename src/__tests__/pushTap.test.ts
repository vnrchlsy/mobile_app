/**
 * Notifications review step 8 (NP9) · a tapped push is KEPT until the app can act on it. The old code dropped a tap when the
 * navigator was not ready, so a cold start from a rescue push landed on Home.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { TAP_TTL_MS, tapPlan, TapState } from "../pushTap";

const OK: TapState = { pending: true, at: 1_000, now: 2_000, authReady: true, navReady: true, signedIn: true, inAuthFlow: false };
const plan = (over: Partial<TapState>) => tapPlan({ ...OK, ...over });

describe("tapPlan", () => {
  it("does nothing when no tap is waiting", () => {
    expect(plan({ pending: false })).toBe("none");
    expect(plan({ pending: false, navReady: false, signedIn: false })).toBe("none");
  });

  it("routes when the session is read, the navigator is ready and the person is signed in", () => {
    expect(plan({})).toBe("route");
  });

  it("waits on a cold start: the session is still being read", () => {
    expect(plan({ authReady: false })).toBe("wait");
  });

  it("waits on a cold start: the navigator does not exist yet (the old code dropped the tap here)", () => {
    expect(plan({ navReady: false })).toBe("wait");
    expect(plan({ navReady: false, authReady: false })).toBe("wait");
  });

  it("keeps a tap that arrives signed out, for the sign-in that may follow", () => {
    expect(plan({ signedIn: false })).toBe("wait");
  });

  it("waits while the sign-in flow is still on screen, because it will reset the stack to Home", () => {
    expect(plan({ inAuthFlow: true })).toBe("wait");
  });

  it("drops a tap that has waited past the TTL, in every waiting state", () => {
    const late = { now: OK.at + TAP_TTL_MS + 1 };
    for (const over of [{}, { authReady: false }, { navReady: false }, { signedIn: false }, { inAuthFlow: true }]) {
      expect(plan({ ...over, ...late })).toBe("drop");
    }
  });

  it("the TTL boundary: exactly the TTL still waits or routes", () => {
    expect(plan({ now: OK.at + TAP_TTL_MS })).toBe("route");
    expect(plan({ now: OK.at + TAP_TTL_MS, signedIn: false })).toBe("wait");
  });

  it("is a bounded wait: ten minutes", () => {
    expect(TAP_TTL_MS).toBe(600_000);
  });
});

describe("PushBridge wiring (source scan)", () => {
  const src = readFileSync(join(__dirname, "..", "push", "PushBridge.tsx"), "utf8");

  it("keeps the tap and decides with tapPlan instead of returning when the navigator is not ready", () => {
    expect(src).toMatch(/tapPlan\(/);
    expect(src).toMatch(/pending\.current = \{ target, notificationId/);
    expect(src).not.toMatch(/!navRef\?\.isReady\?\.\(\)\) return/);
  });

  it("tries again whenever the session or the navigation state changes", () => {
    expect(src).toMatch(/useEffect\(\(\) => \{ flush\.current\(\); \}, \[tokens, isReady\]\)/);
    expect(src).toMatch(/navRef\?\.addListener\?\.\("state"/);
  });

  it("marks the row read and opens the screen only when the plan says route", () => {
    const routeAt = src.indexOf('plan !== "route"');
    expect(routeAt).toBeGreaterThan(-1);
    expect(src.indexOf("/read`", routeAt)).toBeGreaterThan(routeAt);
    expect(src.indexOf("openTarget(navRef, p.target)", routeAt)).toBeGreaterThan(routeAt);
  });

  it("a tap with neither a destination nor a row id is ignored", () => {
    expect(src).toMatch(/if \(!target && !notificationId\) return/);
  });
});
