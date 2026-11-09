export type Capability = { capability: "rescuer" | "provider"; status: "pending" | "approved" | "rejected" };
export type ShelterTier = "community_rescue" | "registered_ngo";
export type VerificationStatus = "pending" | "needs_info" | "approved" | "rejected";
export type DocStatus = "pending" | "approved" | "rejected";
// GET /me/verifications (US-V2) — the applicant's document tracker.
export type MeVerificationDoc = {
  document_id: string; doc_type: string; status: DocStatus;
  review_note: string | null; superseded_by: string | null;
};
export type MeVerification = {
  verification_id: string; type: "shelter_org" | "rescuer" | "provider";
  status: VerificationStatus; notes: string | null;
  submitted_at: string; reviewed_at: string | null;
  documents: MeVerificationDoc[];
};
export type Me = {
  account_id: string; account_type: "personal" | "shelter" | "admin";
  display_name: string; email: string; email_verified_at: string | null;
  phone: string | null; phone_verified_at?: string | null; photo_url: string | null;
  /** Plan Task 14: opt-in OTP step-up for the sensitive actions. Absent from an older server. */
  two_factor_enabled?: boolean;
  capabilities: Capability[];
  shelter: { tier: ShelterTier; verification_status: VerificationStatus | null } | null;
  // The GATE, served: may this account's listings be shown (backend `public_poster_q` —
  // approved `rescuer` capability, or ANY approved shelter_org). `shelter.verification_status`
  // is the LATEST request for display; a tier-1 mid-upgrade is pending there and true here.
  is_verified_rescuer: boolean;
  settings: Record<string, boolean>;
  // X11 (backend#112) · the city the user picked, from the server. City + barangay only (§12.5).
  // Optional: an older server does not send it.
  location?: { city: string; barangay: string | null } | null;
};
export type ApiError = { code: string; message: string; field?: string; details?: any };

// Sagip — stray reports (Track S)
export type StrayStatus = "reported" | "claimed" | "rescued" | "safe" | "resolved";
export type MyReport = {
  report_id: string; species: string; condition: string;
  status: StrayStatus; city: string | null; created_at: string;
  // C13 · true once moderation removed the report. Absent from an older server.
  hidden?: boolean;
};
export type MapReport = {
  report_id: string; species: string; condition: string;
  status: StrayStatus; city: string | null; reported_at: string;
  // S14 · the coarse (~500 m grid) point report detail already publishes. Optional: a cached
  // payload from before the field existed has none.
  approx_location?: LatLng;
  report_type?: "stray" | "lost" | "found";   // D6 · absent in a cached pre-D6 payload
};
// US-O3 — reporter-only block, present only when the caller IS the report's reporter.
// `note` — the claimer's note on a move, or a system note (auto-expiry, placement, a
// reporter's close). See sagip.ts::historyNote.
export type ReportStatusHistoryEntry = { status: StrayStatus; changed_at: string; note?: string };
// US-SEC1 — approx_location is always present (coarsened, ~500m grid, everyone incl.
// guests); precise_location appears ONLY for the reporter or the report's active claimer.
export type LatLng = { lat: number; lng: number };
export type ReportDetail = {
  report_id: string; report_type: "stray" | "lost" | "found";
  species: string; condition: string; status: StrayStatus;
  notes: string | null; city: string | null; reported_at: string; photos: string[];
  approx_location: LatLng; precise_location?: LatLng;
  escalation_level?: number; offers_count?: number;
  status_history?: ReportStatusHistoryEntry[];
  // Reporter only (S5 · S10 · S11) — absent for anyone else, null when not applicable.
  // at_report (D2): the report-time alert's count, or null when the policy sent nothing.
  // reopened (re-alert): how many more were paged when a claimed report reopened.
  // at_report_held (C12): why the report-time alert was held back — null when it wasn't.
  escalation_notified?: {
    level_1: number; level_2: number; at_report?: number | null; reopened?: number | null;
    at_report_held?: "phone_unverified" | "reporter_cap" | null;
  };
  // C13 · reporter only: moderation removed this report.
  hidden?: boolean;
  claimer?: { display_name: string } | null;
  outcome?: { notes: string | null; photo_url: string | null; resolved_at: string } | null;
  close_reason?: string | null;
  // Reporter or active claimer only (S8) — as precise as the pin, so it follows the pin.
  location_text?: string | null;
  // Active claimer only (S27 · S9): their case, and when an unposted claim reopens.
  my_case?: { case_id: string; claim_due_at: string | null; contact_shared?: boolean; handoff?: CaseHandoff | null };
  // D1 + D8 · reporter only: their own contact consent, and whether they reported anonymously.
  contact_shared?: boolean;
  is_anonymous?: boolean;
  // D1 · the viewer's own offers on this report (each carries its own consent).
  my_offers?: { offer_id: string; offer_type: OfferType; status: OfferListStatus; contact_shared: boolean }[];
  // D6 · lost/found only: what a stranger needs to recognise the animal; a lost pet's name.
  describe?: { breed: string | null; color_markings: string | null; size_category: string | null; sex: string | null };
  pet_name?: string;
  // D1 + D8 · the other people on this rescue — present only for someone on it, and only once
  // it's claimed. `contact` is absent unless that person consented.
  people?: RescuePerson[];
};

export type RescuePerson = {
  // finder / owner (D6) · the other side of a lost<->found match.
  role: "reporter" | "claimer" | "helper" | "finder" | "owner";
  display_name?: string;
  anonymous?: boolean;                                   // D8 · an anonymous reporter
  contact?: { phone: string | null; email: string };
  offer_type?: OfferType;                                // helpers only
  note?: string | null;
};

// Track K — the claim + working-the-case loop
export type RescueCaseSummary = {
  case_id: string;
  report: { report_id: string; species: string; condition: string; city: string | null };
  status: StrayStatus; claimed_at: string; expired_at: string | null;
  claim_due_at?: string | null;   // S9 · null once the case can't lapse
  // P2 · moderation removed the report. Can be true on an ACTIVE case; absent from an older server.
  hidden?: boolean;
};
// GET /cases/{id} (US-SEC1) — the claimer's own case; precise_location present only
// while the claim is still active (absent once expired, even for the original claimer).
export type CaseDetail = {
  case_id: string;
  report: {
    report_id: string; species: string; condition: string; city: string | null;
    approx_location: LatLng; precise_location?: LatLng;
  };
  status: StrayStatus; claimed_at: string; expired_at: string | null;
};

// Track O — the commitment ladder (offers)
export type OfferType = "transport" | "vet_costs" | "supplies";
export type OfferListStatus = "open" | "matched" | "expired";
export type MyOffer = {
  offer_id: string;
  report: { report_id: string; species: string; condition: string; city: string | null };
  offer_type: OfferType; status: OfferListStatus; expires_at: string;
};
/** AD20 · where the claimer's handoff stands. Absent from an older server; null when nothing is listed or offered. */
export type CaseHandoff = {
  listing_id: string; kind: "listing" | "placement"; status: string; open_inquiries: number; recipient?: string;
};
// Track A — adoption listings. The browse card (US-A1b/A3) plus the fuller shapes
// US-A3's detail and US-A4's inquiries add.
export type ListingPet = {
  name: string; species: string; breed: string | null; sex?: string | null;
  birthdate?: string | null; size_category?: string | null;
  spayed_neutered?: boolean | null; vaccinated?: boolean | null;
  walkable?: boolean; temperament?: string | null;
};
export type ListingPoster = { account_id: string; name: string; is_shelter: boolean; city: string | null };
export type Listing = {
  listing_id: string;
  pet: ListingPet;
  city: string;
  status: string;
  adoption_fee?: string;
  photo_url?: string | null;
  /** On list cards since backend #18; optional so an older server still renders a deck. */
  poster?: ListingPoster;
  /** On the poster's own cards (?mine=true) only. */
  open_inquiries?: number;
  /** AD7 · on the poster's own cards (?mine=true) only. */
  removed_by_moderation?: boolean;
};
export type ListingDetail = {
  listing_id: string;
  pet: ListingPet;
  description: string | null;
  adoption_fee: string;
  requirements: string | null;
  city: string;
  status: string;
  /** The main photo first. */
  photos: string[];
  poster: ListingPoster;
  /** AD7 · only the poster ever reads a hidden listing; everyone else gets a 404. */
  removed_by_moderation?: boolean;
  /** Moderation walk W1 · this listing is the viewer's own, so Report and Block are not offered. Absent from an older server. */
  mine?: boolean;
};
/**
 * `updated_at` is null until the stage has moved — all six rows exist from the inquiry's first
 * second, so a not_started row's own time would be the creation time, and the API withholds
 * it (backend #18). `note` is the poster's, null when they wrote none.
 */
export type InquiryStage = { stage_key: string; state: string; updated_at?: string | null; note?: string | null };
export type MyInquiry = {
  inquiry_id: string;
  listing: { listing_id: string; name: string; species: string; status?: string };
  status: string;
  stages: InquiryStage[];
  // Adoption PR A (dev/adoption-build-review.md). Optional: an older server omits them.
  viewer?: "adopter" | "poster";
  kind?: "inquiry" | "placement";
  accepted_at?: string | null;
  reserved_at?: string | null;
  end_reason?: string | null;
  /** AQ2 · whether the adopter already holds the badge Reserve will need. */
  verified_member?: boolean;
  /** AQ1 · present once the poster has accepted the adopter for screening. */
  poster_contact?: { name: string; phone: string | null };
};
// Adoption · the poster tier of GET /inquiries/{id} and GET /listings/{id}/inquiries rows
// (backend#77 listings/representations.py::poster_inquiry_rows).
export type PosterInquiry = MyInquiry & {
  viewer: "poster";
  message?: string | null;
  /** AD8 · the adopter's quick answers; null when they gave none. */
  application?: Record<string, string | boolean> | null;
  created_at?: string;
  adopter: { account_id: string; display_name: string; city: string | null; verified_member: boolean };
  /** AQ1 · present once the poster has accepted the applicant for screening (phone null if unverified). */
  adopter_contact?: { name: string; phone: string | null };
};
// US-X1 — the bell. `type` is free-text on the backend (notifications/models.py); the
// known values in use are enumerated in notifications.ts, but new ones need no migration.
export type MeNotification = {
  notification_id: string; type: string; title: string | null; body: string | null;
  data: Record<string, any> | null; read: boolean; created_at: string;
};

// Track H — the recipient's owned pets (US-H3). GET /me/pets, newest first, owner-scoped.
/** PP14 · the pet's open rehoming listing; `removed` = moderation took it down. */
export type PetListingState = { listing_id: string; status: string; removed: boolean };

export type MyPet = {
  pet_id: string; name: string; species: string; photo_url: string | null;
  /** Step 11 · for the card's "Cat · 3 years"; absent from servers before backend's step 11. */
  birthdate?: string | null;
  /** Step 12 · the card says "About 3 years" when the birthdate is approximate. */
  dob_approximate?: boolean;
  open_listing: PetListingState | null; lost_report_id: string | null;
};

/** PQ2 · a pet this account rehomed through Kupkop, frozen at the transfer. No id: nothing to open. */
export type RehomedPet = { name: string; photo_url: string | null; rehomed_at: string };

/** GET /me/pets/{id} · everything the owner entered, plus its open rehoming listing (PP12). */
export type PetDetail = {
  pet_id: string; name: string; species: string; breed: string | null; sex: string | null;
  birthdate: string | null; color_markings: string | null; size_category: string | null;
  spayed_neutered: boolean | null; temperament: string | null; medical_conditions: string | null;
  vet_contact: string | null; photos: string[];
  open_listing: PetListingState | null; lost_report_id: string | null;
  // Step 12 / PQ4 · every §3.2 field the pet table has (optional: absent from older servers).
  dob_approximate?: boolean; weight_kg?: string | null; microchip_no?: string | null;
  feeding_routine?: string | null; allergies?: string | null; medications?: string | null;
  emergency_contact?: string | null;
};

// K27/G12 (backend) · the volunteer-facing summary on the shelter dashboard — pending
// signups awaiting a decision, past shifts still needing attendance marked, and what's
// coming up next. `next_shift` is null when nothing open/full is scheduled ahead.
export type ShelterDashboardVolunteer = {
  pending_requests: number;
  // SH12 · open and full shifts that have not ended (You's "n active"). Optional: an older server omits it.
  active_shifts?: number;
  attendance_due: number;
  next_shift: { shift_id: string; title: string; starts_at: string } | null;
};

export type ShelterDashboard = {
  verification: {
    submitted: boolean;
    status: VerificationStatus | null;
    docs: { doc_type: string; status: string }[];
  };
  // `volunteers` (backend#113): distinct people who took part in the shelter's shifts. Optional: an older server omits it.
  counts: { draft_listings: number; adopted: number; donations: number; live_listings?: number; volunteers?: number };
  gates: { can_publish: boolean; donations_enabled: boolean };
  volunteer: ShelterDashboardVolunteer;
  // S16 · the Rescue card. needs_help is null (never 0) when the map can't search the city.
  rescue?: ShelterDashboardRescue;
  // US-W3 · the Wishlist line. Optional: a server older than the wishlist refactor sends no block.
  wishlist?: ShelterDashboardWishlist;
};
// SH13 · the two fields of GET /shelter/profile the shell's identity reads (the full payload has more).
export type ShelterProfileSummary = { org_name: string; tier: ShelterTier };
export type ShelterDashboardWishlist = { open_needs: number; pledges_awaiting_confirm: number };
export type ShelterDashboardRescue = {
  city: string | null; city_supported: boolean; needs_help: number | null; open_cases: number;
};

// Task B3 — GET /shelter/requests (B-be2), the shelter's merged inbox across its three
// inbound-request surfaces. `status` carries each source's OWN vocabulary, not a shared
// enum: adoption/placement use AdoptionInquiry's (active/adopted/declined/withdrawn),
// volunteer uses VolunteerSignup's (requested/approved/declined/cancelled/completed/
// no_show) — see shelter/views.py::ShelterRequestsView._adoption_items /
// _volunteer_items / _placement_items on the backend. `target` is already the exact
// `navigation.navigate` shape the backend intends (route name + id); `requestRoute` in
// shelterRequests.ts re-derives it from `kind` instead of trusting the wire string
// directly, same defensive stance as notifications.ts's own client-side routing.
export type ShelterRequestKind = "adoption" | "volunteer" | "placement";
// SH8b · the two sources' own vocabularies, as a union (the server 400s an unknown `kind` since backend step 5).
export type ShelterRequestStatus =
  | "active" | "adopted" | "declined" | "withdrawn"
  | "requested" | "approved" | "cancelled" | "completed" | "no_show";
export type ShelterRequest = {
  kind: ShelterRequestKind;
  id: string;
  title: string;
  subtitle: string;
  status: ShelterRequestStatus;
  created_at: string;
  target: { route: string; id: string };
  // SH15 / SQ4 · the person on the other side is suspended: shown with a chip, forward actions refused.
  counterparty_suspended?: boolean;
  // SH18 · volunteer rows only: the raw shift start and title, formatted on the phone.
  shift_starts_at?: string;
  shift_title?: string;
};
