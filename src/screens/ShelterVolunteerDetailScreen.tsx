// US-V9 · the shelter's read-only detail view for one signup — reliability summary plus
// contact info, gated behind US-P0: the backend only includes `contact` on the response when
// the shelter is allowed to see it for this shift, so `detail.contact` may legitimately be
// absent and this screen must never assume otherwise.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { ChipTone, VolunteerDetail, reliabilityChip } from "../shelterVolunteer";

function formatAddress(addr: { line1: string; barangay: string; city: string; province: string }): string {
  return [addr.line1, addr.barangay, addr.city, addr.province].filter(Boolean).join(", ");
}

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerDetail">;

export function ShelterVolunteerDetailScreen({ navigation, route }: Props) {
  const api = useApi();
  const { signupId } = route.params;

  const [detail, setDetail] = useState<VolunteerDetail | null>(null);
  // US-R4 · was three hand-rolled booleans that collapsed offline, 5xx and "deleted"
  // into one sentence. Keeping the RESULT lets the shared view say which it was — and
  // a 404 here is ordinary: these routes are reached from a push notification about a
  // shift that may since have been cancelled.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const load = useCallback(() => {
    setRes(null);
    api.get(`/shelter/signups/${signupId}/volunteer`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setDetail(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [signupId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const chip = detail ? reliabilityChip(detail.reliability) : null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Volunteer</Text>
        <View style={styles.back} />
      </View>

      {!detail ? (
        <LoadStateView state={loadState(res)} subject="volunteer" onRetry={load}
          onBack={() => navigation.goBack()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.name}>{detail.display_name}</Text>
            {!!chip && (
              <View style={[styles.chip, CHIP_STYLE[chip.tone]]}>
                <Text style={[styles.chipText, CHIP_TEXT_STYLE[chip.tone]]}>{chip.label}</Text>
              </View>
            )}
            <Text style={styles.reliabilityLine}>
              {detail.reliability.shifts_completed} shift{detail.reliability.shifts_completed === 1 ? "" : "s"} ·{" "}
              {detail.reliability.no_shows} no-show{detail.reliability.no_shows === 1 ? "" : "s"}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>Contact</Text>
          {detail.contact ? (
            <View style={styles.card}>
              {!!detail.contact.phone && (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Phone</Text>
                  <Text style={styles.contactValue}>{detail.contact.phone}</Text>
                </View>
              )}
              <View style={styles.contactRow}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{detail.contact.email}</Text>
              </View>
              {!!detail.contact.address && (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Address</Text>
                  <Text style={styles.contactValue}>{formatAddress(detail.contact.address)}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.mutedNote}>Contact not shared for this shift</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const colors = {
  ink: "#12213A", teal: "#1C6B6B", tealDark: "#14504F", page: "#F4F5F2", muted: "#5F5E5A",
  white: "#FFFFFF", chipBg: "#E7F0EE", amberBg: "#FAEEDA", amber: "#633806",
  greyBg: "#ECEAE3", grey: "#5F5E5A", danger: "#B23B3B", dangerBg: "#FBEAEA", line: "#E3E1D9"
};

const CHIP_STYLE: Record<ChipTone, { backgroundColor: string }> = {
  done: { backgroundColor: colors.chipBg }, muted: { backgroundColor: colors.greyBg }, danger: { backgroundColor: colors.amberBg }
};
const CHIP_TEXT_STYLE: Record<ChipTone, { color: string }> = {
  done: { color: colors.tealDark }, muted: { color: colors.grey }, danger: { color: colors.amber }
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
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 60 },
  card: { borderRadius: 20, padding: 18, marginBottom: 18, ...card },
  name: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  chip: { alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "800" },
  reliabilityLine: { marginTop: 12, color: colors.muted, fontSize: 14, fontWeight: "700" },
  sectionLabel: { marginBottom: 10, color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  contactRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  contactLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  contactValue: { marginTop: 3, color: colors.ink, fontSize: 15, fontWeight: "700" },
  mutedNote: { color: colors.muted, fontSize: 14, fontStyle: "italic" }
});
