// US-X1/X2 — owner home. Reference: screens/user/screen-home.png (plain) and
// screens/user/screen-home-member-pending.png (Verified Member under review).
// Fetches /me on focus and derives the pending-member banner from capabilities; the city chip
// routes to locationPicker (M5) and reads the cached city from AuthContext (no GET /me/location
// exists — see AuthContext.tsx). The "Saw a stray?" hero is still static — its destination
// lands in a later sprint.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { Avatar, Card, PressScale, SectionHeader } from "../components/ui";
import type { StoryCard } from "./StoriesScreen";
import { loadState } from "../net";
import { Listing, Me, MyReport, RescueCaseSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { OwnerTabs } from "../components/OwnerTabs";
import { BellIcon, CheckIcon, ClockIcon } from "../components/AppIcons";
import { GuestIntentAction, takeIntent } from "../guestIntent";
import { RootStackParamList } from "../navigation/types";
import { pickSpotlight } from "../sagip";
import { TAP_SLOP } from "../touch";
import { LinearGradient } from "expo-linear-gradient";

import { ScreenBackdrop } from "../components/ScreenBackground";
import { gradients, heroDirection } from "../theme/v3";
import { colors, elevation, radii, spacing, typography } from "../theme";

const paw = require("../../assets/paw-white.png") as ImageSourcePropType;

type Props = NativeStackScreenProps<RootStackParamList, "home">;

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

type MapReport = { report_id: string; species: string; condition: string; city: string | null };

export function HomeScreen({ navigation, route }: Props) {
  // The status bar is real now (App.tsx), so the first thing on screen has to start below
  // it. This block used to pad 20pt, which was right while the bar was hidden and
  // put the greeting under the clock once it was not.
  const insets = useSafeAreaInsets();
  const api = useApi();
  const { city, isReady } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [rescues, setRescues] = useState<MapReport[]>([]);
  // US-X1 redesign · the spotlight's two sources. They are deliberately NOT tracked with a
  // `{ ok, status }` the way the two panels below are: the spotlight makes no statement when
  // it has nothing, so a failed fetch and an empty account both land on `null` and render
  // nothing at all. See the ⚠️ on pickSpotlight — the one behaviour to protect here is that
  // Home must never say "you're all clear" on the strength of a request that did not arrive.
  const [myCases, setMyCases] = useState<RescueCaseSummary[]>([]);
  const [myReports, setMyReports] = useState<MyReport[]>([]);
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
  // US-T2 · the stories row used to be a bare link with nothing under it, while both of its
  // sibling sections showed content. It now asks, so it can say "No stories yet" when that is
  // true — which a link row can never do.
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [storiesRes, setStoriesRes] = useState<{ ok: boolean; status: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.get("/me").then((r) => {
        if (!r.ok) return;
        // US-X1: the right shell for who you are. A returning shelter account lands here (the
        // single stack's initialRouteName is always "home") — redirect it to the shelter shell.
        if (r.data.account_type === "shelter") {
          navigation.reset({ index: 0, routes: [{ name: "shelterDashboard" }] });
          return;
        }
        setMe(r.data);
      });
      // Refetched on every focus, including right after leaving NotificationsScreen (which
      // marks everything read on open) — so the dot clears the moment you come back.
      api.get("/me/notifications").then((r) => {
        if (r.ok) setHasUnread((r.data?.notifications ?? []).some((n: { read: boolean }) => !n.read));
      });
      // The spotlight's two sources (see pickSpotlight). Home was already making four
      // requests per focus and these make six — the cost of the card saying something true
      // rather than being a static list. There is no summary endpoint to collapse them into.
      api.get("/me/rescues").then((r) => {
        if (r.ok) setMyCases(r.data?.cases ?? []);
      });
      api.get("/me/reports").then((r) => {
        // `results`, not `reports` — /me/reports and /reports/map disagree on the key
        // (views.py:430 vs :417), and MyReportsScreen reads `results`. Getting this wrong
        // is silent: the spotlight just never appears.
        if (r.ok) setMyReports(r.data?.results ?? []);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on focus, not on every api identity change
    }, [])
  );

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
      if (!isReady) return;
      // Adoption preview — the first 5 available listings in the user's city.
      //
      // ⚠️ THE SLICE IS THE LIMIT, not the query string. This used to ask for `page_size=2`
      // and render whatever came back — but listings/views.py `_paginate` reads only `page`
      // and slices by its own PAGE_SIZE = 20, so `page_size` has never been honoured. Home
      // was rendering up to twenty pets under a comment claiming two.
      const cityParam = city ? `?city=${encodeURIComponent(city)}` : "";
      api.get(`/listings${cityParam}`).then((r) => {
        setListingsRes({ ok: r.ok, status: r.status });
        if (r.ok) setListings((r.data?.results ?? []).slice(0, 5));
      });
      // Nearby rescues — first 2 reported strays near the user's city.
      const rescueCity = city ?? "Marikina";
      api.get(`/reports/map?city=${encodeURIComponent(rescueCity)}&status=reported`).then((r) => {
        setRescuesRes({ ok: r.ok, status: r.status });
        if (r.ok) setRescues((r.data?.reports ?? []).slice(0, 2));
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- api identity is stable; refetch on focus and whenever the city resolves or changes
  }, [city, isReady]);

  const loadStories = useCallback(() => {
    api.get("/stories").then((r) => {
      setStoriesRes({ ok: r.ok, status: r.status });
      // Two, matching the rescue strip. `results`, like StoriesScreen reads.
      if (r.ok) setStories((r.data?.results ?? []).slice(0, 2));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- api identity is stable
  }, []);

  useFocusEffect(loadCityPanels);
  useFocusEffect(loadStories);

  /** One retry for the whole screen, for the one-notice case below. */
  const reloadPanels = useCallback(() => {
    loadCityPanels();
    loadStories();
  }, [loadCityPanels, loadStories]);

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
  const dataPanels = [listingsPanel, storiesPanel, rescuesPanel];
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

  return (
    <View style={styles.screen} testID="screen.home">
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>{me?.display_name ? `Kumusta, ${me.display_name}!` : "Kumusta!"}</Text>
            {pendingMember ? (
              <Text style={styles.role}>Pet owner · Verified Member pending</Text>
            ) : (
              <View style={styles.cityRow}>
                <Text style={styles.cityText}>{city ?? "Set your city"}</Text>
                <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={() => navigation.navigate("locationPicker")}>
                  <Text style={styles.cityChange}>Change ›</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.bellButton}
            activeOpacity={0.75}
            onPress={() => navigation.navigate("notifications")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <BellIcon color="#12213A" />
            {hasUnread ? <View style={styles.bellDot} /> : null}
          </TouchableOpacity>
        </View>

        {pendingMember && (
          // US-D4 audit (2026-08-24) · was a dead tap — "Documents ›" implied a
          // destination but no onPress existed at all, same shape as the dead
          // Google-signup / "+ List an animal" buttons earlier audits found. This is
          // the *only* status surface a Verified Member has (US-V2's own ⚠️ note) — with
          // no handler, a pending Member had no way to learn anything from Home.
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.reviewCard}
            onPress={() => navigation.navigate("verifyDocuments")}
          >
            <ClockIcon color="#8A5A12" size={38} />
            <View style={styles.reviewCopy}>
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
          <View style={styles.verifiedHero}>
            <View style={styles.verifiedHeroIcon}>
              <CheckIcon color="#FFFFFF" size={20} />
            </View>
            <View style={styles.verifiedHeroCopy}>
              <Text style={styles.verifiedHeroTitle}>You're a Verified Member</Text>
              <Text style={styles.verifiedHeroBody}>You can now claim rescues and help strays find safety.</Text>
            </View>
          </View>
        )}

        <LinearGradient
          colors={gradients.hero}
          start={heroDirection.start}
          end={heroDirection.end}
          style={styles.reportCard}
        >
          <View>
            <Text style={styles.reportTitle}>Saw a stray?</Text>
            <Text style={styles.reportText}>Report it in seconds — help is near.</Text>
            <TouchableOpacity
              testID="btn.home.report"
              activeOpacity={0.85}
              style={styles.reportButton}
              onPress={() => navigation.navigate("reportStray")}
              hitSlop={TAP_SLOP}
            >
              <Text style={styles.reportButtonText}>Report now</Text>
            </TouchableOpacity>
          </View>
          <Image source={paw} resizeMode="contain" style={styles.reportPaw} />
        </LinearGradient>

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
            <View style={styles.spotTop}>
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
        <View style={styles.trailRow}>
          <TouchableOpacity
            testID="btn.home.myReports"
            style={styles.trailPill}
            activeOpacity={0.75}
            accessibilityRole="button"
            onPress={() => navigation.navigate("myReports")}
          >
            <Text style={styles.trailPillText}>My reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.trailPill}
            activeOpacity={0.75}
            accessibilityRole="button"
            onPress={() => navigation.navigate("myRescues")}
          >
            <Text style={styles.trailPillText}>My rescues</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.trailPill}
            activeOpacity={0.75}
            accessibilityRole="button"
            onPress={() => navigation.navigate("myOffers")}
          >
            <Text style={styles.trailPillText}>My offers</Text>
          </TouchableOpacity>
        </View>

        {allOffline ? (
          <LoadStateView state={{ kind: "offline" }} onRetry={reloadPanels} />
        ) : (
        <>
        <SectionHeader
          title="Adopt near you"
          actionLabel="See all ›"
          onAction={() => navigation.navigate("adopt")}
          testID="btn.home.adopt"
          style={styles.sectionHeader}
        />

        {listingsPanel.kind !== "ready" && listingsPanel.kind !== "empty" ? (
          <LoadStateView state={listingsPanel} onRetry={loadCityPanels} />
        ) : listingsPanel.kind === "empty" ? (
          <Text style={styles.emptyNote}>No pets listed near you yet.</Text>
        ) : listings.map((listing) => (
          <TouchableOpacity
            key={listing.listing_id}
            activeOpacity={0.75}
            style={styles.petCard}
            onPress={() => navigation.navigate("listingDetail", { listingId: listing.listing_id })}
          >
            {/* ⚠️ SQUIRCLE, NOT A CIRCLE. The design system calls the rounded square "a
                deliberate V2 replacement for the old circular avatar", and these two rows were
                the last circles left on Home — sitting directly under the squircle story
                avatars, which made the inconsistency impossible to miss once both were on
                screen together. */}
            <Avatar size={52}>
              <Image source={paw} resizeMode="contain" style={styles.avatarPaw} />
            </Avatar>
            <View style={styles.petCopy}>
              <Text style={styles.petName}>{listing.pet.name}</Text>
              <Text style={styles.petDetails}>
                {[listing.pet.species, listing.pet.breed, listing.city].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <View style={styles.petMeta}>
              <View style={styles.availableBadge}>
                <Text style={styles.availableText}>Available</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* US-T2 · the community stories entry point (was a dead 'Community' idea in the design). */}
        <SectionHeader
          title="Community stories"
          actionLabel="See all ›"
          onPress={() => navigation.navigate("stories")}
          style={styles.rescueSectionRow}
        />

        {storiesPanel.kind !== "ready" && storiesPanel.kind !== "empty" ? (
          <LoadStateView state={storiesPanel} onRetry={loadStories} />
        ) : storiesPanel.kind === "empty" ? (
          <Text style={styles.emptyNote}>No stories yet. Be the first to share one.</Text>
        ) : stories.map((story) => (
          <TouchableOpacity
            key={story.story_id}
            activeOpacity={0.75}
            style={styles.rescueCard}
            onPress={() => navigation.navigate("storyDetail", { storyId: story.story_id })}
          >
            {/* Tinted: a story's author is shown as an organisation-style tile, so the same
                person keeps the same colour across Home, Stories and a story's detail. */}
            <Avatar initials={storyInitials(story.author.name)} tinted size={44} />
            <View style={styles.petCopy}>
              <Text style={styles.petName} numberOfLines={1}>{story.caption}</Text>
              <Text style={styles.petDetails} numberOfLines={1}>
                {story.author.name}{story.author.city ? ` · ${story.author.city}` : ""}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* `btn.home.rescueMap` used to sit on the "See nearby strays ›" link above, which was
            the third path from Home to this same map (the fourth being the "Lost & found" grid
            tile). Both are gone; this row is now the single way there, so the testID e2e flow 70
            taps — the offline-degradation assertion the whole track exists for — lives here. */}
        <SectionHeader
          testID="btn.home.rescueMap"
          title="Nearby rescues"
          actionLabel="See map ›"
          onPress={() => navigation.navigate("rescueMap")}
          style={styles.rescueSectionRow}
        />

        {rescuesPanel.kind !== "ready" && rescuesPanel.kind !== "empty" ? (
          <LoadStateView state={rescuesPanel} onRetry={loadCityPanels} />
        ) : rescuesPanel.kind === "empty" ? (
          <Text style={styles.emptyNote}>No strays reported nearby yet.</Text>
        ) : rescues.map((report) => (
          <TouchableOpacity
            key={report.report_id}
            activeOpacity={0.75}
            style={styles.rescueCard}
            onPress={() => navigation.navigate("reportDetail", { reportId: report.report_id })}
          >
            {/* ⚠️ SQUIRCLE, NOT A CIRCLE. The design system calls the rounded square "a
                deliberate V2 replacement for the old circular avatar", and these two rows were
                the last circles left on Home — sitting directly under the squircle story
                avatars, which made the inconsistency impossible to miss once both were on
                screen together. */}
            <Avatar size={52}>
              <Image source={paw} resizeMode="contain" style={styles.avatarPaw} />
            </Avatar>
            <View style={styles.petCopy}>
              <Text style={styles.petName}>{report.species} · {report.city ?? "Nearby"}</Text>
              <Text style={styles.petDetails}>{report.condition} · needs pickup</Text>
            </View>
            <View style={conditionBadgeStyle(report.condition)}>
              <Text style={conditionTextStyle(report.condition)}>{conditionLabel(report.condition)}</Text>
            </View>
          </TouchableOpacity>
        ))}

        </>
        )}

        {pendingMember && <Text style={styles.lockedNote}>Claiming rescues unlocks once you're verified.</Text>}
      </ScrollView>

      <OwnerTabs active="home" />
    </View>
  );
}

/** Same two-letter fallback StoriesScreen and StoryDetailScreen already use. */
function storyInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

function conditionLabel(condition: string): string {
  if (condition === "injured" || condition === "sick") return "Urgent";
  if (condition === "pregnant") return "Special";
  return "Stable";
}

function conditionBadgeStyle(condition: string) {
  if (condition === "injured" || condition === "sick") return styles.urgentBadge;
  if (condition === "pregnant") return styles.specialBadge;
  return styles.stableBadge;
}

function conditionTextStyle(condition: string) {
  if (condition === "injured" || condition === "sick") return styles.urgentText;
  if (condition === "pregnant") return styles.specialText;
  return styles.stableText;
}

function intentToast(action: GuestIntentAction): [string, string] {
  switch (action) {
    case "adopt":
      return ["You're in!", "You can now send adoption inquiries."];
    case "save":
      return ["You're in!", "You can now save pets you love."];
    case "report":
      return ["You're in!", "You can now report strays."];
    case "volunteer":
      return ["You're in!", "You can now sign up to volunteer."];
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  headerCopy: {
    flex: 1,
    marginRight: 12
  },
  greeting: {
    color: colors.ink,
    ...typography.title,
    lineHeight: 28
  },
  role: {
    marginTop: 6,
    color: colors.muted,
    ...typography.meta
  },
  cityRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  cityText: {
    color: colors.ink,
    ...typography.strong,
    fontWeight: "700"
  },
  cityChange: {
    color: colors.teal,
    ...typography.meta,
    fontWeight: "700"
  },
  bellButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  bellDot: {
    position: "absolute",
    top: 6,
    right: 7,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#B23B3B",
    borderWidth: 1.5,
    borderColor: "#FFFFFF"
  },
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
  verifiedHeroTitle: {
    color: "#FFFFFF",
    ...typography.title
  },
  verifiedHeroBody: {
    marginTop: 4,
    color: "#DCEDEB",
    ...typography.body
  },
  reportCard: {
    height: 140,
    marginTop: 14,
    // V3 radius scale: 26 hero / 24 card / 18 row. The fill is now the three-stop brand
    // gradient rather than flat colors.teal — overflow hidden so it cannot bleed the corners.
    borderRadius: radii.hero,
    overflow: "hidden",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 16,
    paddingTop: 15
  },
  reportTitle: {
    color: "#FFFFFF",
    ...typography.title,
    lineHeight: 28
  },
  reportText: {
    marginTop: 9,
    color: "#D5ECE8",
    ...typography.meta
  },
  reportButton: {
    // §13.4 · the drawn pill is 38 pt, under the 44 pt minimum. `minHeight` raises the real
    // target without repainting the design, and TAP_SLOP on the element covers the rest.
    // This is the control someone uses in a hurry, standing over an animal — the last one
    // that should be fiddly to press.
    width: 136,
    height: 38,
    minHeight: 44,
    marginTop: 14,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  reportButtonText: {
    color: "#126B69",
    ...typography.meta,
    fontWeight: "800"
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
  spotChip: {
    height: 26,
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
    height: 46,
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
  reportPaw: {
    width: 72,
    height: 72,
    marginTop: 4
  },
  sectionHeader: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.ink,
    ...typography.subtitle,
    fontWeight: "800"
  },
  seeAll: {
    color: "#126B69",
    ...typography.meta,
    fontWeight: "800"
  },
  petCard: {
    height: 68,
    marginTop: 10,
    borderRadius: radii.tile,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 13,
    backgroundColor: "#FFFFFF",
    ...elevation.soft
  },
  avatarPaw: {
    width: 24,
    height: 24,
    tintColor: colors.teal
  },
  petCopy: {
    flex: 1,
    marginLeft: 14
  },
  petName: {
    color: colors.ink,
    ...typography.subtitle,
    fontWeight: "800"
  },
  petDetails: {
    marginTop: 5,
    color: colors.muted,
    ...typography.caption, fontWeight: "600"
  },
  petMeta: {
    alignItems: "flex-end"
  },
  availableBadge: {
    minWidth: 92,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E1F2D3"
  },
  availableText: {
    color: "#356A24",
    ...typography.meta,
    fontWeight: "800"
  },
  shelterText: {
    marginTop: 8,
    color: "#AAA69D",
    ...typography.caption, fontWeight: "600"
  },
  rescueTitle: {},
  rescueCard: {
    height: 68,
    marginTop: 16,
    borderRadius: radii.tile,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 13,
    backgroundColor: "#FFFFFF",
    ...elevation.soft
  },
  urgentBadge: {
    width: 68,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.warningBg
  },
  urgentText: {
    color: colors.warningStrong,
    ...typography.meta,
    fontWeight: "800"
  },
  lockedNote: {
    marginTop: 14,
    color: colors.muted,
    ...typography.caption, fontWeight: "600",
    textAlign: "center"
  },
  emptyNote: {
    marginTop: 12,
    color: colors.muted,
    ...typography.meta,
    textAlign: "center"
  },
  rescueSectionRow: {
    marginTop: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  specialBadge: {
    minWidth: 68,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft
  },
  specialText: {
    color: colors.teal,
    ...typography.meta,
    fontWeight: "800"
  },
  stableBadge: {
    minWidth: 68,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E1F2D3"
  },
  stableText: {
    color: "#356A24",
    ...typography.meta,
    fontWeight: "800"
  }
});
