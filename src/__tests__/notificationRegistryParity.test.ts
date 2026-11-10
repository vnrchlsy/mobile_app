/**
 * Notifications review NP7 · the app's routing map is hand-kept against the backend registry
 * (`notifications/types.py::REGISTRY`), and nothing held the two together: `donation_qr_decided` and
 * `signup_cancelled_by_shelter` were registered, pushed, and did nothing when tapped.
 *
 * Every registered type must either route somewhere when its ids are present or be on the explicit
 * "no destination" list below (a deliberate no-op, with its reason). Advisory when the backend repo is not
 * checked out beside this one (CI), like the other cross-repo guards.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

import { notificationTarget } from "../notifications";

/** Registered, pushed, and deliberately a no-op when tapped. */
const NO_DESTINATION = new Set([
  "report_reviewed",   // MQ7: "we looked at your report" must not hint at what was decided
  "account_warned",    // MO10: a reminder of the rules, nothing to open
]);

function findRegistry(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const f = join(dir, "backend", "notifications", "types.py");
    if (existsSync(f)) return f;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

const file = findRegistry();
const maybe = file ? describe : describe.skip;
if (!file) console.warn("notificationRegistryParity: backend/ not found beside this repo — guard skipped");

const IDS = {
  verification_id: "x", report_id: "x", case_id: "x", inquiry_id: "x", listing_id: "x", shift_id: "x",
  signup_id: "x", need_id: "x", pledge_id: "x", story_id: "x", poster_is_shelter: true,
};

maybe("every registered notification type has a destination or says why not", () => {
  const types = [...readFileSync(file as string, "utf8").matchAll(/NotificationType\("([a-z_]+)"/g)].map((m) => m[1]);

  it("found the registry (a scan that finds nothing proves nothing)", () => {
    expect(types.length).toBeGreaterThan(40);
  });

  it("routes or is on the no-destination list", () => {
    const unrouted = types.filter((t) => !NO_DESTINATION.has(t) && notificationTarget({ type: t, data: { ...IDS } }) === null);
    expect(unrouted).toEqual([]);
  });

  it("the no-destination list names only registered types, and each really goes nowhere", () => {
    for (const t of NO_DESTINATION) {
      expect(types).toContain(t);
      expect(notificationTarget({ type: t, data: { ...IDS } })).toBeNull();
    }
  });
});
