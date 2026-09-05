// US-V9 · the shelter's attendance roster for one posted shift — mark each approved volunteer
// Attended or No-show once the shift has ended. Reference: screens/user/screen-shelter-
// volunteer-attendance.png. GET /shelter/shifts/{shiftId}/roster (Task 9's new backend
// endpoint) returns every non-pending signup for the shift; only `approved` rows are still
// actionable, `completed`/`no_show` rows just render their outcome.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { ChipTone } from "../shelterVolunteer";

type RosterStatus = "approved" | "completed" | "no_show";
type RosterRow = {
  signup_id: string;
  volunteer: { display_name: string };
  status: RosterStatus;
  check_in_at: string | null;
  check_out_at: string | null;
};

const OUTCOME_CHIP: Record<"completed" | "no_show", { label: string; tone: ChipTone }> = {
  completed: { label: "Completed", tone: "done" },
  no_show: { label: "No-show", tone: "danger" }
};

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerAttendance">;

export function ShelterVolunteerAttendanceScreen({ navigation, route }: Props) {
  const api = useApi();
  const { shiftId } = route.params;

  const [roster, setRoster] = useState<RosterRow[]>([]);
  // US-R3 · consolidation, not a bug fix — this screen already split loading/error/empty
  // by hand and got it right. LoadStateView adds the one distinction its own boolean
  // could not make: offline versus the server refusing.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [banner, setBanner] = useState<string | null>(null);
  const [busySignupId, setBusySignupId] = useState<string | null>(null);

  const loadRoster = useCallback(() => {
    setRes(null);
    api.get(`/shelter/shifts/${shiftId}/roster`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setRoster(r.data?.results ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [shiftId]);

  useFocusEffect(useCallback(() => { loadRoster(); }, [loadRoster]));

  async function markAttendance(signupId: string, outcome: "completed" | "no_show") {
    setBusySignupId(signupId);
    setBanner(null);
    const res = await api.post(`/shelter/signups/${signupId}/attendance`, { outcome });
    setBusySignupId(null);
    if (res.ok) {
      loadRoster();
      return;
    }
    const code = res.data?.error?.code;
    if (res.status === 409 && code === "shift_not_ended") {
      setBanner("You can mark attendance once the shift has ended.");
    } else {
      setBanner(res.data?.error?.message ?? "Couldn't mark attendance. Try again.");
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Attendance</Text>
        <View style={styles.back} />
      </View>

      {!!banner && (
        <View style={styles.bannerBox}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      )}

      {loadState(res, roster.length).kind !== "ready" ? (
        <View style={styles.centerFill}>
          <LoadStateView
            state={loadState(res, roster.length)}
            emptyTitle="No approved volunteers yet"
            onRetry={loadRoster}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {roster.map((row) => {
            const busy = busySignupId === row.signup_id;
            return (
              <TouchableOpacity
                key={row.signup_id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("shelterVolunteerDetail", { signupId: row.signup_id })}
              >
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(row.volunteer.display_name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{row.volunteer.display_name}</Text>
                  </View>
                  {row.status !== "approved" && (
                    <View style={[styles.chip, CHIP_STYLE[OUTCOME_CHIP[row.status].tone]]}>
                      <Text style={[styles.chipText, CHIP_TEXT_STYLE[OUTCOME_CHIP[row.status].tone]]}>
                        {OUTCOME_CHIP[row.status].label}
                      </Text>
                    </View>
                  )}
                </View>

                {row.status === "approved" && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.noShowBtn, busy && styles.btnDisabled]}
                      activeOpacity={0.85}
                      disabled={busy}
                      onPress={() => markAttendance(row.signup_id, "no_show")}
                    >
                      <Text style={styles.noShowText}>No-show</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.attendedBtn, busy && styles.btnDisabled]}
                      activeOpacity={0.85}
                      disabled={busy}
                      onPress={() => markAttendance(row.signup_id, "completed")}
                    >
                      {busy ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text style={styles.attendedText}>Attended</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

const colors = {
  ink: "#12213A", teal: "#1C6B6B", tealDark: "#14504F", page: "#F4F5F2", muted: "#5F5E5A",
  white: "#FFFFFF", chipBg: "#E7F0EE", amberBg: "#FAEEDA", amber: "#633806",
  greyBg: "#ECEAE3", grey: "#5F5E5A", danger: "#B23B3B", dangerBg: "#FBEAEA", line: "#E3E1D9"
};

const CHIP_STYLE: Record<ChipTone, { backgroundColor: string }> = {
  done: { backgroundColor: colors.chipBg }, muted: { backgroundColor: colors.greyBg }, danger: { backgroundColor: colors.dangerBg }
};
const CHIP_TEXT_STYLE: Record<ChipTone, { color: string }> = {
  done: { color: colors.tealDark }, muted: { color: colors.grey }, danger: { color: colors.danger }
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
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 60 },
  bannerBox: { marginHorizontal: 20, marginTop: 4, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.dangerBg },
  bannerText: { color: colors.danger, fontSize: 13, fontWeight: "700", textAlign: "center" },
  card: { borderRadius: 20, padding: 16, marginBottom: 14, ...card },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.chipBg, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.tealDark, fontSize: 15, fontWeight: "800" },
  name: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  chip: { paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "800" },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  noShowBtn: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: colors.greyBg },
  noShowText: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  attendedBtn: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  attendedText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  btnDisabled: { opacity: 0.6 }
});
