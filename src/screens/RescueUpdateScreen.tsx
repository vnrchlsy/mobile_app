// US-K2 · work a claimed case toward safe/resolved. Reference: screens/user/screen-rescue-update.png.
// POST /cases/{id}/status. Forward-only (the backend allows skipping ahead, not just one
// step at a time — see advanceableStatuses in ../sagip) and `resolved` is terminal.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { ReportDetail, StrayStatus } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { pickAndUpload } from "../media/pickAndUpload";
import { RootStackParamList } from "../navigation/types";
import { advanceableStatuses, sagipTitle, strayChip } from "../sagip";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";

const TONE = {
  amber: { bg: colors.warningBg, fg: colors.warningStrong }, teal: { bg: colors.infoBg, fg: colors.tealDark },
  green: { bg: colors.successBg, fg: colors.success }, grey: { bg: colors.greyPill, fg: colors.muted }
} as const;
const STATUS_LABEL: Record<StrayStatus, string> = {
  reported: "Reported", claimed: "Claimed", rescued: "Rescued", safe: "Safe", resolved: "Resolved"
};

type Props = NativeStackScreenProps<RootStackParamList, "rescueUpdate">;

export function RescueUpdateScreen({ navigation, route }: Props) {
  const api = useApi();
  const { caseId, reportId } = route.params;
  const [report, setReport] = useState<ReportDetail | null>(null);
  // US-R5 · "Case not found." was shown for every failure — to a RESCUER HOLDING AN ACTIVE
  // CLAIM on a stray, on the one screen that exists to advance that case. Offline read as
  // the case having vanished.
  //
  // The gate stays `!report`, which is also what protects typed work: this screen refetches
  // on focus and after each successful update, and `setReport` only runs on success, so a
  // failed refetch leaves the form (and the note being typed into it) exactly where it was.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [target, setTarget] = useState<StrayStatus | null>(null);
  const [note, setNote] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [outcomePhotoUrl, setOutcomePhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    setRes(null);
    api.get(`/reports/${reportId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setReport(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [reportId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const options = report ? advanceableStatuses(report.status) : [];

  async function addOutcomePhoto() {
    if (uploadingPhoto) return;
    setUploadingPhoto(true);
    // (S3 is still a dev seam), but the client-side wiring is real.
    const res = await pickAndUpload(api, "rescue_outcome_photo");
    setUploadingPhoto(false);
    if (res?.ok) setOutcomePhotoUrl(res.fileUrl);
  }

  async function submit() {
    if (submitting) return;
    // ⚠️ Explains rather than blocks. This condition used to live in the early return while
    // the button was also disabled on it, so tapping with nothing chosen did nothing and
    // said nothing. The fade stays — it is a hint (see colors.tealIdle), not a block.
    if (!target) { setError("Choose the new status first."); return; }
    setSubmitting(true);
    setError(undefined);
    const body: Record<string, string> = { status: target };
    if (note.trim()) body.note = note.trim();
    if (target === "resolved" && outcomeNotes.trim()) body.outcome_notes = outcomeNotes.trim();
    if (target === "resolved" && outcomePhotoUrl) body.outcome_photo_url = outcomePhotoUrl;
    const res = await api.post(`/cases/${caseId}/status`, body);
    setSubmitting(false);
    if (res.ok) {
      setNote(""); setTarget(null); setOutcomeNotes(""); setOutcomePhotoUrl(null);
      load(); // refetch — the report's status (and so the remaining options) just changed
      return;
    }
    const code = res.data?.error?.code;
    setError(
      code === "case_expired" ? "This claim lapsed — it's back on the map for someone else to claim."
      : code === "case_resolved" ? "This case is already resolved."
      : code === "not_forward" ? "That's not a forward move from where this case is now."
      : res.data?.error?.message ?? "Couldn't update the case. Try again."
    );
  }

  const chip = report ? strayChip(report.status) : null;
  const tone = chip ? TONE[chip.tone] : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Update case" onBack={() => navigation.goBack()} />

      {!report ? (
        <LoadStateView state={loadState(res)} subject="case" onRetry={load}
          onBack={() => navigation.goBack()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.h1}>{sagipTitle(report.species, report.condition)}</Text>
          {report.city ? <Text style={styles.sub}>{report.city}</Text> : null}
          {chip && tone ? (
            <View style={[styles.currentChip, { backgroundColor: tone.bg }]}>
              <Text style={[styles.currentChipText, { color: tone.fg }]}>Currently: {chip.label}</Text>
            </View>
          ) : null}

          {/* US-SEC1 — GET /reports/{id} already includes precise_location for the
              active claimer (that's you, on this screen), so no second fetch is needed. */}
          {report.precise_location ? (
            <View style={styles.mapWrap}>
              <MapView
                style={styles.map}
                pointerEvents="none"
                initialRegion={{
                  latitude: report.precise_location.lat, longitude: report.precise_location.lng,
                  latitudeDelta: 0.01, longitudeDelta: 0.01
                }}
              >
                <Marker coordinate={{ latitude: report.precise_location.lat, longitude: report.precise_location.lng }} />
              </MapView>
            </View>
          ) : null}

          {/* US-H1/US-H2 — once the case's report is safe, the claiming rescuer can hand it
              off, either publicly (adoption listing) or directly to someone they already
              know. Shown alongside the forward-status options below (a safe case can still be
              moved on to resolved), not instead of them. */}
          {report.status === "safe" ? (
            <View style={styles.handoffRow}>
              <Button
                label="List for adoption"
                onPress={() => navigation.navigate("rescueList", { caseId })}
                variant="secondary"
              />
              <Button
                label="Place with someone"
                onPress={() => navigation.navigate("rescuePlace", { caseId })}
                variant="secondary"
              />
            </View>
          ) : null}

          {options.length === 0 ? (
            <Text style={styles.resolvedNote}>This case is resolved — there's nothing left to update.</Text>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Move it forward to</Text>
              <View style={styles.radioList}>
                {options.map((status) => {
                  const active = status === target;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[styles.radioRow, active && styles.radioRowActive]}
                      onPress={() => setTarget(status)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.radio, active && styles.radioActive]}>
                        {active ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text style={styles.radioLabel}>{STATUS_LABEL[status]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Note (optional)</Text>
              <TextInput
                style={styles.notes}
                value={note}
                onChangeText={setNote}
                placeholder="What happened at this step?"
                placeholderTextColor={colors.muted}
                multiline
              />

              {target === "resolved" ? (
                <>
                  <Text style={styles.label}>Outcome (optional)</Text>
                  <TextInput
                    style={styles.notes}
                    value={outcomeNotes}
                    onChangeText={setOutcomeNotes}
                    placeholder="How this case ended — reunited, adopted, in foster care…"
                    placeholderTextColor={colors.muted}
                    multiline
                  />
                  <TouchableOpacity style={styles.photoBtn} onPress={addOutcomePhoto} activeOpacity={0.85}>
                    {uploadingPhoto ? <ActivityIndicator color={colors.teal} />
                      : <Text style={styles.photoText}>{outcomePhotoUrl ? "✓ Photo added" : "Add an outcome photo · optional"}</Text>}
                  </TouchableOpacity>
                </>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button
                label={target ? `Mark ${STATUS_LABEL[target]}` : "Pick a status above"}
                onPress={submit}
                loading={submitting}
                accessibilityHint={target ? undefined : "Choose the new status first"}
                style={styles.submit}
              />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  h1: { color: colors.ink, ...typography.display },
  sub: { marginTop: 6, color: colors.muted, ...typography.subtitle },
  currentChip: { marginTop: 14, alignSelf: "flex-start", paddingHorizontal: 14, height: 30, borderRadius: 15, justifyContent: "center" },
  mapWrap: { marginTop: 18, height: 150, borderRadius: radii.field, overflow: "hidden", backgroundColor: colors.soft },
  map: { ...StyleSheet.absoluteFillObject },
  currentChipText: { ...typography.meta, fontWeight: "800" },
  handoffRow: { marginTop: 20, flexDirection: "row", gap: 12 },
  handoffBtn: { flex: 1 },
  resolvedNote: { marginTop: 24, color: colors.muted, ...typography.body },
  sectionTitle: { marginTop: 26, marginBottom: 12, color: colors.ink, ...typography.section },
  radioList: { gap: 10 },
  radioRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: radii.tile, borderWidth: 2, borderColor: "transparent", ...card },
  radioRowActive: { borderColor: colors.teal },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.teal },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.teal },
  radioLabel: { color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  label: { marginTop: 22, marginBottom: 10, color: colors.ink, ...typography.strong, fontWeight: "700" },
  notes: { minHeight: 80, borderRadius: radii.tile, padding: 16, color: colors.ink, ...typography.subtitle, textAlignVertical: "top", ...card },
  photoBtn: { marginTop: 14, height: 64, borderRadius: radii.tile, borderWidth: 2, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoText: { color: colors.teal, ...typography.strong, fontWeight: "700" },
  error: { marginTop: 16, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 26 }
});
