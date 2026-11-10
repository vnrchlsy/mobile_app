// US-X1 · the bell — the notification list that was missing entirely (found during the
// Sprint 3 story audit: the backend wrote report_claimed/offer_matched/case_reopened/
// report_escalated/verification_* rows correctly, but nothing on mobile ever read them).
// GET /me/notifications; POST /me/notifications/read {up_to} marks what the screen SHOWED read on open (NP4):
// a row that arrived after the list was read stays unread.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { ReactElement, useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { MeNotification } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { AlertIcon, CheckIcon, ClockIcon, UserBadgeIcon, XIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import {
  allRows, beginMore, finishMore, moreUrl, NotifPaging, notificationsViewState, pagingAfterRefresh, pagingFrom,
  parseNotificationPage, shouldLoadMore
} from "../notificationFeed";
import { markReadBody, notificationTarget } from "../notifications";
import { relTime } from "../sagip";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { ScreenHeader } from "../components/ui";
import { TAP_SLOP } from "../touch";
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
  // The first page, and the pages scrolled to after it (NP5). A reload of the first page keeps the later pages only when it
  // still ends where it did (src/notificationFeed.ts).
  const [first, setFirst] = useState<MeNotification[]>([]);
  const [paging, setPaging] = useState<NotifPaging>(() => pagingFrom(null, 0));
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const firstRef = useRef<MeNotification[]>([]);
  const pagingRef = useRef(paging);
  const genRef = useRef(0);
  const tappedRef = useRef(new Set<string>());
  const items = allRows(first, paging);

  function setPagingNow(p: NotifPaging) { pagingRef.current = p; setPaging(p); }

  // NQ3 · the bell marks what it SHOWED, one page at a time (up_to .. since), never a bare mark-all. Unread rows keep looking
  // unread for the rest of THIS viewing: reopening the screen later is what actually clears them.
  function markShown(page: MeNotification[]) {
    const body = markReadBody(page);
    if (body) api.post("/me/notifications/read", body);
  }

  const load = useCallback(() => {
    // A reload leaves the rows on screen (no spinner swap, so the person keeps their place); only the very first load shows one.
    if (firstRef.current.length === 0) setRes(null);
    const gen = ++genRef.current;
    api.get("/me/notifications").then((r) => {
      if (gen !== genRef.current) return;
      const page = r.ok ? parseNotificationPage(r.data) : null;
      if (!page) {
        // A 200 that is not a page is a failed load, never an empty or shorter bell.
        setRes({ ok: false, status: r.ok ? 502 : r.status });
        return;
      }
      setRes({ ok: true, status: r.status });
      setPagingNow(pagingAfterRefresh(pagingRef.current, firstRef.current, page, gen));
      firstRef.current = page.rows;
      setFirst(page.rows);
      markShown(page.rows);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch + re-mark on focus
  }, []);
  useFocusEffect(load);

  function loadMore(retry = false) {
    let p = pagingRef.current;
    if (retry) p = { ...p, failed: false };
    if (!shouldLoadMore(p) || !p.next) return;
    const gen = p.gen;
    setPagingNow(beginMore(p));
    api.get(moreUrl(p.next)).then((r) => {
      const shown = allRows(firstRef.current, pagingRef.current);
      const out = finishMore(pagingRef.current, gen, r.ok, r.data, shown);
      if (out.paging === pagingRef.current) return;       // an answer from before a reload: dropped whole
      setPagingNow(out.paging);
      markShown(out.page);
    });
  }

  function onPress(n: MeNotification) {
    // NQ3 · a tapped row is read even if it was added after this screen marked what it showed. Step 11 · and a tap is an OPEN, so it
    // is reported for a row that was already read too (once per row per viewing); `via` is where it came from.
    if (!tappedRef.current.has(n.notification_id)) {
      tappedRef.current.add(n.notification_id);
      api.post(`/me/notifications/${n.notification_id}/read`, { via: "bell" });
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

  // The end of the list: a spinner while a page is on its way, and a way to ask again when it failed (never a silent stop).
  const footer = paging.loading ? (
    <ActivityIndicator style={styles.more} color={colors.teal} testID="state.notifications.loadingMore" />
  ) : paging.failed ? (
    <View style={styles.more}>
      <Text style={styles.moreText}>Couldn't load more notifications.</Text>
      <TouchableOpacity onPress={() => loadMore(true)} hitSlop={TAP_SLOP} accessibilityRole="button"
        accessibilityLabel="Try loading more notifications again" testID="btn.notifications.moreRetry">
        <Text style={styles.moreRetry}>Try again</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Notifications" onBack={() => navigation.goBack()} />
      {notificationsViewState(res, items).kind !== "ready" ? (
        <View style={styles.content}>
          <LoadStateView
            state={notificationsViewState(res, items)}
            emptyTitle="Nothing yet"
            emptyBody="This is where updates on your reports and offers show up."
            onRetry={load}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.notification_id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onEndReached={() => loadMore()}
          onEndReachedThreshold={0.6}
          onRefresh={load}
          refreshing={false}
          ListFooterComponent={footer}
          renderItem={({ item: n }) => {
            const target = notificationTarget(n);
            const kind = VOLUNTEER_ICON[n.type];
            return (
              <TouchableOpacity
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
          }}
        />
      )}
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
  more: { paddingVertical: 20, alignItems: "center", gap: 8 },
  moreText: { color: colors.muted, ...typography.meta },
  moreRetry: { color: colors.teal, ...typography.meta, fontWeight: "700", paddingVertical: 8, paddingHorizontal: 12 },
  empty: { marginTop: 40, color: colors.muted, ...typography.body, textAlign: "center" }
});
