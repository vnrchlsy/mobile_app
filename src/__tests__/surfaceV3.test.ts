// Task A0.1 · the V3 surface, re-derived (spec §1).
//
// Sprint 11 pushed V3 tokens through all 90 screens, but actual V3 SURFACE adoption —
// <ScreenBackdrop> + <Card> — was only 7 owner screens. This test locks the re-derived
// baseline `surfaceV3()` measures, so the 35-screen conversion has ground truth instead
// of a remembered number.
//
// Task A1 (shell roots) converts ShelterDashboardScreen and ShelterProfileScreen onto
// <ScreenBackdrop> — the first two of the 34 in-scope screens to land — so the baseline
// grows from 7 to 9 here. Each conversion story updates this the same way it updates the
// named holdout lists in backdropAdoption.test.ts / cardAdoption.test.ts.
//
// Task A2 (shelter listings + needs) converts ListingFormScreen, ListingDetailScreen,
// PlaceRequestScreen and ShelterNeedsScreen onto <ScreenBackdrop> — the baseline grows
// from 9 to 13 here.
//
// Task A3 (shelter donations) converts DonationQrScreen, DonateScreen, DonatePledgeScreen
// and MyDonationsScreen onto <ScreenBackdrop> — the baseline grows from 13 to 17 here.
//
// Task A4 (shelter volunteer) converts all nine ShelterVolunteer* screens onto
// <ScreenBackdrop> — the baseline grows from 17 to 26 here.
//
// Task A5 (verified member) converts MemberUpgradeScreen, MemberVerifyScreen and
// MemberSubmittedScreen onto <ScreenBackdrop> — the baseline grows from 26 to 29 here.
//
// Task A6 (Sagip rescuer) converts the 12 Sagip rescuer screens — MyRescuesScreen,
// MyOffersScreen, RescueMapScreen, RescueListScreen, RescueListedScreen, RescueOfferScreen,
// RescueOfferSentScreen, RescuePlaceScreen, RescuePlaceConfirmScreen, RescuePlaceSentScreen,
// RescueUpdateScreen, PlaceAcceptedScreen — onto <ScreenBackdrop>. This is the last A-story:
// the baseline grows from 29 to 41 here, and both `backdropAdoption`/`cardAdoption` holdout
// lists go to `[]` (flat rule at zero, the `themeAdoption` precedent).
//
// Task B3 (Requests shell root) converts ShelterRequestsScreen, the last shell root — the
// baseline grows from 43 (41 + Task B1's Donate root + Task B2's Animals root) to 44 here,
// and `deadTabs` goes from `["requests"]` to `[]`: both ShelterDashboardScreen and
// ShelterProfileScreen's `onTabPress` gain `t === "requests"`, and ShelterRequestsScreen
// itself wires home/animals/donate/profile.
//
// Task 9 (P4) deletes two of those forty-four screen FILES — ShelterVolunteerRequestsScreen
// and ShelterVolunteerAttendanceScreen — folding their cards into
// ShelterVolunteerActivityScreen's own Pending/Confirmed/Attendance timeline. The baseline
// drops from 44 to 42: two fewer files on the backdrop, not two fewer in-scope features (the
// timeline itself was already counted, and still is).
//
// P5 Task 3 (K24/K26) converts the six owner-side KawangGawa* screens plus WaiverScreen onto
// <ScreenBackdrop> — these are now inside V3_SCOPE/v3Scope.ts too (commit a1b23d0 moved them
// out of V3_EXCLUDED), but this guard scans every screen file regardless of scope, so the
// baseline grows from 42 to 48 here either way.
//
// Wishlist refactor Task 8 (WD9) puts NeedFormScreen and NeedPledgesScreen on <ScreenBackdrop> and adds
// DonationInstructionsScreen (V3 from birth): the baseline grows from 50 to 53 here.
//
// AS1 (restore a deleted account, backend#108) adds RestoreAccountScreen, V3 from birth: one more on the backdrop.
//
// Task 10 (change password, backend#112) adds ChangePasswordScreen, V3 from birth: one more on the backdrop.
//
// Plan Task 9 (shelter Organization profile, backend#113) adds OrganizationProfileScreen, V3 from birth: one more on the backdrop.
//
// Plan Task 13 (change email) adds ChangeEmailScreen, V3 from birth: one more on the backdrop.
//
// Plan Task 14 (two-step verification) adds TwoStepScreen, V3 from birth: one more on the backdrop.
import { surfaceV3 } from "../../scripts/surface-v3.cjs";

describe("surface, re-derived", () => {
  const s = surfaceV3();

  it("found the screens", () => {
    expect(s.screens.length).toBeGreaterThan(80);
  });

  it("found the sixty-one V3 screens on the backdrop (+ 3 wishlist refactor Task 8: NeedForm, NeedPledges, DonationInstructions; 6 adoption poster loop (Applicant, PosterListing, MyListings, plan 2026-10-06; PetForm, AQ8; PetDetail, PP12; MyPets, step 11) + 7 owner + 2 shell roots + 4 listings/needs + 4 donations + 7 volunteer + 3 verified member + 11 Sagip rescuer (RescueListedScreen deleted by C15) + 1 Task B1 Donate root + 1 Task B2 Animals root + 1 Task B3 Requests root + 6 P5 Task 3 KawangGawa/Waiver + 1 US-W4 Ways to help + 2 Impact & badges review step 10: Impact, BadgeDetail + 2 content-moderation review step 25: ReportContent, StoryDetail + 1 step 7a: Terms)", () => {
    expect(s.backdrop.sort()).toEqual([
      "AdoptScreen",
      "ApplicantScreen",
      "BadgeDetailScreen",
      "ChangeEmailScreen",
      "ChangePasswordScreen",
      "DonatePledgeScreen",
      "DonateScreen",
      "DonationInstructionsScreen",
      "DonationQrScreen",
      "HomeGuestScreen",
      "HomeScreen",
      "ImpactScreen",
      "InquiryScreen",
      "KawangGawaCancelScreen",
      "KawangGawaCheckinScreen",
      "KawangGawaDetailScreen",
      "KawangGawaRequestedScreen",
      "KawangGawaScreen",
      "ListingDetailScreen",
      "ListingFormScreen",
      "MemberSubmittedScreen",
      "MemberUpgradeScreen",
      "MemberVerifyScreen",
      "MyDonationsScreen",
      "MyInquiriesScreen",
      "MyListingsScreen",
      "MyOffersScreen",
      "MyPetsScreen",
      "MyRescuesScreen",
      "NeedFormScreen",
      "NeedPledgesScreen",
      "OrganizationProfileScreen",
      "PetDetailScreen",
      "PetFormScreen",
      "PlaceAcceptedScreen",
      "PlaceRequestScreen",
      "PosterListingScreen",
      "ProfileScreen",
      "ReportContentScreen",
      "RescueListScreen",
      "RescueMapScreen",
      "RescueOfferScreen",
      "RescueOfferSentScreen",
      "RescuePlaceConfirmScreen",
      "RescuePlaceScreen",
      "RescuePlaceSentScreen",
      "RescueUpdateScreen",
      "RestoreAccountScreen",
      "ShelterAnimalsScreen",
      "ShelterDashboardScreen",
      "ShelterDonateScreen",
      "ShelterNeedsScreen",
      "ShelterProfileScreen",
      "ShelterRequestsScreen",
      "ShelterVolunteerActivityScreen",
      "ShelterVolunteerCalendarScreen",
      "ShelterVolunteerCancelScreen",
      "ShelterVolunteerCreateScreen",
      "ShelterVolunteerDetailScreen",
      "ShelterVolunteerEditScreen",
      "ShelterVolunteerScreen",
      "SigninScreen",
      "StoriesScreen",
      "StoryComposeScreen",
      "StoryDetailScreen",
      "TermsScreen",
      "TwoStepScreen",
      "WaiverScreen",
      "WaysToHelpScreen"
    ]);
  });

  it("found the dead shelter tabs", () => {
    // Task B1 wires the Donate tab (ShelterDashboardScreen + ShelterProfileScreen's
    // onTabPress both gain `t === "donate"`), so it leaves this list.
    // Task B2 wires the Animals tab the same way (both roots' onTabPress gain
    // `t === "animals"`, and ShelterAnimalsScreen itself wires home/donate/profile), so
    // "animals" leaves this list too.
    // Task B3 wires the Requests tab the same way (both roots' onTabPress gain
    // `t === "requests"`, and ShelterRequestsScreen itself wires home/animals/donate/
    // profile) — the last of ShelterTabs' five tabs, so this list is empty now.
    // SQ5 · "wired" now means: the tab navigator's single bar presses through `SHELTER_TAB_ROUTE`, which routes all five.
    expect(s.deadTabs.sort()).toEqual([]);
  });
});
