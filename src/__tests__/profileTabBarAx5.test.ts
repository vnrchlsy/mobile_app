/**
 * O6-17 · AX-1 — At Dynamic Type AX5 the Profile screen and the tab bar fall apart (Run 6 parts 10 and 11, seen on
 * `main` at `c662e71`): the account rows ("My pets", "My listings", "My impact", "Settings", "Log out") sit at a
 * fixed `height: 56` and overlap; the "Get Verified" card breaks as "Get / Verifi / ed" with the "Start" chip (a fixed
 * `height: 38`) clipped; the city chip is a fixed `height: 40`; and the tab labels read "Ho… / Ado… / Vol…" because
 * they scale freely inside a fixed 68 pt bar with `numberOfLines={1}`. The shelter shell uses the same bar (O6-3).
 *
 * Same fixes the app already uses: rows and chips take `minHeight` + padding instead of `height` (R6-F3/F4/F6); the
 * verify card stacks at `fontScale > 1.5` (R6-F10/F12/F14), cancelling the surviving `flex: 1`; the initials in the
 * avatar do not scale (R6-F5); and the tab labels are capped (`maxFontScale.tabLabel`) because a bar of a fixed height
 * cannot grow with its text the way a row can. Default-size layout is unchanged.
 *
 * A source scan in the style of docSlotAx5.test.ts; the device walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { maxFontScale } from "../theme";

const src = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
const profile = src("screens", "ProfileScreen.tsx");
const tabBar = src("components", "ui", "TabBar.tsx");
const body = (s: string, name: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\{([^{}]*)\\}`).exec(s);
  return m ? m[1] : null;
};
/** A fixed `height:` (not `minHeight:` / `lineHeight:`). */
const fixedHeight = /(^|[^a-zA-Z])height\s*:/;

describe("Profile rows and chips grow with their text (O6-17)", () => {
  it("the scan found the styles (a guard that matches nothing proves nothing)", () => {
    for (const n of ["accountRow", "verifyButton", "cityChip", "verifyCard", "avatarInitials"]) {
      expect(body(profile, n)).not.toBeNull();
    }
  });

  it.each([
    ["accountRow", 56],
    ["verifyButton", 38],
    ["cityChip", 40]
  ])("%s uses minHeight %i with vertical padding, not a fixed height", (name, h) => {
    const b = body(profile, name as string) as string;
    expect(b).toMatch(new RegExp(`minHeight\\s*:\\s*${h}`));
    expect(b).toMatch(/paddingVertical\s*:/);
    expect(b).not.toMatch(fixedHeight);
  });
});

describe("the Get Verified card stacks at a large font scale (O6-17)", () => {
  it("reads the font scale", () => {
    expect(profile).toMatch(/useWindowDimensions/);
    expect(profile).toMatch(/const\s+large\s*=\s*fontScale\s*>\s*1\.5/);
  });
  it("the card becomes a column; the text gets the full width with the base flex cancelled", () => {
    expect(profile).toMatch(/styles\.verifyCard,\s*large && styles\.verifyCardLarge/);
    const card = body(profile, "verifyCardLarge") as string;
    expect(card).toMatch(/flexDirection\s*:\s*"column"/);
    expect(card).toMatch(/alignItems\s*:\s*"flex-start"/);
    expect(profile).toMatch(/styles\.verifyCopy,\s*large && styles\.verifyCopyLarge/);
    const copy = body(profile, "verifyCopyLarge") as string;
    expect(copy).toMatch(/marginLeft\s*:\s*0/);
    expect(copy).toMatch(/alignSelf\s*:\s*"stretch"/);
    expect(copy).not.toMatch(/\bflex\s*:\s*1/);
    // the base `verifyCopy` is `flex: 1`, which survives in a style array and would collapse the text in a column
    expect(copy).toMatch(/flexGrow\s*:\s*0/);
    expect(copy).toMatch(/flexBasis\s*:\s*"auto"/);
  });
  it("the Start chip sits under the text when large", () => {
    expect(profile).toMatch(/styles\.verifyButton,\s*large && styles\.verifyButtonLarge/);
    expect(body(profile, "verifyButtonLarge") as string).toMatch(/marginTop\s*:/);
  });
});

describe("text in fixed shapes does not outgrow them (O6-17)", () => {
  it("the avatar's initials do not scale (R6-F5: a text glyph in a fixed 84 pt tile)", () => {
    const tag = /<Text\b[^>]*style=\{styles\.avatarInitials\}[^>]*>/s.exec(profile);
    expect(tag).not.toBeNull();
    expect((tag as RegExpExecArray)[0]).toMatch(/allowFontScaling=\{false\}/);
  });
  it("the row chevrons do not scale", () => {
    const tags = [...profile.matchAll(/<Text\b[^>]*style=\{styles\.accountRowChevron\}[^>]*>/gs)].map((m) => m[0]);
    expect(tags.length).toBe(6);                                  // 6 since stories review step 6 added the Your stories row
    for (const t of tags) expect(t).toMatch(/allowFontScaling=\{false\}/);
  });
  it("the page title is capped like every other title (R6-F10)", () => {
    const tag = /<Text\b[^>]*style=\{styles\.pageTitle\}[^>]*>/s.exec(profile);
    expect(tag).not.toBeNull();
    expect((tag as RegExpExecArray)[0]).toMatch(/maxFontSizeMultiplier=\{maxFontScale\.title\}/);
    expect(profile).toMatch(/import\s*\{[^}]*\bmaxFontScale\b[^}]*\}\s*from\s*"\.\.\/theme"/s);
  });
});

describe("the tab bar's labels are capped (O6-17, and the shelter shell, O6-3)", () => {
  it("maxFontScale.tabLabel lets a label grow a little but keeps 'Requests' inside a 69 pt slot", () => {
    // 343 pt / 5 tabs = 68.6 pt per item (see the note in TabBar.tsx). An 11 pt label at 1.2x is 13 pt.
    expect(maxFontScale.tabLabel).toBeGreaterThanOrEqual(1.1);
    expect(maxFontScale.tabLabel).toBeLessThanOrEqual(1.3);
  });
  it("the label Text carries the cap, and the file imports it", () => {
    const tag = /<Text\b[^>]*style=\{\[styles\.tabText[^>]*>/s.exec(tabBar);
    expect(tag).not.toBeNull();
    expect((tag as RegExpExecArray)[0]).toMatch(/maxFontSizeMultiplier=\{maxFontScale\.tabLabel\}/);
    expect(tabBar).toMatch(/import\s*\{[^}]*\bmaxFontScale\b[^}]*\}\s*from\s*"\.\.\/\.\.\/theme"/s);
  });
});
