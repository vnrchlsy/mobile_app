// US-K2 · work a claimed case toward safe/resolved. Reference: screens/user/screen-rescue-update.png.
// POST /cases/{id}/status. Forward-only (the backend allows skipping ahead, not just one
// step at a time — see advanceableStatuses in ../sagip) and `resolved` is terminal.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ReportDetail, StrayStatus } from "../api/types";
import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { advanceableStatuses, sagipTitle, strayChip } from "../sagip";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  line: "#E3E1D9", danger: "#B23B3B", fine: "#9a988f",
  amberBg: "#FAEEDA", amber: "#633806", tealBg: "#E2EEF0", tealFg: "#14504F",
  greenBg: "#EAF3DE", green: "#27500A", greyBg: "#ECEAE3", grey: "#5F5E5A"
};
const TONE = {
  amber: { bg: colors.amberBg, fg: colors.amber }, teal: { bg: colors.tealBg, fg: colors.tealFg },
  green: { bg: colors.greenBg, fg: colors.green }, grey: { bg: colors.greyBg, fg: colors.grey }
} as const;
const STATUS_LABEL: Record<StrayStatus, string> = {
  reported: "Reported", claimed: "Claimed", rescued: "Rescued", safe: "Safe", resolved: "Resolved"
};

type Props = NativeStackScreenProps<RootStackParamList, "rescueUpdate">;

export function RescueUpdateScreen({ navigation, route }: Props) {
  const api = useApi();
  const { caseId, reportId } = route.params;
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [target, setTarget] = useState<StrayStatus | null>(null);
  const [note, setNote] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    api.get(`/reports/${reportId}`).then((r) => {
      if (r.ok) setReport(r.data);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [reportId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const options = report ? advanceableStatuses(report.status) : [];

  async function submit() {
    if (!target || submitting) return;
    setSubmitting(true);
    setError(undefined);
    const body: Record<string, string> = { status: target };
    if (note.trim()) body.note = note.trim();
    if (target === "resolved" && outcomeNotes.trim()) body.outcome_notes = outcomeNotes.trim();
    const res = await api.post(`/cases/${caseId}/status`, body);
    setSubmitting(false);
    if (res.ok) {
      setNote(""); setTarget(null);
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}>
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Update case</Text>
      </View>

      {!report ? (
        <Text style={styles.empty}>{loaded ? "Case not found." : "Loading…"}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.h1}>{sagipTitle(report.species, report.condition)}</Text>
          {report.city ? <Text style={styles.sub}>{report.city}</Text> : null}
          {chip && tone ? (
            <View style={[styles.currentChip, { backgroundColor: tone.bg }]}>
              <Text style={[styles.currentChipText, { color: tone.fg }]}>Currently: {chip.label}</Text>
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
                placeholderTextColor={colors.fine}
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
                    placeholderTextColor={colors.fine}
                    multiline
                  />
                </>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.submit, !target && styles.submitIdle]}
                onPress={submit}
                activeOpacity={0.9}
                disabled={!target || submitting}
              >
                {submitting ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.submitText}>
                      {target ? `Mark ${STATUS_LABEL[target]}` : "Pick a status above"}
                    </Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  empty: { marginTop: 60, color: colors.muted, fontSize: 16, textAlign: "center" },
  h1: { color: colors.ink, fontSize: 27, fontWeight: "800", letterSpacing: -0.5 },
  sub: { marginTop: 6, color: colors.muted, fontSize: 16 },
  currentChip: { marginTop: 14, alignSelf: "flex-start", paddingHorizontal: 14, height: 30, borderRadius: 15, justifyContent: "center" },
  currentChipText: { fontSize: 13, fontWeight: "800" },
  resolvedNote: { marginTop: 24, color: colors.muted, fontSize: 16, lineHeight: 22 },
  sectionTitle: { marginTop: 26, marginBottom: 12, color: colors.ink, fontSize: 18, fontWeight: "800" },
  radioList: { gap: 10 },
  radioRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, borderWidth: 2, borderColor: "transparent", ...card },
  radioRowActive: { borderColor: colors.teal },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.teal },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.teal },
  radioLabel: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  label: { marginTop: 22, marginBottom: 10, color: colors.ink, fontSize: 15, fontWeight: "700" },
  notes: { minHeight: 80, borderRadius: 18, padding: 16, color: colors.ink, fontSize: 16, textAlignVertical: "top", ...card },
  error: { marginTop: 16, color: colors.danger, fontSize: 15, fontWeight: "600" },
  submit: { marginTop: 26, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  submitIdle: { backgroundColor: "#7FA8A6" },
  submitText: { color: colors.white, fontSize: 19, fontWeight: "700" }
});
