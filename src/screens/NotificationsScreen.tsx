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
import { colors, elevation, radii, spacing, typography } from "../theme";
import { ScreenHeader } from "../components/ui";


// US-V8 · the four volunteer notification types get a dedicated icon + tone, matching the
// vocabulary already used on the schedule/history cards (green = good news, soft-red = a
// request didn't go through, teal = a heads-up, amber = something changed on you). Every
// other type (verification_*, report-linked, stage_advanced) keeps the plain unread-dot
// treatment it already had — this map only ever adds, never changes existing behavior.
// US-V9 · signup_requested (the shelter's own "a volunteer wants your shift" notification)
// joins the same map — teal heads-up tone, same as shift_reminder, since it's an FYI that
// needs the shelter's attention rather than good/bad news about something already decided.
const VOLUNTEER_ICON: Record<string, { bg: string; fg: string; Icon: (p: { color: string; size?: number }) => ReactElement }> = {
  shift_confirmed: { bg: colors.successBg, fg: colors.success, Icon: CheckIcon },
  signup_declined: { bg: colors.dangerBg, fg: colors.danger, Icon: XIcon },
  shift_reminder: { bg: colors.soft, fg: colors.teal, Icon: ClockIcon },
  shift_cancelled_by_shelter: { bg: colors.warningBg, fg: colors.warningStrong, Icon: AlertIcon },
  signup_requested: { bg: colors.soft, fg: colors.teal, Icon: UserBadgeIcon }
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
      <ScreenHeader title="Notifications" onBack={() => navigation.goBack()} />
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
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 16, paddingBottom: 60 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 18, borderRadius: radii.field, marginBottom: 12, ...card },
  cardUnread: { backgroundColor: colors.soft },
  dot: { marginTop: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.teal },
  cardIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  cardBody: { marginTop: 4, color: colors.muted, ...typography.meta, lineHeight: 20 },
  cardTime: { marginTop: 8, color: "#9a988f", ...typography.meta, fontWeight: "600" },
  empty: { marginTop: 40, color: colors.muted, ...typography.body, textAlign: "center" }
});
