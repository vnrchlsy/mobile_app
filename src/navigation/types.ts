import { ShelterTier } from "../api/types";
import { SocialIdentity } from "../auth/socialAuth";

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
};

// US-B2 · a badge, threaded from the impact grid to its detail.
export type BadgeShape = {
  badge_code: string; name: string; description: string; icon: string; criteria: string;
  earned: boolean; earned_at: string | null;
};

// US-W3 · a shelter need, threaded through the manage/edit/pledges screens.
export type ShelterNeedShape = {
  need_id: string; title: string; category: string; description: string;
  quantity_needed: number; quantity_received: number; status: "open" | "fulfilled" | "closed";
};

export type RootStackParamList = {
  welcome: undefined;
  // A social identity rides through account-type (US-A2): the provider already asserted a
  // verified email, so the owner path needs no form and no code.
  accountType: { social?: SocialIdentity } | undefined;
  // `tier` is present only for the shelter journey; it rides through signup → otp → shelterSetup,
  // where it is written to shelter_profile (US-B1 carries it client-side, US-B2 persists it).
  signup: { accountType: "personal" | "shelter"; tier?: ShelterTier };
  otp: { email: string; mode: "signup" | "unverified"; tier?: ShelterTier };
  otpLocked: { email: string };
  signupSuccess: undefined;
  signin: undefined;
  forgotPassword: undefined;
  resetOtp: { email: string };
  resetPassword: { email: string; code: string };
  passwordChanged: undefined;
  support: undefined;
  home: { justSignedUp?: boolean } | undefined;
  homeGuest: undefined;
  adopt: undefined;
  volunteer: undefined;
  profile: undefined;
  locationPicker: undefined;
  memberUpgrade: undefined;
  memberVerify: undefined;
  memberSubmitted: undefined;
  // Shelter journey (B · tier 1, C · tier 2)
  shelterTier: { social?: SocialIdentity } | undefined;
  shelterSetup: { tier: ShelterTier };
  shelterContact: { tier: ShelterTier };
  shelterPhoneVerify: { tier: ShelterTier; phone: string };
  shelterVerify: { tier: ShelterTier };
  shelterVerifyNgo: { baseDocs: ShelterDoc[]; socialUrl: string };
  shelterDashboard: undefined;
  shelterProfile: undefined;
  // Verification decision — the applicant's side (Track V)
  verifyDocuments: undefined;
  verifyResubmit: {
    verificationId: string; documentId: string; docType: string; reviewNote?: string | null;
  };
  // Sagip — report a stray (Track S)
  // adjustedLat/Lng ride back from the US-S2 Adjust map when the reporter refines the exact pin.
  reportStray: { adjustedLat?: number; adjustedLng?: number } | undefined;
  // US-S2 · refine the report's precise pin on a map. Seeded with the current GPS coords.
  adjustPin: { lat: number; lng: number };
  // US-O3 · `reportId` is null and `queued` true when the report went to the offline
  // outbox instead of the server — the success screen says so rather than pretending.
  reportSent: { reportId: string | null; title: string; city: string | null; queued?: boolean };
  myReports: undefined;
  rescueMap: undefined;
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
  rescueListed: undefined;
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
  placeAccepted: undefined;
  // Track H — the owner's own pets (US-H3): what a rescuer/shelter placed with them, or what
  // they adopted. Reachable from ProfileScreen; GET /me/pets.
  myPets: undefined;
  // US-X1 — the bell
  notifications: undefined;
  // Track A — adoption (US-A3/A4)
  listingDetail: { listingId: string };
  myInquiries: undefined;
  // US-A2 — create (no listingId) or edit (listingId) a listing.
  listingForm: { listingId?: string } | undefined;
  // Owner-side first-use phone verification (decision 14); first trigger = US-A4 inquiry.
  verifyPhone: undefined;
  // Track Q — donations. donationQr (shelter side) uploads/replaces the QR; donate
  // (public side) renders an org's verified QRs, reached from a listing's poster row.
  donationQr: undefined;
  donate: { accountId: string; orgName: string };
  // US-W2 · Abot-tulong wishlist (giver side): pledge to a need, then My Donations.
  donatePledge: { needId: string; needTitle: string; shelterName: string };
  myDonations: undefined;
  // US-W3 · Abot-tulong wishlist (shelter side): manage needs, edit/create, confirm pledges.
  shelterNeeds: undefined;
  needForm: { need?: ShelterNeedShape } | undefined;
  needPledges: { need: ShelterNeedShape };
  // US-N5 · settings + the two RA 10173 data rights (§12.6/§12.7).
  settings: undefined;
  settingsPrivacy: undefined;
  deleteAccount: undefined;
  exportData: undefined;
  // US-B2 · My impact: the badge grid + a single badge's detail.
  impact: undefined;
  badgeComparison: { badge: BadgeShape };
  // US-T2 · success stories: feed, compose (optionally prefilled from an adoption), detail.
  stories: undefined;
  storyCompose: { adoptionListingId?: string } | undefined;
  storyDetail: { storyId: string };
  // US-L3 · lost & found match surfacing: the reporter's matches + one match's detail.
  reportMatches: { reportId: string };
  matchDetail: { reportId: string; match: MatchShape };
  // US-M1 — "report this" on a stray report or listing (or, in principle, any moderation
  // flag_target — account/qr/message are modeled backend-side but have no UI trigger yet).
  reportContent: { targetType: "report" | "listing" | "account" | "qr" | "message"; targetId: string };
  // US-V8 — Kawang-Gawa volunteer flow (Track V, Sprint 5). `kawanggawa` is the real hub
  // (Task 3); the other seven are placeholders pointed at KawangGawaScreen until Tasks 4–8
  // register their own components.
  kawanggawa: undefined;
  kawanggawaDetail: { shiftId: string };
  waiver: undefined; // the D-S5-1 placeholder
  kawanggawaRequested: undefined;
  kawanggawaSchedule: undefined;
  kawanggawaCheckin: { signupId: string };
  kawanggawaHistory: undefined;
  kawanggawaCancel: { signupId: string };
  // US-V9 — the shelter side of Kawang-Gawa (Track V, Sprint 5). `shelterVolunteer` is the real
  // manage list (Task 5); the other eight are placeholders pointed at ShelterVolunteerScreen until
  // Tasks 6–10 register their own components.
  shelterVolunteer: undefined;
  shelterVolunteerCreate: undefined;
  shelterVolunteerActivity: { shiftId: string };
  shelterVolunteerRequests: { shiftId: string };
  shelterVolunteerAttendance: { shiftId: string };
  shelterVolunteerDetail: { signupId: string };
  shelterVolunteerCalendar: undefined;
  shelterVolunteerEdit: { shiftId: string };
  shelterVolunteerCancel: { shiftId: string };
};
