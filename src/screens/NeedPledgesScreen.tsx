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
import { colors, elevation, pill, radii, spacing, typography } from "../theme";
import { ScreenHeader } from "../components/ui";

const card = {
  backgroundColor: colors.white, ...elevation.soft
};
const CHIP: Record<ChipTone, { bg: string; fg: string }> = {
  ok: { bg: colors.successBg, fg: colors.success },
  warn: { bg: colors.warningBg, fg: colors.warning },
  muted: { bg: colors.greyPill, fg: colors.muted }
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
      <ScreenHeader title={need.title} onBack={() => navigation.goBack()} />
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
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  progress: { color: colors.teal, ...typography.subtitle, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  secondaryBtn: { height: 38, paddingHorizontal: 20, justifyContent: "center", borderRadius: pill(38), ...card },
  secondaryLabel: { color: colors.ink, ...typography.strong, fontWeight: "700" },
  sectionTitle: { marginTop: 28, marginBottom: 12, color: colors.ink, ...typography.section },
  empty: { marginTop: 20, color: colors.muted, ...typography.body },
  pledgeCard: { marginBottom: 12, padding: 18, borderRadius: radii.card, ...card },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  pledger: { flex: 1, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radii.chip },
  chipText: { ...typography.meta, fontWeight: "700" },
  meta: { marginTop: 8, color: colors.muted, ...typography.body },
  receiveBtn: { marginTop: 14, alignSelf: "flex-start", height: 38, paddingHorizontal: 18, justifyContent: "center", borderRadius: pill(38), backgroundColor: colors.soft },
  receiveLabel: { color: colors.teal, ...typography.strong, fontWeight: "700" }
});
