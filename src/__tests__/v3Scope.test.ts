// Task A0.2 Step 1 · the shared V3 scope list is internally consistent and matches the
// screen tree — nothing named twice, nothing forgotten.
import { readdirSync } from "fs";
import { join } from "path";
import { V3_SCOPE, V3_EXCLUDED } from "./v3Scope";

const SCREENS = join(__dirname, "..", "screens");

describe("v3Scope", () => {
  it("has 43 in-scope screens — 34 from spec §4.2's own table (see v3Scope.ts header) plus "
    + "ShelterDonateScreen (Task B1), ShelterAnimalsScreen (Task B2) and ShelterRequestsScreen "
    + "(Task B3), each added whole by its own shell-root task (spec §5), minus the two screen "
    + "files Task 9 (P4) deleted (ShelterVolunteerRequestsScreen, "
    + "ShelterVolunteerAttendanceScreen) when it folded them into ShelterVolunteerActivityScreen's "
    + "own timeline — 37 -> 35 — plus the 6 P5 Task 3 (K24/K26) KawangGawa*/WaiverScreen "
    + "screens, moved from V3_EXCLUDED into scope once converted — 35 -> 41 — minus "
    + "RescueListedScreen, deleted by C15 when List for adoption became a draft that continues "
    + "into the listing form — 41 -> 40 — plus ApplicantScreen, the adoption poster loop's "
    + "(plan 2026-10-06) first screen, born V3 — 40 -> 41 — plus PosterListingScreen — 41 -> 42 — plus MyListingsScreen — 42 -> 43 — plus PetFormScreen (AQ8) — 43 -> 44 — plus NeedFormScreen and NeedPledgesScreen, moved from V3_EXCLUDED when the wishlist refactor (Task 8) rewrote them on ScreenBackdrop + Card + Chip + Button — 44 -> 46 — plus DonationInstructionsScreen, born V3 in the same task — 46 -> 47 — plus WaysToHelpScreen, US-W4 Ways to help, born V3 — 47 -> 48", () => {
    // 48 -> 49: RestoreAccountScreen, AS1 restore a deleted account (backend#108), born V3.
    // 49 -> 50: ChangePasswordScreen, Task 10 change password (backend#112), born V3.
    // 50 -> 51: OrganizationProfileScreen, plan Task 9 shelter profile (backend#113), born V3.
    // 51 -> 52: ChangeEmailScreen, plan Task 13 change email (backend: POST /me/email), born V3.
    // 52 -> 53: TwoStepScreen, plan Task 14 two-step verification (backend: /me/2fa/*), born V3.
    // 53 -> 54: PetDetailScreen, PP12 one pet and its actions (My Pets review 2026-10-28), born V3.
    // 54 -> 55: MyPetsScreen, moved from V3_EXCLUDED when My Pets review step 11 converted it (artboards approved 2026-10-29).
    // 55 -> 57: ImpactScreen and BadgeDetailScreen, moved from V3_EXCLUDED when Impact & badges review step 10 converted them.
    // 57 -> 59: ReportContentScreen and StoryDetailScreen, moved from V3_EXCLUDED when content-moderation review step 25 converted them.
    // 59 -> 60: TermsScreen, content-moderation review step 7a (the community guidelines), born V3.
    // 60 -> 62: StoriesScreen and StoryComposeScreen, moved from V3_EXCLUDED when Stories review step 12 converted them (artboard approved 2026-11-10).
    // 62 -> 63: NotificationsScreen, moved from V3_EXCLUDED when the notifications review step 14 converted it (artboard approved 2026-11-10).
    expect(V3_SCOPE.length).toBe(63);
  });

  it("has no duplicate names in V3_SCOPE", () => {
    expect(new Set(V3_SCOPE).size).toBe(V3_SCOPE.length);
  });

  it("has no duplicate names in V3_EXCLUDED", () => {
    expect(new Set(V3_EXCLUDED).size).toBe(V3_EXCLUDED.length);
  });

  it("every V3_SCOPE name exists as a screen file", () => {
    const files = new Set(readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, "")));
    const missing = V3_SCOPE.filter((n) => !files.has(n));
    expect(missing).toEqual([]);
  });

  it("every V3_EXCLUDED name exists as a screen file", () => {
    const files = new Set(readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, "")));
    const missing = V3_EXCLUDED.filter((n) => !files.has(n));
    expect(missing).toEqual([]);
  });

  it("V3_SCOPE and V3_EXCLUDED never name the same screen twice", () => {
    const overlap = V3_SCOPE.filter((n) => V3_EXCLUDED.includes(n));
    expect(overlap).toEqual([]);
  });

  it("V3_SCOPE union V3_EXCLUDED equals the full screen file list — nothing forgotten", () => {
    const all = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, ""));
    expect([...V3_SCOPE, ...V3_EXCLUDED].sort()).toEqual(all.sort());
  });

  it("the wishlist's shelter screens are in scope (WD9), and no longer excluded", () => {
    for (const n of ["ShelterNeedsScreen", "NeedFormScreen", "NeedPledgesScreen", "DonationInstructionsScreen"]) {
      expect(V3_SCOPE).toContain(n);
      expect(V3_EXCLUDED).not.toContain(n);
    }
  });
});
