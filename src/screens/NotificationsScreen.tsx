// US-X1 · the bell — the notification list that was missing entirely (found during the
// Sprint 3 story audit: the backend wrote report_claimed/offer_matched/case_reopened/
// report_escalated/verification_* rows correctly, but nothing on mobile ever read them).
// GET /me/notifications; POST /me/notifications/read {up_to} marks what the screen SHOWED read on open (NP4):
// a row that arrived after the list was read stays unread.
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
import { markReadBody, notificationTarget } from "../notifications";
import { relTime } from "../sagip";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { ScreenHeader } from "../components/ui";
import { openOwnerTab } from "../appTabs";
import { openShelterTab } from "../shelterTabs";


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
  const tappedRef = useRef(new Set<string>());

  const load = useCallback(() => {
    markedRef.current = false;
    setRes(null);
    api.get("/me/notifications").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) {
        const list: MeNotification[] = r.data?.notifications ?? [];
        setItems(list);
        const body = markReadBody(list);
        if (!markedRef.current && body) {
          markedRef.current = true;
          api.post("/me/notifications/read", body);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch + re-mark on focus
  }, []);
  useFocusEffect(load);

  function onPress(n: MeNotification) {
    // NQ3 · a tapped row is read even if it was added after this screen marked what it showed.
    if (!n.read && !tappedRef.current.has(n.notification_id)) {
      tappedRef.current.add(n.notification_id);
      api.post(`/me/notifications/${n.notification_id}/read`);
    }
    const target = notificationTarget(n);
    if (!target) return; // unrecognized type, or missing the data it needs — no destination
    // US-N1 · was an if/else that silently sent anything non-reportDetail to
    // verifyDocuments — harmless while that was the only other variant, but wrong the
    // moment a third one (myInquiries) existed. Switched to match every variant by name.
    // F-R3-4 · …and it was still an if/else with a catch-all `else`, so the three Sprint 6
    // variants (impact, myDonations, shelterNeeds) fell into it and opened verifyDocuments —
    // a shelter tapping "pledge received" in the feed landed on its verification documents.
    // Push taps were fine (PushBridge navigates generically). Now a switch with a `never`
    // default: a NotificationTarget variant without a case here fails typecheck.
    switch (target.screen) {
      case "reportDetail":
        navigation.navigate("reportDetail", { reportId: target.reportId });
        return;
      case "myInquiries":
        navigation.navigate("myInquiries");
        return;
      case "rescueUpdate":
        navigation.navigate("rescueUpdate", { caseId: target.caseId, reportId: target.reportId });
        return;
      case "myRescues":
        navigation.navigate("myRescues");
        return;
      case "kawanggawa":
        openOwnerTab(navigation, "volunteer", { tab: target.tab });
        return;
      case "shelterVolunteerActivity":
        navigation.navigate("shelterVolunteerActivity", { shiftId: target.shiftId, section: target.section });
        return;
      case "verifyDocuments":
        navigation.navigate("verifyDocuments");
        return;
      case "impact":
        navigation.navigate("impact");
        return;
      case "myDonations":
        navigation.navigate("myDonations");
        return;
      case "shelterNeeds":
        navigation.navigate("shelterNeeds");
        return;
      case "needPledges":
        navigation.navigate("needPledges", { needId: target.needId });
        return;
      case "shelterRequests":
        openShelterTab(navigation, "requests");
        return;
      case "shelterDonate":
        openShelterTab(navigation, "donate");
        return;
      case "applicant":
        navigation.navigate("applicant", { inquiryId: target.inquiryId });
        return;
      case "inquiry":
        navigation.navigate("inquiry", { inquiryId: target.inquiryId });
        return;
      case "memberUpgrade":
        navigation.navigate("memberUpgrade");
        return;
      case "listingDetail":
        navigation.navigate("listingDetail", { listingId: target.listingId });
        return;
      case "posterListing":
        navigation.navigate("posterListing", { listingId: target.listingId });
        return;
      case "storyDetail":
        navigation.navigate("storyDetail", { storyId: target.storyId });
        return;
      default: {
        const unhandled: never = target;
        return unhandled;
      }
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
