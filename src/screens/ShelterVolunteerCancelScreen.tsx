// US-V9 · cancel an activity — the shelter side, and heavier than the volunteer's own cancel
// (KawangGawaCancelScreen): this one stands other people up, so the confirm copy must NAME the
// blast radius before the shelter commits. Reference: screens/user/screen-shelter-volunteer-
// cancel(-confirm).png. POST /shelter/shifts/{shiftId}/cancel (ShelterShiftCancelView) cascades
// server-side — it cancels every REQUESTED + APPROVED signup in one transaction and returns the
// authoritative `cancelled_signups` count. That count is only known AFTER the call, so the
// pre-confirm count shown in the ConfirmModal is derived client-side from two reads: the roster
// (GET /shelter/shifts/{shiftId}/roster — approved/completed/no_show rows; only `approved` ones
// are still live) and the pending requests (GET /shelter/shifts/{shiftId}/requests — REQUESTED
// rows). affected = approved + pending. The result screen always reflects the server's own
// `cancelled_signups`, never this pre-count — the two normally agree, but the server value is
// the source of truth if a signup changed state between the two reads and the cancel call.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { AlertIcon, CheckIcon, VolunteerIcon } from "../components/AppIcons";
import { ConfirmModal } from "../components/ConfirmModal";
import { RootStackParamList } from "../navigation/types";
import { ShelterShift, blastRadiusCopy } from "../shelterVolunteer";
import { shiftTypeLabel } from "../volunteer";

function shiftWhenLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime}–${endTime}`;
}

type RosterRow = { status: "approved" | "completed" | "no_show" };

type Phase = "review" | "submitting" | "done";

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerCancel">;

export function ShelterVolunteerCancelScreen({ navigation, route }: Props) {
  const api = useApi();
  const { shiftId } = route.params;

  const [shift, setShift] = useState<ShelterShift | null>(null);
  const [affected, setAffected] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [phase, setPhase] = useState<Phase>("review");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [cancelledSignups, setCancelledSignups] = useState(0);

  const load = useCallback(() => {
    Promise.all([
      api.get(`/shelter/shifts/${shiftId}`),
      api.get(`/shelter/shifts/${shiftId}/roster`),
      api.get(`/shelter/shifts/${shiftId}/requests`)
    ]).then(([shiftRes, rosterRes, requestsRes]) => {
      if (shiftRes.status === 404) {
        setNotFound(true);
        setLoaded(true);
        return;
      }
      if (!shiftRes.ok || !rosterRes.ok || !requestsRes.ok) {
        setLoadError(true);
        setLoaded(true);
        return;
      }
      const approved = (rosterRes.data?.results ?? []).filter(
        (r: RosterRow) => r.status === "approved"
      ).length;
      const pending = (requestsRes.data?.results ?? []).length;
      setShift(shiftRes.data);
      setAffected(approved + pending);
      setNotFound(false);
      setLoadError(false);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [shiftId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onConfirm() {
    setConfirmVisible(false);
    setPhase("submitting");
    setBanner(null);
    const res = await api.post(`/shelter/shifts/${shiftId}/cancel`);
    if (!res.ok) {
      const code = res.data?.error?.code;
      if (res.status === 409 && code === "shift_closed") {
        setBanner("This activity is already closed.");
      } else if (res.status === 403 && code === "not_your_shift") {
        setBanner("You don't have permission to cancel this activity.");
      } else if (res.status === 404) {
        setBanner("This activity no longer exists.");
      } else {
        setBanner(res.data?.error?.message ?? "Couldn't cancel this activity. Try again.");
      }
      setPhase("review");
      return;
    }
    setCancelledSignups(res.data?.cancelled_signups ?? 0);
    setPhase("done");
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Cancel activity</Text>
        <View style={styles.back} />
      </View>

      {phase === "done" ? (
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.greenBg }]}>
            <CheckIcon color={colors.green} size={32} />
          </View>
          <Text style={styles.heading}>Activity cancelled</Text>
          <Text style={styles.subheading}>
            {cancelledSignups} volunteer{cancelledSignups === 1 ? "" : "s"} notified.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryButton}
            onPress={() => navigation.navigate("shelterVolunteer")}
          >
            <Text style={styles.primaryText}>Back to activities</Text>
          </TouchableOpacity>
        </View>
      ) : phase === "submitting" || !loaded ? (
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
      ) : loadError || !shift || affected === null ? (
        <View style={styles.centerFill}>
          <Text style={styles.empty}>Couldn't load this activity. Pull down or go back and try again.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <VolunteerIcon color={colors.teal} size={26} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>{shiftTypeLabel(shift.type)}</Text>
              <Text style={styles.summaryWhen}>{shiftWhenLabel(shift.starts_at, shift.ends_at)}</Text>
              <Text style={styles.summarySub}>
                {affected} volunteer{affected === 1 ? "" : "s"} signed up
              </Text>
            </View>
          </View>

          <Text style={styles.question}>Cancel this activity?</Text>
          <Text style={styles.body}>{blastRadiusCopy(affected)}</Text>

          {!!banner && (
            <View style={styles.bannerBox}>
              <Text style={styles.bannerText}>{banner}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.85}
            onPress={() => setConfirmVisible(true)}
          >
            <Text style={styles.cancelButtonText}>Cancel activity</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keepLink} activeOpacity={0.75} onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={styles.keepLinkText}>Keep activity</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <ConfirmModal
        visible={confirmVisible}
        title="Cancel this activity?"
        body={affected !== null ? blastRadiusCopy(affected) : ""}
        confirmLabel="Yes, cancel activity"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  greenBg: "#EAF3DE", green: "#27500A", chipBg: "#E7F0EE", danger: "#B23B3B", dangerBg: "#FBEAEA"
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
  title: { color: colors.ink, fontSize: 19, fontWeight: "800" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  empty: { color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 21 },
  backLink: { marginTop: 16 },
  backLinkText: { color: colors.teal, fontSize: 14, fontWeight: "800" },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 60, alignItems: "center" },
  summaryCard: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 20, padding: 18, ...card
  },
  summaryIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.chipBg, alignItems: "center", justifyContent: "center" },
  summaryTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  summaryWhen: { marginTop: 3, color: colors.teal, fontSize: 13, fontWeight: "700" },
  summarySub: { marginTop: 3, color: colors.muted, fontSize: 13 },
  question: { alignSelf: "flex-start", marginTop: 26, color: colors.ink, fontSize: 24, fontWeight: "800" },
  body: { alignSelf: "flex-start", marginTop: 10, color: colors.muted, fontSize: 15, lineHeight: 21 },
  bannerBox: { width: "100%", marginTop: 18, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.dangerBg },
  bannerText: { color: colors.danger, fontSize: 13, fontWeight: "700", textAlign: "center" },
  cancelButton: {
    width: "100%", height: 56, marginTop: 36, borderRadius: 28,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.danger
  },
  cancelButtonText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  keepLink: { marginTop: 16, height: 40, alignItems: "center", justifyContent: "center" },
  keepLinkText: { color: colors.teal, fontSize: 14, fontWeight: "800" },
  iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  heading: { marginTop: 22, color: colors.ink, fontSize: 24, fontWeight: "800" },
  subheading: { marginTop: 10, color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 21 },
  primaryButton: {
    width: "100%", height: 56, marginTop: 32, borderRadius: 28, alignItems: "center",
    justifyContent: "center", backgroundColor: colors.teal
  },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: "800" }
});
