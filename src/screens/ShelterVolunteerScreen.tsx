// US-V9 · the shelter's "manage" list for Kawang-Gawa — posted shifts and their sign-ups.
// Reference: screens/user/screen-shelter-volunteer.png. GET /shelter/shifts.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { VolunteerIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { ShelterShift } from "../shelterVolunteer";
import { shiftTypeLabel } from "../volunteer";
import { TAP_SLOP } from "../touch";

function shiftWhenLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime}–${endTime}`;
}

type StatusTone = "active" | "muted" | "danger";
const STATUS_CHIP: Record<ShelterShift["status"], { label: string; tone: StatusTone }> = {
  open: { label: "Open", tone: "active" },
  full: { label: "Full", tone: "muted" },
  closed: { label: "Closed", tone: "danger" }
};

// Registered under "shelterVolunteer" (the real list) and, temporarily, under the remaining
// not-yet-built US-V9 route names too — RootNavigator points them all at this component so the
// app compiles before Tasks 6–10 swap in their real screens. The union keeps that placeholder
// wiring typechecking without an `any` cast; this screen never reads `route.params`.
// This component only serves the `shelterVolunteer` route; navigating onward to the sibling
// shelter-volunteer screens needs no union here (navigation.navigate accepts any route). The
// old wide union was left over from when this file held several screens.
type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteer">;

export function ShelterVolunteerScreen({ navigation }: Props) {
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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Kawang-Gawa</Text>
        <TouchableOpacity hitSlop={TAP_SLOP}
          style={styles.newBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("shelterVolunteerCreate")}
        >
          <Text style={styles.newBtnText}>+ Post an activity</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Your volunteer activities</Text>
            <Text style={styles.sectionSub}>Posted shifts and their sign-ups.</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("shelterVolunteerCalendar")} hitSlop={TAP_SLOP}>
            <Text style={styles.calendarLink}>Calendar ›</Text>
          </TouchableOpacity>
        </View>

        {!loaded ? (
          <Text style={styles.empty}>Loading…</Text>
        ) : error ? (
          <Text style={styles.empty}>Couldn't load your activities. Pull to refresh or try again shortly.</Text>
        ) : shifts.length === 0 ? (
          <Text style={styles.empty}>No volunteer activities posted yet — tap "+ Post an activity" to start.</Text>
        ) : (
          shifts.map((s) => {
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
                  <Text style={styles.cardMeta}>{shiftWhenLabel(s.starts_at, s.ends_at)}</Text>
                  <Text style={styles.cardSignedUp}>{signedUp} / {s.capacity} signed up</Text>
                </View>
                <View style={[styles.statusChip, STATUS_STYLE[chip.tone]]}>
                  <Text style={[styles.statusChipText, STATUS_TEXT_STYLE[chip.tone]]}>{chip.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
  title: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  newBtn: { paddingHorizontal: 16, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  newBtnText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 60 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  sectionTitle: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  sectionSub: { marginTop: 6, color: colors.muted, fontSize: 14 },
  calendarLink: { color: colors.teal, fontSize: 15, fontWeight: "800", marginTop: 4 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 20, marginBottom: 12, ...card },
  cardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.chipBg, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  cardMeta: { marginTop: 4, color: colors.teal, fontSize: 14, fontWeight: "700" },
  cardSignedUp: { marginTop: 4, color: colors.muted, fontSize: 13 },
  statusChip: { paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: "center" },
  statusChipText: { fontSize: 13, fontWeight: "800" },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, textAlign: "center" }
});
