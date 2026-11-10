// US-X1 (bell) deep-linking — where a tap on a notification goes. Tested like sagip.ts:
// a derivation, not a screen. Every type below is one `notify()` actually calls in the
// backend, now registered once in `notifications/types.py::REGISTRY` (US-N1) — this map
// is still hand-kept in sync with that registry (the server has no shared-package export
// for the mobile client to import), but there's now one source of truth to sync AGAINST
// instead of reverse-engineering call sites.
export type NotificationTarget =
  | { screen: "verifyDocuments" }
  | { screen: "reportDetail"; reportId: string }
  // Sagip loop closure · claim_due opens the claimer's case (where the update is posted);
  // placement_decided opens their cases list. Param names match the routes, because
  // PushBridge navigates with the target's fields as params.
  | { screen: "rescueUpdate"; caseId: string; reportId: string }
  | { screen: "myRescues" }
  | { screen: "myInquiries" }
  | { screen: "kawanggawa"; tab: "mine" }
  // Task 9 · the pending-requests and attendance-roster screens folded into one activity
  // timeline (PendingSection/ConfirmedSection/AttendanceSection over one SegmentedControl),
  // so every shelter-side volunteer notification now opens THIS screen, on the section that
  // answers the question the notification raised.
  | { screen: "shelterVolunteerActivity"; shiftId: string; section?: "pending" | "confirmed" | "attendance" }
  // Sprint 6 · community. match_suggested rides the report_id path (reportDetail) until L3's
  // dedicated matches screen lands; the wishlist/badge types land on their own screens.
  | { screen: "impact" }
  | { screen: "myDonations" }
  | { screen: "shelterNeeds" }
  // Wishlist refactor · a pledge landing on / withdrawn from a need opens THAT need's pledges.
  // `needId` matches the route param because PushBridge navigates with the target's fields.
  | { screen: "needPledges"; needId: string }
  // Poster-push fallbacks when the push lacks an inquiry_id: shelter → their Requests tab,
  // individual → the listing. Spec 2026-10-06 §1.
  | { screen: "shelterRequests" }
  // Notifications review NP7 · the shelter's donation QR decision opens its Donate tab, where the QR lives.
  | { screen: "shelterDonate" }
  | { screen: "applicant"; inquiryId: string }
  | { screen: "inquiry"; inquiryId: string }
  | { screen: "memberUpgrade" }
  | { screen: "listingDetail"; listingId: string }
  // AD7 · the poster's own view reads "Removed by moderation".
  | { screen: "posterListing"; listingId: string }
  // Review step 9 (MO7) · a hidden story opens for its author, marked hidden, with nothing hidden from them.
  | { screen: "storyDetail"; storyId: string };

const REPORT_LINKED_TYPES = new Set([
  "offer_matched", "report_claimed", "offer_received", "report_escalated", "case_reopened",
  "match_suggested",  // {report_id} → the report; a possible-matches row lives there (L3)
  // Sagip loop closure: the reporter's case_progress (the report shows the steps and the
  // outcome) and the claimer's claim_lapsed (the report shows it's back on the map).
  "case_progress", "claim_lapsed",
  // D2 · an urgent stray was just reported nearby — the report is where to claim or offer.
  "report_nearby"
]);
const VERIFICATION_TYPES = new Set([
  "verification_approved", "verification_rejected", "verification_needs_info"
]);
// Spec 2026-10-06 §1 · the adopter's adoption pushes open THAT inquiry's ladder (data.inquiry_id),
// falling back to My inquiries; the badge push opens the upgrade it asks for. Placement pushes
// keep My inquiries — a placement is answered on placeRequest, reached from there.
const ADOPTER_INQUIRY_TYPES = new Set([
  "stage_advanced", "listing_withdrawn", "inquiry_accepted", "inquiry_rejected",
  "adoption_reserved", "reservation_released", "adoption_completed"
]);
const MY_INQUIRIES_TYPES = new Set(["placement_offered", "placement_withdrawn"]);
// The POSTER's adoption pushes open the Applicant screen (data.inquiry_id). A push without an
// inquiry_id (from before the Applicant screen) keeps PR A's interim routing: a shelter lands on
// Requests, an individual poster on the listing. The backend says which (`poster_is_shelter`),
// because the client holds no account type.
// A push's data map is all strings (backend#89), so poster_is_shelter is true in the bell and "true" in a push.
const POSTER_INQUIRY_TYPES = new Set(["inquiry_received", "inquiry_withdrawn", "inquiry_waiting"]);
// US-V8 · the volunteer side of notify(): schedule and history folded onto one hub screen
// (Task 5, K30/G9) — every volunteer notification now opens the hub on its "My shifts" tab,
// whether it's "look at your upcoming shifts" (shift_confirmed/shift_reminder) or "see what
// happened" (signup_declined/shift_cancelled_by_shelter). MY_SHIFTS_TYPES replaces the old
// SCHEDULE_TYPES/HISTORY_TYPES split — the two destinations became one screen with two
// sections, so the routing no longer needs to guess which section a type belongs under.
const MY_SHIFTS_TYPES = new Set([
  "shift_confirmed", "shift_reminder", "signup_declined", "shift_cancelled_by_shelter",
  "signup_cancelled_by_shelter"   // NP7 · registered (kupkop://shifts) but had no route, so its tap did nothing
]);
// US-V9 · signup_requested is the SHELTER's own notification (a volunteer requested one of
// their shifts) — routes to the activity timeline's Pending section for that shift, same
// whitelist-by-type posture as reportDetail above: the only `data` read is the id plugged
// into a fixed screen, never a URL parsed out of `data`.
// attendance_due (Task 9) — the shift has ended and attendance still needs marking — opens
// the timeline on Attendance.
// signup_cancelled_by_volunteer is the shelter's own notification too (a volunteer cancelled
// a shift they were on) — the freed slot is a Confirmed-list change, so it opens there.

export function notificationTarget(n: { type: string; data: Record<string, any> | null }): NotificationTarget | null {
  if (VERIFICATION_TYPES.has(n.type)) {
    return { screen: "verifyDocuments" };
  }
  if (REPORT_LINKED_TYPES.has(n.type) && n.data?.report_id) {
    return { screen: "reportDetail", reportId: n.data.report_id };
  }
  if (n.type === "claim_due" && n.data?.case_id && n.data?.report_id) {
    return { screen: "rescueUpdate", caseId: n.data.case_id, reportId: n.data.report_id };
  }
  // C13 · a takedown ended their claim: the claimer's list is where that shows.
  if (n.type === "placement_decided" || n.type === "report_removed") {
    return { screen: "myRescues" };
  }
  if (POSTER_INQUIRY_TYPES.has(n.type)) {
    if (n.data?.inquiry_id) return { screen: "applicant", inquiryId: n.data.inquiry_id };
    if ((n.data?.poster_is_shelter === true || n.data?.poster_is_shelter === "true")) return { screen: "shelterRequests" };
    if (n.data?.listing_id) return { screen: "listingDetail", listingId: n.data.listing_id };
    return null;
  }
  if (n.type === "listing_removed" && n.data?.listing_id) {
    return { screen: "posterListing", listingId: n.data.listing_id };
  }
  if ((n.type === "story_removed" || n.type === "story_restored") && n.data?.story_id) {
    return { screen: "storyDetail", storyId: n.data.story_id };
  }
  if (n.type === "donation_qr_decided") return { screen: "shelterDonate" };   // NP7
  if (n.type === "adoption_badge_needed") return { screen: "memberUpgrade" };
  if (ADOPTER_INQUIRY_TYPES.has(n.type)) {
    return n.data?.inquiry_id ? { screen: "inquiry", inquiryId: n.data.inquiry_id } : { screen: "myInquiries" };
  }
  if (MY_INQUIRIES_TYPES.has(n.type)) {
    return { screen: "myInquiries" };
  }
  if (MY_SHIFTS_TYPES.has(n.type)) {
    return { screen: "kawanggawa", tab: "mine" };
  }
  if (n.type === "signup_requested" && n.data?.shift_id) {
    return { screen: "shelterVolunteerActivity", shiftId: n.data.shift_id, section: "pending" };
  }
  if (n.type === "attendance_due" && n.data?.shift_id) {
    return { screen: "shelterVolunteerActivity", shiftId: n.data.shift_id, section: "attendance" };
  }
  if (n.type === "signup_cancelled_by_volunteer" && n.data?.shift_id) {
    return { screen: "shelterVolunteerActivity", shiftId: n.data.shift_id, section: "confirmed" };
  }
  // Sprint 6 · community notifications route to their own screens (US-B2/W2/W3).
  if (n.type === "badge_earned") {
    return { screen: "impact" };
  }
  // Donor side: a confirmed pledge and a closed need both land on the donor's own list.
  if (n.type === "pledge_confirmed" || n.type === "need_closed") {
    return { screen: "myDonations" };
  }
  // Shelter side: pledge_received / pledge_cancelled open the need they concern, falling back
  // to the needs list for a notification that predates need_id.
  if (n.type === "pledge_received" || n.type === "pledge_cancelled") {
    return n.data?.need_id
      ? { screen: "needPledges", needId: n.data.need_id }
      : { screen: "shelterNeeds" };
  }
  // `report_reviewed` (review step 22) is information, not a place: "we looked at your report" has nowhere to take you, and
  // must not, because anything it opened would hint at what was decided. It is a deliberate no-op tap.
  return null; // unknown type, or a report-linked type missing its report_id — no-op tap
}

/**
 * Notifications review NP4 / NP5 / NQ3 · what to tell the server when the bell has just SHOWN `page`: `up_to` is the newest
 * `created_at` on that page and `since` the oldest, so a notification that arrived after the list was read stays unread, and
 * (the list now pages) so do older rows on pages not yet loaded. `null` when nothing on the page is unread (no request), or
 * when no row has a usable timestamp (never fall back to mark-all). The original strings are sent, not re-formatted Dates, so
 * the microseconds survive.
 */
export function markReadBody(page: { read: boolean; created_at: string }[]): { up_to: string; since: string } | null {
  if (!page.some((n) => !n.read)) return null;
  let newest: { ms: number; raw: string } | null = null;
  let oldest: { ms: number; raw: string } | null = null;
  for (const n of page) {
    const ms = Date.parse(n.created_at);
    if (Number.isNaN(ms)) continue;
    if (!newest || ms > newest.ms) newest = { ms, raw: n.created_at };
    if (!oldest || ms < oldest.ms) oldest = { ms, raw: n.created_at };
  }
  return newest && oldest ? { up_to: newest.raw, since: oldest.raw } : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** NP8 · the id a push carries for its own row, or null when absent or not a UUID (it goes into a URL path). */
export function pushNotificationId(data: unknown): string | null {
  const id = (data as { notification_id?: unknown } | null | undefined)?.notification_id;
  return typeof id === "string" && UUID.test(id) ? id : null;
}
