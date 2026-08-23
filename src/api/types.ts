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
  phone: string | null; photo_url: string | null;
  capabilities: Capability[];
  shelter: { tier: ShelterTier; verification_status: VerificationStatus | null } | null;
  settings: Record<string, boolean>;
};
export type ApiError = { code: string; message: string; field?: string; details?: any };

// Sagip — stray reports (Track S)
export type StrayStatus = "reported" | "claimed" | "rescued" | "safe" | "resolved";
export type MyReport = {
  report_id: string; species: string; condition: string;
  status: StrayStatus; city: string | null; created_at: string;
};
export type MapReport = {
  report_id: string; species: string; condition: string;
  status: StrayStatus; city: string | null; reported_at: string;
};
// US-O3 — reporter-only block, present only when the caller IS the report's reporter.
export type ReportStatusHistoryEntry = { status: StrayStatus; changed_at: string };
export type ReportDetail = {
  report_id: string; species: string; condition: string; status: StrayStatus;
  notes: string | null; city: string | null; reported_at: string; photos: string[];
  escalation_level?: number; offers_count?: number;
  status_history?: ReportStatusHistoryEntry[];
};

// Track K — the claim + working-the-case loop
export type RescueCaseSummary = {
  case_id: string;
  report: { report_id: string; species: string; condition: string; city: string | null };
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
export type Listing = {
  listing_id: string;
  pet: { name: string; species: string; breed: string | null };
  city: string;
  status: string;
};
export type ShelterDashboard = {
  verification: {
    submitted: boolean;
    status: VerificationStatus | null;
    docs: { doc_type: string; status: string }[];
  };
  counts: { draft_listings: number; adopted: number; donations: number };
  gates: { can_publish: boolean; donations_enabled: boolean };
};
