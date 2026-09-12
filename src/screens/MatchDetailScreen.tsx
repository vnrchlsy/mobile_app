// US-L3 · one match, with the binding decision. "This is my pet" is binding (the claim/commitment
// rule) so it's confirmed here with full context, not from a list button. A second decision on an
// already-decided match returns 409 match_decided — shown gracefully (the other party got there).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { matchReasons } from "../community";
import { RootStackParamList } from "../navigation/types";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";

const card = {
  backgroundColor: colors.white, ...elevation.soft
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
      <ScreenHeader title="Match" onBack={() => navigation.goBack()} />
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
            <Button
              label="This is my pet"
              onPress={() => decide("confirm")}
              loading={busy}
              style={styles.primaryBtn}
            />
            <Button label="Not a match" onPress={() => decide("dismiss")} loading={busy} variant="secondary" style={styles.secondaryBtn} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  reportCard: { padding: 18, borderRadius: radii.card, ...card },
  chip: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.chip, backgroundColor: colors.soft },
  chipText: { color: colors.teal, ...typography.meta, fontWeight: "700" },
  photo: { height: 180, borderRadius: radii.card, backgroundColor: colors.soft, marginTop: 14, marginBottom: 6 },
  factRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 16 },
  factKey: { color: colors.muted, ...typography.meta },
  factVal: { color: colors.ink, ...typography.strong, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  reasonsCard: { marginTop: 16, padding: 16, borderRadius: radii.tile, backgroundColor: colors.soft },
  reasonsTitle: { color: colors.tealDark, ...typography.meta, fontWeight: "700" },
  reasonsText: { marginTop: 6, color: colors.tealDark, ...typography.body },
  decidedNote: { marginTop: 24, color: colors.muted, ...typography.body, textAlign: "center" },
  primaryBtn: { marginTop: 24 },
  secondaryBtn: { marginTop: 14 },
});
