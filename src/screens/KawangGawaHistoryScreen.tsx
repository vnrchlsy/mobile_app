// US-V8 · volunteer history — completed/cancelled shifts plus aggregate reliability stats.
// Reference: screens/user/screen-kawanggawa-history.png. GET /me/signups returns
// { requested, upcoming, history, reliability }; this screen shows `history` (completed,
// no-show, cancelled, and declined signups all land here already) and the `reliability` block.
// D-S5-2: the stats header is aggregate-only — shifts_completed / no_shows / summed hours,
// no shelter names, dates, or per-org breakdown. The history list below is where org names and
// dates belong.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { VolunteerIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { CardTone, historyHours, MySignupItem, MySignups, shiftTypeLabel, signupStatusCard } from "../volunteer";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { ScreenHeader } from "../components/ui";


const TONE: Record<CardTone, { bg: string; fg: string }> = {
  active: { bg: colors.successBg, fg: colors.success },
  done: { bg: colors.soft, fg: colors.teal },
  muted: { bg: colors.warningBg, fg: colors.warningStrong },
  danger: { bg: colors.dangerBg, fg: colors.danger }
};

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

function shiftDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Sum of `item.hours` across completed shifts only — the numeric aggregate for the Hours stat.
// `historyHours` (from ../volunteer) formats a single item for display; it isn't summed itself.
function totalCompletedHours(history: MySignupItem[]): number {
  return history
    .filter((i) => i.status === "completed")
    .reduce((sum, i) => sum + (i.hours ?? 0), 0);
}

function hoursLabel(total: number): string {
  return Number.isInteger(total) ? `${total}h` : `${total.toFixed(1)}h`;
}

function StatusChip({ item }: { item: MySignupItem }) {
  const { label, tone } = signupStatusCard(item.status);
  const c = TONE[tone];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.chipText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

function HistoryCard({ item }: { item: MySignupItem }) {
  const hours = item.status === "completed" ? historyHours(item) : null;
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <VolunteerIcon color={colors.teal} size={22} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{shiftTypeLabel(item.shift.type)}</Text>
        <Text style={styles.cardMeta}>
          {item.shift.org_name} · {shiftDateLabel(item.shift.starts_at)}
          {hours ? ` · ${hours}` : ""}
        </Text>
      </View>
      <StatusChip item={item} />
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "kawanggawaHistory">;

export function KawangGawaHistoryScreen({ navigation }: Props) {
  const api = useApi();
  const [data, setData] = useState<MySignups | null>(null);
  // US-R4 · was three hand-rolled booleans that collapsed offline, 5xx and "deleted"
  // into one sentence. Keeping the RESULT lets the shared view say which it was — and
  // a 404 here is ordinary: these routes are reached from a push notification about a
  // shift that may since have been cancelled.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const load = useCallback(() => {
    setRes(null);
    api.get("/me/signups").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setData(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const history = data?.history ?? [];
  const reliability = data?.reliability;
  // `loaded && !error &&` used to prefix this: the guard against announcing "empty" to
  // someone whose request never came back. That guard now lives one level up — this is
  // only ever read inside the `data !== null` branch — so `!!data` IS the same check.
  const isEmpty = !!data && history.length === 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Volunteer history" onBack={() => navigation.goBack()} />

      {!data ? (
        <LoadStateView state={loadState(res)} subject="shift history" onRetry={load}
          onBack={() => navigation.goBack()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {reliability && (
            <View style={styles.statsCard}>
              <View style={styles.statCol}>
                <Text style={styles.statValue}>{reliability.shifts_completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statValue}>{hoursLabel(totalCompletedHours(history))}</Text>
                <Text style={styles.statLabel}>Hours</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statValue}>{reliability.no_shows}</Text>
                <Text style={styles.statLabel}>No-shows</Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionLabel}>Shift history</Text>

          {isEmpty ? (
            <Text style={styles.empty}>Completed and cancelled shifts will show up here.</Text>
          ) : (
            history.map((item) => <HistoryCard key={item.signup_id} item={item} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  empty: { color: colors.muted, ...typography.body, textAlign: "center" },
  content: { paddingHorizontal: spacing.lg, paddingTop: 16, paddingBottom: 60 },
  statsCard: {
    flexDirection: "row", alignItems: "center", borderRadius: radii.field, paddingVertical: 20, marginBottom: 18, ...card
  },
  statCol: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 40, backgroundColor: colors.border },
  statValue: { color: colors.ink, ...typography.hero },
  statLabel: { marginTop: 4, color: colors.muted, ...typography.meta, fontWeight: "700" },
  sectionLabel: { marginTop: 4, marginBottom: 12, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: radii.field, marginBottom: 12, ...card },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft,
              alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  cardMeta: { marginTop: 4, color: colors.muted, ...typography.meta, fontWeight: "700" },
  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  chipText: { ...typography.meta, fontWeight: "800" }
});
