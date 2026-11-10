/**
 * Notifications review step 14 (V5) · the bell's shared icon map. Every type in the backend registry is in exactly one family, so a new
 * type cannot arrive unplaced (it would otherwise quietly fall back to the neutral bell).
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

import { FAMILY_TYPES, GLYPH_SOURCE, NotificationGlyph, notificationLook, TONE_COLORS } from "../notificationIcons";

describe("the families", () => {
  const all = Object.values(FAMILY_TYPES).flat();

  it("place each type once", () => {
    expect(all.length).toBeGreaterThan(40);
    expect(new Set(all).size).toBe(all.length);
  });

  it("look up to the family they are listed under", () => {
    for (const [family, types] of Object.entries(FAMILY_TYPES)) {
      for (const t of types) expect(notificationLook(t).family).toBe(family);
    }
  });

  it("give every family member a glyph that ships and a tone that has colours", () => {
    for (const t of all) {
      const look = notificationLook(t);
      expect(GLYPH_SOURCE[look.glyph]).toBeTruthy();
      expect(TONE_COLORS[look.tone].bg).toMatch(/^#[0-9A-F]{6}$/i);
      expect(TONE_COLORS[look.tone].fg).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("ship a glyph for every name, and only those", () => {
    const names: NotificationGlyph[] = ["alert", "paw", "heart", "clock", "check", "x", "user", "gift", "shield", "flag", "star", "bell"];
    expect(Object.keys(GLYPH_SOURCE).sort()).toEqual([...names].sort());
  });
});

describe("the looks the artboard draws", () => {
  it("keeps the five shift icons that already existed", () => {
    expect(notificationLook("shift_confirmed")).toMatchObject({ glyph: "check", tone: "green" });
    expect(notificationLook("signup_declined")).toMatchObject({ glyph: "x", tone: "red" });
    expect(notificationLook("shift_reminder")).toMatchObject({ glyph: "clock", tone: "teal" });
    expect(notificationLook("shift_cancelled_by_shelter")).toMatchObject({ glyph: "alert", tone: "amber" });
    expect(notificationLook("signup_requested")).toMatchObject({ glyph: "user", tone: "teal" });
  });

  it("gives the rest of the shift family and the other families their icons", () => {
    expect(notificationLook("attendance_due")).toMatchObject({ family: "shift", glyph: "clock" });
    expect(notificationLook("signup_cancelled_by_volunteer")).toMatchObject({ glyph: "alert", tone: "amber" });
    expect(notificationLook("report_nearby")).toMatchObject({ family: "urgent", glyph: "alert", tone: "amber" });
    expect(notificationLook("report_claimed")).toMatchObject({ family: "rescue", glyph: "paw", tone: "teal" });
    expect(notificationLook("inquiry_accepted")).toMatchObject({ family: "adoption", glyph: "heart", tone: "green" });
    expect(notificationLook("pledge_received")).toMatchObject({ family: "donation", glyph: "gift", tone: "green" });
    expect(notificationLook("verification_approved")).toMatchObject({ family: "account", glyph: "shield", tone: "navy" });
    expect(notificationLook("account_warned")).toMatchObject({ family: "moderation", glyph: "flag", tone: "amber" });
    expect(notificationLook("badge_earned")).toMatchObject({ family: "badge", glyph: "star", tone: "amber" });
  });

  it("falls back to the neutral bell for a type with no family, including names that are on Object's prototype", () => {
    for (const t of ["something_new", "", "constructor", "__proto__", "toString", "hasOwnProperty"]) {
      expect(notificationLook(t)).toEqual({ family: "other", glyph: "bell", tone: "neutral" });
    }
  });
});

// The registry lives in the backend repo; advisory (skipped with a warning) when it is not checked out beside this one, like the other cross-repo guards.
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
const registry = findRegistry();
if (!registry) console.warn("notificationIcons: backend/ not found beside this repo, so the registry coverage check is skipped");
(registry ? describe : describe.skip)("every registered notification type has a family", () => {
  const types = registry ? [...readFileSync(registry, "utf8").matchAll(/NotificationType\("([a-z_]+)"/g)].map((m) => m[1]) : [];

  it("found the registry (a scan that finds nothing proves nothing)", () => {
    expect(types.length).toBeGreaterThan(40);
  });

  it("places every one, so none falls back to the neutral bell", () => {
    expect(types.filter((t) => notificationLook(t).family === "other")).toEqual([]);
  });

  it("lists no type the registry does not have", () => {
    const known = new Set(types);
    expect(Object.values(FAMILY_TYPES).flat().filter((t) => !known.has(t))).toEqual([]);
  });
});
