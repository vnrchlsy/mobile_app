// US-X1/X2 — owner home. Reference: screens/user/screen-home.png (plain) and
// screens/user/screen-home-member-pending.png (Verified Member under review).
// Fetches /me on focus and derives the pending-member banner from capabilities; the city chip
// routes to locationPicker (M5) and reads the cached city from AuthContext (no GET /me/location
// exists — see AuthContext.tsx). The "Saw a stray?" hero is still static — its destination
// lands in a later sprint.
import { useFocusEffect } from "@react-navigation/native";
import { type ComponentProps, useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { Card, PressScale, SectionHeader } from "../components/ui";
import { EmptyNote, HomeHeader, ListingRow, MapReport, ReportStrayCard, ShelterHelpRow, StoryRow, StrayRow, sectionSpacing } from "../components/home/HomeSections";
import type { StoryCard } from "./StoriesScreen";
import { loadState } from "../net";
import { Listing, Me, MyReport, RescueCaseSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { cityToCache } from "../auth/cityFromMe";
import { CheckIcon, ClockIcon } from "../components/AppIcons";
import { NotificationBell } from "../components/NotificationBell";
import { GuestIntentAction, takeIntent } from "../guestIntent";
import { OwnerTabScreenProps, RootStackParamList } from "../navigation/types";
import { keepGoodRes } from "../refreshState";
import { useRefreshOnFocus, useRefreshWithKey } from "../useRefreshOnFocus";
import { pickSpotlight } from "../sagip";
import { MySignupItem, shiftHeadline, shiftTimeRange, todayShift } from "../volunteer";
import { HelpShelter, WAYS_TO_HELP_EMPTY } from "../waysToHelp";

import { ScreenBackdrop } from "../components/ScreenBackground";
import { useLargeText } from "../useLargeText";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { enterShelterShell } from "../shelterTabs";
import { openOwnerTab } from "../appTabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";


type Props = OwnerTabScreenProps<"home">;

// Redesigned 2026-09-09 · Home used to carry a flat row of four teal text links AND a
// four-tile quick-action grid, and every tile in that grid was already reachable somewhere
// else: Adopt and Volunteer are bottom tabs, "Lost & found" was the third path to the rescue
// map, and "Donate" navigated to the ADOPT feed because no generic donate landing exists
// (`donate` needs { accountId, orgName }). Both blocks are gone.
//
// What replaced them (2nd pass): the first rewrite was a list of three labelled rows, which
// was the same screenful whether you had twelve open reports or none — and structurally the
// same control as ProfileScreen's `accountCard`, on a different tab. Home now leads with the
// ONE animal waiting on you (`pickSpotlight`, unit-tested in sagip.ts) and demotes the three
// destinations to a single quiet line beneath it.
const TONE = {
  amber: { bg: "#FAEEDA", fg: "#633806" }, teal: { bg: "#E2EEF0", fg: "#14504F" },
  green: { bg: "#EAF3DE", fg: "#27500A" }, grey: { bg: "#ECEAE3", fg: "#5F5E5A" }
} as const;


export function HomeScreen({ navigation, route }: Props) {
  // At Dynamic Type AX3 and up this screen's icon | text | link rows and its three-pill row cannot share a line, so they stack.
  const large = useLargeText();
  // The status bar is real now (App.tsx), so the first thing on screen has to start below
  // it. This block used to pad 20pt, which was right while the bar was hidden and
  // put the greeting under the clock once it was not.
  const insets = useSafeAreaInsets();
  const api = useApi();
  const { city, isReady, setCity, setAccountType } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  // X11 · the server returns the user's city in /me, but the app only knew the one cached on THIS phone, so a new phone
  // or a reinstall said "Set your city" while the server had it. Fill an EMPTY cache from /me — and only once the cache
  // has finished loading, or a city already saved on the phone could be overwritten while that read is still in flight.
  useEffect(() => {
    if (!isReady || !me) return;
    const seed = cityToCache(me, city);
    if (seed) void setCity(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setCity is recreated each render; the guard is `city`
  }, [isReady, me, city]);

  const [hasUnread, setHasUnread] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [rescues, setRescues] = useState<MapReport[]>([]);
  // US-W4 · verified shelters asking for help, the viewer's city first (three on Home; See all for the rest).
  const [helpers, setHelpers] = useState<HelpShelter[]>([]);
  // US-X1 redesign · the spotlight's two sources. They are deliberately NOT tracked with a
  // `{ ok, status }` the way the two panels below are: the spotlight makes no statement when
  // it has nothing, so a failed fetch and an empty account both land on `null` and render
  // nothing at all. See the ⚠️ on pickSpotlight — the one behaviour to protect here is that
  // Home must never say "you're all clear" on the strength of a request that did not arrive.
  const [myCases, setMyCases] = useState<RescueCaseSummary[]>([]);
  const [myReports, setMyReports] = useState<MyReport[]>([]);
  // G15 · today's approved Kawang-Gawa shift, personal accounts only. Same "say nothing on
  // failure" rule as the spotlight above: a failed /me/signups renders no card at all, never
  // an empty/error state — a volunteer's actual shift must never silently disappear from the
  // one place check-in starts, but a network hiccup also must never invent a false "no shift".
  const [todaySignup, setTodaySignup] = useState<MySignupItem | null>(null);
  // US-R2 · FOUR fetches, and neither list is "the" primary — they are peer panels, so this
  // screen takes the per-panel branch of the rule rather than the whole-screen one. Blanking
  // Home because the adoption strip timed out would hide the rescue strip that did load, and
  // Home is the highest-traffic screen in the app.
  //
  // ⚠️ The rescue panel is why this matters most. Its empty copy is "No strays reported
  // nearby yet." — word for word the statement the 2026-09-04 device walk caught the rescue
  // MAP making while eight reports sat within 10 km. The same lie was live on Home the whole
  // time, on a screen far more people see.
  const [listingsRes, setListingsRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [rescuesRes, setRescuesRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [helpRes, setHelpRes] = useState<{ ok: boolean; status: number } | null>(null);
  // US-T2 · the stories row used to be a bare link with nothing under it, while both of its
  // sibling sections showed content. It now asks, so it can say "No stories yet" when that is
  // true — which a link row can never do.
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [storiesRes, setStoriesRes] = useState<{ ok: boolean; status: number } | null>(null);

  // F8 (shelter home test plan) · named so focus AND the offline panel's "Try again" run it. A shelter that opened the
  // app offline lands here (the stack's initial route is "home"); the redirect below waits for /me, so a retry that
  // skipped it left the shelter in the owner shell after the connection came back.
  // SQ5 follow-up · this is the ACCOUNT half of what Home loads: who you are (and the shelter redirect) and today's shift. It
  // changes only through something done elsewhere, so it loads on first focus and after a pushed screen pops, never on a
  // plain tab switch (`useRefreshOnFocus(…, Infinity)`). It resolves to /me's outcome, so a failure retries on the next focus.
  const loadAccount = useCallback(() => {
    return api.get("/me").then((r) => {
      if (!r.ok) return false;
      // US-X1: the right shell for who you are. A returning shelter account lands here (the
      // single stack's initialRouteName is always "home") — redirect it to the shelter shell.
      if (r.data.account_type === "shelter") {
        void setAccountType("shelter");   // teaches the cache, so the next cold start opens this shell directly
        // The tab screen's own `navigation.reset` would reset the tab navigator; the shelter shell is a root-stack route.
        enterShelterShell(navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()!);
        return true;
      }
      setMe(r.data);
      // G15 · shelter accounts already returned above (via the reset); admin accounts have
      // no shifts to volunteer for. Only a personal account's own signups are relevant here,
      // and the brief is explicit that this must not fire for shelter/business accounts.
      if (r.data.account_type === "personal") {
        void setAccountType("personal");
        api.get("/me/signups").then((sr) => {
          setTodaySignup(sr.ok ? todayShift(sr.data) : null);
        });
      } else {
        setTodaySignup(null);
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on focus, not on every api identity change
  }, []);
  useRefreshOnFocus(loadAccount, Infinity);

  // The bell's dot and the spotlight's two sources (see pickSpotlight): the 30 s rule, and always after a pushed screen pops
  // (NotificationsScreen marks everything read on open, so the dot clears the moment you come back).
  // SH12 · one count, not the whole feed. There is no summary endpoint to collapse the three into.
  const loadHomeData = useCallback(() => {
    return Promise.all([
      api.get("/me/notifications/unread-count").then((r) => {
        if (r.ok) setHasUnread((r.data?.unread ?? 0) > 0);
        return r.ok;
      }),
      api.get("/me/rescues").then((r) => {
        if (r.ok) setMyCases(r.data?.cases ?? []);
        return r.ok;
      }),
      api.get("/me/reports").then((r) => {
        // `results`, not `reports` — /me/reports and /reports/map disagree on the key
        // (views.py:430 vs :417), and MyReportsScreen reads `results`. Getting this wrong
        // is silent: the spotlight just never appears.
        if (r.ok) setMyReports(r.data?.results ?? []);
        return r.ok;
      })
    ]).then((all) => all.every(Boolean));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- api identity is stable
  }, []);
  useRefreshOnFocus(loadHomeData);

  // The two CITY-SCOPED panels, split out of the account-scoped effect above and keyed on
  // `city`.
  //
  // ⚠️ WHY THEY CANNOT LIVE IN THAT EFFECT. Its dependency array is `[]`, so its callback
  // closes over whatever `city` held on the first render of this mount — and AuthContext
  // loads the cached city ASYNCHRONOUSLY out of SecureStore (see its isReady effect). On a
  // cold start that read has not landed yet, so both requests went out with city === null:
  // the adoption feed came back nationwide and the map fell through to its "Marikina"
  // default, under two headings that say "near you". The greeting above them meanwhile
  // re-rendered with the real city, so the screen showed one city and queried another.
  // Found 2026-09-09 on an account set to Pasig City that was served Marikina pets.
  //
  // `isReady` is the whole reason this is a gate and not just a dep: it separates "the
  // city has not been read yet" (wait — firing now is the bug) from "this account genuinely
  // has no city" (a nationwide feed is then the correct answer).
  // ⚠️ NAMED, not inlined into useFocusEffect, because a failed panel needs something to
  // retry WITH. Before this, the two panels below had no retry at all — they rendered a
  // sentence claiming there was nothing to show.
  const loadCityPanels = useCallback(() => {
      if (!isReady) return false;
      // Adoption preview — the first 5 available listings in the user's city.
      //
      // ⚠️ THE SLICE IS THE LIMIT, not the query string. This used to ask for `page_size=2`
      // and render whatever came back — but listings/views.py `_paginate` reads only `page`
      // and slices by its own PAGE_SIZE = 20, so `page_size` has never been honoured. Home
      // was rendering up to twenty pets under a comment claiming two.
      const cityParam = city ? `?city=${encodeURIComponent(city)}` : "";
      // SQ5 follow-up · a refresh keeps what is showing: `keepGoodRes` never downgrades a panel that had loaded.
      const listingsP = api.get(`/listings${cityParam}`).then((r) => {
        setListingsRes((prev) => keepGoodRes(prev, r));
        if (r.ok) setListings((r.data?.results ?? []).slice(0, 5));
        return r.ok;
      });
      // US-W4 · Ways to help — page 1 of the shelters asking for help, near first; the slice is the limit (as above).
      const helpP = api.get(`/shelters/ways-to-help?city=${encodeURIComponent(city ?? "")}`).then((r) => {
        setHelpRes((prev) => keepGoodRes(prev, r));
        if (r.ok) setHelpers((r.data?.results ?? []).slice(0, 3));
        return r.ok;
      });
      // Nearby rescues — first 2 reported strays near the user's city.
      const rescueCity = city ?? "Marikina";
      const rescuesP = api.get(`/reports/map?city=${encodeURIComponent(rescueCity)}&status=reported`).then((r) => {
        setRescuesRes((prev) => keepGoodRes(prev, r));
        if (r.ok) setRescues((r.data?.reports ?? []).slice(0, 2));
        return r.ok;
      });
      return Promise.all([listingsP, helpP, rescuesP]).then((all) => all.every(Boolean));
      // eslint-disable-next-line react-hooks/exhaustive-deps -- api identity is stable; refetch on focus and whenever the city resolves or changes
  }, [city, isReady]);

  const loadStories = useCallback(() => {
    return api.get("/stories").then((r) => {
      setStoriesRes((prev) => keepGoodRes(prev, r));
      // Two, matching the rescue strip. `results`, like StoriesScreen reads.
      if (r.ok) setStories((r.data?.results ?? []).slice(0, 2));
      return r.ok;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- api identity is stable
  }, []);

  // The cached city lands ASYNCHRONOUSLY on a cold start (above): the panels reload by themselves when it does, and wait for it
  // (a null key) before the first focus load. The 30 s rule decides every other focus.
  const cityKey = isReady ? city ?? "" : null;
  useRefreshWithKey(loadCityPanels, cityKey);
  useRefreshOnFocus(loadStories);

  /** One retry for the whole screen, for the one-notice case below. */
  const reloadPanels = useCallback(() => {
    loadAccount();
    loadHomeData();
    loadCityPanels();
    loadStories();
  }, [loadAccount, loadHomeData, loadCityPanels, loadStories]);

  /**
   * ⚠️ PER-PANEL STATE — the US-R2 rule this screen's own comment says it follows, now
   * actually applied. `loadState` separates "the server said there are none" from "we never
   * reached the server"; `listings.length === 0` cannot tell them apart, and the sentence it
   * used to render — "No strays reported nearby yet." — is word for word the statement the
   * 2026-09-04 device walk caught the rescue MAP making while eight reports sat within 10 km.
   * The same lie was live here the whole time, on the screen far more people see, and it took
   * the US-PF3 walk to catch it because the guard that should have was satisfied by an
   * unused import.
   */
  const listingsPanel = loadState(listingsRes, listings.length);
  const rescuesPanel = loadState(rescuesRes, rescues.length);
  const storiesPanel = loadState(storiesRes, stories.length);
  const helpPanel = loadState(helpRes, helpers.length);

  /**
   * ⚠️ ONE NOTICE, NOT THREE. US-R2's per-panel rule exists for panels that DISAGREE — the
   * dashboard "showing three real counters and one fabricated zero". When every panel failed
   * for the same reason, that is one fact, and saying it three times is just noise: the first
   * version of this fix stacked two identical full-height offline blocks on one screen.
   *
   * The hero and the quick links stay: "Report now" queues through the outbox and works with
   * no connection at all, and the trail pills navigate. Only the three data sections — which
   * genuinely have nothing to show — collapse into the single notice.
   */
  const dataPanels = [listingsPanel, helpPanel, storiesPanel, rescuesPanel];
  const allOffline = dataPanels.every((panel) => panel.kind === "offline");

  // US-A1b resume: SignupSuccessScreen's "Start exploring" resets to Home with
  // params.justSignedUp = true, and ONLY that route sets the flag (SigninScreen's plain-login
  // reset to "home" carries no params). Without this gate, any arrival at Home — including a
  // later, unrelated sign-in — would drain and surface a stale guest intent left over from a
  // signup someone abandoned earlier in the session (see M8 review). takeIntent() also clears
  // itself on read, so a later focus of this same Home mount is a no-op even while the flag
  // is still true.
  useFocusEffect(
    useCallback(() => {
      if (!route.params?.justSignedUp) return;
      const intent = takeIntent();
      if (intent) {
        const [title, body] = intentToast(intent);
        Alert.alert(title, body);
      }
    }, [route.params?.justSignedUp])
  );

  const pendingMember = me?.capabilities.some((c) => c.capability === "rescuer" && c.status === "pending") ?? false;
  // US-G1 · the owner side never had a "you're verified" moment — only the shelter (verifiedHero)
  // did; this closes the gap the US-D4 audit left open. Mutually exclusive with pendingMember on
  // the same rescuer capability.
  const approvedMember = me?.capabilities.some((c) => c.capability === "rescuer" && c.status === "approved") ?? false;
  const spotlight = pickSpotlight(myCases, myReports);

  const rescueMapHeader = (style: ComponentProps<typeof SectionHeader>["style"]) => (
    <SectionHeader
      testID="btn.home.rescueMap"
      title="Nearby rescues"
      actionLabel="See map ›"
      onPress={() => navigation.navigate("rescueMap")}
      style={style}
    />
  );

  return (
    <View style={styles.screen} testID="screen.home">
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        <HomeHeader
          greeting={me?.display_name ? `Kumusta, ${me.display_name}!` : "Kumusta!"}
          roleLine={pendingMember ? "Pet owner · Verified Member pending" : undefined}
          city={city ?? "Set your city"}
          onChangeCity={() => navigation.navigate("locationPicker")}
          right={
            <NotificationBell hasUnread={hasUnread} onPress={() => navigation.navigate("notifications")} />
          }
        />

        {todaySignup && (
          // G15 · today's approved shift, top of Home — `todayShift` already narrows to the
          // one-signup, 3h-before-to-2h-after window, so anything non-null here is meant to
          // be acted on right now. Disappears on its own once checked out: that's `todayShift`
          // returning null on the next focus, not a dismiss the volunteer has to do by hand.
          <PressScale
            testID="card.home.todayShift"
            style={styles.todayCardLayout}
            accessibilityRole="button"
            accessibilityLabel={`Today: ${shiftHeadline(todaySignup.shift)} at ${todaySignup.shift.org_name}`}
            onPress={() => navigation.navigate("kawanggawaCheckin", { signupId: todaySignup.signup_id })}
          >
            <Card accent={colors.teal} style={styles.todayCardInner}>
              <View style={styles.todayCardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.todayCardTitle}>
                    Today · {shiftHeadline(todaySignup.shift)} at {todaySignup.shift.org_name}
                  </Text>
                  <Text style={styles.todayCardMeta}>
                    {shiftTimeRange(todaySignup.shift.starts_at, todaySignup.shift.ends_at)} ·{" "}
                    {todaySignup.shift.location?.meeting_point || todaySignup.shift.city}
                  </Text>
                </View>
                <Text style={styles.todayCardChevron}>›</Text>
              </View>
            </Card>
          </PressScale>
        )}

        {pendingMember && (
          // US-D4 audit (2026-08-24) · was a dead tap — "Documents ›" implied a
          // destination but no onPress existed at all, same shape as the dead
          // Google-signup / "+ List an animal" buttons earlier audits found. This is
          // the *only* status surface a Verified Member has (US-V2's own ⚠️ note) — with
          // no handler, a pending Member had no way to learn anything from Home.
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.reviewCard, large && styles.reviewCardLarge]}
            onPress={() => navigation.navigate("verifyDocuments")}
          >
            <ClockIcon color="#8A5A12" size={38} />
            <View style={large ? styles.reviewCopyLarge : styles.reviewCopy}>
              <Text style={styles.reviewTitle}>Verified Member in review</Text>
              <Text style={styles.reviewText}>We'll notify you within a day.</Text>
            </View>
            <Text style={styles.statusLink}>Documents ›</Text>
          </TouchableOpacity>
        )}

        {approvedMember && (
          // US-G1 · mirrors ShelterDashboardScreen's verifiedHero (solid teal card + white check
          // tile) — the app uses solid fills, not gradients, so this matches the sibling exactly.
          // Names the type ("Verified Member"), never a bare "Verified".
          <View style={[styles.verifiedHero, large && styles.verifiedHeroLarge]}>
            <View style={styles.verifiedHeroIcon}>
              <CheckIcon color="#FFFFFF" size={20} />
            </View>
            <View style={large ? styles.verifiedHeroCopyLarge : styles.verifiedHeroCopy}>
              <Text style={styles.verifiedHeroTitle}>You're a Verified Member</Text>
              <Text style={styles.verifiedHeroBody}>You can now claim rescues and help strays find safety.</Text>
            </View>
          </View>
        )}

        <ReportStrayCard testID="btn.home.report" onPress={() => navigation.navigate("reportStray")} />

        {spotlight && (
          // The left accent is the one place this card departs from the V2 recipe's strokeless
          // white. It is not an outline — it carries the status tone, so the state is readable
          // before you have read a word of it. That is exactly Card's `accent`, so the surface
          // (fill, radius, the deeper of the two shadows) now comes from the primitive and only
          // the layout stays here.
          <PressScale
            testID="card.home.spotlight"
            style={styles.spotCardLayout}
            accessibilityRole="button"
            accessibilityLabel={`${spotlight.eyebrow}: ${spotlight.title}, ${spotlight.chip.label}. ${spotlight.nextStep}`}
            onPress={() =>
              spotlight.caseId
                ? navigation.navigate("rescueUpdate", { caseId: spotlight.caseId, reportId: spotlight.reportId })
                : navigation.navigate("reportDetail", { reportId: spotlight.reportId })
            }
          >
            <Card accent={TONE[spotlight.chip.tone].fg} style={styles.spotCardInner}>
            <View style={[styles.spotTop, large && styles.spotTopLarge]}>
              <Text style={styles.spotEyebrow}>{spotlight.eyebrow}</Text>
              <View style={[styles.spotChip, { backgroundColor: TONE[spotlight.chip.tone].bg }]}>
                <Text style={[styles.spotChipText, { color: TONE[spotlight.chip.tone].fg }]}>
                  {spotlight.chip.label}
                </Text>
              </View>
            </View>
            <Text style={styles.spotTitle}>{spotlight.title}</Text>
            <Text style={styles.spotMeta}>{`${spotlight.city ?? "Nearby"} · ${spotlight.since}`}</Text>
            <View style={styles.spotDivider} />
            <View style={styles.spotNextRow}>
              <Text style={styles.spotNext}>{spotlight.nextStep}</Text>
              <Text style={styles.spotChevron}>›</Text>
            </View>
            </Card>
          </PressScale>
        )}

        {/* ⚠️ This line renders UNCONDITIONALLY, outside the spotlight. `btn.home.myReports`
            is tapped by e2e flows 10-report-a-stray and 70-offline-degradation — flow 70 runs
            offline, where the spotlight has nothing and draws nothing, so parking the selector
            inside it would break the suite on exactly the branch it was written to test.
            It is also the only route in the app to myRescues and myOffers. */}
        <View style={[styles.trailRow, large && styles.trailRowLarge]}>
          <TouchableOpacity
            testID="btn.home.myReports"
            style={[styles.trailPill, large && styles.trailPillLarge]}
            activeOpacity={0.75}
            accessibilityRole="button"
            onPress={() => navigation.navigate("myReports")}
          >
            <Text style={styles.trailPillText}>My reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.trailPill, large && styles.trailPillLarge]}
            activeOpacity={0.75}
            accessibilityRole="button"
            onPress={() => navigation.navigate("myRescues")}
          >
            <Text style={styles.trailPillText}>My rescues</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.trailPill, large && styles.trailPillLarge]}
            activeOpacity={0.75}
            accessibilityRole="button"
            onPress={() => navigation.navigate("myOffers")}
          >
            <Text style={styles.trailPillText}>My offers</Text>
          </TouchableOpacity>
        </View>

        {allOffline ? (
          <>
            {/* ⚠️ The map stays reachable when every panel is offline: the map screen has its own
                offline and stale states, and flow 70 taps this header to prove it never says
                "No strays reported near" while the server is unreachable. */}
            {rescueMapHeader(sectionSpacing.first)}
            <LoadStateView state={{ kind: "offline" }} onRetry={reloadPanels} />
          </>
        ) : (
        <>
        <SectionHeader
          title="Adopt near you"
          actionLabel="See all ›"
          onAction={() => openOwnerTab(navigation, "adopt")}
          testID="btn.home.adopt"
          style={sectionSpacing.first}
        />

        {listingsPanel.kind !== "ready" && listingsPanel.kind !== "empty" ? (
          <LoadStateView state={listingsPanel} onRetry={loadCityPanels} />
        ) : listingsPanel.kind === "empty" ? (
          <EmptyNote>No pets listed near you yet.</EmptyNote>
        ) : listings.map((listing) => (
          <ListingRow
            key={listing.listing_id}
            listing={listing}
            onPress={() => navigation.navigate("listingDetail", { listingId: listing.listing_id })}
          />
        ))}

        {/* US-W4 · Ways to help — the generic donate landing the 2026-09-09 redesign found missing (header comment). */}
        <SectionHeader
          title="Ways to help"
          actionLabel="See all ›"
          onPress={() => navigation.navigate("waysToHelp")}
          style={sectionSpacing.next}
        />

        {helpPanel.kind !== "ready" && helpPanel.kind !== "empty" ? (
          <LoadStateView state={helpPanel} onRetry={loadCityPanels} />
        ) : helpPanel.kind === "empty" ? (
          <EmptyNote>{WAYS_TO_HELP_EMPTY}</EmptyNote>
        ) : helpers.map((s) => (
          <ShelterHelpRow
            key={s.account_id}
            shelter={s}
            onPress={() => navigation.navigate("donate", { accountId: s.account_id, orgName: s.org_name, city: s.city })}
          />
        ))}

        {/* US-T2 · the community stories entry point (was a dead 'Community' idea in the design). */}
        <SectionHeader
          title="Community stories"
          actionLabel="See all ›"
          onPress={() => navigation.navigate("stories")}
          style={sectionSpacing.next}
        />

        {storiesPanel.kind !== "ready" && storiesPanel.kind !== "empty" ? (
          <LoadStateView state={storiesPanel} onRetry={loadStories} />
        ) : storiesPanel.kind === "empty" ? (
          <EmptyNote>No stories yet. Be the first to share one.</EmptyNote>
        ) : stories.map((story) => (
          <StoryRow key={story.story_id} story={story} onPress={() => navigation.navigate("storyDetail", { storyId: story.story_id })} />
        ))}

        {/* `btn.home.rescueMap` used to sit on the "See nearby strays ›" link above, which was
            the third path from Home to this same map (the fourth being the "Lost & found" grid
            tile). Both are gone; this row is now the single way there, so the testID e2e flow 70
            taps — the offline-degradation assertion the whole track exists for — lives here. */}
        {rescueMapHeader(sectionSpacing.next)}

        {rescuesPanel.kind !== "ready" && rescuesPanel.kind !== "empty" ? (
          <LoadStateView state={rescuesPanel} onRetry={loadCityPanels} />
        ) : rescuesPanel.kind === "empty" ? (
          <EmptyNote>No strays reported nearby yet.</EmptyNote>
        ) : rescues.map((report) => (
          <StrayRow key={report.report_id} report={report} onPress={() => navigation.navigate("reportDetail", { reportId: report.report_id })} />
        ))}

        </>
        )}

        {pendingMember && <Text style={styles.lockedNote}>Claiming rescues unlocks once you're verified.</Text>}
      </ScrollView>

    </View>
  );
}


function intentToast(action: GuestIntentAction): [string, string] {
  switch (action) {
    case "adopt":
      return ["You're in!", "You can now send adoption inquiries."];
    case "report":
      return ["You're in!", "You can now report strays."];
    case "volunteer":
      return ["You're in!", "You can now sign up to volunteer."];
    case "react":
      return ["You're in!", "You can now react to stories."];
    case "donate":
      return ["You're in!", "You can now pledge to a shelter's wishlist."];
    case "share_story":
      return ["You're in!", "You can now share a story."];
    case "account":
    default:
      return ["You're in!", "You can now manage your profile."];
  }
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "transparent"
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 20,
    paddingBottom: 156
  },
  /** Layout only — the fill, radius, accent bar and shadow are Card's. Matches the spotlight
   *  card's own split between PressScale (layout) and Card (surface). */
  todayCardLayout: { marginTop: 18 },
  todayCardInner: { paddingVertical: 16, paddingHorizontal: 18 },
  todayCardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  todayCardTitle: { color: colors.ink, ...typography.section },
  todayCardMeta: { marginTop: 4, color: colors.muted, ...typography.meta },
  todayCardChevron: { color: colors.teal, fontSize: 19, fontWeight: "700" },
  reviewCard: {
    minHeight: 84,
    marginTop: 22,
    borderRadius: radii.card,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.warningBg
  },
  reviewCopy: {
    flex: 1,
    marginLeft: 14
  },
  // large: icon, copy and link stack. The base `flex: 1` survives in a style array and would collapse the text in a column (`flex: 0` is what works, #189).
  reviewCardLarge: { flexDirection: "column", alignItems: "flex-start", gap: 8 },
  reviewCopyLarge: { flex: 0, marginLeft: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  reviewTitle: {
    color: colors.warningStrong,
    ...typography.meta,
    fontWeight: "800"
  },
  reviewText: {
    marginTop: 5,
    color: colors.warning,
    ...typography.caption, fontWeight: "600"
  },
  statusLink: {
    color: colors.warningStrong,
    ...typography.meta,
    fontWeight: "800"
  },
  verifiedHero: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: radii.card, // matches ShelterDashboardScreen.verifiedHero exactly
    backgroundColor: colors.teal
  },
  verifiedHeroIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  verifiedHeroCopy: {
    flex: 1
  },
  verifiedHeroLarge: { flexDirection: "column", alignItems: "flex-start", gap: 12 },
  verifiedHeroCopyLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  verifiedHeroTitle: {
    color: "#FFFFFF",
    ...typography.title
  },
  verifiedHeroBody: {
    marginTop: 4,
    color: "#DCEDEB",
    ...typography.body
  },
  /** Layout only — the fill, radius, accent bar and shadow are Card's. */
  spotCardLayout: { marginTop: 18 },
  spotCardInner: { paddingVertical: 16, paddingHorizontal: 18 },
  spotTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  spotEyebrow: {
    color: colors.muted,
    ...typography.label,
    textTransform: "uppercase"
  },
  spotTopLarge: { flexDirection: "column", alignItems: "flex-start", gap: 8 },
  spotChip: {
    minHeight: 26,
    paddingVertical: 4,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  spotChipText: {
    ...typography.meta,
    fontWeight: "800"
  },
  spotTitle: {
    marginTop: 10,
    color: colors.ink,
    ...typography.section
  },
  spotMeta: {
    marginTop: 4,
    color: colors.muted,
    ...typography.meta
  },
  spotDivider: {
    marginTop: 14,
    height: 1,
    backgroundColor: colors.border
  },
  spotNextRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  spotNext: {
    color: colors.teal,
    ...typography.meta,
    fontWeight: "800"
  },
  spotChevron: {
    color: colors.teal,
    fontSize: 19,
    fontWeight: "700"
  },
  trailRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10
  },
  trailRowLarge: { flexDirection: "column" },
  trailPillLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  trailPill: {
    // The V2 secondary-button recipe: white fill + soft shadow, NO stroke — the design
    // system is explicit that the shadow alone signals "raised/tappable" and that a border
    // reads as V1. These were 13 pt teal text links separated by dots, which put the only
    // route to myRescues/myOffers in the quietest type on the screen.
    //
    // §13.4 · a 46 pt box clears the 44 pt floor on its own, so there is no hitSlop here —
    // touch.ts warns that invisible slop between close siblings overlaps, and three pills in
    // a row 10 pt apart are exactly the case where the first sibling would win every
    // contested tap.
    flex: 1,
    minHeight: 46,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    ...elevation.soft
  },
  trailPillText: {
    // Ink, not teal: the system's outline/secondary button takes a V2INK label, and against
    // white it is the higher-contrast of the two.
    color: colors.ink,
    ...typography.meta,
    fontWeight: "800"
  },
  lockedNote: {
    marginTop: 14,
    color: colors.muted,
    ...typography.caption, fontWeight: "600",
    textAlign: "center"
  }
});
