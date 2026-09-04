// US-V9 · the shelter's pending-requests queue for one activity — approve/decline, the
// no-show re-approval disclosure (D-S5-2's reliability block surfaced, D-S5-3 gates it), and
// the walking-shift animal picker (D-S5-3). Reference: screens/user/screen-shelter-volunteer-
// requests(-flagged|-reapprove-confirm).png. GET /shelter/shifts/{shiftId}/requests returns only
// PENDING (REQUESTED) signups — there's no "confirmed" list here, unlike the mock's second
// section, because ShiftRequestsView only ever queries status=REQUESTED (see backend
// volunteer/views.py::ShiftRequestsView).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { AlertIcon } from "../components/AppIcons";
import { ConfirmModal } from "../components/ConfirmModal";
import { RootStackParamList } from "../navigation/types";
import { ChipTone, ListingCard, PendingRequest, ShelterShift, reliabilityChip } from "../shelterVolunteer";
import { Reliability, shiftTypeLabel } from "../volunteer";
import { TAP_SLOP } from "../touch";

// The endpoint also returns `requested_at` per-row (backend ShiftRequestsView) even though
// Task 4's PendingRequest type doesn't declare it — extend locally rather than widen the
// shared type for one screen's "requested 2h ago" label.
type RequestRow = PendingRequest & { requested_at: string };

function timeAgo(iso: string, nowMs: number = Date.now()): string {
  const mins = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function shiftWhenLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime}–${endTime}`;
}

// The reapprove-confirm dialog's context: which signup, its reliability block (for the body
// copy), and the listing (if any) already picked for it — carried through so the re-call after
// "Approve anyway" assigns the SAME animal the shelter chose before hitting the 409.
type ReapproveState = { signupId: string; details: Reliability; assignedListingId: string | null };

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerRequests">;

export function ShelterVolunteerRequestsScreen({ navigation, route }: Props) {
  const api = useApi();
  const { shiftId } = route.params;

  const [shift, setShift] = useState<ShelterShift | null>(null);
  // Approve must never fire before this resolves — see onPressApprove: a walking shift's
  // picker is gated on `shift?.type === "walking"`, and while `shift` is still null that
  // check is silently false, so an early tap would approve with no assigned_listing_id and
  // there is no way to attach one after the fact.
  const [shiftLoaded, setShiftLoaded] = useState(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [busySignupId, setBusySignupId] = useState<string | null>(null);

  const [pickerSignupId, setPickerSignupId] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [listingsLoaded, setListingsLoaded] = useState(false);
  const [listingsError, setListingsError] = useState(false);

  const [reapprove, setReapprove] = useState<ReapproveState | null>(null);

  // The shift's type decides whether Approve opens the animal picker — read once on load
  // (the brief allows this; type never changes for a posted shift).
  useEffect(() => {
    api.get(`/shelter/shifts/${shiftId}`).then((r) => {
      if (r.ok) setShift(r.data);
      setShiftLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, [shiftId]);

  const loadRequests = useCallback(() => {
    api.get(`/shelter/shifts/${shiftId}/requests`).then((r) => {
      if (r.ok) {
        setRequests(r.data?.results ?? []);
        setLoadError(false);
      } else {
        setLoadError(true);
      }
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [shiftId]);

  useFocusEffect(useCallback(() => { loadRequests(); }, [loadRequests]));

  function loadListingsIfNeeded() {
    if (listingsLoaded) return;
    api.get("/listings?mine=true").then((r) => {
      if (r.ok) {
        setListings(r.data?.results ?? []);
        setListingsError(false);
      } else {
        setListingsError(true);
      }
      setListingsLoaded(true);
    });
  }

  function onPressApprove(signupId: string) {
    // Defense in depth alongside the button's own `disabled` — never approve before we know
    // the shift's type, or a walking shift's picker could be silently skipped (IMPORTANT 1).
    if (!shiftLoaded) return;
    setBanner(null);
    if (shift?.type === "walking") {
      loadListingsIfNeeded();
      setPickerSignupId(signupId);
      return;
    }
    doApprove(signupId, null);
  }

  function onPickListing(listingId: string | null) {
    const signupId = pickerSignupId;
    setPickerSignupId(null);
    if (signupId) doApprove(signupId, listingId);
  }

  async function doApprove(signupId: string, assignedListingId: string | null, acknowledged = false) {
    setBusySignupId(signupId);
    setBanner(null);
    const body: { assigned_listing_id?: string; acknowledged_reapproval?: boolean } = {};
    if (assignedListingId) body.assigned_listing_id = assignedListingId;
    if (acknowledged) body.acknowledged_reapproval = true;
    const res = await api.post(`/shelter/signups/${signupId}/approve`, body);
    setBusySignupId(null);
    if (res.ok) {
      setReapprove(null);
      loadRequests();
      return;
    }
    const code = res.data?.error?.code;
    if (res.status === 409 && code === "reapproval_required") {
      setReapprove({ signupId, details: res.data.error.details, assignedListingId });
      return;
    }
    setReapprove(null);
    if (res.status === 409 && code === "shift_full") {
      setBanner("This activity is already full.");
    } else if (res.status === 409 && code === "not_pending") {
      loadRequests();
    } else {
      setBanner(res.data?.error?.message ?? "Couldn't approve this request. Try again.");
    }
  }

  async function doDecline(signupId: string) {
    setBusySignupId(signupId);
    setBanner(null);
    const res = await api.post(`/shelter/signups/${signupId}/decline`);
    setBusySignupId(null);
    if (res.ok) {
      setReapprove(null);
      loadRequests();
      return;
    }
    const code = res.data?.error?.code;
    if (res.status === 409 && code === "not_pending") {
      setReapprove(null);
      loadRequests();
    } else {
      // Close the reapprove modal on any other failure too — otherwise it stays open on top
      // of the banner and hides the error (a no-op when it wasn't open, i.e. a plain row
      // Decline that failed).
      setReapprove(null);
      setBanner(res.data?.error?.message ?? "Couldn't decline this request. Try again.");
    }
  }

  const reapproveRow = reapprove ? requests.find((r) => r.signup_id === reapprove.signupId) : undefined;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{shift ? shiftTypeLabel(shift.type) : "Requests"}</Text>
          {!!shift && (
            <Text style={styles.subtitle}>
              {shiftWhenLabel(shift.starts_at, shift.ends_at)} · {shift.capacity} spot{shift.capacity === 1 ? "" : "s"}
            </Text>
          )}
        </View>
        <View style={styles.back} />
      </View>

      {!!banner && (
        <View style={styles.bannerBox}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      )}

      {!loaded ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.teal} />
        </View>
      ) : loadError ? (
        <View style={styles.centerFill}>
          <Text style={styles.empty}>Couldn't load requests. Pull down or go back and try again.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Pending · {requests.length}</Text>

          {requests.length === 0 ? (
            <Text style={styles.empty}>No pending requests right now.</Text>
          ) : (
            requests.map((row) => {
              const chip = reliabilityChip(row.reliability);
              const busy = busySignupId === row.signup_id;
              // Approve stays disabled (spinner in place of the label) until the shift's
              // type is known — see IMPORTANT 1: approving a walking shift before then would
              // silently skip the animal picker with no way to attach a listing afterward.
              const approveBusy = busy || !shiftLoaded;
              return (
                <View key={row.signup_id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials(row.volunteer.display_name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{row.volunteer.display_name}</Text>
                      {!!row.requested_at && (
                        <Text style={styles.requestedAt}>requested {timeAgo(row.requested_at)}</Text>
                      )}
                    </View>
                    {!row.reliability.needs_reapproval && (
                      <View style={[styles.chip, CHIP_STYLE[chip.tone]]}>
                        <Text style={[styles.chipText, CHIP_TEXT_STYLE[chip.tone]]}>{chip.label}</Text>
                      </View>
                    )}
                  </View>

                  {row.reliability.needs_reapproval && (
                    <View style={styles.flagStrip}>
                      <AlertIcon color={colors.amber} size={26} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.flagTitle}>Needs re-approval</Text>
                        <Text style={styles.flagSub}>
                          {row.reliability.consecutive_no_shows} no-show{row.reliability.consecutive_no_shows === 1 ? "" : "s"} in a row
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.declineBtn, busy && styles.btnDisabled]}
                      activeOpacity={0.85}
                      disabled={busy}
                      onPress={() => doDecline(row.signup_id)}
                    >
                      <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.approveBtn, approveBusy && styles.btnDisabled]}
                      activeOpacity={0.85}
                      disabled={approveBusy}
                      onPress={() => onPressApprove(row.signup_id)}
                    >
                      {approveBusy ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text style={styles.approveText}>Approve</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* D-S5-3 — the walking-shift animal picker. Non-walking shifts never open this. */}
      <Modal visible={pickerSignupId !== null} transparent animationType="slide" onRequestClose={() => setPickerSignupId(null)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Assign an animal</Text>
              <TouchableOpacity onPress={() => setPickerSignupId(null)} hitSlop={TAP_SLOP}>
                <Text style={styles.pickerClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.pickerSub}>Optional — pick which of your animals this volunteer will walk.</Text>

            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {!listingsLoaded ? (
                <ActivityIndicator color={colors.teal} style={{ marginTop: 20 }} />
              ) : listingsError ? (
                <Text style={styles.empty}>Couldn't load your animals. You can still skip.</Text>
              ) : listings.length === 0 ? (
                <Text style={styles.empty}>No animals listed yet. You can still skip.</Text>
              ) : (
                listings.map((l) => (
                  <TouchableOpacity
                    key={l.listing_id}
                    style={styles.animalCard}
                    activeOpacity={0.85}
                    onPress={() => onPickListing(l.listing_id)}
                  >
                    {l.photo_url ? (
                      <Image source={{ uri: l.photo_url }} style={styles.animalPhoto} resizeMode="cover" />
                    ) : (
                      <View style={[styles.animalPhoto, styles.animalPhotoEmpty]} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.animalName}>{l.pet.name}</Text>
                      <Text style={styles.animalSpecies}>{capitalize(l.pet.species)}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity style={styles.skipBtn} activeOpacity={0.85} onPress={() => onPickListing(null)}>
              <Text style={styles.skipText}>Skip — approve without assigning an animal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* The no-show re-approval disclosure — server-enforced 409, this is just the UI ack. */}
      <ConfirmModal
        visible={!!reapprove}
        title="Approve anyway?"
        body={
          reapprove
            ? `${reapproveRow ? reapproveRow.volunteer.display_name + " has " : "This volunteer has "}` +
              `${reapprove.details.shifts_completed} completed · ${reapprove.details.no_shows} no-shows · ` +
              `${reapprove.details.consecutive_no_shows} in a row.`
            : ""
        }
        confirmLabel="Approve anyway"
        tone="danger"
        secondaryLabel="Decline instead"
        onSecondary={() => {
          // Guard against a double-tap firing two concurrent declines, same as the row
          // buttons' `disabled={busy}`.
          if (reapprove && !busySignupId) doDecline(reapprove.signupId);
        }}
        onConfirm={() => {
          // Same double-tap guard as onSecondary above — a second "Approve anyway" before the
          // first resolves would fire two concurrent approves (the 2nd a harmless not_pending,
          // but no reason to send it).
          if (reapprove && !busySignupId) doApprove(reapprove.signupId, reapprove.assignedListingId, true);
        }}
        onCancel={() => setReapprove(null)}
      />
    </View>
  );
}

const colors = {
  ink: "#12213A", teal: "#1C6B6B", tealDark: "#14504F", page: "#F4F5F2", muted: "#5F5E5A",
  white: "#FFFFFF", chipBg: "#E7F0EE", amberBg: "#FAEEDA", amber: "#633806",
  greyBg: "#ECEAE3", grey: "#5F5E5A", danger: "#B23B3B", dangerBg: "#FBEAEA", line: "#E3E1D9"
};

const CHIP_STYLE: Record<ChipTone, { backgroundColor: string }> = {
  done: { backgroundColor: colors.chipBg }, muted: { backgroundColor: colors.greyBg }, danger: { backgroundColor: colors.amberBg }
};
const CHIP_TEXT_STYLE: Record<ChipTone, { color: string }> = {
  done: { color: colors.tealDark }, muted: { color: colors.grey }, danger: { color: colors.amber }
};

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: {
    paddingTop: 58, paddingHorizontal: 20, paddingBottom: 10,
    flexDirection: "row", alignItems: "center", gap: 8
  },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 19, fontWeight: "800", textAlign: "center" },
  subtitle: { marginTop: 3, color: colors.muted, fontSize: 12, textAlign: "center" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  empty: { color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 21, marginTop: 8 },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 60 },
  sectionLabel: { marginBottom: 12, color: colors.ink, fontSize: 15, fontWeight: "800" },
  bannerBox: { marginHorizontal: 20, marginTop: 4, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.dangerBg },
  bannerText: { color: colors.danger, fontSize: 13, fontWeight: "700", textAlign: "center" },
  card: { borderRadius: 20, padding: 16, marginBottom: 14, ...card },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.chipBg, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.tealDark, fontSize: 15, fontWeight: "800" },
  name: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  requestedAt: { marginTop: 2, color: colors.muted, fontSize: 12 },
  chip: { paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "800" },
  flagStrip: {
    marginTop: 12, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12,
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.amberBg
  },
  flagTitle: { color: colors.amber, fontSize: 14, fontWeight: "800" },
  flagSub: { marginTop: 1, color: colors.amber, fontSize: 12 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  declineBtn: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: colors.greyBg },
  declineText: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  approveBtn: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  approveText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  btnDisabled: { opacity: 0.6 },
  pickerOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(18, 33, 58, 0.45)" },
  pickerSheet: { maxHeight: "78%", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.page, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 28 },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  pickerClose: { color: colors.teal, fontSize: 14, fontWeight: "800" },
  pickerSub: { marginTop: 6, color: colors.muted, fontSize: 13 },
  pickerList: { marginTop: 14 },
  animalCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, marginBottom: 10, ...card },
  animalPhoto: { width: 52, height: 52, borderRadius: 12 },
  animalPhotoEmpty: { backgroundColor: colors.greyBg },
  animalName: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  animalSpecies: { marginTop: 2, color: colors.muted, fontSize: 12 },
  skipBtn: { marginTop: 8, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: colors.chipBg },
  skipText: { color: colors.tealDark, fontSize: 14, fontWeight: "800" }
});
