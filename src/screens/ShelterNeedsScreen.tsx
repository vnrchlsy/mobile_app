// US-W3 · a shelter manages its Abot-tulong wishlist. Lists its own needs (all statuses) with
// progress + status chips; add a new need; tap one to see and confirm pledges.
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { ChipTone, needProgressLabel, needStatusChip, NeedStatus } from "../community";
import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  okBg: "#EAF3DE", ok: "#27500A", warnBg: "#FAEEDA", warn: "#8A5A12",
  greyPill: "#ECEAE3", greyInk: "#5F5E5A"
};
const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};
const CHIP: Record<ChipTone, { bg: string; fg: string }> = {
  ok: { bg: colors.okBg, fg: colors.ok },
  warn: { bg: colors.warnBg, fg: colors.warn },
  muted: { bg: colors.greyPill, fg: colors.greyInk }
};

type Need = {
  need_id: string; title: string; category: string; description: string;
  quantity_needed: number; quantity_received: number; status: NeedStatus;
};
type Props = NativeStackScreenProps<RootStackParamList, "shelterNeeds">;

export function ShelterNeedsScreen({ navigation }: Props) {
  const api = useApi();
  const [needs, setNeeds] = useState<Need[] | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const load = useCallback(() => {
    let alive = true;
    api.get("/me").then((me) => {
      if (!me.ok || !alive) return;
      api.get(`/shelters/${me.data.account_id}/needs`)
        .then((r) => alive && setNeeds(r.ok ? r.data.results : []));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFocusEffect(load);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Wishlist</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.note}>
          Post what your shelter needs. Givers pledge to bring items; you confirm once they arrive.
        </Text>
        <TouchableOpacity style={styles.addBtn}
          onPress={() => navigation.navigate("needForm", {})}>
          <Text style={styles.addLabel}>+ Add a need</Text>
        </TouchableOpacity>

        {loadState(res, needs?.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, needs?.length)}
            emptyTitle="No needs posted yet."
            onRetry={load}
          />
        ) : (
          (needs ?? []).map((need) => {
            const chip = needStatusChip(need.status);
            return (
              <TouchableOpacity key={need.need_id} style={styles.needCard} activeOpacity={0.8}
                onPress={() => navigation.navigate("needPledges", { need })}>
                <View style={styles.row}>
                  <Text style={styles.needTitle}>{need.title}</Text>
                  <View style={[styles.chip, { backgroundColor: CHIP[chip.tone].bg }]}>
                    <Text style={[styles.chipText, { color: CHIP[chip.tone].fg }]}>{chip.label}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>
                  {need.category} · {needProgressLabel(need.quantity_received, need.quantity_needed)}
                </Text>
              </TouchableOpacity>
            );
          })
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
  note: { color: colors.muted, fontSize: 14.5, lineHeight: 21, marginBottom: 16 },
  addBtn: { height: 54, borderRadius: 27, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  addLabel: { color: colors.white, fontSize: 16, fontWeight: "700" },
  empty: { marginTop: 30, color: colors.muted, fontSize: 16, textAlign: "center" },
  needCard: { marginBottom: 12, padding: 18, borderRadius: 22, ...card },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  needTitle: { flex: 1, color: colors.ink, fontSize: 17, fontWeight: "800" },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  chipText: { fontSize: 12.5, fontWeight: "700" },
  meta: { marginTop: 8, color: colors.muted, fontSize: 14, textTransform: "capitalize" }
});
