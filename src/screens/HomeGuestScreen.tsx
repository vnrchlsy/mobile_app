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

import { useApi } from "../api/useApi";
import { Listing } from "../api/types";
import { AdoptIcon, HomeIcon, ProfileIcon, VolunteerIcon } from "../components/AppIcons";
import { ScreenContainer } from "../components/ScreenContainer";
import { SignupWall, SignupWallAction } from "../components/SignupWall";
import { setIntent } from "../guestIntent";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

const paw = require("../../assets/paw-white.png") as ImageSourcePropType;

type Props = NativeStackScreenProps<RootStackParamList, "homeGuest">;

const GUEST_CITY = "Marikina";

type WallState = { action: SignupWallAction; subject?: string } | null;

export function HomeGuestScreen({ navigation }: Props) {
  const api = useApi();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [wall, setWall] = useState<WallState>(null);

  useFocusEffect(
    useCallback(() => {
      api.get(`/listings?city=${GUEST_CITY}`).then((r) => {
        if (r.ok) setListings(r.data.results ?? []);
        setLoaded(true);
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
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>Welcome!</Text>
            <View style={styles.cityRow}>
              <Text style={styles.cityText}>Marikina City</Text>
              <Text style={styles.cityChange}>Change ›</Text>
            </View>
          </View>
          <TouchableOpacity
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
          <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.navigate("accountType")}>
            <Text style={styles.guestLink}>Sign up ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reportCard}>
          <View>
            <Text style={styles.reportTitle}>Saw a stray?</Text>
            <Text style={styles.reportText}>Report it in seconds — help is near.</Text>
            <TouchableOpacity activeOpacity={0.85} style={styles.reportButton} onPress={() => openWall("report")}>
              <Text style={styles.reportButtonText}>Report now</Text>
            </TouchableOpacity>
          </View>
          <Image source={paw} resizeMode="contain" style={styles.reportPaw} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Adopt near you</Text>
        </View>

        {loaded && listings.length === 0 && (
          <Text style={styles.emptyText}>No pets listed near Marikina yet — check back soon.</Text>
        )}

        {listings.map((listing) => (
          <TouchableOpacity
            key={listing.listing_id}
            activeOpacity={0.85}
            style={styles.petCard}
            onPress={() => openWall("adopt", listing.pet.name)}
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
    </ScreenContainer>
  );
}

// A guest-only tab bar (not OwnerTabs): OwnerTabs navigates straight to the real Adopt/Volunteer/
// profile routes, which is exactly what a guest must not do — every non-Home tab here opens the
// SignupWall instead. Visual language matches OwnerTabs (screen-home.png bottom nav).
function GuestTabs({ onGated }: { onGated: (action: SignupWallAction) => void }) {
  return (
    <View style={styles.tabsWrap} pointerEvents="box-none">
      <View style={styles.tabsBar}>
        <View style={styles.tabItem}>
          <View style={[styles.iconSlot, styles.iconSlotActive]}>
            <HomeIcon color={colors.teal} size={24} />
          </View>
          <Text style={[styles.tabText, styles.activeTabText]}>Home</Text>
        </View>
        <TouchableOpacity activeOpacity={0.75} style={styles.tabItem} onPress={() => onGated("adopt")}>
          <View style={styles.iconSlot}>
            <AdoptIcon color={colors.inactive} size={24} />
          </View>
          <Text style={styles.tabText}>Adopt</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.75} style={styles.tabItem} onPress={() => onGated("volunteer")}>
          <View style={styles.iconSlot}>
            <VolunteerIcon color={colors.inactive} size={24} />
          </View>
          <Text style={styles.tabText}>Volunteer</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.75} style={styles.tabItem} onPress={() => onGated("account")}>
          <View style={styles.iconSlot}>
            <ProfileIcon color={colors.inactive} size={24} />
          </View>
          <Text style={styles.tabText}>You</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    // 26 ties between s24/s28 on the snapping scale — round down per Migration Protocol
    paddingHorizontal: spacing.s24,
    paddingTop: spacing.s20,
    // clears GuestTabs' floating bar — not snapped to the spacing scale, see Migration Protocol step 2
    paddingBottom: 156
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  headerCopy: {
    flex: 1,
    marginRight: spacing.s12
  },
  greeting: {
    color: colors.inkStrong,
    ...typography.heading800_22,
    lineHeight: 28
  },
  cityRow: {
    marginTop: spacing.s4,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s8
  },
  cityText: {
    color: colors.inkStrong,
    ...typography.label700_15
  },
  cityChange: {
    color: colors.teal,
    ...typography.label700_13
  },
  loginPill: {
    height: 40,
    paddingHorizontal: spacing.s20,
    borderRadius: 20, // exactly half of height (pill) — do not snap to radii scale
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  loginPillText: {
    color: colors.teal,
    ...typography.label800_13
  },
  guestBanner: {
    minHeight: 72,
    marginTop: spacing.s20,
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: radii.r16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s12,
    backgroundColor: colors.tealTint
  },
  guestIcon: {
    width: 36,
    height: 36,
    borderRadius: 18, // exactly half of width/height (circle) — do not snap to radii scale
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  guestCopy: {
    flex: 1,
    marginLeft: spacing.s12
  },
  guestTitle: {
    color: colors.inkStrong,
    ...typography.label800_13
  },
  guestBody: {
    marginTop: spacing.s2,
    color: colors.muted,
    ...typography.body11
  },
  guestLink: {
    marginLeft: spacing.s8,
    color: colors.tealDark,
    ...typography.label800_13
  },
  reportCard: {
    height: 136,
    marginTop: spacing.s16,
    borderRadius: radii.r16,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: spacing.s20,
    paddingRight: spacing.s16,
    paddingTop: spacing.s24,
    backgroundColor: colors.teal
  },
  reportTitle: {
    color: colors.white,
    ...typography.heading800_23,
    lineHeight: 28
  },
  reportText: {
    marginTop: spacing.s8,
    color: colors.tealTint,
    ...typography.body13
  },
  reportButton: {
    width: 136,
    height: 38,
    marginTop: spacing.s12,
    borderRadius: 19, // exactly half of height (pill) — do not snap to radii scale
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  reportButtonText: {
    color: colors.teal,
    ...typography.label800_13
  },
  reportPaw: {
    width: 72,
    height: 72,
    marginTop: spacing.s4
  },
  sectionHeader: {
    marginTop: spacing.s20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.inkStrong,
    ...typography.heading800_17
  },
  emptyText: {
    marginTop: spacing.s12,
    color: colors.muted,
    ...typography.body13,
    textAlign: "center"
  },
  petCard: {
    height: 68,
    marginTop: spacing.s8,
    borderRadius: radii.r12,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: spacing.s12,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24, // exactly half of width/height (circle) — do not snap to radii scale
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tealTint
  },
  avatarPaw: {
    width: 24,
    height: 24,
    tintColor: colors.teal
  },
  petCopy: {
    flex: 1,
    marginLeft: spacing.s12
  },
  petName: {
    color: colors.inkStrong,
    ...typography.heading800_17
  },
  petDetails: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.body11
  },
  petMeta: {
    alignItems: "flex-end"
  },
  availableBadge: {
    minWidth: 92,
    height: 28,
    borderRadius: 14, // exactly half of height (pill) — do not snap to radii scale
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.successTint
  },
  availableText: {
    color: colors.success,
    ...typography.label800_12
  },
  shelterText: {
    marginTop: spacing.s8,
    color: colors.neutralMuted,
    ...typography.body10
  },
  tabsWrap: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24
  },
  tabsBar: {
    height: 84,
    borderRadius: radii.r32,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  iconSlot: {
    width: 44,
    height: 34,
    borderRadius: 17, // exactly half of height (pill) — do not snap to radii scale
    alignItems: "center",
    justifyContent: "center"
  },
  iconSlotActive: {
    backgroundColor: colors.tealTint
  },
  tabText: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.label600_12
  },
  activeTabText: {
    color: colors.tealDark,
    ...typography.label800_12
  }
});
