// US-W2 · the giver's My Donations: their pledges (pledged / delivered / cancelled). A
// still-pledged pledge can be cancelled (honest and always allowed, D-S6-7); a delivered one
// is a recorded fact with no action.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { ChipTone, pledgeIsCancellable, pledgeStatusChip, PledgeStatus } from "../community";
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

type Pledge = {
  pledge_id: string; quantity: number; status: PledgeStatus;
  need: { need_id: string; title: string; category: string; shelter_name: string };
};
type Props = NativeStackScreenProps<RootStackParamList, "myDonations">;

export function MyDonationsScreen({ navigation }: Props) {
  const api = useApi();
  const [pledges, setPledges] = useState<Pledge[] | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setRes(null);
    // ⚠️ was `setPledges(r.ok ? r.data.results : [])` — a failure became an empty list, and
    // the render below turned that into "You haven't pledged anything yet."
    api.get("/me/pledges").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setPledges(r.data.results);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(load, [load]);

  function confirmCancel(p: Pledge) {
    Alert.alert("Cancel this pledge?",
      `You pledged ${p.quantity} to “${p.need.title}”. Cancelling is fine — it just lets the ` +
      "shelter know not to expect it.",
      [{ text: "Keep pledge", style: "cancel" },
       { text: "Cancel pledge", style: "destructive", onPress: () => doCancel(p) }]);
  }

  async function doCancel(p: Pledge) {
    if (busyId) return;
    setBusyId(p.pledge_id);
    const res = await api.post(`/pledges/${p.pledge_id}/cancel`);
    setBusyId(null);
    if (res.ok) load();
    else Alert.alert("Couldn't cancel", "Please try again.");
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="My donations" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loadState(res, pledges?.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, pledges?.length)}
            emptyTitle="You haven't pledged anything yet."
            emptyBody="A shelter's wishlist is a great place to start."
            onRetry={load}
          />
        ) : (
          (pledges ?? []).map((p) => {
            const chip = pledgeStatusChip(p.status);
            return (
              <View key={p.pledge_id} style={styles.pledgeCard}>
                <View style={styles.row}>
                  <Text style={styles.needTitle}>{p.need.title}</Text>
                  <View style={[styles.chip, { backgroundColor: CHIP[chip.tone].bg }]}>
                    <Text style={[styles.chipText, { color: CHIP[chip.tone].fg }]}>{chip.label}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>{p.need.shelter_name} · pledged {p.quantity}</Text>
                {pledgeIsCancellable(p.status) ? (
                  <TouchableOpacity hitSlop={TAP_SLOP} style={styles.cancelBtn} onPress={() => confirmCancel(p)}
                    disabled={busyId === p.pledge_id}>
                    <Text style={styles.cancelLabel}>
                      {busyId === p.pledge_id ? "Cancelling…" : "Cancel pledge"}
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
  empty: { marginTop: 40, color: colors.muted, ...typography.body, textAlign: "center" },
  pledgeCard: { marginBottom: 14, padding: 18, borderRadius: radii.card, ...card },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  needTitle: { flex: 1, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radii.chip },
  chipText: { ...typography.meta, fontWeight: "700" },
  meta: { marginTop: 8, color: colors.muted, ...typography.body },
  cancelBtn: { marginTop: 14, alignSelf: "flex-start", height: 38, paddingHorizontal: 16, justifyContent: "center", borderRadius: pill(38), backgroundColor: "#FBEEEC" },
  cancelLabel: { color: colors.danger, ...typography.strong, fontWeight: "700" }
});
