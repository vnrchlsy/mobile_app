// US-X1 · the bell — the notification list that was missing entirely (found during the
// Sprint 3 story audit: the backend wrote report_claimed/offer_matched/case_reopened/
// report_escalated/verification_* rows correctly, but nothing on mobile ever read them).
// GET /me/notifications; POST /me/notifications/read {up_to} marks what the screen SHOWED read on open (NP4):
// a row that arrived after the list was read stays unread.
//
// Notifications review step 14 (V1 to V3) · on the V3 surface, as drawn on design/mobile-v3/Notifications.dc.html (approved 2026-11-10): backdrop,
// one Card per row, one press target and one label per row (src/notificationRows.ts), the type's icon and tone from the shared map
// (src/notificationIcons.ts), "New" then "Earlier", and information-only rows that are not buttons.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from "react-native";

import { MeNotification } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { RootStackParamList } from "../navigation/types";
import {
  allRows, beginMore, finishMore, moreUrl, NotifPaging, notificationsViewState, pagingAfterRefresh, pagingFrom,
  parseNotificationPage, shouldLoadMore
} from "../notificationFeed";
import { GLYPH_SOURCE, notificationLook, TONE_COLORS } from "../notificationIcons";
import { BellItem, bellItems, isInformationOnly, notificationRowLabel, notificationTitle } from "../notificationRows";
import { markReadBody, notificationTarget } from "../notifications";
import { relTime } from "../sagip";
import { colors, maxFontScale, pill, radii, spacing, squircle, typography } from "../theme";
import { Card, PressScale, ScreenHeader } from "../components/ui";
import { TAP_SLOP } from "../touch";
import { openOwnerTab } from "../appTabs";
import { openShelterTab } from "../shelterTabs";

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
      <Text style={styles.moreText} maxFontSizeMultiplier={maxFontScale.title}>Couldn't load more notifications.</Text>
      <PressScale hitSlop={TAP_SLOP} style={styles.moreRetry} onPress={() => loadMore(true)} accessibilityRole="button"
        accessibilityLabel="Try loading more notifications again" testID="btn.notifications.moreRetry">
        <Text style={styles.moreRetryLabel} maxFontSizeMultiplier={maxFontScale.title}>Try again</Text>
      </PressScale>
    </View>
  ) : null;

  function renderItem({ item }: { item: BellItem }) {
    if (item.kind === "header") {
      return <Text style={styles.group} accessibilityRole="header" maxFontSizeMultiplier={maxFontScale.title}>{item.name}</Text>;
    }
    if (item.kind === "caughtUp") {
      return (
        <View style={styles.caughtUp} accessible accessibilityLabel="You're all caught up" testID="state.notifications.caughtUp">
          <View style={styles.caughtUpTile} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Image source={GLYPH_SOURCE.check} tintColor={colors.teal} resizeMode="contain" style={styles.caughtUpGlyph} />
          </View>
          <Text style={styles.caughtUpLabel} maxFontSizeMultiplier={maxFontScale.title}>You're all caught up</Text>
        </View>
      );
    }
    const n = item.n;
    const look = notificationLook(n.type);
    const tone = TONE_COLORS[look.tone];
    const unread = !n.read;
    const info = isInformationOnly(n);
    const label = notificationRowLabel(n);
    const content = (
      <Card style={styles.row}>
        <View style={[styles.tile, { backgroundColor: tone.bg }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Image source={GLYPH_SOURCE[look.glyph]} tintColor={tone.fg} resizeMode="contain" style={styles.glyph} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, !unread && styles.titleRead]} maxFontSizeMultiplier={maxFontScale.title}>{notificationTitle(n)}</Text>
          {n.body ? <Text style={[styles.body, !unread && styles.bodyRead]} maxFontSizeMultiplier={maxFontScale.title}>{n.body}</Text> : null}
          <Text style={styles.time} maxFontSizeMultiplier={maxFontScale.title}>{relTime(n.created_at)}</Text>
        </View>
        <View style={styles.side} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {unread ? <View style={styles.dot} /> : <View />}
          {info ? <View /> : <View style={styles.chevron} />}
        </View>
      </Card>
    );
    // A row with nowhere to go is not a button: no pressed state, no button role, and it still goes read when the bell shows it.
    return info ? (
      <View accessible accessibilityRole="text" accessibilityLabel={label} style={styles.rowGap} testID={`row.notifications.${n.notification_id}`}>
        {content}
      </View>
    ) : (
      <PressScale accessibilityRole="button" accessibilityLabel={label} style={styles.rowGap} onPress={() => onPress(n)}
        testID={`row.notifications.${n.notification_id}`}>
        {content}
      </PressScale>
    );
  }

  const viewState = notificationsViewState(res, items);

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="Notifications" onBack={() => navigation.goBack()} />
      {viewState.kind !== "ready" ? (
        <View style={styles.content}>
          <LoadStateView
            state={viewState}
            emptyTitle="Nothing yet"
            emptyBody="This is where updates on your reports and offers show up."
            onRetry={load}
          />
        </View>
      ) : (
        <FlatList
          testID="list.notifications"
          data={bellItems(items)}
          keyExtractor={(i) => i.key}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onEndReached={() => loadMore()}
          onEndReachedThreshold={0.6}
          onRefresh={load}
          refreshing={false}
          ListFooterComponent={footer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: 60 },
  group: { marginTop: 22, marginBottom: 2, marginLeft: 4, color: colors.muted, ...typography.meta, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  caughtUp: { marginTop: 14, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radii.card, backgroundColor: colors.soft },
  caughtUpTile: { width: 36, height: 36, borderRadius: squircle(36), alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  caughtUpGlyph: { width: 18, height: 18 },
  caughtUpLabel: { flex: 1, color: colors.ink, ...typography.strong, fontWeight: "800" },
  rowGap: { marginTop: 10 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: radii.card },
  tile: { width: 44, height: 44, borderRadius: squircle(44), alignItems: "center", justifyContent: "center" },
  glyph: { width: 22, height: 22 },
  copy: { flex: 1 },
  title: { color: colors.ink, ...typography.strong, fontWeight: "800", lineHeight: 20 },
  titleRead: { fontWeight: "700" },
  body: { marginTop: 3, color: colors.ink, ...typography.meta, fontWeight: "600", lineHeight: 19 },
  bodyRead: { color: colors.muted },
  time: { marginTop: 7, color: colors.muted, ...typography.meta, fontWeight: "700" },
  side: { width: 20, alignSelf: "stretch", alignItems: "center", justifyContent: "space-between" },
  dot: { width: 9, height: 9, marginTop: 4, borderRadius: pill(9), backgroundColor: colors.teal },
  chevron: { width: 9, height: 9, marginBottom: 4, borderRightWidth: 2.4, borderBottomWidth: 2.4, borderColor: colors.muted, opacity: 0.5, transform: [{ rotate: "-45deg" }] },
  more: { marginTop: 10, marginBottom: 12, alignItems: "center", gap: 8 },
  moreText: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  moreRetry: { minHeight: 44, paddingHorizontal: 18, justifyContent: "center", borderRadius: pill(44), backgroundColor: colors.white },
  moreRetryLabel: { color: colors.teal, ...typography.strong, fontWeight: "800" }
});
