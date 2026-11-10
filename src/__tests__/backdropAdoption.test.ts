/**
 * Task A0.2 · the backdrop adoption guard.
 *
 * Actual V3 surface adoption is 7 owner screens on <ScreenBackdrop>. The other 34 screens
 * in spec §4.2's scope (see v3Scope.ts for why 34, not the plan's 35) do not sit on it yet.
 * This STARTED as a RATCHET with a NAMED holdout list, in the shape of themeAdoption.test.ts —
 * unlike that guard's flat `REMAINING = 0` count, each conversion story removed exactly its own
 * screens from BACKDROP_HOLDOUTS by name, so the list was the plan, not a summary of it.
 *
 * Starts at all 34: no in-scope screen has been converted yet in this PR.
 *
 * Task A1 (shell roots) converts ShelterDashboardScreen and ShelterProfileScreen onto
 * <ScreenBackdrop>, so those two leave the list here — 34 -> 32.
 *
 * Task A2 (shelter listings + needs) converts ListingFormScreen, ListingDetailScreen,
 * PlaceRequestScreen and ShelterNeedsScreen onto <ScreenBackdrop>, so those four leave
 * the list here — 32 -> 28.
 *
 * Task A3 (shelter donations) converts DonationQrScreen, DonateScreen, DonatePledgeScreen
 * and MyDonationsScreen onto <ScreenBackdrop>, so those four leave the list here — 28 -> 24.
 *
 * Task A4 (shelter volunteer) converts the nine ShelterVolunteer* screens onto
 * <ScreenBackdrop>, so those nine leave the list here — 24 -> 15.
 *
 * Task A5 (verified member) converts MemberUpgradeScreen, MemberVerifyScreen and
 * MemberSubmittedScreen onto <ScreenBackdrop>, so those three leave the list here — 15 -> 12.
 *
 * ZERO, AND IT IS NO LONGER A RATCHET (the `themeAdoption` precedent). Task A6 (Sagip rescuer)
 * converts the last twelve in-scope screens — MyRescuesScreen, MyOffersScreen, RescueMapScreen,
 * RescueListScreen, RescueListedScreen, RescueOfferScreen, RescueOfferSentScreen,
 * RescuePlaceScreen, RescuePlaceConfirmScreen, RescuePlaceSentScreen, RescueUpdateScreen,
 * PlaceAcceptedScreen — onto <ScreenBackdrop>, so those twelve leave the list here — 12 -> 0.
 * BACKDROP_HOLDOUTS stays `[]` from here: this is now a FLAT RULE, not "how many are left". A
 * screen inside V3_SCOPE that lacks <ScreenBackdrop> is a regression, full stop — raising this
 * list is not "recording progress", it is reintroducing the surface V3 was written to end.
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { V3_SCOPE, V3_EXCLUDED } from "./v3Scope";

const SCREENS = join(__dirname, "..", "screens");
const read = (n: string) => readFileSync(join(SCREENS, `${n}.tsx`), "utf8");
const HAS_BACKDROP = /<ScreenBackdrop\b/;

/** Flat rule at zero — every V3 scope screen must be converted. */
const BACKDROP_HOLDOUTS: string[] = [];

describe("V3 screens sit on the backdrop", () => {
  it("found screens to classify", () => {
    expect(readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).length).toBeGreaterThan(80);
    // 37 -> 35: Task 9 (P4) deleted ShelterVolunteerRequestsScreen and
    // ShelterVolunteerAttendanceScreen (folded into ShelterVolunteerActivityScreen's own
    // timeline) — two fewer screen files, not two fewer in-scope features.
    // 35 -> 41: P5 Task 3 (K24/K26) moves the six KawangGawa*/WaiverScreen screens from
    // V3_EXCLUDED into scope, now that they're converted.
    // 41 -> 40: C15 deleted RescueListedScreen (List for adoption now continues into the form).
    // 40 -> 41: ApplicantScreen, the adoption poster loop's (plan 2026-10-06) first screen, born V3.
    // 41 -> 42: PosterListingScreen, the poster's own listing (spec §3), born V3.
    // 42 -> 43: MyListingsScreen, an individual poster's listings (spec §3), born V3.
    // 43 -> 44: PetFormScreen, an owner adding a pet to rehome later (AQ8), born V3.
    // 47 -> 48: WaysToHelpScreen, US-W4 Ways to help (design 2026-10-27), born V3.
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
    // 60 -> 62: StoriesScreen and StoryComposeScreen, Stories review step 12.
    // 62 -> 63: NotificationsScreen, notifications review step 14.
    expect(V3_SCOPE.length).toBe(63);
  });

  it("every in-scope screen not in the holdout list renders ScreenBackdrop", () => {
    const missing = V3_SCOPE.filter((n) => !BACKDROP_HOLDOUTS.includes(n) && !HAS_BACKDROP.test(read(n)));
    expect(missing).toEqual([]);
  });

  it("the holdout list only shrinks (a converted screen must leave it)", () => {
    const converted = BACKDROP_HOLDOUTS.filter((n) => HAS_BACKDROP.test(read(n)));
    expect(converted).toEqual([]);
  });

  it("names every excluded screen rather than implying it", () => {
    const all = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, ""));
    expect([...V3_SCOPE, ...V3_EXCLUDED].sort()).toEqual(all.sort());
  });
});
