// US-A1b — guest browse. Read-only Home for an unauthenticated visitor.
//
// ⚠️ THE SAME HOME, NOT A SEPARATE ONE. This screen composes the pieces in
// components/home/HomeSections.tsx — the header, the report card, the three sections and
// their rows — exactly as HomeScreen does, from the same three public endpoints (/listings,
// /stories, /reports/map are AllowAny on GET). What differs is only what a guest cannot do:
// there is no /me, so no verification card, no spotlight and no trail; the bell's slot holds
// "Log in"; the status slot says "browsing as a guest"; the city is fixed to the seeded one;
// and the gated taps — Report now, See all under Adopt, a stray's row, the Adopt / Volunteer /
// You tabs — open the SignupWall. A listing row opens the read-only detail (US-A3).
//
// It was written against a V1 mock and then not kept up with Home for two sprints; the header
// of HomeSections.tsx records what that looked like and why the pieces are now shared.
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { Listing } from "../api/types";
import { parseStoryPage } from "../community";
import { withStoryContract } from "../storyFeed";
import { ProfileIcon } from "../components/AppIcons";
import { SignupWall, SignupWallAction } from "../components/SignupWall";
import { setIntent } from "../guestIntent";
import { SectionHeader } from "../components/ui";
import { EmptyNote, HomeHeader, ListingRow, MapReport, ReportStrayCard, ShelterHelpRow, StoryRow, StoryRowData, StrayRow, sectionSpacing } from "../components/home/HomeSections";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { GuestTabScreenProps } from "../navigation/types";
import { HelpShelter, WAYS_TO_HELP_EMPTY } from "../waysToHelp";
import { TAP_SLOP } from "../touch";
import { useLargeText } from "../useLargeText";
import { colors, elevation, pill, radii, spacing, squircle, typography } from "../theme";
import { keepGoodRes } from "../refreshState";
import { useRefreshOnFocus } from "../useRefreshOnFocus";


type Props = GuestTabScreenProps<"homeGuest">;

const GUEST_CITY = "Marikina";
// US-W4 · the city the header shows, for Ways to help's near-first order and its "Near {city}" heading.
const GUEST_HELP_CITY = `${GUEST_CITY} City`;

type WallState = { action: SignupWallAction; subject?: string } | null;

export function HomeGuestScreen({ navigation }: Props) {
  // At Dynamic Type AX3 and up the guest card's icon | text | "Sign up ›" row left the text a sliver, so it stacks instead.
  const large = useLargeText();
  // The status bar is real now (App.tsx), so the first thing on screen has to start below
  // it. This block used to pad 20pt, which was right while the bar was hidden and put
  // "Welcome!" directly under the clock once it was not.
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsRes, setListingsRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [stories, setStories] = useState<StoryRowData[]>([]);
  const [storiesRes, setStoriesRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [rescues, setRescues] = useState<MapReport[]>([]);
  const [rescuesRes, setRescuesRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [helpers, setHelpers] = useState<HelpShelter[]>([]);
  const [helpRes, setHelpRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [wall, setWall] = useState<WallState>(null);

  // ⚠️ THE SAME SECTIONS THE SIGNED-IN HOME SHOWS (four, with US-W4's Ways to help), from the same endpoints — all
  // AllowAny on GET. For two sprints the guest Home showed one of them, drawn the V1
  // way, and a "See nearby strays" row the signed-in Home had already replaced with the
  // "Nearby rescues" section. HomeSections.tsx says why that is not allowed to happen again.
  const load = useCallback(() => {
    // SQ5 follow-up · not blanked to spinners on a refresh (the four `set…Res(null)` calls are gone): a panel that had loaded
    // keeps its rows through a failed refresh (`keepGoodRes`).
    const listingsP = api.get(`/listings?city=${GUEST_CITY}`).then((r) => {
      setListingsRes((prev) => keepGoodRes(prev, r));
      if (r.ok) setListings((r.data?.results ?? []).slice(0, 5));
      return r.ok;
    });
    const helpP = api.get(`/shelters/ways-to-help?city=${encodeURIComponent(GUEST_HELP_CITY)}`).then((r) => {
      setHelpRes((prev) => keepGoodRes(prev, r));
      if (r.ok) setHelpers((r.data?.results ?? []).slice(0, 3));
      return r.ok;
    });
    const storiesP = withStoryContract(api).get("/stories").then((r) => {     // stories review step 5 · checked like the wall
      setStoriesRes((prev) => keepGoodRes(prev, r));
      if (r.ok) setStories((parseStoryPage(r.data)?.results ?? []).slice(0, 2));
      return r.ok;
    });
    const rescuesP = api.get(`/reports/map?city=${GUEST_CITY}&status=reported`).then((r) => {
      setRescuesRes((prev) => keepGoodRes(prev, r));
      if (r.ok) setRescues((r.data?.reports ?? []).slice(0, 2));
      return r.ok;
    });
    return Promise.all([listingsP, helpP, storiesP, rescuesP]).then((all) => all.every(Boolean));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on focus, not on every api identity change
  }, []);
  useRefreshOnFocus(load);

  function openWall(action: SignupWallAction, subject?: string) {
    setWall({ action, subject });
  }

  function onCreateAccount() {
    if (wall) setIntent(wall.action);
    setWall(null);
    navigation.navigate("accountType");
  }

  function onWallLogin() {
    setWall(null);
    navigation.navigate("signin");
  }

  const listingsPanel = loadState(listingsRes, listings.length);
  const storiesPanel = loadState(storiesRes, stories.length);
  const rescuesPanel = loadState(rescuesRes, rescues.length);
  const helpPanel = loadState(helpRes, helpers.length);

  return (
    <View style={styles.screen} testID="screen.homeGuest">
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        {/* The bell's slot carries "Log in"; the city is fixed to the seeded one — changing it
            is an account feature (LocationPickerScreen's PUT /me/location). */}
        <HomeHeader
          greeting="Welcome!"
          city={`${GUEST_CITY} City`}
          right={
            <TouchableOpacity
              hitSlop={TAP_SLOP}
              activeOpacity={0.85}
              style={styles.loginPill}
              onPress={() => navigation.navigate("signin")}
              accessibilityRole="button"
            >
              <Text style={styles.loginPillText}>Log in</Text>
            </TouchableOpacity>
          }
        />

        {/* The status slot: where a member sees "Verified Member in review", a guest sees this,
            in the same card. */}
        {/* G11 (library/dev/test-plan-guest.md Run 2): this used to navigate straight to
            accountType, the one guest CTA that skipped the wall. Owner ratified: route through
            the wall like every other gated action, for one consistent gate across the guest
            surface. */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.guestCard, large && styles.guestCardLarge]}
          onPress={() => openWall("account")}
          accessibilityRole="button"
          accessibilityLabel="Sign up"
        >
          <View style={styles.guestIcon}>
            <ProfileIcon color={colors.teal} size={22} />
          </View>
          <View style={[styles.guestCopy, large && styles.guestCopyLarge]}>
            <Text style={styles.guestTitle}>You're browsing as a guest</Text>
            <Text style={styles.guestBody}>Sign up to adopt, save pets & help strays.</Text>
          </View>
          <Text style={[styles.guestLink, large && styles.guestLinkLarge]}>Sign up ›</Text>
        </TouchableOpacity>

        <ReportStrayCard testID="btn.homeGuest.report" onPress={() => openWall("report")} />

        <SectionHeader
          title="Adopt near you"
          actionLabel="See all ›"
          onAction={() => openWall("adopt")}
          testID="btn.homeGuest.adopt"
          style={sectionSpacing.first}
        />
        {listingsPanel.kind !== "ready" && listingsPanel.kind !== "empty" ? (
          <LoadStateView state={listingsPanel} onRetry={load} />
        ) : listingsPanel.kind === "empty" ? (
          <EmptyNote>No pets listed near you yet.</EmptyNote>
        ) : listings.map((listing, i) => (
          // US-A1b/A3: a guest may VIEW a listing read-only; Inquire on it raises the wall.
          <ListingRow
            key={listing.listing_id}
            testID={`card.homeGuest.listing.${i}`}
            listing={listing}
            onPress={() => navigation.navigate("listingDetail", { listingId: listing.listing_id })}
          />
        ))}

        {/* US-W4 · Ways to help — verified shelters asking for help, Marikina first. Open to guests (the Donate screen walls a pledge). */}
        <SectionHeader
          title="Ways to help"
          actionLabel="See all ›"
          onPress={() => navigation.navigate("waysToHelp", { city: GUEST_HELP_CITY })}
          style={sectionSpacing.next}
        />
        {helpPanel.kind !== "ready" && helpPanel.kind !== "empty" ? (
          <LoadStateView state={helpPanel} onRetry={load} />
        ) : helpPanel.kind === "empty" ? (
          <EmptyNote>{WAYS_TO_HELP_EMPTY}</EmptyNote>
        ) : helpers.map((s) => (
          <ShelterHelpRow
            key={s.account_id}
            shelter={s}
            onPress={() => navigation.navigate("donate", { accountId: s.account_id, orgName: s.org_name, city: s.city })}
          />
        ))}

        <SectionHeader
          title="Community stories"
          actionLabel="See all ›"
          onPress={() => navigation.navigate("stories")}
          style={sectionSpacing.next}
        />
        {storiesPanel.kind !== "ready" && storiesPanel.kind !== "empty" ? (
          <LoadStateView state={storiesPanel} onRetry={load} />
        ) : storiesPanel.kind === "empty" ? (
          <EmptyNote>No stories yet.</EmptyNote>
        ) : stories.map((story) => (
          <StoryRow key={story.story_id} story={story} onPress={() => navigation.navigate("storyDetail", { storyId: story.story_id })} />
        ))}

        {/* US-G2 · the public rescue map (GET /reports/map is AllowAny). The section header goes
            there directly, as on the signed-in Home. A row is a step toward claiming, which is
            an account action, so it opens the wall rather than a detail whose only control the
            guest cannot use. */}
        <SectionHeader
          testID="btn.homeGuest.rescueMap"
          title="Nearby rescues"
          actionLabel="See map ›"
          onPress={() => navigation.navigate("rescueMap")}
          style={sectionSpacing.next}
        />
        {rescuesPanel.kind !== "ready" && rescuesPanel.kind !== "empty" ? (
          <LoadStateView state={rescuesPanel} onRetry={load} />
        ) : rescuesPanel.kind === "empty" ? (
          <EmptyNote>No strays reported nearby yet.</EmptyNote>
        ) : rescues.map((report) => (
          <StrayRow key={report.report_id} report={report} onPress={() => openWall("account", report.species)} />
        ))}
      </ScrollView>

      <SignupWall
        visible={!!wall}
        action={wall?.action ?? "account"}
        subject={wall?.subject}
        onCreateAccount={onCreateAccount}
        onLogin={onWallLogin}
        onDismiss={() => setWall(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 20,
    paddingBottom: 156
  },
  loginPill: {
    minHeight: 40,
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: pill(40),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    ...elevation.soft
  },
  loginPillText: {
    color: colors.teal,
    ...typography.meta,
    fontWeight: "800"
  },
  // The signed-in Home's status card, in the guest's tint: same height, radius, padding and
  // type as `reviewCard` there. It was an outlined box with a circle icon — the V1 recipe.
  guestCard: {
    minHeight: 84,
    marginTop: 22,
    borderRadius: radii.card,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.soft
  },
  // large: stacked. The base `guestCopy` is `flex: 1`, which survives in a style array and would collapse the text in a column.
  guestCardLarge: { flexDirection: "column", alignItems: "flex-start" },
  guestCopyLarge: { marginLeft: 0, marginTop: 12, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  guestLinkLarge: { marginLeft: 0, marginTop: 12 },
  guestIcon: {
    width: 46,
    height: 46,
    borderRadius: squircle(46),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  guestCopy: {
    flex: 1,
    marginLeft: 14
  },
  guestTitle: {
    color: colors.ink,
    ...typography.meta,
    fontWeight: "800"
  },
  guestBody: {
    marginTop: 5,
    color: colors.muted,
    ...typography.caption,
    fontWeight: "600"
  },
  guestLink: {
    marginLeft: 8,
    color: colors.tealDark,
    ...typography.meta,
    fontWeight: "800"
  }
});
