// US-V9 · the shelter's volunteer schedule — posted shifts grouped by date.
// Reference: screens/user/screen-shelter-volunteer-calendar.png, scoped down per the Task 6
// brief to a date-sectioned list (not a full month grid) — same scoping call as V8's schedule
// screen. GET /shelter/shifts is the same list the manage hub (Task 5) already uses.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { VolunteerIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { ShelterShift } from "../shelterVolunteer";
import { shiftTypeLabel } from "../volunteer";

function dateHeading(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function timeRangeLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${startTime}–${endTime}`;
}

// Group shifts by calendar day (local time), preserving each group's shifts in the order the
// API returned them, and ordering the day sections by their earliest shift's timestamp.
function groupByDate(shifts: ShelterShift[]): { key: string; heading: string; shifts: ShelterShift[] }[] {
  const groups = new Map<string, ShelterShift[]>();
  for (const s of shifts) {
    const d = new Date(s.starts_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(s);
    else groups.set(key, [s]);
  }
  return Array.from(groups.entries())
    .map(([key, groupShifts]) => ({
      key,
      heading: dateHeading(groupShifts[0].starts_at),
      shifts: groupShifts
    }))
    .sort((a, b) => new Date(a.shifts[0].starts_at).getTime() - new Date(b.shifts[0].starts_at).getTime());
}

type StatusTone = "active" | "muted" | "danger";
const STATUS_CHIP: Record<ShelterShift["status"], { label: string; tone: StatusTone }> = {
  open: { label: "Open", tone: "active" },
  full: { label: "Full", tone: "muted" },
  closed: { label: "Closed", tone: "danger" }
};

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerCalendar">;

export function ShelterVolunteerCalendarScreen({ navigation }: Props) {
  const api = useApi();
  const [shifts, setShifts] = useState<ShelterShift[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api.get("/shelter/shifts").then((r) => {
        if (r.ok) {
          setShifts(r.data?.results ?? []);
          setError(false);
        } else {
          setError(true);
        }
        setLoaded(true);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus only
    }, [])
  );

  const groups = groupByDate(shifts);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Volunteer schedule</Text>
        <View style={styles.back} />
      </View>

      {!loaded ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.teal} />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.empty}>Couldn't load your schedule. Pull to refresh or try again shortly.</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.empty}>No volunteer activities posted yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {groups.map((group) => (
            <View key={group.key} style={styles.section}>
              <Text style={styles.sectionHeading}>{group.heading}</Text>
              {group.shifts.map((s) => {
                const chip = STATUS_CHIP[s.status];
                const signedUp = s.capacity - s.slots_left;
                return (
                  <TouchableOpacity
                    key={s.shift_id}
                    style={styles.card}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate("shelterVolunteerActivity", { shiftId: s.shift_id })}
                  >
                    <View style={styles.cardIcon}>
                      <VolunteerIcon color={colors.teal} size={22} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{shiftTypeLabel(s.type)}</Text>
                      <Text style={styles.cardMeta}>
                        {timeRangeLabel(s.starts_at, s.ends_at)} · {signedUp} / {s.capacity} signed up
                      </Text>
                    </View>
                    <View style={[styles.statusChip, STATUS_STYLE[chip.tone]]}>
                      <Text style={[styles.statusChipText, STATUS_TEXT_STYLE[chip.tone]]}>{chip.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const colors = {
  ink: "#12213A", teal: "#1C6B6B", tealDark: "#14504F", page: "#F4F5F2", muted: "#5F5E5A",
  white: "#FFFFFF", chipBg: "#E7F0EE", amberBg: "#FAEEDA", amber: "#633806",
  greyBg: "#ECEAE3", grey: "#5F5E5A"
};

const STATUS_STYLE: Record<StatusTone, { backgroundColor: string }> = {
  active: { backgroundColor: colors.chipBg },
  muted: { backgroundColor: colors.greyBg },
  danger: { backgroundColor: colors.amberBg }
};
const STATUS_TEXT_STYLE: Record<StatusTone, { color: string }> = {
  active: { color: colors.tealDark },
  muted: { color: colors.grey },
  danger: { color: colors.amber }
};

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: {
    paddingTop: 58, paddingHorizontal: 20, paddingBottom: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8
  },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  empty: { color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 21 },
  content: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 60 },
  section: { marginBottom: 22 },
  sectionHeading: { marginBottom: 12, color: colors.ink, fontSize: 16, fontWeight: "800" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 18, marginBottom: 10, ...card },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.chipBg, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  cardMeta: { marginTop: 4, color: colors.muted, fontSize: 13 },
  statusChip: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  statusChipText: { fontSize: 12, fontWeight: "800" }
});
