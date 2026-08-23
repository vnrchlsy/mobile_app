// US-S5 · report detail (city-level, public shared-link) + Track K/O — claim it, offer
// help, or (if you're the reporter) see the waiting view. Reference:
// screens/user/screen-report-detail.png (+ -waiting, -unclaimed).
// GET /reports/{id}; POST /reports/{id}/claim.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ReportDetail, StrayStatus } from "../api/types";
import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { relTime, sagipTitle, strayChip } from "../sagip";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  amberBg: "#FAEEDA", amber: "#633806", tealBg: "#E2EEF0", tealFg: "#14504F",
  greenBg: "#EAF3DE", green: "#27500A", greyBg: "#ECEAE3", grey: "#5F5E5A", line: "#E3E1D9"
};
const TONE = {
  amber: { bg: colors.amberBg, fg: colors.amber }, teal: { bg: colors.tealBg, fg: colors.tealFg },
  green: { bg: colors.greenBg, fg: colors.green }, grey: { bg: colors.greyBg, fg: colors.grey }
} as const;
const LADDER: StrayStatus[] = ["reported", "claimed", "rescued", "resolved"];
const LADDER_LABEL: Record<StrayStatus, string> = {
  reported: "Reported", claimed: "Claimed", rescued: "Rescued", safe: "Safe", resolved: "Resolved"
};

type Props = NativeStackScreenProps<RootStackParamList, "reportDetail">;

export function ReportDetailScreen({ navigation, route }: Props) {
  const api = useApi();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(() => {
    api.get(`/reports/${route.params.reportId}`).then((r) => {
      if (r.ok) setReport(r.data);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [route.params.reportId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmClaim() {
    // The exclusivity warning appears before the tap commits to anything — claiming is
    // final, there's no release once it lands.
    Alert.alert(
      "Claiming is final",
      "It's locked to you and can't be handed back. Only claim if you're actually going.",
      [
        { text: "Not yet", style: "cancel" },
        { text: "Claim this case", style: "default", onPress: claim }
      ]
    );
  }

  async function claim() {
    if (claiming) return;
    setClaiming(true);
    const res = await api.post(`/reports/${route.params.reportId}/claim`);
    setClaiming(false);
    if (res.ok) {
      navigation.replace("rescueUpdate", { caseId: res.data.case_id, reportId: route.params.reportId });
      return;
    }
    const code = res.data?.error?.code;
    if (code === "already_claimed") {
      Alert.alert("Someone else got there first", "This report was just claimed by another rescuer.");
      load();
      return;
    }
    if (res.status === 403) {
      Alert.alert(
        "Get verified to claim",
        "Claiming needs a Verified Member badge or a verified shelter account.",
        [{ text: "Not now", style: "cancel" }, { text: "Get verified", onPress: () => navigation.navigate("memberUpgrade") }]
      );
      return;
    }
    Alert.alert("Couldn't claim this case", res.data?.error?.message ?? "Try again.");
  }

  const chip = report ? strayChip(report.status) : null;
  const activeIdx = report ? LADDER.indexOf(report.status === "safe" ? "rescued" : report.status) : -1;
  // Present only when the caller IS this report's reporter (US-O3) — the backend omits
  // these fields entirely for anyone else, so their presence alone is the signal.
  const isReporterView = report?.status_history !== undefined;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}>
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Report</Text>
      </View>

      {!report ? (
        <Text style={styles.empty}>{loaded ? "Report not found." : "Loading…"}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {report.photos.length > 0 ? (
            <Image source={{ uri: report.photos[0] }} style={styles.photo} resizeMode="cover" />
          ) : null}

          <Text style={styles.h1}>{sagipTitle(report.species, report.condition)}</Text>
          <Text style={styles.sub}>
            {(report.city ? report.city + " · " : "") + "reported " + relTime(report.reported_at)}
          </Text>
          {chip ? (
            <View style={[styles.chip, { backgroundColor: TONE[chip.tone].bg }]}>
              <Text style={[styles.chipText, { color: TONE[chip.tone].fg }]}>{chip.label}</Text>
            </View>
          ) : null}

          {report.notes ? (
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{report.notes}</Text>
            </View>
          ) : null}

          {isReporterView && report.status === "reported" ? (
            <View style={styles.waitingCard}>
              <Text style={styles.waitingLine}>
                {(report.offers_count ?? 0) === 0
                  ? "No one has offered yet — you'd be on your own for this one."
                  : `${report.offers_count} ${report.offers_count === 1 ? "person has" : "people have"} offered to help.`}
              </Text>
              {report.escalation_level === 1 ? (
                <Text style={styles.waitingSub}>Widened to ~5 km · nearby rescuers notified.</Text>
              ) : report.escalation_level === 2 ? (
                <Text style={styles.waitingSub}>Widened further · partner shelters notified.</Text>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Status</Text>
          {isReporterView && report.status_history && report.status_history.length > 0 ? (
            <View style={styles.ladder}>
              {report.status_history.map((h, i) => (
                <View key={i} style={styles.ladderRow}>
                  <View style={[styles.ladderDot, styles.ladderDotDone]} />
                  <Text style={[styles.ladderLabel, styles.ladderLabelDone]}>
                    {LADDER_LABEL[h.status]} · {relTime(h.changed_at)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.ladder}>
              {LADDER.map((s, i) => {
                const done = i <= activeIdx;
                return (
                  <View key={s} style={styles.ladderRow}>
                    <View style={[styles.ladderDot, done && styles.ladderDotDone]} />
                    <Text style={[styles.ladderLabel, done && styles.ladderLabelDone]}>{LADDER_LABEL[s]}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {!isReporterView && report.status === "reported" ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.claimBtn}
                activeOpacity={0.9}
                onPress={confirmClaim}
                disabled={claiming}
              >
                {claiming ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.claimBtnText}>Claim this case</Text>}
              </TouchableOpacity>
              <Text style={styles.claimFine}>
                Claiming is final — it's locked to you and can't be handed back.
              </Text>
              <TouchableOpacity
                style={styles.offerBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("rescueOffer", { reportId: report.report_id })}
              >
                <Text style={styles.offerBtnText}>Can't go? Offer help instead</Text>
              </TouchableOpacity>
            </View>
          ) : null}
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
  photo: { width: "100%", height: 200, borderRadius: 22, marginBottom: 18, backgroundColor: colors.line },
  h1: { color: colors.ink, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  sub: { marginTop: 8, color: colors.muted, fontSize: 16 },
  chip: { marginTop: 14, alignSelf: "flex-start", paddingHorizontal: 14, height: 30, borderRadius: 15, justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "800" },
  notesCard: { marginTop: 20, padding: 18, borderRadius: 18, ...card },
  notesText: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  waitingCard: { marginTop: 20, padding: 18, borderRadius: 18, backgroundColor: colors.tealBg },
  waitingLine: { color: colors.tealFg, fontSize: 16, fontWeight: "700" },
  waitingSub: { marginTop: 6, color: colors.tealFg, fontSize: 14 },
  sectionTitle: { marginTop: 26, marginBottom: 14, color: colors.ink, fontSize: 20, fontWeight: "800" },
  ladder: { paddingLeft: 4 },
  ladderRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  ladderDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.line },
  ladderDotDone: { backgroundColor: colors.teal },
  ladderLabel: { color: colors.muted, fontSize: 16 },
  ladderLabelDone: { color: colors.ink, fontWeight: "700" },
  actionRow: { marginTop: 30 },
  claimBtn: { height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  claimBtnText: { color: colors.white, fontSize: 19, fontWeight: "700" },
  claimFine: { marginTop: 10, color: "#9a988f", fontSize: 13, lineHeight: 18, textAlign: "center" },
  offerBtn: { marginTop: 16, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.teal },
  offerBtnText: { color: colors.teal, fontSize: 16, fontWeight: "700" }
});
