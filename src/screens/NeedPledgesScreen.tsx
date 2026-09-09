// US-W3 · a need's pledges, and the shelter's confirm-received action. Covers screen-need-pledges,
// -need-received-confirm and -need-complete (close). Received-confirm defaults to the pledged
// quantity (the common case); the backend accepts any actual amount (D-S6-7) — a per-item
// quantity editor is a later refinement.
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { ChipTone, needProgressLabel, pledgeStatusChip, PledgeStatus } from "../community";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  okBg: "#EAF3DE", ok: "#27500A", warnBg: "#FAEEDA", warn: "#8A5A12",
  greyPill: "#ECEAE3", greyInk: "#5F5E5A", soft: "#E7F0EF", danger: "#B23B3B"
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

type Pledge = { pledge_id: string; quantity: number; status: PledgeStatus; pledger_name: string };
type Props = NativeStackScreenProps<RootStackParamList, "needPledges">;

export function NeedPledgesScreen({ navigation, route }: Props) {
  const api = useApi();
  const { need } = route.params;
  const [pledges, setPledges] = useState<Pledge[] | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setRes(null);
    api.get(`/needs/${need.need_id}/pledges`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setPledges(r.data.results);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [need.need_id]);
  useFocusEffect(load);

  function confirmReceived(p: Pledge) {
    Alert.alert("Mark received?",
      `Confirm you received ${p.quantity} from ${p.pledger_name}. This adds to the need's total.`,
      [{ text: "Not yet", style: "cancel" },
       { text: "Confirm", onPress: () => doReceive(p) }]);
  }

  async function doReceive(p: Pledge) {
    if (busyId) return;
    setBusyId(p.pledge_id);
    const res = await api.post(`/needs/${need.need_id}/received`,
      { pledge_id: p.pledge_id, quantity_received: p.quantity });
    setBusyId(null);
    if (res.ok) load();
    else Alert.alert("Couldn't confirm", "Please try again.");
  }

  function confirmClose() {
    Alert.alert("Close this need?",
      "It stops accepting new pledges. Delivered pledges stay on record.",
      [{ text: "Keep open", style: "cancel" },
       { text: "Close need", style: "destructive", onPress: doClose }]);
  }

  async function doClose() {
    const res = await api.patch(`/needs/${need.need_id}`, { status: "closed" });
    if (res.ok) navigation.goBack();
    else Alert.alert("Couldn't close", "Please try again.");
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{need.title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.progress}>
          {needProgressLabel(need.quantity_received, need.quantity_needed)}
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity hitSlop={TAP_SLOP} style={styles.secondaryBtn}
            onPress={() => navigation.navigate("needForm", { need })}>
            <Text style={styles.secondaryLabel}>Edit</Text>
          </TouchableOpacity>
          {need.status === "open" ? (
            <TouchableOpacity hitSlop={TAP_SLOP} style={styles.secondaryBtn} onPress={confirmClose}>
              <Text style={[styles.secondaryLabel, { color: colors.danger }]}>Close need</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Pledges</Text>
        {loadState(res, pledges?.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, pledges?.length)}
            emptyTitle="No pledges yet."
            onRetry={load}
          />
        ) : (
          (pledges ?? []).map((p) => {
            const chip = pledgeStatusChip(p.status);
            return (
              <View key={p.pledge_id} style={styles.pledgeCard}>
                <View style={styles.row}>
                  <Text style={styles.pledger}>{p.pledger_name}</Text>
                  <View style={[styles.chip, { backgroundColor: CHIP[chip.tone].bg }]}>
                    <Text style={[styles.chipText, { color: CHIP[chip.tone].fg }]}>{chip.label}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>Pledged {p.quantity}</Text>
                {p.status === "pledged" ? (
                  <TouchableOpacity hitSlop={TAP_SLOP} style={styles.receiveBtn} onPress={() => confirmReceived(p)}
                    disabled={busyId === p.pledge_id}>
                    <Text style={styles.receiveLabel}>
                      {busyId === p.pledge_id ? "Confirming…" : "Mark received"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
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
  title: { flex: 1, color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  progress: { color: colors.teal, fontSize: 16, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  secondaryBtn: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 16, ...card },
  secondaryLabel: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  sectionTitle: { marginTop: 28, marginBottom: 12, color: colors.ink, fontSize: 18, fontWeight: "800" },
  empty: { marginTop: 20, color: colors.muted, fontSize: 15 },
  pledgeCard: { marginBottom: 12, padding: 18, borderRadius: 22, ...card },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  pledger: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: "800" },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  chipText: { fontSize: 12.5, fontWeight: "700" },
  meta: { marginTop: 8, color: colors.muted, fontSize: 14.5 },
  receiveBtn: { marginTop: 14, alignSelf: "flex-start", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.soft },
  receiveLabel: { color: colors.teal, fontSize: 14.5, fontWeight: "700" }
});
