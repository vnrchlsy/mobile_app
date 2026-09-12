// US-A1b — guest browse. Reference: screens/user/screen-home-guest.png. Read-only Home for an
// unauthenticated visitor: fetches the PUBLIC GET /listings endpoint (no token needed) instead of
// /me, has no bell/notifications, and every action that would require an account — a listing
// card, "Report now", the Adopt/Volunteer/You tabs — opens the SignupWall instead of navigating.
// The city is fixed to the seeded "Marikina" (no locationPicker for guests — changing it is an
// account feature, see LocationPickerScreen's PUT /me/location).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { Listing } from "../api/types";
import { AdoptIcon, HomeIcon, LocationPinIcon, ProfileIcon, VolunteerIcon } from "../components/AppIcons";
import { SignupWall, SignupWallAction } from "../components/SignupWall";
import { setIntent } from "../guestIntent";
import { TabBar, type TabBarItem } from "../components/ui";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { colors, elevation, radii, spacing, typography } from "../theme";

const paw = require("../../assets/paw-white.png") as ImageSourcePropType;

type Props = NativeStackScreenProps<RootStackParamList, "homeGuest">;

const GUEST_CITY = "Marikina";

type WallState = { action: SignupWallAction; subject?: string } | null;

export function HomeGuestScreen({ navigation }: Props) {
  // The status bar is real now (App.tsx), so the first thing on screen has to start below
  // it. This block used to pad 20pt, which was right while the bar was hidden and put
  // "Welcome!" directly under the clock once it was not.
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [listings, setListings] = useState<Listing[]>([]);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [wall, setWall] = useState<WallState>(null);

  useFocusEffect(
    useCallback(() => {
      setRes(null);
      api.get(`/listings?city=${GUEST_CITY}`).then((r) => {
        setRes({ ok: r.ok, status: r.status });
        if (r.ok) setListings(r.data.results ?? []);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on focus, not on every api identity change
    }, [])
  );

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

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>Welcome!</Text>
            <View style={styles.cityRow}>
              <Text style={styles.cityText}>Marikina City</Text>
              <Text style={styles.cityChange}>Change ›</Text>
            </View>
          </View>
          <TouchableOpacity hitSlop={TAP_SLOP}
            activeOpacity={0.85}
            style={styles.loginPill}
            onPress={() => navigation.navigate("signin")}
          >
            <Text style={styles.loginPillText}>Log in</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.guestBanner}>
          <View style={styles.guestIcon}>
            <ProfileIcon color={colors.teal} size={20} />
          </View>
          <View style={styles.guestCopy}>
            <Text style={styles.guestTitle}>You're browsing as a guest</Text>
            <Text style={styles.guestBody}>Sign up to adopt, save pets & help strays.</Text>
          </View>
          <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={() => navigation.navigate("accountType")}>
            <Text style={styles.guestLink}>Sign up ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reportCard}>
          <View>
            <Text style={styles.reportTitle}>Saw a stray?</Text>
            <Text style={styles.reportText}>Report it in seconds — help is near.</Text>
            <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.85} style={styles.reportButton} onPress={() => openWall("report")}>
              <Text style={styles.reportButtonText}>Report now</Text>
            </TouchableOpacity>
          </View>
          <Image source={paw} resizeMode="contain" style={styles.reportPaw} />
        </View>

        {/* US-G2 · a guest can reach the public rescue map (GET /reports/map is AllowAny — public
            since US-S4). This navigates DIRECTLY, not through the SignupWall like the gated actions
            above: browsing the map needs no account. Mirrors the owner Home's "See nearby strays"
            link. Closes Sprint 1's last remaining US-A1b Partial (guest home never pointed at it). */}
        <TouchableOpacity hitSlop={TAP_SLOP}
          activeOpacity={0.85}
          style={styles.mapCard}
          accessibilityRole="button"
          onPress={() => navigation.navigate("rescueMap")}
        >
          <View style={styles.mapIconTile}>
            <LocationPinIcon color={colors.teal} size={20} />
          </View>
          <View style={styles.mapCopy}>
            <Text style={styles.mapTitle}>See nearby strays</Text>
            <Text style={styles.mapSub}>Live map of reports around you</Text>
          </View>
          <Text style={styles.mapChevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Adopt near you</Text>
        </View>

        {loadState(res, listings.length).kind !== "ready" && (
          <LoadStateView
            state={loadState(res, listings.length)}
            emptyTitle="No pets listed near Marikina yet — check back soon."
          />
        )}

        {listings.map((listing) => (
          <TouchableOpacity
            key={listing.listing_id}
            activeOpacity={0.85}
            style={styles.petCard}
            // US-A3: a guest may now open the listing read-only; the wall is raised at the
            // Inquire action inside detail, not at the card tap. (The signup-wall itself still
            // exists here for the Report / Adopt-tab / You-tab entry points, which have no
            // read-only surface to fall through to.)
            onPress={() => navigation.navigate("listingDetail", { listingId: listing.listing_id })}
          >
            <View style={styles.avatarCircle}>
              <Image source={paw} resizeMode="contain" style={styles.avatarPaw} />
            </View>
            <View style={styles.petCopy}>
              <Text style={styles.petName}>{listing.pet.name}</Text>
              <Text style={styles.petDetails}>
                {listing.pet.species}
                {listing.pet.breed ? ` · ${listing.pet.breed}` : ""}
              </Text>
            </View>
            <View style={styles.petMeta}>
              <View style={styles.availableBadge}>
                <Text style={styles.availableText}>
                  {listing.status === "available" ? "Available" : listing.status}
                </Text>
              </View>
              <Text style={styles.shelterText}>{listing.city}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <GuestTabs onGated={openWall} />

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

// A guest-only tab bar (not OwnerTabs): OwnerTabs navigates straight to the real Adopt/Volunteer/
// profile routes, which is exactly what a guest must not do — every non-Home tab here opens the
// SignupWall instead. Only the DESTINATIONS differ; the look comes from the shared TabBar.
//
// ⚠️ US-CH1 converted this bar. It was an opaque white 84 pt panel whose active state was a tinted
// chip behind the ICON ALONE, leaving the label outside the selection — the V2 shape. It now uses
// the same 68 pt glass bar as the other two shells, with the pill behind icon and label together.
// It also carried its own private colour table (GUEST_TAB_COLORS); the colours now come from the
// theme, which is the point of the exercise — this is the bar a signed-out visitor actually lands
// on, and it is the one that kept its 1.60:1 inactive icon the last time only the owner bar
// was fixed.
function GuestTabs({ onGated }: { onGated: (action: SignupWallAction) => void }) {
  const items: TabBarItem[] = [
    // Home is the tab the guest is already on, so TabBar swallows the press.
    { key: "home", label: "Home", testID: "tab.guest.home", icon: (c, s) => <HomeIcon color={c} size={s} />, onPress: () => {} },
    { key: "adopt", label: "Adopt", testID: "tab.guest.adopt", icon: (c, s) => <AdoptIcon color={c} size={s} />, onPress: () => onGated("adopt") },
    { key: "volunteer", label: "Volunteer", testID: "tab.guest.volunteer", icon: (c, s) => <VolunteerIcon color={c} size={s} />, onPress: () => onGated("volunteer") },
    { key: "profile", label: "You", testID: "tab.guest.profile", icon: (c, s) => <ProfileIcon color={c} size={s} />, onPress: () => onGated("account") }
  ];

  return <TabBar items={items} active="home" />;
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
  loginPill: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    ...elevation.soft
  },
  loginPillText: {
    color: colors.teal,
    ...typography.meta,
    fontWeight: "800"
  },
  guestBanner: {
    minHeight: 72,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: radii.notice,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.soft
  },
  guestIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  guestCopy: {
    flex: 1,
    marginLeft: 12
  },
  guestTitle: {
    color: colors.ink,
    ...typography.meta,
    fontWeight: "800"
  },
  guestBody: {
    marginTop: 3,
    color: colors.muted,
    ...typography.caption, fontWeight: "600"
  },
  guestLink: {
    marginLeft: 8,
    color: colors.tealDark,
    ...typography.meta,
    fontWeight: "800"
  },
  reportCard: {
    height: 140,
    marginTop: 14,
    borderRadius: radii.tile,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 16,
    paddingTop: 15,
    backgroundColor: colors.teal
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
    width: 136,
    height: 38,
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
  reportPaw: {
    width: 72,
    height: 72,
    marginTop: 4
  },
  // Was a bare teal "See nearby strays ›" text link — the one V1 element left between two V2
  // cards, and the smallest target on the screen. Rebuilt as a V2 raised row: white fill with
  // the `v2soft` shadow and NO stroke, since in this language the shadow is what says
  // "tappable" and a border reads as V1. The squircle icon tile matches the guest banner above
  // it, so the two rows now belong to the same system.
  mapCard: {
    marginTop: 14,
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radii.tile,
    backgroundColor: "#FFFFFF",
    ...elevation.soft
  },
  mapIconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft
  },
  mapCopy: {
    flex: 1,
    marginLeft: 14
  },
  mapTitle: {
    color: colors.ink,
    ...typography.strong,
    fontWeight: "800"
  },
  mapSub: {
    marginTop: 2,
    color: colors.muted,
    ...typography.meta
  },
  mapChevron: {
    marginLeft: 8,
    color: colors.teal,
    fontSize: 19,
    fontWeight: "700"
  },
  sectionHeader: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.ink,
    ...typography.subtitle,
    fontWeight: "800"
  },
  emptyText: {
    marginTop: 14,
    color: colors.muted,
    ...typography.meta,
    textAlign: "center"
  },
  petCard: {
    height: 68,
    marginTop: 10,
    borderRadius: radii.card,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 13,
    backgroundColor: "#FFFFFF",
    ...elevation.soft
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft
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
});
