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

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  okBg: "#EAF3DE", ok: "#27500A", warnBg: "#FAEEDA", warn: "#8A5A12",
  greyPill: "#ECEAE3", greyInk: "#5F5E5A", danger: "#B23B3B"
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My donations</Text>
      </View>
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
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, lineHeight: 23, textAlign: "center" },
  pledgeCard: { marginBottom: 14, padding: 18, borderRadius: 22, ...card },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  needTitle: { flex: 1, color: colors.ink, fontSize: 17, fontWeight: "800" },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  chipText: { fontSize: 12.5, fontWeight: "700" },
  meta: { marginTop: 8, color: colors.muted, fontSize: 14.5 },
  cancelBtn: { marginTop: 14, alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: "#FBEEEC" },
  cancelLabel: { color: colors.danger, fontSize: 14.5, fontWeight: "700" }
});
