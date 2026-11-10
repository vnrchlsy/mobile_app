/**
 * Notifications review step 14 (V1 to V3) · the bell on the V3 surface, drawn on design/mobile-v3/Notifications.dc.html (approved 2026-11-10).
 * No render-test setup exists in this repo, so the screen is covered by pure helpers (notificationRows, notificationIcons) and source scans.
 *
 * ⚠️ The project's rule for a source scan: assert it READ something before it asserts anything was or was not there.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { V3_EXCLUDED, V3_SCOPE } from "./v3Scope";

const read = (rel: string) => {
  const text = readFileSync(join(__dirname, "..", rel), "utf8");
  expect(text.length).toBeGreaterThan(500);
  return text;
};
const screen = read("screens/NotificationsScreen.tsx");

describe("the screen is on the V3 surface", () => {
  it("is in V3 scope and no longer excluded", () => {
    expect(V3_SCOPE).toContain("NotificationsScreen");
    expect(V3_EXCLUDED).not.toContain("NotificationsScreen");
  });

  it("uses the backdrop, a Card per row and PressScale, and none of the old pieces", () => {
    expect(screen).toMatch(/<ScreenBackdrop \/>/);
    expect(screen).toMatch(/<Card /);
    expect(screen).toMatch(/<PressScale/);
    expect(screen).not.toMatch(/TouchableOpacity/);
    expect(screen).not.toMatch(/\.\.\.elevation\./);
    expect(screen).not.toMatch(/VOLUNTEER_ICON/);
  });

  it("uses no raw colour: every colour is a token", () => {
    expect(screen).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  });
});

describe("a row is one press target with one label (V3)", () => {
  it("is a button carrying the row's whole label, and its pieces are hidden from the reader", () => {
    expect(screen).toMatch(/accessibilityRole="button" accessibilityLabel=\{label\}/);
    expect(screen).toMatch(/const label = notificationRowLabel\(n\)/);
    expect((screen.match(/accessibilityElementsHidden/g) ?? []).length).toBeGreaterThanOrEqual(2);     // the tile and the dot/chevron column
  });

  it("an information-only row is not a button: no PressScale, role text, no chevron", () => {
    expect(screen).toMatch(/const info = isInformationOnly\(n\)/);
    expect(screen).toMatch(/info \? \(\s*<View accessible accessibilityRole="text"/);
    expect(screen).toMatch(/\{info \? <View \/> : <View style=\{styles\.chevron\} \/>\}/);
  });

  it("takes the icon and tone from the shared map, not a local one", () => {
    expect(screen).toMatch(/notificationLook\(n\.type\)/);
    expect(screen).toMatch(/TONE_COLORS\[look\.tone\]/);
    expect(screen).toMatch(/GLYPH_SOURCE\[look\.glyph\]/);
  });
});

describe("the list", () => {
  it("is grouped by read state through bellItems, with a header role on the group titles", () => {
    expect(screen).toMatch(/data=\{bellItems\(items\)\}/);
    expect(screen).toMatch(/accessibilityRole="header"/);
    expect(screen).toMatch(/You're all caught up/);
  });

  it("keeps the footer's retry a 44 pt target and the first-load states on LoadStateView", () => {
    expect(screen).toMatch(/minHeight: 44/);
    expect(screen).toMatch(/hitSlop=\{TAP_SLOP\}/);
    expect(screen).toMatch(/emptyTitle="Nothing yet"/);
    expect(screen).toMatch(/emptyBody="This is where updates on your reports and offers show up\."/);
  });

  it("a tap on a row still marks it read and reports where it came from (step 11), and navigates through the same switch", () => {
    expect(screen).toMatch(/\{ via: "bell" \}/);
    expect(screen).toMatch(/const target = notificationTarget\(n\)/);
    expect(screen).toMatch(/const unhandled: never = target/);
  });
});

describe("the glyph assets exist", () => {
  it("ships one PNG per glyph the map names", () => {
    const { existsSync } = require("fs");
    for (const g of ["alert", "paw", "heart", "clock", "check", "x", "user", "gift", "shield", "flag", "star", "bell"]) {
      expect(existsSync(join(__dirname, "..", "..", "assets", "notif", `${g}.png`))).toBe(true);
    }
  });
});
