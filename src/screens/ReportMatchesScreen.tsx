// US-L3 · possible lost<->found matches for the reporter's own report (GET /reports/{id}/matches).
// Each card shows WHY (the §11 signals as reasons) and a soft strength label — never a raw
// percentage. Tapping a card opens the full comparison, where the binding confirm/dismiss lives.
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { matchReasons, matchStrength } from "../community";
import { MatchShape, RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  dim: "#DBE6E2", okBg: "#EAF3DE", ok: "#27500A", warnBg: "#FAEEDA", warn: "#8A5A12"
};
const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

type Props = NativeStackScreenProps<RootStackParamList, "reportMatches">;

export function ReportMatchesScreen({ navigation, route }: Props) {
  const api = useApi();
  const { reportId } = route.params;
  const [matches, setMatches] = useState<MatchShape[] | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(() => {
    setRes(null);
    // ⚠️ was `else { setMatches([]); setForbidden(r.status === 403); }` — so a 500 or an
    // offline request left matches = [] and forbidden = false, and the render told someone
    // whose pet is LOST that there were "No matches yet". `forbidden` keeps its own branch
    // because its copy is more specific than the generic `gone` state.
    api.get(`/reports/${reportId}/matches`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setMatches(r.data.results);
      else setForbidden(r.status === 403);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);
  useFocusEffect(load);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Possible matches</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>You decide — nothing happens until you confirm.</Text>
        {forbidden ? (
          <Text style={styles.empty}>Only the reporter can see a report's matches.</Text>
        ) : loadState(res, matches?.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, matches?.length)}
            emptyTitle="No matches yet."
            emptyBody="We'll notify you if one turns up."
            onRetry={load}
          />
        ) : (
          (matches ?? []).map((m) => {
            const strength = matchStrength(m.score ?? 0);
            const reasons = m.signals ? matchReasons(m.signals) : ["a possible match"];
            const tone = strength.tone === "ok"
              ? { bg: colors.okBg, fg: colors.ok } : { bg: colors.warnBg, fg: colors.warn };
            return (
              <TouchableOpacity key={m.match_id} style={styles.matchCard} activeOpacity={0.85}
                onPress={() => navigation.navigate("matchDetail", { reportId, match: m })}>
                <View style={styles.row}>
                  <View style={styles.photo} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.topRow}>
                      <Text style={styles.type}>
                        {m.report.report_type === "found" ? "Found report" : "Lost report"}
                      </Text>
                      <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                        <Text style={[styles.chipText, { color: tone.fg }]}>{strength.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.reasons} numberOfLines={2}>{reasons.join(" · ")}</Text>
                    <Text style={styles.review}>Review match ›</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        {matches && matches.length > 0 ? (
          <Text style={styles.footnote}>Both reporters see these suggestions.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  intro: { color: colors.muted, fontSize: 15, marginBottom: 16 },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, textAlign: "center", lineHeight: 23 },
  matchCard: { marginBottom: 14, padding: 16, borderRadius: 22, ...card },
  row: { flexDirection: "row", gap: 14 },
  photo: { width: 96, height: 96, borderRadius: 16, backgroundColor: colors.dim },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  type: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  chip: { paddingHorizontal: 11, paddingVertical: 4, borderRadius: 11 },
  chipText: { fontSize: 12, fontWeight: "700" },
  reasons: { marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 19 },
  review: { marginTop: 10, color: colors.teal, fontSize: 14.5, fontWeight: "700" },
  footnote: { marginTop: 8, color: "#B8B6AD", fontSize: 13.5, textAlign: "center" }
});
