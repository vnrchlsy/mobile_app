// US-S3 · the reporter's own list. Reference: screens/user/screen-my-reports.png. GET /me/reports.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View , Alert } from "react-native";

import { MyReport, StrayStatus } from "../api/types";
import { useApi } from "../api/useApi";
import { isStuck, pendingLabel } from "../outbox";
import { useOutbox } from "../outbox/OutboxProvider";
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

const FILTERS: Array<{ key: "all" | StrayStatus; label: string }> = [
  { key: "all", label: "All" }, { key: "reported", label: "Reported" },
  { key: "rescued", label: "Rescued" }, { key: "resolved", label: "Resolved" }
];

type Props = NativeStackScreenProps<RootStackParamList, "myReports">;

export function MyReportsScreen({ navigation }: Props) {
  const api = useApi();
  const { queue, retry, discard } = useOutbox();
  const [reports, setReports] = useState<MyReport[]>([]);
  const [filter, setFilter] = useState<"all" | StrayStatus>("all");
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    api.get("/me/reports").then((r) => {
      if (r.ok) setReports(r.data?.results ?? []);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []));

  const shown = filter === "all" ? reports : reports.filter((r) => r.status === filter);

  // US-O3 · queued reports render ABOVE the sent ones, always, regardless of the filter.
  // A report the server has never seen is the one the person most needs to know about, and
  // hiding it behind a status filter (it has no status yet) would be how it gets forgotten —
  // which is precisely the silent loss §13.3 forbids.
  function confirmDiscard(key: string, label: string) {
    Alert.alert("Discard this report?", `"${label}" hasn't been sent. This can't be undone.`, [
      { text: "Keep it", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => { void discard(key); } },
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}>
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My reports</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {queue.map((item) => {
          const label = sagipTitle(String(item.body.species), String(item.body.condition));
          const stuck = isStuck(item);
          return (
            <View key={item.idempotency_key} style={[styles.card, styles.pendingCard]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{label}</Text>
                <Text style={styles.cardMeta}>
                  {stuck ? "Couldn't send — tap to try again" : "On this device until you're back online"}
                </Text>
                <View style={styles.pendingActions}>
                  <Text
                    style={styles.pendingAction}
                    onPress={() => { void retry(item.idempotency_key); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Try sending ${label} again`}
                  >
                    Try again
                  </Text>
                  <Text
                    style={[styles.pendingAction, styles.pendingDiscard]}
                    onPress={() => confirmDiscard(item.idempotency_key, label)}
                    accessibilityRole="button"
                    accessibilityLabel={`Discard ${label}`}
                  >
                    Discard
                  </Text>
                </View>
              </View>
              <View style={[styles.chip, { backgroundColor: stuck ? "#FBEEEC" : "#FAEEDA" }]}>
                <Text style={[styles.chipText, { color: stuck ? "#B23B3B" : "#633806" }]}>
                  {pendingLabel(item)}
                </Text>
              </View>
            </View>
          );
        })}

        {loaded && shown.length === 0 && queue.length === 0 ? (
          <Text style={styles.empty}>No reports here yet.</Text>
        ) : (
          shown.map((r) => {
            const chip = strayChip(r.status);
            const tone = TONE[chip.tone];
            return (
              <TouchableOpacity
                key={r.report_id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("reportDetail", { reportId: r.report_id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{sagipTitle(r.species, r.condition)}</Text>
                  <Text style={styles.cardMeta}>
                    {(r.city ? r.city + " · " : "") + relTime(r.created_at)}
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
  pendingCard: { borderWidth: 1, borderColor: "#EFE3C9" },
  pendingActions: { flexDirection: "row", marginTop: 8 },
  pendingAction: { fontSize: 13, fontWeight: "700", color: "#1C6B6B", marginRight: 18 },
  pendingDiscard: { color: "#B23B3B" },
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 60 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  filterChip: { paddingHorizontal: 16, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  filterChipActive: { backgroundColor: colors.teal },
  filterText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  filterTextActive: { color: colors.white },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 20, marginBottom: 12, ...card },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  cardMeta: { marginTop: 6, color: colors.muted, fontSize: 14 },
  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "800" },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, textAlign: "center" }
});
