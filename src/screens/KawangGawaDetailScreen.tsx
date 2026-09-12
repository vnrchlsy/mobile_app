// US-V8 · Kawang-Gawa shift detail — the two consents, then the request.
// Reference: screens/user/screen-kawanggawa-detail.png. GET /shifts/{shiftId} returns the
// BrowseShift shape, which carries `org_name` (Task 4b) but no location field yet; POST
// /shifts/{shiftId}/signups sends both consents together.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button, ScreenHeader } from "../components/ui";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { CheckIcon, VolunteerIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { BrowseShift, shiftDurationLabel, shiftSlotsChip, shiftTimeRange, shiftTypeLabel } from "../volunteer";
import { colors, elevation, radii, spacing, squircle, typography } from "../theme";


const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const TONE = {
  amber: { bg: "#FAEEDA", fg: "#633806" }, teal: { bg: "#E2EEF0", fg: "#14504F" },
  green: { bg: "#EAF3DE", fg: "#27500A" }, grey: { bg: "#ECEAE3", fg: "#5F5E5A" }
} as const;

/** The full date. The hub's section heads say "Today"/"Friday" because the list groups by
 *  day; a detail screen is the one place that should state which Friday. */
function shiftDateLabel(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

type Props = NativeStackScreenProps<RootStackParamList, "kawanggawaDetail">;

export function KawangGawaDetailScreen({ navigation, route }: Props) {
  const api = useApi();
  const { shiftId } = route.params;

  const [shift, setShift] = useState<BrowseShift | null>(null);
  // US-R4 · was three hand-rolled booleans that collapsed offline, 5xx and "deleted"
  // into one sentence. Keeping the RESULT lets the shared view say which it was — and
  // a 404 here is ordinary: these routes are reached from a push notification about a
  // shift that may since have been cancelled.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const [waiverChecked, setWaiverChecked] = useState(false);
  const [contactChecked, setContactChecked] = useState(false);
  const [waiverHighlight, setWaiverHighlight] = useState(false);
  const [contactHighlight, setContactHighlight] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    setRes(null);
    api.get(`/shifts/${shiftId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setShift(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [shiftId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ⚠️ NOT a `canRequest` that disables the button. The design system's rule is explicit:
  // never disable a submit control because the form is incomplete — a disabled button gives
  // someone nothing to press and no way to find out why. The waiver is still an absolute gate
  // (D-S5-1); it just moved from "cannot be pressed" to "press it and be told exactly which
  // consent is missing". `submit()` below refuses, so the request cannot be made without it.
  //
  // `submitting` is the one thing that still disables, and it is not a validation state — it
  // stops a double POST while the first is in flight, and the spinner says so.
  async function submit() {
    if (submitting) return;

    // Missing consents are reported ON the rows they belong to, not pooled into a summary
    // above the button — the same design rule, and the reason `error` is left for failures
    // that are not about a field (already requested, shift closed, network).
    const missingWaiver = !waiverChecked;
    const missingContact = !contactChecked;
    setWaiverHighlight(missingWaiver);
    setContactHighlight(missingContact);
    if (missingWaiver || missingContact) {
      setError(undefined);
      return;
    }
    if (shift?.status !== "open") {
      setError("This shift is no longer open.");
      return;
    }

    setSubmitting(true);
    setError(undefined);
    setWaiverHighlight(false);
    const res = await api.post(`/shifts/${shiftId}/signups`, {
      waiver_accepted: true,
      contact_share_consent: contactChecked
    });
    setSubmitting(false);
    if (res.ok) {
      navigation.navigate("kawanggawaRequested");
      return;
    }
    const code = res.data?.error?.code;
    if (res.status === 409 && code === "already_requested") {
      setError("You've already requested this shift.");
      return;
    }
    if (res.status === 409 && code === "shift_not_open") {
      setError("This shift is no longer open.");
      load();
      return;
    }
    if (res.status === 422 && code === "waiver_required") {
      setWaiverHighlight(true);
      setError("Please agree to the volunteer waiver to continue.");
      return;
    }
    setError(res.data?.error?.message ?? "Couldn't send your request. Try again.");
  }

  return (
    <View style={styles.screen} testID="screen.kawanggawaDetail">
      <ScreenHeader title="Volunteer" onBack={() => navigation.goBack()} />

      {!shift ? (
        <LoadStateView state={loadState(res)} subject="shift" onRetry={load}
          onBack={() => navigation.goBack()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <VolunteerIcon color={colors.teal} size={26} />
            </View>
            <Text style={styles.heroTitle}>{shiftTypeLabel(shift.type)}</Text>
          </View>

          <Text style={styles.orgName}>{shift.org_name}</Text>

          {/* Matched to the hub card 2026-09-09. This said "5 of 5 slots left" while the card
              the user had just tapped said "5 slots" — one shift, two vocabularies, one tap
              apart. Same three tiers as the card now: day, time · duration, toned chip. */}
          <View style={styles.infoCard}>
            <Text style={styles.infoDate}>{shiftDateLabel(shift.starts_at)}</Text>
            <Text style={styles.infoWhen}>
              {shiftTimeRange(shift.starts_at, shift.ends_at)} · {shiftDurationLabel(shift.starts_at, shift.ends_at)}
            </Text>
            <View style={styles.infoDivider} />
            {(() => {
              const chip = shiftSlotsChip(shift.slots_left, shift.capacity);
              return (
                <View style={[styles.infoChip, { backgroundColor: TONE[chip.tone].bg }]}>
                  <Text style={[styles.infoChipText, { color: TONE[chip.tone].fg }]}>{chip.label}</Text>
                </View>
              );
            })()}
          </View>

          {shift.status !== "open" && (
            <Text style={styles.notOpenNote}>This shift is no longer open for requests.</Text>
          )}

          <Text style={styles.sectionLabel}>Before you request</Text>

          <TouchableOpacity
            testID="chk.kawanggawaDetail.waiver"
            activeOpacity={0.85}
            style={[styles.consentRow, waiverHighlight && styles.consentRowAlert]}
            onPress={() => {
              setWaiverChecked((v) => !v);
              if (waiverHighlight) setWaiverHighlight(false);
            }}
          >
            <View style={[styles.consentBox, waiverChecked && styles.consentBoxChecked, waiverHighlight && styles.consentBoxAlert]}>
              {waiverChecked && <CheckIcon color="#FFFFFF" size={13} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.consentText}>
                I agree to the{" "}
                <Text style={styles.consentLink} onPress={() => navigation.navigate("waiver")}>
                  volunteer waiver & guidelines
                </Text>
                .
              </Text>
              <Text style={styles.consentHelper}>Tap the link to read what's there so far.</Text>
              {/* Inside the tinted block on purpose. Sitting between the two rows, this read
                  as if it belonged to the row BELOW whenever only one consent was missing. */}
              {waiverHighlight && (
                <Text testID="err.kawanggawaDetail.waiver" style={styles.consentError}>
                  Agree to the waiver to request this shift.
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            testID="chk.kawanggawaDetail.contact"
            activeOpacity={0.85}
            style={[styles.consentRow, contactHighlight && styles.consentRowAlert]}
            onPress={() => {
              setContactChecked((v) => !v);
              if (contactHighlight) setContactHighlight(false);
            }}
          >
            <View style={[styles.consentBox, contactChecked && styles.consentBoxChecked, contactHighlight && styles.consentBoxAlert]}>
              {contactChecked && <CheckIcon color="#FFFFFF" size={13} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.consentText}>
                I agree to share my contact details (phone, email) with the shelter to coordinate this shift.
              </Text>
              {contactHighlight && (
                <Text testID="err.kawanggawaDetail.contact" style={styles.consentError}>
                  The shelter needs this to coordinate the shift with you.
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {!!error && <Text style={styles.formError}>{error}</Text>}

          <Button
            testID="btn.kawanggawaDetail.request"
            label="Request"
            onPress={submit}
            loading={submitting}
            accessibilityLabel="Request this shift"
            style={styles.submitButton}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 22, paddingBottom: 60 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  // Squircle, matching the hub card's tile — V2 replaced round tiles with rounded squares.
  heroIcon: { width: 52, height: 52, borderRadius: squircle(52), backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  heroTitle: { flex: 1, color: colors.ink, ...typography.hero },
  orgName: { marginTop: 14, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  infoCard: { marginTop: 16, borderRadius: radii.tile, paddingHorizontal: 18, paddingVertical: 16, ...card },
  infoDate: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  infoWhen: { marginTop: 4, color: colors.teal, ...typography.strong, fontWeight: "700" },
  infoDivider: { marginTop: 14, height: 1, backgroundColor: colors.border },
  infoChip: { marginTop: 14, alignSelf: "flex-start", paddingHorizontal: 12, height: 28,
              borderRadius: 14, justifyContent: "center" },
  infoChipText: { ...typography.meta, fontWeight: "800" },
  notOpenNote: { marginTop: 14, color: colors.danger, ...typography.meta, fontWeight: "700" },
  sectionLabel: { marginTop: 28, marginBottom: 12, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  consentRow: {
    marginBottom: 14, borderRadius: radii.notice, flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 16, paddingVertical: 16, gap: 14, backgroundColor: colors.soft
  },
  consentRowAlert: { backgroundColor: "#FBEEEC" },
  consentBox: {
    width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, borderColor: colors.teal,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.white, marginTop: 1
  },
  consentBoxChecked: { backgroundColor: colors.teal },
  consentBoxAlert: { borderColor: colors.danger },
  consentText: { color: colors.tealDark, ...typography.meta, fontWeight: "700", lineHeight: 19 },
  consentLink: { textDecorationLine: "underline" },
  consentHelper: { marginTop: 6, color: colors.muted, ...typography.caption, fontWeight: "600" },
  formError: { marginTop: 4, marginBottom: 10, color: colors.danger, ...typography.meta, fontWeight: "700" },
  submitButton: { marginTop: 8 },
  consentError: { marginTop: 8, color: colors.danger, ...typography.meta, fontWeight: "700" }
});
