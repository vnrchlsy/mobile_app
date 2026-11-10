// Task A0.2 · the shared V3 scope list.
//
// Spec §4.2 names the shelter-rescuer V3 conversion surface by category. Its own table
// sums to 34 (2 + 3 + 4 + 1 + 9 + 3 + 12), not the 35 the plan narrates — the parenthetical
// "RescueMapScreen chrome only" bracket in the Sagip section does not add a 13th screen, it
// just calls out that RescueMapScreen (already counted once, in the list of 12 Sagip names)
// is in scope for its chrome, not a separate screen. `RootNavigator.tsx` registers exactly
// 12 distinct Sagip rescuer screen names — MyRescuesScreen, MyOffersScreen, RescueMapScreen,
// RescueListScreen, RescueListedScreen, RescueOfferScreen, RescueOfferSentScreen,
// RescuePlaceScreen, RescuePlaceConfirmScreen, RescuePlaceSentScreen, RescueUpdateScreen,
// PlaceAcceptedScreen — confirming 12, not 13. A screen cannot be invented to make the plan's
// count match; V3_SCOPE below ships with the true, empirically-verified count: 34.
//
// V3_EXCLUDED lists, by name, every one of the other 56 screens in `src/screens/` — the 6
// shelter-onboarding screens (spec §3), the 7 owner V3 screens (already converted in
// Sprint 11), the 7 KawangGawa owner-side volunteer screens, and every remaining owner
// screen — so `V3_SCOPE ∪ V3_EXCLUDED` accounts for the entire file list and nothing is
// silently forgotten (asserted in v3Scope.test.ts).
//
// Task B1/B2/B3 later added three more (ShelterDonateScreen, ShelterAnimalsScreen,
// ShelterRequestsScreen — see SHELL_ROOTS below), making 37. Task 9 (P4) then DELETED two
// screen FILES (ShelterVolunteerRequestsScreen, ShelterVolunteerAttendanceScreen) without
// removing an in-scope feature — their cards folded into ShelterVolunteerActivityScreen's own
// timeline — so the true count drops to 35, not because two features left scope.
//
// P5 Task 3 (K24/K26, commit a1b23d0) moves six of the seven KawangGawa owner-side volunteer
// screens named above — KawangGawaScreen, KawangGawaCancelScreen, KawangGawaCheckinScreen,
// KawangGawaDetailScreen, KawangGawaRequestedScreen, and WaiverScreen — OUT of V3_EXCLUDED
// and INTO V3_SCOPE (see KAWANG_GAWA_V3 below), now that they are converted onto
// <ScreenBackdrop> + <Card>. V3_SCOPE grows from 35 to 41; V3_EXCLUDED shrinks by the same
// six.
//
// Wishlist refactor Task 8 (WD9): NeedFormScreen and NeedPledgesScreen — the last two V3 holdouts
// on the shelter's wishlist — move OUT of OTHER_OWNER_SCREENS and INTO SHELTER_NEEDS once rewritten
// on <ScreenBackdrop> + <Card> + <Chip> + <Button>, and the new DonationInstructionsScreen is added
// there too. V3_SCOPE grows from 44 to 47; V3_EXCLUDED shrinks by two (OTHER_OWNER_SCREENS: 33 names).

/** Shell roots (5) — Task B1 added ShelterDonateScreen, the Donate tab's new root, born
 * converted (spec §5); Task B2 added ShelterAnimalsScreen, the Animals tab's new root, the
 * same way; Task B3 adds ShelterRequestsScreen, the Requests tab's new root — the last of
 * ShelterTabs' five tabs to stop being dead — none of the three is a re-derived count like
 * the rest of this file, all three are ADDITIONS. */
const SHELL_ROOTS = [
  "ShelterDashboardScreen",
  "ShelterProfileScreen",
  "ShelterDonateScreen",
  "ShelterAnimalsScreen",
  "ShelterRequestsScreen"
] as const;

/** Shelter listings (3) */
const SHELTER_LISTINGS = ["ListingFormScreen", "ListingDetailScreen", "PlaceRequestScreen"] as const;

/** Shelter donations (4) */
const SHELTER_DONATIONS = ["DonationQrScreen", "DonateScreen", "DonatePledgeScreen", "MyDonationsScreen"] as const;

/** Shelter needs (4) — the wishlist manager, its form, a need's pledges, and the drop-off instructions.
 * NeedFormScreen and NeedPledgesScreen were V3 holdouts (OTHER_OWNER_SCREENS) until the wishlist
 * refactor (Task 8, WD9) rewrote them on <ScreenBackdrop> + <Card> + <Chip> + <Button>;
 * DonationInstructionsScreen is V3 from birth. */
const SHELTER_NEEDS = [
  "ShelterNeedsScreen", "NeedFormScreen", "NeedPledgesScreen", "DonationInstructionsScreen"
] as const;

/** Shelter volunteer (7 — DOWN FROM 9. Task 9 (P4) deleted ShelterVolunteerRequestsScreen and
 * ShelterVolunteerAttendanceScreen: their cards folded into ShelterVolunteerActivityScreen's
 * own Pending/Confirmed/Attendance timeline, so there are two fewer screen files, not two
 * fewer in-scope FEATURES — the timeline itself is still in V3_SCOPE, unchanged.) */
const SHELTER_VOLUNTEER = [
  "ShelterVolunteerScreen",
  "ShelterVolunteerCreateScreen",
  "ShelterVolunteerEditScreen",
  "ShelterVolunteerDetailScreen",
  "ShelterVolunteerCalendarScreen",
  "ShelterVolunteerActivityScreen",
  "ShelterVolunteerCancelScreen"
] as const;

/** Verified Member (3) */
const VERIFIED_MEMBER = ["MemberUpgradeScreen", "MemberVerifyScreen", "MemberSubmittedScreen"] as const;

/**
 * Sagip rescuer (11 now — 12 RootNavigator.tsx-verified, not the plan's 13, see file header, minus
 * RescueListedScreen, deleted by C15).
 * RescueMapScreen is counted once here, covering both the map screen itself and its chrome.
 */
const SAGIP_RESCUER = [
  "MyRescuesScreen",
  "MyOffersScreen",
  "RescueMapScreen",
  "RescueListScreen",
  "RescueOfferScreen",
  "RescueOfferSentScreen",
  "RescuePlaceScreen",
  "RescuePlaceConfirmScreen",
  "RescuePlaceSentScreen",
  "RescueUpdateScreen",
  "PlaceAcceptedScreen"
] as const;

/** P5 Task 3 (K24/K26) · the six owner-side KawangGawa* screens plus WaiverScreen (the
 * waiver linked from the detail screen's consent row), all moved onto <ScreenBackdrop> +
 * <Card> in this task. Was excluded (see v3Scope.test.ts history / KAWANG_GAWA, removed
 * here) — now in scope, so backdropAdoption/cardAdoption enforce them like every other
 * V3_SCOPE screen. */
const KAWANG_GAWA_V3 = [
  "KawangGawaScreen",
  "KawangGawaCancelScreen",
  "KawangGawaCheckinScreen",
  "KawangGawaDetailScreen",
  "KawangGawaRequestedScreen",
  "WaiverScreen"
] as const;

/** Adoption poster loop (plan 2026-10-06) — V3 from birth. */
const ADOPTION_POSTER = ["ApplicantScreen", "MyListingsScreen", "MyPetsScreen", "PetDetailScreen", "PetFormScreen", "PosterListingScreen"] as const;   // PetFormScreen: AQ8 · PetDetailScreen: PP12 · MyPetsScreen: step 11

/** US-W4 · Ways to help (design 2026-10-27) — V3 from birth. */
const WAYS_TO_HELP = ["WaysToHelpScreen"] as const;

/** AS1 · Restore a deleted account (backend#108) — V3 from birth. */
const ACCOUNT_RESTORE = ["RestoreAccountScreen"] as const;

/** Task 10 · Change password (backend#112) — V3 from birth. */
const ACCOUNT_SETTINGS = ["ChangePasswordScreen", "ChangeEmailScreen", "TwoStepScreen"] as const;

/** Plan Task 9 · the shelter's Organization profile (backend#113) — V3 from birth. */
const ORGANIZATION_PROFILE = ["OrganizationProfileScreen"] as const;

/** Impact & badges review step 10 (V1-V4) · My impact and one badge's detail, moved in from OTHER_OWNER_SCREENS once
 * rewritten on <ScreenBackdrop> + <Card>. There is no artboard for either yet (IQ8: commission them), so §3(c) "follows its
 * artboard" is held by the Sprint 6 mockups and the design system until then. */
const IMPACT_BADGES = ["ImpactScreen", "BadgeDetailScreen"] as const;

/** Content-moderation review steps 25 and 7a (V1, V4, V6) · the report form and the story page, moved in from OTHER_OWNER_SCREENS once
 * rewritten on <ScreenBackdrop> + <Card> + <PressScale>, with the hidden banner on warning tokens. */
const MODERATION_V3 = ["ReportContentScreen", "StoryDetailScreen", "TermsScreen"] as const;

/** Stories review step 12 (V1 to V4, SQ6) · the wall (also "Your stories") and the compose form, converted to the approved Stories artboard. */
const STORIES_V3 = ["StoriesScreen", "StoryComposeScreen"] as const;

/** Notifications review step 14 (V1 to V3) · the bell, converted to the approved Notifications artboard (design/mobile-v3/Notifications.dc.html). */
const NOTIFICATIONS_V3 = ["NotificationsScreen"] as const;

export const V3_SCOPE: readonly string[] = [
  ...SHELL_ROOTS,
  ...SHELTER_LISTINGS,
  ...SHELTER_DONATIONS,
  ...SHELTER_NEEDS,
  ...SHELTER_VOLUNTEER,
  ...VERIFIED_MEMBER,
  ...SAGIP_RESCUER,
  ...KAWANG_GAWA_V3,
  // Adoption poster loop (plan 2026-10-06) — V3 from birth.
  ...ADOPTION_POSTER,
  // US-W4 · Ways to help — V3 from birth.
  ...WAYS_TO_HELP,
  // AS1 · Restore a deleted account — V3 from birth.
  ...ACCOUNT_RESTORE,
  // Task 10 · Change password — V3 from birth.
  ...ACCOUNT_SETTINGS,
  // Plan Task 9 · Organization profile — V3 from birth.
  ...ORGANIZATION_PROFILE,
  // Impact & badges review step 10 · converted.
  ...IMPACT_BADGES,
  // Content-moderation review step 25 · converted.
  ...MODERATION_V3,
  // Stories review step 12 · converted.
  ...STORIES_V3,
  ...NOTIFICATIONS_V3
];

/** 6 shelter-onboarding screens (spec §3) */
const SHELTER_ONBOARDING = [
  "ShelterTierScreen",
  "ShelterSetupScreen",
  "ShelterContactScreen",
  "ShelterPhoneVerifyScreen",
  "ShelterVerifyScreen",
  "ShelterVerifyNgoScreen"
] as const;

/** 7 owner V3 screens (already converted in Sprint 11) */
const OWNER_V3 = [
  "HomeScreen",
  "HomeGuestScreen",
  "AdoptScreen",
  "InquiryScreen",
  "MyInquiriesScreen",
  "ProfileScreen",
  "SigninScreen"
] as const;

/** Every other owner screen (auth, onboarding, reports, settings, stories, etc.) — 29 names (NotificationsScreen moved to NOTIFICATIONS_V3 in the bell review, step 14)
 *  (MyPetsScreen moved to ADOPTION_POSTER when My Pets review step 11 converted it; ImpactScreen and BadgeDetailScreen
 *  moved to IMPACT_BADGES when Impact & badges review step 10 did) */
const OTHER_OWNER_SCREENS = [
  "AccountTypeScreen",
  "AdjustPinScreen",
  "AuthFormKit",
  "BlockedPeopleScreen",
  "DeleteAccountScreen",
  "ExportDataScreen",
  "ForgotPasswordScreen",
  "LocationPickerScreen",
  "MatchDetailScreen",
  "MyReportsScreen",
  "OtpLockedScreen",
  "OtpScreen",
  "PasswordChangedScreen",
  "ReportContentSentScreen",
  "ReportDetailScreen",
  "ReportMatchesScreen",
  "ReportSentScreen",
  "ReportStrayScreen",
  "ResetOtpScreen",
  "ResetPasswordScreen",
  "SettingsPrivacyScreen",
  "SettingsScreen",
  "SignupScreen",
  "SignupSuccessScreen",
  "SupportScreen",
  "VerifyDocumentsScreen",
  "VerifyPhoneScreen",
  "VerifyResubmitScreen"
] as const;

export const V3_EXCLUDED: readonly string[] = [
  ...SHELTER_ONBOARDING,
  ...OWNER_V3,
  ...OTHER_OWNER_SCREENS
];
