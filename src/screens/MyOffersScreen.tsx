// US-O2 · the caller's own offers, grouped Open / Matched / Expired.
// Reference: screens/user/screen-my-offers.png. GET /me/offers, DELETE …/offers/{id}.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { MyOffer } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { OFFER_TYPE_LABEL, offerStatusChip, sagipTitle } from "../sagip";
import { TAP_SLOP } from "../touch";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  tealBg: "#E2EEF0", tealFg: "#14504F", greenBg: "#EAF3DE", green: "#27500A",
  greyBg: "#ECEAE3", grey: "#5F5E5A", danger: "#B23B3B"
};
const TONE = {
  teal: { bg: colors.tealBg, fg: colors.tealFg }, green: { bg: colors.greenBg, fg: colors.green },
  grey: { bg: colors.greyBg, fg: colors.grey }
} as const;

const GROUPS: Array<{ key: "open" | "matched" | "expired"; label: string }> = [
  { key: "open", label: "Open" }, { key: "matched", label: "Matched" }, { key: "expired", label: "Expired" }
];

type Props = NativeStackScreenProps<RootStackParamList, "myOffers">;

export function MyOffersScreen({ navigation }: Props) {
  const api = useApi();
  const [offers, setOffers] = useState<MyOffer[]>([]);
  // US-R3 · `loaded` tracked that a response ARRIVED, never that it succeeded — so
  // `loaded && length === 0` was true both for a genuine empty list and for a failed
  // request, and rendered the same sentence for both.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const load = useCallback(() => {
    setRes(null);
    api.get("/me/offers").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setOffers(r.data?.offers ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function withdraw(offer: MyOffer) {
    Alert.alert("Withdraw this offer?", "You can offer again later if you change your mind.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Withdraw", style: "destructive", onPress: async () => {
          const res = await api.del(`/reports/${offer.report.report_id}/offers/${offer.offer_id}`);
          if (res.ok) {
            setOffers((prev) => prev.filter((o) => o.offer_id !== offer.offer_id));
          } else {
            // Someone matched or it expired between the list load and the tap — reload
            // to show its real state rather than silently doing nothing.
            Alert.alert("Can't withdraw this one anymore", "It's no longer open.");
            load();
          }
        }
      }
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My offers</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loadState(res, offers.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, offers.length)}
            emptyTitle="You haven't offered to help on anything yet."
            onRetry={load}
          />
        ) : (
          GROUPS.map((group) => {
            const rows = offers.filter((o) => o.status === group.key);
            if (rows.length === 0) return null;
            return (
              <View key={group.key} style={styles.section}>
                <Text style={styles.sectionTitle}>{group.label} · {rows.length}</Text>
                {rows.map((o) => {
                  const chip = offerStatusChip(o.status);
                  const tone = TONE[chip.tone as keyof typeof TONE];
                  return (
                    <TouchableOpacity
                      key={o.offer_id}
                      style={styles.card}
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate("reportDetail", { reportId: o.report.report_id })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{sagipTitle(o.report.species, o.report.condition)}</Text>
                        <Text style={styles.cardMeta}>
                          {OFFER_TYPE_LABEL[o.offer_type]}{o.report.city ? " · " + o.report.city : ""}
                        </Text>
                      </View>
                      <View style={styles.rightCol}>
                        <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.chipText, { color: tone.fg }]}>{chip.label}</Text>
                        </View>
                        {o.status === "open" ? (
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); withdraw(o); }} hitSlop={TAP_SLOP}
                            style={styles.withdrawBtn}
                          >
                            <Text style={styles.withdrawText}>Withdraw</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
  section: { marginBottom: 22 },
  sectionTitle: { marginBottom: 12, color: colors.ink, fontSize: 16, fontWeight: "800" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 20, marginBottom: 12, ...card },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  cardMeta: { marginTop: 6, color: colors.muted, fontSize: 14 },
  rightCol: { alignItems: "flex-end", gap: 8 },
  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "800" },
  withdrawBtn: { paddingVertical: 2 },
  withdrawText: { color: colors.danger, fontSize: 13, fontWeight: "700" },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, textAlign: "center" }
});
