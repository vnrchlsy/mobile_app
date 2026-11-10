import type { StorySource } from "../storyCompose";
import type { PersonRef, ReportParams } from "../moderation";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ShelterTier } from "../api/types";
import type { BadgeShape } from "../community";
import { SocialIdentity } from "../auth/socialAuth";
import type { QueuedReason } from "../sagip";
import { ActivitySection } from "../shelterVolunteer";

// Base document collected in the tier-1 step, threaded to the NGO step so the final
// POST /verifications (US-C1) can submit the base set + NGO papers in one request.
export type ShelterDoc = { doc_type: string; file_url: string };

// US-L3 · a lost<->found match, threaded from the matches list to its detail.
export type MatchShape = {
  match_id: string;
  status: string;
  score: number | null;
  signals: { geo: number; time: number; breed: number; color: number; size_sex: number } | null;
  report: {
    report_id: string; report_type: string; species: string; breed: string | null;
    color_markings: string | null; city: string | null; created_at: string;
  };
  // D6 + D1 · who filed the other half: named unless anonymous, contact only by their consent.
  reporter?: { display_name?: string; anonymous?: boolean; contact?: { phone: string | null; email: string } };
};

// US-B2 · a badge, threaded from the impact grid to its detail.

// US-W3 · a shelter need, threaded through the manage/edit/pledges screens.
export type ShelterNeedShape = {
  need_id: string; title: string; category: string; description: string;
  quantity_needed: number; quantity_received: number; status: "open" | "fulfilled" | "closed";
  // The wishlist refactor's additions. Optional: a server older than the refactor sends none of them.
  unit?: string; quantity_pledged?: number; pledge_count?: number; awaiting_confirm?: number;
};

// SQ5 · the five tabs of the shelter shell. Names are the stack routes' names, kept so `screen.shelter*` ids and the
// screens' file names do not move; only the container changes (`shelterTabs` below).
export type ShelterTabParamList = {
  shelterDashboard: undefined;
  shelterAnimals: undefined;
  shelterDonate: undefined;
  shelterRequests: undefined;
  shelterProfile: undefined;
};

/** A tab root's props: the tab navigator's own, plus the root stack above it (a tab pushes `applicant`, `listingForm`, …). */
export type ShelterTabScreenProps<K extends keyof ShelterTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<ShelterTabParamList, K>,
  NativeStackScreenProps<RootStackParamList>
>;

// SQ5 follow-up (owner and guest shells; spec 2026-11-04-owner-guest-tab-navigator-design.md) · the tabs of the personal
// member's shell and of the signed-out visitor's shell. Route names are the stack routes' names, kept so screen files and
// `screen.*` ids do not move. `kawanggawa` is registered in BOTH (one component, two parents).
export type OwnerTabParamList = {
  home: { justSignedUp?: boolean } | undefined;
  adopt: undefined;
  kawanggawa: { tab?: "browse" | "mine" } | undefined;
  profile: { editing?: boolean } | undefined;
};

export type GuestTabParamList = {
  homeGuest: undefined;
  kawanggawa: { tab?: "browse" | "mine" } | undefined;
};

export type OwnerTabScreenProps<K extends keyof OwnerTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<OwnerTabParamList, K>,
  NativeStackScreenProps<RootStackParamList>
>;

export type GuestTabScreenProps<K extends keyof GuestTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<GuestTabParamList, K>,
  NativeStackScreenProps<RootStackParamList>
>;

export type RootStackParamList = {
  // SQ5 follow-up · the two other shells. PR 1 registers them; nothing navigates to them until the switch PR.
  ownerTabs: NavigatorScreenParams<OwnerTabParamList> | undefined;
  guestTabs: NavigatorScreenParams<GuestTabParamList> | undefined;
  // SQ5 · the shelter shell: a bottom-tab navigator holding the five roots. The ONLY way in is `shelterTabs.ts`.
  shelterTabs: NavigatorScreenParams<ShelterTabParamList> | undefined;
  welcome: undefined;
  // A social identity rides through account-type (US-A2): the provider already asserted a
  // verified email, so the owner path needs no form and no code.
  accountType: { social?: SocialIdentity } | undefined;
  // `tier` is present only for the shelter journey; it rides through signup → otp → shelterSetup,
  // where it is written to shelter_profile (US-B1 carries it client-side, US-B2 persists it).
  signup: { accountType: "personal" | "shelter"; tier?: ShelterTier };
  otp: { email: string; mode: "signup" | "unverified"; tier?: ShelterTier };
  otpLocked: { email: string };
  // AS1 · a deleted account still inside its 30 days, offered a restore. `purgeOn` is the
  // server's YYYY-MM-DD ("" if it sent none); the token is single-use and lasts ten minutes.
  restoreAccount: { restoreToken: string; purgeOn: string };
  signupSuccess: undefined;
  signin: undefined;
  forgotPassword: undefined;
  // `codeError` carries a late code failure back from resetPassword — see the backstop
  // in ResetPasswordScreen for why the message belongs on the code step, not under the
  // password field.
  resetOtp: { email: string; codeError?: string };
  resetPassword: { email: string; code: string };
  passwordChanged: undefined;
  support: undefined;
  // Review step 7a · the community guidelines / Terms of Use; `accept` ends in an "I agree" that records the current version.
  terms: { accept?: boolean } | undefined;
  // SQ5 follow-up · `home`, `adopt`, `kawanggawa`, `profile` and `homeGuest` are tabs now: see OwnerTabParamList and
  // GuestTabParamList above. (Settings → Edit profile pops back to the You tab with `editing`: `popToOwnerTab`.)
  locationPicker: undefined;
  memberUpgrade: undefined;
  memberVerify: undefined;
  memberSubmitted: undefined;
  // Shelter journey (B · tier 1, C · tier 2)
  // NT-14 · `resume`: a signed-in shelter finishing setup it quit; a pick goes straight to shelterSetup.
  shelterTier: { social?: SocialIdentity; resume?: true } | undefined;
  shelterSetup: { tier: ShelterTier };
  shelterContact: { tier: ShelterTier };
  shelterPhoneVerify: { tier: ShelterTier; phone: string };
  shelterVerify: { tier: ShelterTier };
  // Step 2 of the initial tier-2 flow carries step 1's base set; `upgrade` is an APPROVED
  // tier-1 moving up (US-X4) — its base is already on file, so only the NGO papers are sent.
  shelterVerifyNgo: { baseDocs: ShelterDoc[]; socialUrl: string } | { upgrade: true };
  shelterDashboard: undefined;
  shelterProfile: undefined;
  // Task B2 · the shelter's Animals tab root — segmented Live/Pending/Adopted over the
  // shelter's own listings.
  shelterAnimals: undefined;
  shelterDonate: undefined;
  // Task B3 · the shelter's Requests tab root — segmented Adoption/Volunteer/Placement
  // over B-be2's merged inbox (GET /shelter/requests).
  shelterRequests: undefined;
  // Verification decision — the applicant's side (Track V)
  verifyDocuments: undefined;
  verifyResubmit: {
    verificationId: string; documentId: string; docType: string; reviewNote?: string | null;
  };
  // Sagip — report a stray (Track S)
  // adjustedLat/Lng ride back from the US-S2 Adjust map when the reporter refines the exact pin.
  // D6 · `mode` preselects stray / lost / found; `sightingOf` makes it "I've seen this pet"
  // (a found report linked to that lost one), with its species fixed.
  reportStray: {
    adjustedLat?: number; adjustedLng?: number;
    mode?: "stray" | "lost" | "found"; sightingOf?: string; sightingSpecies?: string; sightingName?: string;
    /** PP12 · "Report lost" from a pet's screen preselects that pet. */
    petId?: string;
  } | undefined;
  // US-S2 · refine the report's precise pin on a map. Seeded with the current GPS coords.
  adjustPin: { lat: number; lng: number };
  // US-O3 · `reportId` is null and `queued` true when the report went to the offline
  // outbox instead of the server — the success screen says so rather than pretending.
  reportSent: {
    reportId: string | null; title: string; city: string | null; queued?: boolean;
    /** PR3-F2 · why it queued; absent reads as offline. */
    queuedReason?: QueuedReason;
  };
  myReports: undefined;
  // S16 · a shelter opens the map on its own city (its address), not the owner-picked one.
  rescueMap: { city?: string } | undefined;
  reportDetail: { reportId: string };
  // Track O — the commitment ladder (offers)
  rescueOffer: { reportId: string };
  rescueOfferSent: { reportId: string; offerType: string };
  myOffers: undefined;
  // Track K — claim + work the case
  myRescues: undefined;
  rescueUpdate: { caseId: string; reportId: string };
  // Track H — handoff from a safe rescue case (US-H1: list for adoption). Reachable
  // from RescueUpdateScreen once the case's report is `safe`.
  rescueList: { caseId: string };
  // Track H — direct placement from a safe rescue case (US-H2: place with a known verified
  // member/shelter, no public listing). Reachable from RescueUpdateScreen alongside rescueList,
  // same safe gating. recipientEmail rides Place → Confirm; city/fee are collected on Confirm
  // itself (reviewed alongside the recipient right before the POST).
  rescuePlace: { caseId: string };
  rescuePlaceConfirm: { caseId: string; recipientEmail: string };
  rescuePlaceSent: undefined;
  // Track H — the recipient's side of a direct placement (US-H3): accept/decline the animal
  // a rescuer/shelter placed with them. Reachable from MyInquiriesScreen, which flags a
  // placement inquiry client-side (all six stages skipped — the CasePlaceView bypass) and
  // taps through with its inquiry_id.
  placeRequest: { inquiryId: string };
  /** The adopter's ladder for one inquiry — design/mobile-v3/Inquiry.dc.html. */
  inquiry: { inquiryId: string };
  /** The poster's view of one applicant — design/mobile-v3/Applicant.dc.html. */
  applicant: { inquiryId: string };
  /** The poster's own listing: status, Publish/Edit, applicants — design/mobile-v3/PosterListing.dc.html. */
  posterListing: { listingId: string };
  /** An individual poster's listings (Profile → My listings) — the shared ListingsByStatus body. */
  myListings: undefined;
  // D7 · a shelter's accept lands the animal as a draft listing; a person's has no params.
  placeAccepted: { listingId?: string } | undefined;
  // Track H — the owner's own pets (US-H3): what a rescuer/shelter placed with them, or what
  // they adopted. Reachable from ProfileScreen; GET /me/pets.
  myPets: undefined;
  petForm: { petId?: string } | undefined;   // AQ8 · add a pet; PP12 · petId = edit that pet
  petDetail: { petId: string };   // PP12 · one pet: its details and what can be done with it
  // US-X1 — the bell
  notifications: undefined;
  // Track A — adoption (US-A3/A4)
  listingDetail: { listingId: string };
  myInquiries: undefined;
  // US-A2 — create (no listingId) or edit (listingId) a listing.
  listingForm: { listingId?: string; petId?: string } | undefined;   // AQ8 · petId prefills and links
  // Owner-side first-use phone verification (decision 14); first trigger = US-A4 inquiry.
  verifyPhone: undefined;
  // Track Q — donations. donationQr (shelter side) uploads/replaces the QR; donate
  // (public side) renders an org's verified QRs, reached from a listing's poster row.
  donationQr: undefined;
  donate: { accountId: string; orgName: string; city?: string | null };
  // US-W2 · Abot-tulong wishlist (giver side): pledge to a need, then My Donations.
  donatePledge: { needId: string; needTitle: string; shelterName: string };
  myDonations: undefined;
  // US-W4 · verified shelters asking for help, near the viewer first.
  // `city` overrides the cached one: the guest Home passes its fixed city so the list groups the way its section does.
  waysToHelp: { city?: string } | undefined;
  // US-W3 · Abot-tulong wishlist (shelter side): manage needs, edit/create, confirm pledges.
  shelterNeeds: undefined;
  // US-W3 · the shelter's drop-off instructions, shown to a giver after they pledge.
  donationInstructions: undefined;
  needForm: { need?: ShelterNeedShape } | undefined;
  needPledges: { needId: string; need?: ShelterNeedShape };
  // US-N5 · settings + the two RA 10173 data rights (§12.6/§12.7).
  // F-R3-4 · `shelter` hides the owner-only ACCOUNT rows (Edit profile → the OWNER
  // ProfileScreen, Phone number → the owner verifyPhone, which would desync the org's
  // SMS-verified official_phone). Optional, so the owner's navigate("settings") is unchanged.
  settings: { shelter?: boolean } | undefined;
  settingsPrivacy: undefined;
  changePassword: undefined;
  changeEmail: undefined;
  twoStep: undefined;
  // Plan Task 9 · the shelter's own profile: name, logo, description, hours and its private contacts.
  organizationProfile: undefined;
  deleteAccount: undefined;
  exportData: undefined;
  // US-B2 · My impact: the badge grid + a single badge's detail.
  impact: undefined;
  badgeDetail: { badge: BadgeShape };
  // US-T2 · success stories: feed, compose (optionally prefilled from an adoption), detail.
  stories: { mine?: boolean } | undefined;     // `mine`: your own stories (stories review step 6)
  // `edit`: change the caption of a story you posted (the photo and the link are what was shared, and stay).
  storyCompose: { adoptionListingId?: string; rescueCaseId?: string; source?: StorySource; edit?: { storyId: string; caption: string; photoUrl: string | null } } | undefined;
  storyDetail: { storyId: string };
  // US-L3 · lost & found match surfacing: the reporter's matches + one match's detail.
  reportMatches: { reportId: string };
  matchDetail: { reportId: string; match: MatchShape };
  // US-M1 — "report this" on a stray report or listing (or, in principle, any moderation
  // flag_target — account/qr/message are modeled backend-side but have no UI trigger yet).
  reportContent: ReportParams;
  // Review step 7g · what a report ends on, and (for a report about a person) where Block is offered.
  reportContentSent: { subject?: string; person?: PersonRef; leaveContent?: boolean };
  // Review step 7d · the people you have blocked, reached from Settings.
  blockedPeople: undefined;
  // US-V8 — Kawang-Gawa volunteer flow (Track V, Sprint 5). The hub `kawanggawa` is a tab of both shells now
  // (Task 5 folded the schedule and history into one segmented Browse | My shifts hub; `tab` picks the initial segment).
  kawanggawaDetail: { shiftId: string };
  waiver: undefined; // the D-S5-1 placeholder
  kawanggawaRequested: undefined;
  kawanggawaCheckin: { signupId: string };
  kawanggawaCancel: { signupId: string };
  // US-V9 — the shelter side of Kawang-Gawa (Track V, Sprint 5). `shelterVolunteer` is the real
  // manage list (Task 5). Task 9 folded the standalone Requests and Attendance screens into
  // `shelterVolunteerActivity`'s own Pending/Confirmed/Attendance timeline — `section` picks
  // the initial tab (defaults to `activitySection(shift, pendingCount)` when omitted).
  shelterVolunteer: undefined;
  // `copyFrom` (Task 9's footer "Duplicate") pre-fills the form from that shift; omitted for
  // a fresh post, same as before.
  shelterVolunteerCreate: { copyFrom?: string } | undefined;
  shelterVolunteerActivity: { shiftId: string; section?: ActivitySection };
  shelterVolunteerDetail: { signupId: string };
  shelterVolunteerCalendar: undefined;
  shelterVolunteerEdit: { shiftId: string };
  shelterVolunteerCancel: { shiftId: string };
  // US-DEV1 · dev-only seed-tokens shortcut. The type exists unconditionally so a
  // production build still type-checks against `navigation.navigate("dev")` in
  // WelcomeScreen.tsx; RootNavigator.tsx is what actually gates whether the route is
  // ever registered (Constants.expoConfig.extra.profile === "development").
  dev: undefined;
};
