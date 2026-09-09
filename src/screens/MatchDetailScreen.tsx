// US-L3 · one match, with the binding decision. "This is my pet" is binding (the claim/commitment
// rule) so it's confirmed here with full context, not from a list button. A second decision on an
// already-decided match returns 409 match_decided — shown gracefully (the other party got there).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { matchReasons } from "../community";
import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", tealDk: "#14504F", page: "#F4F5F2", muted: "#5F5E5A",
  white: "#FFFFFF", soft: "#E7F0EF", dim: "#DBE6E2", line: "#E3E1D9", danger: "#B23B3B"
};
const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

type Props = NativeStackScreenProps<RootStackParamList, "matchDetail">;

export function MatchDetailScreen({ navigation, route }: Props) {
  const { reportId, match } = route.params;
  const api = useApi();
  const [busy, setBusy] = useState(false);
  const rep = match.report;
  const reasons = match.signals ? matchReasons(match.signals) : ["a possible match"];
  const decided = match.status !== "suggested";

  async function decide(action: "confirm" | "dismiss") {
    if (busy || decided) return;
    if (action === "confirm") {
      Alert.alert("This is my pet?",
        "Confirming links both reports and marks them reunited. Do this only if you're sure.",
        [{ text: "Not yet", style: "cancel" },
         { text: "Yes, it's mine", onPress: () => send("confirm") }]);
    } else {
      send("dismiss");
    }
  }

  async function send(action: "confirm" | "dismiss") {
    setBusy(true);
    const res = await api.post(`/reports/${reportId}/matches/${match.match_id}/${action}`);
    setBusy(false);
    if (res.ok) {
      navigation.goBack();
    } else if (res.status === 409) {
      Alert.alert("Already decided", "The other reporter already responded to this match.",
        [{ text: "OK", onPress: () => navigation.goBack() }]);
    } else {
      Alert.alert("Something went wrong", "Please try again.");
    }
  }

  const fact = (k: string, v: string | null) => (
    <View style={styles.factRow} key={k}>
      <Text style={styles.factKey}>{k}</Text>
      <Text style={styles.factVal}>{v || "—"}</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Match</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.reportCard}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{rep.report_type === "found" ? "Found nearby" : "Lost nearby"}</Text>
          </View>
          <View style={styles.photo} />
          {fact("Species", rep.species)}
          {fact("Breed", rep.breed)}
          {fact("Colour & markings", rep.color_markings)}
          {fact("Area", rep.city)}
        </View>

        <View style={styles.reasonsCard}>
          <Text style={styles.reasonsTitle}>Why we matched these</Text>
          <Text style={styles.reasonsText}>{reasons.join(" · ")}</Text>
        </View>

        {decided ? (
          <Text style={styles.decidedNote}>
            This match was already {match.status === "confirmed" ? "confirmed" : "dismissed"}.
          </Text>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => decide("confirm")} disabled={busy}>
              <Text style={styles.primaryLabel}>This is my pet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => decide("dismiss")} disabled={busy}>
              <Text style={styles.secondaryLabel}>Not a match</Text>
            </TouchableOpacity>
          </>
        )}
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
  reportCard: { padding: 18, borderRadius: 22, ...card },
  chip: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 13, backgroundColor: colors.soft },
  chipText: { color: colors.teal, fontSize: 13, fontWeight: "700" },
  photo: { height: 180, borderRadius: 16, backgroundColor: colors.dim, marginTop: 14, marginBottom: 6 },
  factRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 16 },
  factKey: { color: colors.muted, fontSize: 14 },
  factVal: { color: colors.ink, fontSize: 15, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  reasonsCard: { marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: colors.soft },
  reasonsTitle: { color: colors.tealDk, fontSize: 14, fontWeight: "700" },
  reasonsText: { marginTop: 6, color: colors.tealDk, fontSize: 14.5, lineHeight: 20 },
  decidedNote: { marginTop: 24, color: colors.muted, fontSize: 15, textAlign: "center" },
  primaryBtn: { marginTop: 24, height: 58, borderRadius: 29, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  primaryLabel: { color: colors.white, fontSize: 18, fontWeight: "700" },
  secondaryBtn: { marginTop: 14, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", ...card },
  secondaryLabel: { color: colors.ink, fontSize: 16, fontWeight: "700" }
});
