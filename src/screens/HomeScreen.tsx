// US-X1/X2 — owner home. Reference: screens/user/screen-home.png (plain) and
// screens/user/screen-home-member-pending.png (Verified Member under review).
// Fetches /me on focus and derives the pending-member banner from capabilities; the city chip
// routes to locationPicker (M5) and reads the cached city from AuthContext (no GET /me/location
// exists — see AuthContext.tsx). The "Saw a stray?" hero and quick actions are still static —
// their destinations land in later sprints.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { Listing, Me } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { OwnerTabs } from "../components/OwnerTabs";
import { BellIcon, CheckIcon, ClockIcon } from "../components/AppIcons";
import { GuestIntentAction, takeIntent } from "../guestIntent";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";

const paw = require("../../assets/paw-white.png") as ImageSourcePropType;

type Props = NativeStackScreenProps<RootStackParamList, "home">;

type QuickAction = {
  label: string;
  icon: "search" | "heart" | "peso" | "person";
  dest: keyof RootStackParamList;
};

const quickActions: QuickAction[] = [
  { label: "Lost & found", icon: "search", dest: "rescueMap" },
  { label: "Adopt", icon: "heart", dest: "adopt" },
  // No generic "browse shelters" screen yet — adopt feed is the nearest landing.
  { label: "Donate", icon: "peso", dest: "adopt" },
  { label: "Volunteer", icon: "person", dest: "kawanggawa" },
];

type MapReport = { report_id: string; species: string; condition: string; city: string | null };

export function HomeScreen({ navigation, route }: Props) {
  // The status bar is real now (App.tsx), so the first thing on screen has to start below
  // it. This block used to pad 20pt, which was right while the bar was hidden and
  // put the greeting under the clock once it was not.
  const insets = useSafeAreaInsets();
  const api = useApi();
  const { city } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [rescues, setRescues] = useState<MapReport[]>([]);
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
      // Adoption preview — first 2 available listings near the user's city.
      const cityParam = city ? `&city=${encodeURIComponent(city)}` : "";
      api.get(`/listings?page_size=2${cityParam}`).then((r) => {
        setListingsRes({ ok: r.ok, status: r.status });
        if (r.ok) setListings(r.data?.results ?? []);
      });
      // Nearby rescues — first 2 reported strays near the user's city.
      const rescueCity = city ?? "Marikina";
      api.get(`/reports/map?city=${encodeURIComponent(rescueCity)}&status=reported`).then((r) => {
        setRescuesRes({ ok: r.ok, status: r.status });
        if (r.ok) setRescues((r.data?.reports ?? []).slice(0, 2));
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on focus, not on every api identity change
    }, [])
  );

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

  return (
    <View style={styles.screen} testID="screen.home">
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

        <View style={styles.reportCard}>
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
        </View>

        <View style={styles.sagipLinks}>
          <TouchableOpacity testID="btn.home.rescueMap" hitSlop={TAP_SLOP} activeOpacity={0.7} onPress={() => navigation.navigate("rescueMap")}>
            <Text style={styles.sagipLink}>See nearby strays ›</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="btn.home.myReports" hitSlop={TAP_SLOP} activeOpacity={0.7} onPress={() => navigation.navigate("myReports")}>
            <Text style={styles.sagipLink}>My reports ›</Text>
          </TouchableOpacity>
          <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.7} onPress={() => navigation.navigate("myRescues")}>
            <Text style={styles.sagipLink}>My rescues ›</Text>
          </TouchableOpacity>
          <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.7} onPress={() => navigation.navigate("myOffers")}>
            <Text style={styles.sagipLink}>My offers ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              activeOpacity={0.75}
              style={styles.quickCard}
              onPress={() => navigation.navigate(action.dest as never)}
            >
              <View style={styles.quickIcon}>{renderQuickIcon(action.icon)}</View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Adopt near you</Text>
          <TouchableOpacity testID="btn.home.adopt" hitSlop={TAP_SLOP} activeOpacity={0.7} onPress={() => navigation.navigate("adopt")}>
            <Text style={styles.seeAll}>See all ›</Text>
          </TouchableOpacity>
        </View>

        {listings.length === 0 ? (
          <Text style={styles.emptyNote}>No pets listed near you yet.</Text>
        ) : listings.map((listing) => (
          <TouchableOpacity
            key={listing.listing_id}
            activeOpacity={0.75}
            style={styles.petCard}
            onPress={() => navigation.navigate("listingDetail", { listingId: listing.listing_id })}
          >
            <View style={styles.avatarCircle}>
              <Image source={paw} resizeMode="contain" style={styles.avatarPaw} />
            </View>
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
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.rescueSectionRow}
          onPress={() => navigation.navigate("stories")}
        >
          <Text style={[styles.sectionTitle, styles.rescueTitle]}>Community stories</Text>
          <Text style={styles.seeAll}>See all ›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.rescueSectionRow}
          onPress={() => navigation.navigate("rescueMap")}
        >
          <Text style={[styles.sectionTitle, styles.rescueTitle]}>Nearby rescues</Text>
          <Text style={styles.seeAll}>See map ›</Text>
        </TouchableOpacity>

        {rescues.length === 0 ? (
          <Text style={styles.emptyNote}>No strays reported nearby yet.</Text>
        ) : rescues.map((report) => (
          <TouchableOpacity
            key={report.report_id}
            activeOpacity={0.75}
            style={styles.rescueCard}
            onPress={() => navigation.navigate("reportDetail", { reportId: report.report_id })}
          >
            <View style={styles.avatarCircle}>
              <Image source={paw} resizeMode="contain" style={styles.avatarPaw} />
            </View>
            <View style={styles.petCopy}>
              <Text style={styles.petName}>{report.species} · {report.city ?? "Nearby"}</Text>
              <Text style={styles.petDetails}>{report.condition} · needs pickup</Text>
            </View>
            <View style={conditionBadgeStyle(report.condition)}>
              <Text style={conditionTextStyle(report.condition)}>{conditionLabel(report.condition)}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {pendingMember && <Text style={styles.lockedNote}>Claiming rescues unlocks once you're verified.</Text>}
      </ScrollView>

      <OwnerTabs active="home" />
    </View>
  );
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

function renderQuickIcon(icon: QuickAction["icon"]) {
  if (icon === "search") {
    return (
      <View style={styles.searchIcon}>
        <View style={styles.searchCircle} />
        <View style={styles.searchHandle} />
      </View>
    );
  }

  if (icon === "person") {
    return (
      <View style={styles.personIcon}>
        <View style={styles.personHead} />
        <View style={styles.personBody} />
      </View>
    );
  }

  return <Text style={styles.quickSymbol}>{icon === "heart" ? "♥" : "₱"}</Text>;
}

const colors = {
  ink: "#12213A",
  teal: "#1C6B6B",
  page: "#F4F5F2",
  border: "#E3E1D9",
  muted: "#5F5E5A",
  warnBg: "#FAEEDA",
  warn: "#8A5A12",
  warn2: "#633806",
  paleTeal: "#E7F0EE"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  content: {
    paddingHorizontal: 26,
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
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28
  },
  role: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13
  },
  cityRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  cityText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700"
  },
  cityChange: {
    color: colors.teal,
    fontSize: 13,
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
    borderRadius: 15,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.warnBg
  },
  reviewCopy: {
    flex: 1,
    marginLeft: 14
  },
  reviewTitle: {
    color: colors.warn2,
    fontSize: 14,
    fontWeight: "800"
  },
  reviewText: {
    marginTop: 5,
    color: colors.warn,
    fontSize: 11
  },
  statusLink: {
    color: colors.warn2,
    fontSize: 12,
    fontWeight: "800"
  },
  verifiedHero: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 24, // matches ShelterDashboardScreen.verifiedHero exactly
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
    fontSize: 21,
    fontWeight: "800"
  },
  verifiedHeroBody: {
    marginTop: 4,
    color: "#DCEDEB",
    fontSize: 15,
    lineHeight: 21
  },
  reportCard: {
    height: 136,
    marginTop: 22,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 16,
    paddingTop: 26,
    backgroundColor: colors.teal
  },
  reportTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
    lineHeight: 28
  },
  reportText: {
    marginTop: 9,
    color: "#D5ECE8",
    fontSize: 13
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
    fontSize: 13,
    fontWeight: "800"
  },
  sagipLinks: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 18,
    rowGap: 10
  },
  sagipLink: {
    color: "#1C6B6B",
    fontSize: 14,
    fontWeight: "800"
  },
  reportPaw: {
    width: 72,
    height: 72,
    marginTop: 4
  },
  quickGrid: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  quickCard: {
    width: "23%",
    height: 86,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  quickLabel: {
    marginTop: 8,
    color: colors.ink,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center"
  },
  quickSymbol: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900"
  },
  searchIcon: {
    width: 25,
    height: 25
  },
  searchCircle: {
    width: 17,
    height: 17,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 9
  },
  searchHandle: {
    position: "absolute",
    right: 2,
    bottom: 3,
    width: 11,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }]
  },
  personIcon: {
    alignItems: "center"
  },
  personHead: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#FFFFFF"
  },
  personBody: {
    width: 23,
    height: 13,
    marginTop: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: "#FFFFFF"
  },
  sectionHeader: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  seeAll: {
    color: "#126B69",
    fontSize: 12,
    fontWeight: "800"
  },
  petCard: {
    height: 68,
    marginTop: 10,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 13,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paleTeal
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
    fontSize: 17,
    fontWeight: "800"
  },
  petDetails: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 11
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
    fontSize: 12,
    fontWeight: "800"
  },
  shelterText: {
    marginTop: 8,
    color: "#AAA69D",
    fontSize: 10
  },
  rescueTitle: {},
  rescueCard: {
    height: 68,
    marginTop: 16,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 13,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  urgentBadge: {
    width: 68,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.warnBg
  },
  urgentText: {
    color: colors.warn2,
    fontSize: 12,
    fontWeight: "800"
  },
  lockedNote: {
    marginTop: 14,
    color: colors.muted,
    fontSize: 11,
    textAlign: "center"
  },
  emptyNote: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 12,
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
    backgroundColor: colors.paleTeal
  },
  specialText: {
    color: colors.teal,
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: "800"
  }
});
