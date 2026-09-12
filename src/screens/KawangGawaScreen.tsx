// US-V8 · the Kawang-Gawa hub — the Volunteer tab. Browse open shifts across shelters.
// Reference: screens/user/screen-kawanggawa.png. GET /shifts (optionally ?type=), plus
// GET /me/signups for the impact strip.
//
// Redesigned 2026-09-09. What was here: a 26pt title that collided with two 14pt header links
// at phone width, seven filter chips wrapping onto three rows above a list that often held one
// shift, and cards reading "Dog walking / E2E shelter / Fri, Sep 11 · 11:29 PM–1:29 AM /
// 5 of 5 slots left". Nothing said how long a shift takes, whether it was nearly gone, or what
// the volunteer had already done — there was nothing on the screen to bring anyone back.
//
// ⚠️ WHAT THE DATA WILL NOT SUPPORT. `_shift_repr` carries no location, description or photo
// (volunteer/views.py), so "shelters near you", distance and imagery are not available here
// without backend work. Everything below is derived from the two endpoints that already exist.
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
import {
  BrowseShift, MySignups, ShiftType, groupShiftsByDay, nextBookedShift, shiftDurationLabel,
  shiftSlotsChip, shiftTimeRange, shiftTypeLabel, volunteerTotals, volunteerTotalsLabel
} from "../volunteer";
import { colors, elevation, radii, spacing, typography } from "../theme";

const SHIFT_TYPES: ShiftType[] = ["walking", "feeding", "visitor", "event", "facility", "transport"];
const FILTERS: Array<{ key: "" | ShiftType; label: string }> = [
  { key: "", label: "All" },
  ...SHIFT_TYPES.map((t) => ({ key: t, label: shiftTypeLabel(t) }))
];

const TONE = {
  amber: { bg: "#FAEEDA", fg: "#633806" }, teal: { bg: "#E2EEF0", fg: "#14504F" },
  green: { bg: "#EAF3DE", fg: "#27500A" }, grey: { bg: "#ECEAE3", fg: "#5F5E5A" }
} as const;

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
  // ⚠️ Set ONLY on a successful response, and the strip renders only when it is non-null. A
  // failed /me/signups therefore draws nothing rather than a confident "0 shifts" — the same
  // rule the rescue panels follow, and for the same reason: an empty answer and an answer that
  // never arrived are not the same statement. A genuine first-timer comes back non-null with
  // zeroes and gets the invitation line instead.
  const [mine, setMine] = useState<MySignups | null>(null);

  const load = useCallback(() => {
    const qs = type ? `?type=${type}` : "";
    loadFeed(`/shifts${qs}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus + filter change
  }, [type]);

  useFocusEffect(useCallback(() => {
    load();
    api.get("/me/signups").then((r) => {
      if (r.ok) setMine(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- api identity is stable per render
  }, [load]));

  const totalsLabel = volunteerTotalsLabel(volunteerTotals(mine));
  const next = nextBookedShift(mine);
  const groups = groupShiftsByDay(shifts ?? []);
  const state = loadState(res, shifts?.length);
  let cardIndex = -1; // flat across day sections — e2e flow 30 taps card.kawanggawa.0

  return (
    <View style={styles.screen} testID="screen.kawanggawa">
      {/* The title had `justifyContent: space-between` against two links and no room to
          shrink, so "Kawang-Gawa" ran straight into "My schedule ›" at 402 pt. It gets its
          own line now, and the two destinations became real buttons rather than 14 pt text. */}
      <View style={styles.header}>
        <Text style={styles.title}>Kawang-Gawa</Text>
        <View style={styles.headerLinks}>
          <TouchableOpacity
            style={styles.headerPill}
            activeOpacity={0.75}
            accessibilityRole="button"
            onPress={() => navigation.navigate("kawanggawaSchedule")}
          >
            <Text style={styles.headerPillText}>My schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerPill}
            activeOpacity={0.75}
            accessibilityRole="button"
            onPress={() => navigation.navigate("kawanggawaHistory")}
          >
            <Text style={styles.headerPillText}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {mine && (
          <View style={styles.impact}>
            <Text style={styles.impactTotals}>{totalsLabel ?? "Your first shift is waiting."}</Text>
            {next ? (
              <>
                <View style={styles.impactDivider} />
                <TouchableOpacity
                  style={styles.impactNext}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Next shift: ${shiftTypeLabel(next.shift.type)} at ${next.shift.org_name}`}
                  onPress={() => navigation.navigate("kawanggawaSchedule")}
                >
                  <View style={styles.impactNextCopy}>
                    <Text style={styles.impactNextLabel}>
                      Next · {shiftTypeLabel(next.shift.type)} at {next.shift.org_name}
                    </Text>
                    <Text style={styles.impactNextWhen}>
                      {shiftTimeRange(next.shift.starts_at, next.shift.ends_at)} · {shiftDurationLabel(next.shift.starts_at, next.shift.ends_at)}
                    </Text>
                  </View>
                  <Text style={styles.impactChevron}>›</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        )}

        {/* One scrolling row. Seven chips wrapped onto three rows before, taking ~140 pt of
            the screen above a list that is often shorter than the filter that sorts it. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key || "all"}
              style={[styles.filterChip, type === f.key && styles.filterChipActive]}
              onPress={() => setType(f.key)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected: type === f.key }}
            >
              <Text style={[styles.filterText, type === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {state.kind !== "ready" ? (
          <LoadStateView
            state={state}
            emptyTitle="No open shifts right now — check back soon."
            onRetry={load}
          />
        ) : (
          <>
          {stale ? <StaleBanner offline={isOffline(res)} /> : null}
          {groups.map((group) => (
            <View key={group.label}>
              <Text style={styles.groupHead}>{group.label}</Text>
              {group.shifts.map((s) => {
                cardIndex += 1;
                const chip = shiftSlotsChip(s.slots_left, s.capacity);
                const tone = TONE[chip.tone];
                const full = s.slots_left <= 0;
                return (
                  <TouchableOpacity
                    testID={`card.kawanggawa.${cardIndex}`}
                    key={s.shift_id}
                    style={styles.card}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`${shiftTypeLabel(s.type)} at ${s.org_name}, ${shiftTimeRange(s.starts_at, s.ends_at)}, ${chip.label}`}
                    onPress={() => navigation.navigate("kawanggawaDetail", { shiftId: s.shift_id })}
                  >
                    <View style={[styles.cardIcon, full && styles.cardIconFull]}>
                      <VolunteerIcon color={full ? colors.muted : colors.teal} size={22} />
                    </View>
                    {/* The chip sits in the TITLE row, not a third column. As a column it
                        left the time line about 156 pt and "11:29 PM–1:29 AM · 2 hours"
                        wrapped onto two lines on a 402 pt screen. */}
                    <View style={styles.cardCopy}>
                      <View style={styles.cardTop}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{shiftTypeLabel(s.type)}</Text>
                        <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.chipText, { color: tone.fg }]}>{chip.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardOrg}>{s.org_name}</Text>
                      <Text style={styles.cardMeta}>
                        {shiftTimeRange(s.starts_at, s.ends_at)} · {shiftDurationLabel(s.starts_at, s.ends_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          </>
        )}
      </ScrollView>

      <OwnerTabs active="volunteer" />
    </View>
  );
}

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: spacing.lg, paddingBottom: 4 },
  title: { color: colors.ink, ...typography.hero },
  headerLinks: { marginTop: 12, flexDirection: "row", gap: 10 },
  headerPill: {
    // §13.4 · a real 44 pt box rather than hitSlop; touch.ts is explicit that invisible slop
    // between close siblings overlaps and the first one wins every contested tap.
    height: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: "center",
    justifyContent: "center", ...card
  },
  headerPillText: { color: colors.ink, ...typography.meta, fontWeight: "800" },
  content: { paddingHorizontal: spacing.lg, paddingTop: 16, paddingBottom: 130 },
  impact: { borderRadius: radii.tile, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 18, ...card },
  impactTotals: { color: colors.ink, ...typography.section },
  impactDivider: { marginTop: 14, height: 1, backgroundColor: colors.border },
  impactNext: { marginTop: 12, flexDirection: "row", alignItems: "center" },
  impactNextCopy: { flex: 1 },
  impactNextLabel: { color: colors.teal, ...typography.meta, fontWeight: "800" },
  impactNextWhen: { marginTop: 3, color: colors.muted, ...typography.meta },
  impactChevron: { marginLeft: 10, color: colors.teal, fontSize: 19, fontWeight: "700" },
  filterRow: { gap: 8, paddingRight: 26, marginBottom: 18 },
  filterChip: { paddingHorizontal: 16, height: 44, borderRadius: 22, alignItems: "center",
                justifyContent: "center", backgroundColor: colors.white },
  filterChipActive: { backgroundColor: colors.teal },
  filterText: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  filterTextActive: { color: colors.white },
  groupHead: { marginTop: 4, marginBottom: 10, color: colors.muted, ...typography.meta,
               fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: radii.field, marginBottom: 12, ...card },
  cardIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.soft,
              alignItems: "center", justifyContent: "center" },
  cardIconFull: { backgroundColor: "#ECEAE3" },
  cardCopy: { flex: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  cardOrg: { marginTop: 2, color: colors.muted, ...typography.meta, fontWeight: "700" },
  cardMeta: { marginTop: 6, color: colors.teal, ...typography.meta, fontWeight: "700" },
  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  chipText: { ...typography.meta, fontWeight: "800" }
});
