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

import { useApi } from "../api/useApi";
import { Me } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { OwnerTabs } from "../components/OwnerTabs";
import { BellIcon, ClockIcon } from "../components/AppIcons";
import { GuestIntentAction, takeIntent } from "../guestIntent";
import { RootStackParamList } from "../navigation/types";

const paw = require("../../assets/paw-white.png") as ImageSourcePropType;

type Props = NativeStackScreenProps<RootStackParamList, "home">;

type QuickAction = { label: string; icon: "search" | "heart" | "peso" | "person" };

const quickActions: QuickAction[] = [
  { label: "Lost & found", icon: "search" },
  { label: "Adopt", icon: "heart" },
  { label: "Donate", icon: "peso" },
  { label: "Volunteer", icon: "person" }
];

const pets = [
  { name: "Milo", details: "Aspin · 1 yr · Male", shelter: "PAWS Manila · 2 km" },
  { name: "Luna", details: "Puspin · 2 yrs · Female", shelter: "Marikina AWG · 4 km" }
];

export function HomeScreen({ navigation, route }: Props) {
  const api = useApi();
  const { city } = useAuth();
  const [me, setMe] = useState<Me | null>(null);

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

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>{me?.display_name ? `Kumusta, ${me.display_name}!` : "Kumusta!"}</Text>
            {pendingMember ? (
              <Text style={styles.role}>Pet owner · Verified Member pending</Text>
            ) : (
              <View style={styles.cityRow}>
                <Text style={styles.cityText}>{city ?? "Set your city"}</Text>
                <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.navigate("locationPicker")}>
                  <Text style={styles.cityChange}>Change ›</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.bellButton}>
            <BellIcon color="#12213A" />
          </View>
        </View>

        {pendingMember && (
          <TouchableOpacity activeOpacity={0.85} style={styles.reviewCard}>
            <ClockIcon color="#8A5A12" size={38} />
            <View style={styles.reviewCopy}>
              <Text style={styles.reviewTitle}>Verified Member in review</Text>
              <Text style={styles.reviewText}>We'll notify you within a day.</Text>
            </View>
            <Text style={styles.statusLink}>Documents ›</Text>
          </TouchableOpacity>
        )}

        <View style={styles.reportCard}>
          <View>
            <Text style={styles.reportTitle}>Saw a stray?</Text>
            <Text style={styles.reportText}>Report it in seconds — help is near.</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.reportButton}
              onPress={() => navigation.navigate("reportStray")}
            >
              <Text style={styles.reportButtonText}>Report now</Text>
            </TouchableOpacity>
          </View>
          <Image source={paw} resizeMode="contain" style={styles.reportPaw} />
        </View>

        <View style={styles.sagipLinks}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("rescueMap")}>
            <Text style={styles.sagipLink}>See nearby strays ›</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("myReports")}>
            <Text style={styles.sagipLink}>My reports ›</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("myRescues")}>
            <Text style={styles.sagipLink}>My rescues ›</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("myOffers")}>
            <Text style={styles.sagipLink}>My offers ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <View key={action.label} style={styles.quickCard}>
              <View style={styles.quickIcon}>{renderQuickIcon(action.icon)}</View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Adopt near you</Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>

        {pets.map((pet) => (
          <View key={pet.name} style={styles.petCard}>
            <View style={styles.avatarCircle}>
              <Image source={paw} resizeMode="contain" style={styles.avatarPaw} />
            </View>
            <View style={styles.petCopy}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petDetails}>{pet.details}</Text>
            </View>
            <View style={styles.petMeta}>
              <View style={styles.availableBadge}>
                <Text style={styles.availableText}>Available</Text>
              </View>
              <Text style={styles.shelterText}>{pet.shelter}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, styles.rescueTitle]}>Nearby rescues</Text>
        <View style={styles.rescueCard}>
          <View style={styles.avatarCircle}>
            <Image source={paw} resizeMode="contain" style={styles.avatarPaw} />
          </View>
          <View style={styles.petCopy}>
            <Text style={styles.petName}>Aspin · Quezon City</Text>
            <Text style={styles.petDetails}>0.4 km · needs pickup</Text>
          </View>
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>Urgent</Text>
          </View>
        </View>

        {pendingMember && <Text style={styles.lockedNote}>Claiming rescues unlocks once you're verified.</Text>}
      </ScrollView>

      <OwnerTabs active="home" />
    </View>
  );
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
  rescueTitle: {
    marginTop: 34
  },
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
  }
});
