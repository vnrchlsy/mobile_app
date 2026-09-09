// US-V8 · check in / check out on the day of the shift.
// Reference: screens/user/screen-kawanggawa-checkin.png. GET /me/signups is the single source
// of truth for check_in_at/check_out_at — POST /signups/{id}/check-in|check-out just flips a
// timestamp server-side, so after either action we re-fetch instead of guessing the new state.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { CheckIcon, VolunteerIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { MySignupItem, MySignups, shiftTypeLabel } from "../volunteer";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  chipBg: "#E7F0EE", greenBg: "#EAF3DE", green: "#27500A", amberBg: "#FAEEDA", amber: "#633806",
  line: "#E3E1D9", danger: "#B23B3B"
};

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

function shiftWhenLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime}–${endTime}`;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function AttendanceRow({ label, at, isLast }: { label: string; at: string | null; isLast?: boolean }) {
  return (
    <View style={[styles.attRow, isLast && styles.attRowLast]}>
      <View style={styles.attDotCol}>
        <View style={[styles.attDot, at && styles.attDotDone]}>
          {at && <CheckIcon color={colors.white} size={13} />}
        </View>
        {!isLast && <View style={styles.attLine} />}
      </View>
      <Text style={[styles.attLabel, at && styles.attLabelDone]}>{label}</Text>
      <Text style={[styles.attValue, at && styles.attValueDone]}>{at ? timeLabel(at) : "Pending"}</Text>
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "kawanggawaCheckin">;

export function KawangGawaCheckinScreen({ navigation, route }: Props) {
  const api = useApi();
  const { signupId } = route.params;

  const [data, setData] = useState<MySignups | null>(null);
  // US-R4 · was three hand-rolled booleans that collapsed offline, 5xx and "deleted"
  // into one sentence. Keeping the RESULT lets the shared view say which it was — and
  // a 404 here is ordinary: these routes are reached from a push notification about a
  // shift that may since have been cancelled.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    setRes(null);
    return api.get("/me/signups").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setData(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const item: MySignupItem | undefined = data
    ? [...data.upcoming, ...data.requested, ...data.history].find((i) => i.signup_id === signupId)
    : undefined;

  const canCheckIn = !!item && !item.check_in_at && !submitting;
  const canCheckOut = !!item && !!item.check_in_at && !item.check_out_at && !submitting;

  async function act(action: "in" | "out") {
    if (submitting) return;
    setSubmitting(true);
    setError(undefined);
    const res = await api.post(`/signups/${signupId}/check-${action}`);
    if (!res.ok) {
      const code = res.data?.error?.code;
      if (res.status === 409 && code === "not_approved") {
        setError("You can only check in to a confirmed shift.");
      } else {
        setError(res.data?.error?.message ?? "Couldn't update your attendance. Try again.");
      }
      setSubmitting(false);
      return;
    }
    await load();
    setSubmitting(false);
  }

  const banner = !item
    ? undefined
    : item.check_out_at
      ? { bg: colors.chipBg, fg: colors.teal, text: "Shift complete. Thanks for volunteering!" }
      : item.check_in_at
        ? { bg: colors.greenBg, fg: colors.green, text: "Happening now — check out when you're done." }
        : { bg: colors.amberBg, fg: colors.amber, text: "Check in when you arrive." };

  const actionLabel = item?.check_in_at ? "Check out" : "Check in";
  const actionDisabled = item?.check_in_at ? !canCheckOut : !canCheckIn;
  const onAction = () => act(item?.check_in_at ? "out" : "in");

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Today's shift</Text>
      </View>

      {!item ? (
        <View style={styles.centerFill}>
          {/* count is passed HERE and only here: "no shift today" is a real, correct answer
              this screen must be able to give, and it is not the same as a failure. */}
          <LoadStateView
            state={loadState(res, 0)}
            emptyTitle="No shift today"
            emptyBody="You don't have a shift scheduled for today."
            subject="shift"
            onRetry={load}
            onBack={() => navigation.goBack()}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.shiftCard}>
            <View style={styles.cardIcon}>
              <VolunteerIcon color={colors.teal} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{shiftTypeLabel(item.shift.type)}</Text>
              <Text style={styles.cardOrg}>{item.shift.org_name}</Text>
              <Text style={styles.cardMeta}>{shiftWhenLabel(item.shift.starts_at, item.shift.ends_at)}</Text>
            </View>
          </View>

          {!!banner && (
            <View style={[styles.banner, { backgroundColor: banner.bg }]}>
              <View style={[styles.bannerDot, { backgroundColor: banner.fg }]} />
              <Text style={[styles.bannerText, { color: banner.fg }]}>{banner.text}</Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>Attendance</Text>
          <View style={styles.attCard}>
            <AttendanceRow label="Checked in" at={item.check_in_at} />
            <AttendanceRow label="Check out" at={item.check_out_at} isLast />
          </View>

          {!!error && <Text style={styles.formError}>{error}</Text>}

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.actionButton, actionDisabled && styles.actionButtonDisabled]}
            onPress={onAction}
            disabled={actionDisabled}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.actionText}>{actionLabel}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.helper}>The shelter marks your attendance from this.</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  content: { paddingHorizontal: 26, paddingTop: 22, paddingBottom: 60 },
  shiftCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 20, ...card },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.chipBg,
              alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  cardOrg: { marginTop: 2, color: colors.muted, fontSize: 13, fontWeight: "700" },
  cardMeta: { marginTop: 6, color: colors.teal, fontSize: 14, fontWeight: "700" },
  banner: { marginTop: 16, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  bannerDot: { width: 9, height: 9, borderRadius: 5 },
  bannerText: { flex: 1, fontSize: 14, fontWeight: "800" },
  sectionLabel: { marginTop: 28, marginBottom: 12, color: colors.ink, fontSize: 16, fontWeight: "800" },
  attCard: { borderRadius: 18, paddingHorizontal: 18, ...card },
  attRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16 },
  attRowLast: {},
  attDotCol: { width: 28, alignItems: "center", alignSelf: "stretch" },
  attDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.line,
            backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  attDotDone: { backgroundColor: colors.teal, borderColor: colors.teal },
  attLine: { flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 2 },
  attLabel: { flex: 1, marginLeft: 14, color: colors.muted, fontSize: 15, fontWeight: "700" },
  attLabelDone: { color: colors.ink },
  attValue: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  attValueDone: { color: colors.ink },
  formError: { marginTop: 20, color: colors.danger, fontSize: 13, fontWeight: "700", textAlign: "center" },
  actionButton: { height: 56, marginTop: 28, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  actionButtonDisabled: { opacity: 0.5 },
  actionText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  helper: { marginTop: 12, color: colors.muted, fontSize: 12, fontWeight: "600", textAlign: "center" }
});
