// US-X1 · the bell — the notification list that was missing entirely (found during the
// Sprint 3 story audit: the backend wrote report_claimed/offer_matched/case_reopened/
// report_escalated/verification_* rows correctly, but nothing on mobile ever read them).
// GET /me/notifications; POST /me/notifications/read marks everything read on open, per
// the backend's own docstring ("on opening the bell").
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { ReactElement, useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { MeNotification } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { AlertIcon, CheckIcon, ClockIcon, UserBadgeIcon, XIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { notificationTarget } from "../notifications";
import { relTime } from "../sagip";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  line: "#E3E1D9", unreadBg: "#EAF3F2",
  chipBg: "#E7F0EE", greenBg: "#EAF3DE", green: "#27500A", amberBg: "#FAEEDA", amber: "#633806",
  pinkBg: "#FBECEC", pink: "#B23B3B"
};

// US-V8 · the four volunteer notification types get a dedicated icon + tone, matching the
// vocabulary already used on the schedule/history cards (green = good news, soft-red = a
// request didn't go through, teal = a heads-up, amber = something changed on you). Every
// other type (verification_*, report-linked, stage_advanced) keeps the plain unread-dot
// treatment it already had — this map only ever adds, never changes existing behavior.
// US-V9 · signup_requested (the shelter's own "a volunteer wants your shift" notification)
// joins the same map — teal heads-up tone, same as shift_reminder, since it's an FYI that
// needs the shelter's attention rather than good/bad news about something already decided.
const VOLUNTEER_ICON: Record<string, { bg: string; fg: string; Icon: (p: { color: string; size?: number }) => ReactElement }> = {
  shift_confirmed: { bg: colors.greenBg, fg: colors.green, Icon: CheckIcon },
  signup_declined: { bg: colors.pinkBg, fg: colors.pink, Icon: XIcon },
  shift_reminder: { bg: colors.chipBg, fg: colors.teal, Icon: ClockIcon },
  shift_cancelled_by_shelter: { bg: colors.amberBg, fg: colors.amber, Icon: AlertIcon },
  signup_requested: { bg: colors.chipBg, fg: colors.teal, Icon: UserBadgeIcon }
};

type Props = NativeStackScreenProps<RootStackParamList, "notifications">;

export function NotificationsScreen({ navigation }: Props) {
  const api = useApi();
  const [items, setItems] = useState<MeNotification[]>([]);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  // Unread rows keep looking unread for the rest of THIS viewing, even after the
  // mark-read call fires — reopening the screen later is what actually clears them.
  const markedRef = useRef(false);

  const load = useCallback(() => {
    markedRef.current = false;
    setRes(null);
    api.get("/me/notifications").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) {
        const list: MeNotification[] = r.data?.notifications ?? [];
        setItems(list);
        if (!markedRef.current && list.some((n) => !n.read)) {
          markedRef.current = true;
          api.post("/me/notifications/read");
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch + re-mark on focus
  }, []);
  useFocusEffect(load);

  function onPress(n: MeNotification) {
    const target = notificationTarget(n);
    if (!target) return; // unrecognized type, or missing the data it needs — no destination
    // US-N1 · was an if/else that silently sent anything non-reportDetail to
    // verifyDocuments — harmless while that was the only other variant, but wrong the
    // moment a third one (myInquiries) existed. Switched to match every variant by name.
    if (target.screen === "reportDetail") {
      navigation.navigate("reportDetail", { reportId: target.reportId });
    } else if (target.screen === "myInquiries") {
      navigation.navigate("myInquiries");
    } else if (target.screen === "kawanggawaSchedule") {
      navigation.navigate("kawanggawaSchedule");
    } else if (target.screen === "kawanggawaHistory") {
      navigation.navigate("kawanggawaHistory");
    } else if (target.screen === "shelterVolunteerRequests") {
      navigation.navigate("shelterVolunteerRequests", { shiftId: target.shiftId });
    } else {
      navigation.navigate("verifyDocuments");
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loadState(res, items.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, items.length)}
            emptyTitle="Nothing yet"
            emptyBody="This is where updates on your reports and offers show up."
            onRetry={load}
          />
        ) : (
          items.map((n) => {
            const target = notificationTarget(n);
            const kind = VOLUNTEER_ICON[n.type];
            return (
              <TouchableOpacity
                key={n.notification_id}
                style={[styles.card, !n.read && styles.cardUnread]}
                activeOpacity={target ? 0.85 : 1}
                onPress={() => onPress(n)}
              >
                {kind ? (
                  <View style={[styles.cardIcon, { backgroundColor: kind.bg }]}>
                    <kind.Icon color={kind.fg} size={22} />
                  </View>
                ) : !n.read ? (
                  <View style={styles.dot} />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{n.title || "Update"}</Text>
                  {n.body ? <Text style={styles.cardBody}>{n.body}</Text> : null}
                  <Text style={styles.cardTime}>{relTime(n.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
  content: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 60 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 18, borderRadius: 20, marginBottom: 12, ...card },
  cardUnread: { backgroundColor: colors.unreadBg },
  dot: { marginTop: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.teal },
  cardIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  cardBody: { marginTop: 4, color: colors.muted, fontSize: 14, lineHeight: 20 },
  cardTime: { marginTop: 8, color: "#9a988f", fontSize: 12, fontWeight: "600" },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, textAlign: "center", lineHeight: 22 }
});
