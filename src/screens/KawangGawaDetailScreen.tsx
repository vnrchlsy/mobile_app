// US-V8 · Kawang-Gawa shift detail — the two consents, then the request.
// Reference: screens/user/screen-kawanggawa-detail.png. GET /shifts/{shiftId} returns the
// BrowseShift shape, which carries `org_name` (Task 4b) but no location field yet; POST
// /shifts/{shiftId}/signups sends both consents together.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { CheckIcon, VolunteerIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { BrowseShift, shiftTypeLabel, slotsLeftLabel } from "../volunteer";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", tealDark: "#14504F", page: "#F4F5F2", muted: "#5F5E5A",
  white: "#FFFFFF", chipBg: "#E7F0EE", danger: "#B23B3B", line: "#E3E1D9"
};

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

function shiftWhenLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime}–${endTime}`;
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

  const canRequest = waiverChecked && contactChecked && !submitting && shift?.status === "open";

  async function submit() {
    if (!canRequest || submitting) return;
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Volunteer</Text>
      </View>

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

          <View style={styles.infoCard}>
            <Text style={styles.infoLine}>{shiftWhenLabel(shift.starts_at, shift.ends_at)}</Text>
            <Text style={[styles.infoLine, styles.infoLineLast]}>
              {slotsLeftLabel(shift.slots_left, shift.capacity)}
            </Text>
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
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            testID="chk.kawanggawaDetail.contact"
            activeOpacity={0.85}
            style={styles.consentRow}
            onPress={() => setContactChecked((v) => !v)}
          >
            <View style={[styles.consentBox, contactChecked && styles.consentBoxChecked]}>
              {contactChecked && <CheckIcon color="#FFFFFF" size={13} />}
            </View>
            <Text style={styles.consentText}>
              I agree to share my contact details (phone, email) with the shelter to coordinate this shift.
            </Text>
          </TouchableOpacity>

          {!!error && <Text style={styles.formError}>{error}</Text>}

          <TouchableOpacity
            testID="btn.kawanggawaDetail.request"
            activeOpacity={0.85}
            style={[styles.submitButton, !canRequest && styles.submitButtonDisabled]}
            onPress={submit}
            disabled={!canRequest}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Request</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 22, paddingBottom: 60 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.chipBg, alignItems: "center", justifyContent: "center" },
  heroTitle: { flex: 1, color: colors.ink, fontSize: 24, fontWeight: "800" },
  orgName: { marginTop: 14, color: colors.ink, fontSize: 16, fontWeight: "800" },
  infoCard: { marginTop: 16, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, ...card },
  infoLine: { color: colors.ink, fontSize: 15, fontWeight: "700", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  infoLineLast: { borderBottomWidth: 0, paddingBottom: 0 },
  notOpenNote: { marginTop: 14, color: colors.danger, fontSize: 13, fontWeight: "700" },
  sectionLabel: { marginTop: 28, marginBottom: 12, color: colors.ink, fontSize: 16, fontWeight: "800" },
  consentRow: {
    marginBottom: 14, borderRadius: 14, flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 16, paddingVertical: 16, gap: 14, backgroundColor: colors.chipBg
  },
  consentRowAlert: { backgroundColor: "#FBEAEA" },
  consentBox: {
    width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, borderColor: colors.teal,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.white, marginTop: 1
  },
  consentBoxChecked: { backgroundColor: colors.teal },
  consentBoxAlert: { borderColor: colors.danger },
  consentText: { color: colors.tealDark, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  consentLink: { textDecorationLine: "underline" },
  consentHelper: { marginTop: 6, color: colors.muted, fontSize: 11, fontWeight: "600" },
  formError: { marginTop: 4, marginBottom: 10, color: colors.danger, fontSize: 13, fontWeight: "700" },
  submitButton: { height: 56, marginTop: 8, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { color: colors.white, fontSize: 16, fontWeight: "800" }
});
