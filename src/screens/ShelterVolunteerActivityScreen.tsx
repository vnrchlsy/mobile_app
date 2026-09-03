// US-V9 · the shelter's activity hub for a single posted shift — summary + the manage actions.
// Reference: screens/user/screen-shelter-volunteer-activity.png. GET /shelter/shifts/{shiftId}
// is the owner-only detail endpoint from Task 1; it returns the same `_shift_repr` shape as the
// volunteer-facing GET /shifts/{id} (ShelterShift = BrowseShift), so no new type is needed.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { VolunteerIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { ShelterShift } from "../shelterVolunteer";
import { shiftTypeLabel } from "../volunteer";

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

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerActivity">;

export function ShelterVolunteerActivityScreen({ navigation, route }: Props) {
  const api = useApi();
  const { shiftId } = route.params;

  const [shift, setShift] = useState<ShelterShift | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    api.get(`/shelter/shifts/${shiftId}`).then((r) => {
      if (r.ok) {
        setShift(r.data);
        setNotFound(false);
        setLoadError(false);
      } else if (r.status === 404) {
        setNotFound(true);
      } else {
        setLoadError(true);
      }
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [shiftId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Activity</Text>
        <View style={styles.back} />
      </View>

      {!loaded ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.teal} />
        </View>
      ) : notFound ? (
        <View style={styles.centerFill}>
          <Text style={styles.empty}>This activity no longer exists. It may have been cancelled or removed.</Text>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : loadError || !shift ? (
        <View style={styles.centerFill}>
          <Text style={styles.empty}>Couldn't load this activity. Pull down or go back and try again.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <VolunteerIcon color={colors.teal} size={26} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{shiftTypeLabel(shift.type)}</Text>
              <Text style={styles.heroWhen}>{shiftWhenLabel(shift.starts_at, shift.ends_at)}</Text>
              <Text style={styles.heroOrg}>{shift.org_name}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>
                {shift.capacity - shift.slots_left} of {shift.capacity} spots filled
              </Text>
              <Text style={styles.infoSub}>
                {shift.slots_left <= 0 ? "No slots left" : `${shift.slots_left} slot${shift.slots_left === 1 ? "" : "s"} left`}
              </Text>
            </View>
            <View style={[styles.statusChip, STATUS_STYLE[STATUS_CHIP[shift.status].tone]]}>
              <Text style={[styles.statusChipText, STATUS_TEXT_STYLE[STATUS_CHIP[shift.status].tone]]}>
                {STATUS_CHIP[shift.status].label}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Manage</Text>
          <View style={styles.actionCard}>
            <ActionRow
              label="View requests"
              onPress={() => navigation.navigate("shelterVolunteerRequests", { shiftId })}
            />
            <ActionRow
              label="Mark attendance"
              onPress={() => navigation.navigate("shelterVolunteerAttendance", { shiftId })}
            />
            <ActionRow
              label="Edit activity"
              last
              onPress={() => navigation.navigate("shelterVolunteerEdit", { shiftId })}
            />
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("shelterVolunteerCancel", { shiftId })}
          >
            <Text style={styles.cancelButtonText}>Cancel activity</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function ActionRow({ label, onPress, last }: { label: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.actionRow, !last && styles.actionRowDivider]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={styles.actionRowText}>{label}</Text>
      <Text style={styles.actionRowGlyph}>›</Text>
    </TouchableOpacity>
  );
}

const colors = {
  ink: "#12213A", teal: "#1C6B6B", tealDark: "#14504F", page: "#F4F5F2", muted: "#5F5E5A",
  white: "#FFFFFF", chipBg: "#E7F0EE", amberBg: "#FAEEDA", amber: "#633806",
  greyBg: "#ECEAE3", grey: "#5F5E5A", danger: "#B23B3B", dangerBg: "#FBEAEA", line: "#E3E1D9"
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
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  empty: { color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 21 },
  backLink: { marginTop: 18 },
  backLinkText: { color: colors.teal, fontSize: 15, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 60 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.chipBg, alignItems: "center", justifyContent: "center" },
  heroTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  heroWhen: { marginTop: 4, color: colors.teal, fontSize: 14, fontWeight: "700" },
  heroOrg: { marginTop: 2, color: colors.muted, fontSize: 13 },
  infoCard: {
    marginTop: 24, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18,
    flexDirection: "row", alignItems: "center", gap: 12, ...card
  },
  infoTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  infoSub: { marginTop: 4, color: colors.muted, fontSize: 13 },
  statusChip: { paddingHorizontal: 14, height: 32, borderRadius: 16, justifyContent: "center" },
  statusChipText: { fontSize: 13, fontWeight: "800" },
  sectionLabel: { marginTop: 28, marginBottom: 10, color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  actionCard: { borderRadius: 20, overflow: "hidden", ...card },
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, height: 60 },
  actionRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  actionRowText: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  actionRowGlyph: { color: colors.muted, fontSize: 20, fontWeight: "700" },
  cancelButton: {
    marginTop: 24, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.dangerBg
  },
  cancelButtonText: { color: colors.danger, fontSize: 16, fontWeight: "800" }
});
