// US-V8 · the volunteer's own schedule — confirmed shifts plus what's still awaiting approval.
// Reference: screens/user/screen-kawanggawa-schedule.png. GET /me/signups returns
// { requested, upcoming, history, reliability }; this screen shows `upcoming` (approved, not yet
// completed) as tappable cards into check-in, and `requested` (pending) as a separate,
// non-tappable "Awaiting approval" section — approval happens on the shelter side, not here.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { VolunteerIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { CardTone, MySignupItem, MySignups, shiftTypeLabel, signupStatusCard } from "../volunteer";
import { TAP_SLOP } from "../touch";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  chipBg: "#E7F0EE", greenBg: "#EAF3DE", green: "#27500A", amberBg: "#FAEEDA", amber: "#633806",
  pinkBg: "#FBECEC", pink: "#B23B3B"
};

const TONE: Record<CardTone, { bg: string; fg: string }> = {
  active: { bg: colors.greenBg, fg: colors.green },
  done: { bg: colors.chipBg, fg: colors.teal },
  muted: { bg: colors.amberBg, fg: colors.amber },
  danger: { bg: colors.pinkBg, fg: colors.pink }
};

function shiftWhenLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime}–${endTime}`;
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

function ShiftCardBody({ item }: { item: MySignupItem }) {
  return (
    <>
      <View style={styles.cardIcon}>
        <VolunteerIcon color={colors.teal} size={22} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{shiftTypeLabel(item.shift.type)}</Text>
        <Text style={styles.cardOrg}>{item.shift.org_name}</Text>
        <Text style={styles.cardMeta}>{shiftWhenLabel(item.shift.starts_at, item.shift.ends_at)}</Text>
      </View>
      <StatusChip item={item} />
    </>
  );
}

// A small, separately-tappable affordance on an upcoming card. Nested inside the card's own
// TouchableOpacity (which navigates to check-in) — RN's touch responder system lets the
// innermost Touchable claim the gesture, so tapping "Cancel" never also fires the card tap.
function CancelLink({ label = "Cancel", onPress }: { label?: string; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.6} onPress={onPress} hitSlop={TAP_SLOP} style={styles.cancelLink}>
      <Text style={styles.cancelLinkText}>{label}</Text>
    </TouchableOpacity>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "kawanggawaSchedule">;

export function KawangGawaScheduleScreen({ navigation }: Props) {
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

  const upcoming = data?.upcoming ?? [];
  const requested = data?.requested ?? [];
  // `loaded && !error &&` used to prefix this: the guard against announcing "empty" to
  // someone whose request never came back. That guard now lives one level up — this is
  // only ever read inside the `data !== null` branch — so `!!data` IS the same check.
  const isEmpty = !!data && upcoming.length === 0 && requested.length === 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My schedule</Text>
      </View>

      {!data ? (
        <LoadStateView state={loadState(res)} subject="schedule" onRetry={load}
          onBack={() => navigation.goBack()} />
      ) : isEmpty ? (
        <View style={styles.centerFill}>
          <Text style={styles.empty}>You don't have any shifts yet. Browse open shifts to get started.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {upcoming.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Upcoming shifts</Text>
              {upcoming.map((item) => (
                <TouchableOpacity
                  key={item.signup_id}
                  style={[styles.card, styles.cardColumn]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("kawanggawaCheckin", { signupId: item.signup_id })}
                  accessibilityRole="button"
                  accessibilityLabel="Volunteer shift — open to check in"
                  // US-W1 · resolves the limitation recorded here during US-U1.
                  //
                  // This card contains a NESTED touchable (CancelLink), and iOS flattens an
                  // accessible container into a single element — so a VoiceOver user could
                  // reach "open to check in" and had NO WAY AT ALL to reach Cancel. Not
                  // awkward: absent. Cancelling a shift you cannot make is the whole reason
                  // the shelter is not left a volunteer short.
                  //
                  // The note said the fix was "lifting the cancel out of the card (or using
                  // accessibilityActions), which is a layout change". Half right — the second
                  // option is not a layout change, and it is the one RN provides for exactly
                  // this shape: the action joins the element's rotor, the visual link stays
                  // put for sighted users, and nothing about the card moves.
                  //
                  // ⚠️ Still needs confirming on a device. This makes the action REACHABLE;
                  // whether the rotor reads well in context is a person's judgement.
                  accessibilityActions={[{ name: "cancel", label: "Cancel this shift" }]}
                  onAccessibilityAction={(event) => {
                    if (event.nativeEvent.actionName === "cancel") {
                      navigation.navigate("kawanggawaCancel", { signupId: item.signup_id });
                    }
                  }}
                >
                  <View style={styles.cardRow}>
                    <ShiftCardBody item={item} />
                  </View>
                  <CancelLink onPress={() => navigation.navigate("kawanggawaCancel", { signupId: item.signup_id })} />
                </TouchableOpacity>
              ))}
            </>
          )}

          {requested.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Awaiting approval</Text>
              {requested.map((item) => (
                <View key={item.signup_id} style={[styles.card, styles.cardColumn]}>
                  <View style={styles.cardRow}>
                    <ShiftCardBody item={item} />
                  </View>
                  <CancelLink
                    label="Cancel request"
                    onPress={() => navigation.navigate("kawanggawaCancel", { signupId: item.signup_id })}
                  />
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  empty: { color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 21 },
  content: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 60 },
  sectionLabel: { marginTop: 18, marginBottom: 12, color: colors.ink, fontSize: 16, fontWeight: "800" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 20, marginBottom: 12, ...card },
  cardColumn: { flexDirection: "column", alignItems: "stretch" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cancelLink: { alignSelf: "flex-end", marginTop: 10, paddingVertical: 4, paddingHorizontal: 4 },
  cancelLinkText: { color: colors.pink, fontSize: 13, fontWeight: "800" },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.chipBg,
              alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  cardOrg: { marginTop: 2, color: colors.muted, fontSize: 13, fontWeight: "700" },
  cardMeta: { marginTop: 6, color: colors.teal, fontSize: 14, fontWeight: "700" },
  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "800" }
});
