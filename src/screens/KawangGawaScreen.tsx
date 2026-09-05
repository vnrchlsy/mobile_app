// US-V8 · the Kawang-Gawa hub — the Volunteer tab. Browse open shifts across shelters.
// Reference: screens/user/screen-kawanggawa.png. GET /shifts (optionally ?type=).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { StaleBanner } from "../components/StaleBanner";
import { isOffline, loadState } from "../net";
import { VolunteerIcon } from "../components/AppIcons";
import { OwnerTabs } from "../components/OwnerTabs";
import { RootStackParamList } from "../navigation/types";
import { useCachedFeed } from "../useCachedFeed";
import { BrowseShift, ShiftType, shiftTypeLabel, slotsLeftLabel } from "../volunteer";
import { TAP_SLOP } from "../touch";

const SHIFT_TYPES: ShiftType[] = ["walking", "feeding", "visitor", "event", "facility", "transport"];
const FILTERS: Array<{ key: "" | ShiftType; label: string }> = [
  { key: "", label: "All" },
  ...SHIFT_TYPES.map((t) => ({ key: t, label: shiftTypeLabel(t) }))
];

function shiftWhenLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime}–${endTime}`;
}

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  chipBg: "#E7F0EE"
};

// Registered under "kawanggawa" (the real hub) and, temporarily, under the remaining
// not-yet-built US-V8 route names too — RootNavigator points them all at this component so the
// app compiles before Tasks 5–8 swap in their real screens ("kawanggawaDetail" and "waiver" got
// their real components in Task 4). The union keeps that placeholder wiring typechecking without
// an `any` cast; this screen never reads `route.params`.
type Props = NativeStackScreenProps<
  RootStackParamList,
  | "kawanggawa"
  | "kawanggawaRequested"
  | "kawanggawaSchedule"
  | "kawanggawaCheckin"
  | "kawanggawaHistory"
  | "kawanggawaCancel"
>;

export function KawangGawaScreen({ navigation }: Props) {
  const api = useApi();
  const { rows: shifts, res, stale, load: loadFeed } =
    useCachedFeed<BrowseShift>(api, (d) => d?.results ?? []);

  const [type, setType] = useState<"" | ShiftType>("");

  const load = useCallback(() => {
    const qs = type ? `?type=${type}` : "";
    loadFeed(`/shifts${qs}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus + filter change
  }, [type]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen} testID="screen.kawanggawa">
      <View style={styles.header}>
        <Text style={styles.title}>Kawang-Gawa</Text>
        <View style={styles.headerLinks}>
          <TouchableOpacity onPress={() => navigation.navigate("kawanggawaSchedule")} hitSlop={TAP_SLOP}>
            <Text style={styles.headerLink}>My schedule ›</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("kawanggawaHistory")} hitSlop={TAP_SLOP}>
            <Text style={styles.headerLink}>History ›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity hitSlop={TAP_SLOP}
              key={f.key || "all"}
              style={[styles.filterChip, type === f.key && styles.filterChipActive]}
              onPress={() => setType(f.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterText, type === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loadState(res, shifts?.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, shifts?.length)}
            emptyTitle="No open shifts right now — check back soon."
            onRetry={load}
          />
        ) : (
          <>
          {stale ? <StaleBanner offline={isOffline(res)} /> : null}
          {(shifts ?? []).map((s, i) => (
            <TouchableOpacity
              testID={`card.kawanggawa.${i}`}
              key={s.shift_id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("kawanggawaDetail", { shiftId: s.shift_id })}
            >
              <View style={styles.cardIcon}>
                <VolunteerIcon color={colors.teal} size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{shiftTypeLabel(s.type)}</Text>
                <Text style={styles.cardOrg}>{s.org_name}</Text>
                <Text style={styles.cardMeta}>{shiftWhenLabel(s.starts_at, s.ends_at)}</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{slotsLeftLabel(s.slots_left, s.capacity)}</Text>
              </View>
            </TouchableOpacity>
          ))}
          </>
        )}
      </ScrollView>

      <OwnerTabs active="volunteer" />
    </View>
  );
}

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 4, flexDirection: "row",
            alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.ink, fontSize: 26, fontWeight: "800" },
  headerLinks: { flexDirection: "row", gap: 16 },
  headerLink: { color: colors.teal, fontSize: 14, fontWeight: "700" },
  content: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 130 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  filterChip: { paddingHorizontal: 16, height: 38, borderRadius: 19, alignItems: "center",
                justifyContent: "center", backgroundColor: colors.white },
  filterChipActive: { backgroundColor: colors.teal },
  filterText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  filterTextActive: { color: colors.white },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 20, marginBottom: 12, ...card },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.chipBg,
              alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  cardOrg: { marginTop: 2, color: colors.muted, fontSize: 13, fontWeight: "700" },
  cardMeta: { marginTop: 6, color: colors.teal, fontSize: 14, fontWeight: "700" },
  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center", backgroundColor: colors.chipBg },
  chipText: { fontSize: 13, fontWeight: "800", color: colors.teal },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, textAlign: "center" }
});
