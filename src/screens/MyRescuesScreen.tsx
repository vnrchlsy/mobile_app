// US-K3 · the claimer's own cases — active, resolved, and expired, newest claim first.
// Reference: screens/user/screen-my-rescues.png. GET /me/rescues.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { RescueCaseSummary } from "../api/types";
import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { relTime, sagipTitle, strayChip } from "../sagip";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  amberBg: "#FAEEDA", amber: "#633806", tealBg: "#E2EEF0", tealFg: "#14504F",
  greenBg: "#EAF3DE", green: "#27500A", greyBg: "#ECEAE3", grey: "#5F5E5A"
};
const TONE = {
  amber: { bg: colors.amberBg, fg: colors.amber }, teal: { bg: colors.tealBg, fg: colors.tealFg },
  green: { bg: colors.greenBg, fg: colors.green }, grey: { bg: colors.greyBg, fg: colors.grey }
} as const;

type Props = NativeStackScreenProps<RootStackParamList, "myRescues">;

export function MyRescuesScreen({ navigation }: Props) {
  const api = useApi();
  const [cases, setCases] = useState<RescueCaseSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    api.get("/me/rescues").then((r) => {
      if (r.ok) setCases(r.data?.cases ?? []);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My rescues</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loaded && cases.length === 0 ? (
          <Text style={styles.empty}>You haven't claimed a case yet.</Text>
        ) : (
          cases.map((c) => {
            // An expired claim shows its own lapsed state rather than the report's
            // current (possibly re-claimed by someone else) status.
            const chip = c.expired_at ? { label: "Expired", tone: "grey" as const } : strayChip(c.status);
            const tone = TONE[chip.tone];
            return (
              <TouchableOpacity
                key={c.case_id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("rescueUpdate", {
                  caseId: c.case_id, reportId: c.report.report_id
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{sagipTitle(c.report.species, c.report.condition)}</Text>
                  <Text style={styles.cardMeta}>
                    {(c.report.city ? c.report.city + " · " : "") + "claimed " + relTime(c.claimed_at)}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.chipText, { color: tone.fg }]}>{chip.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
  content: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 60 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 20, marginBottom: 12, ...card },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  cardMeta: { marginTop: 6, color: colors.muted, fontSize: 14 },
  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "800" },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, textAlign: "center" }
});
