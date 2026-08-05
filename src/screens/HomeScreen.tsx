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
import { BellIcon, ClockIcon } from "../components/AppIcons";
import { Card } from "../components/Card";
import { OwnerTabs } from "../components/OwnerTabs";
import { ScreenContainer } from "../components/ScreenContainer";
import { GuestIntentAction, takeIntent } from "../guestIntent";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

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
      api.get("/me").then((r) => r.ok && setMe(r.data));
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
    <ScreenContainer>
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
            <BellIcon color={colors.inkStrong} />
          </View>
        </View>

        {pendingMember && (
          <TouchableOpacity activeOpacity={0.85} style={styles.reviewCard}>
            <ClockIcon color={colors.warning} size={38} />
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
            <TouchableOpacity activeOpacity={0.85} style={styles.reportButton}>
              <Text style={styles.reportButtonText}>Report now</Text>
            </TouchableOpacity>
          </View>
          <Image source={paw} resizeMode="contain" style={styles.reportPaw} />
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
          <Card key={pet.name} style={styles.petCard}>
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
          </Card>
        ))}

        <Text style={[styles.sectionTitle, styles.rescueTitle]}>Nearby rescues</Text>
        <Card style={styles.rescueCard}>
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
        </Card>

        {pendingMember && <Text style={styles.lockedNote}>Claiming rescues unlocks once you're verified.</Text>}
      </ScrollView>

      <OwnerTabs active="home" />
    </ScreenContainer>
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

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.s24,
    paddingTop: spacing.s20,
    // clears OwnerTabs' floating bar — not snapped to the spacing scale, see Migration Protocol step 2
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
  role: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.body13
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
  bellButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20, // exactly half of width/height (circle) — do not snap to radii scale
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  reviewCard: {
    minHeight: 84,
    marginTop: spacing.s20,
    borderRadius: radii.r16,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s12,
    backgroundColor: colors.warningTint
  },
  reviewCopy: {
    flex: 1,
    marginLeft: spacing.s12
  },
  reviewTitle: {
    color: colors.warning,
    ...typography.label800_14
  },
  reviewText: {
    marginTop: spacing.s4,
    color: colors.warning,
    ...typography.body11
  },
  statusLink: {
    color: colors.warning,
    ...typography.label800_12
  },
  reportCard: {
    height: 136,
    marginTop: spacing.s20,
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
  quickGrid: {
    marginTop: spacing.s16,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  quickCard: {
    width: "23%",
    height: 86,
    borderRadius: radii.r12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20, // exactly half of width/height (circle) — do not snap to radii scale
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  quickLabel: {
    marginTop: spacing.s8,
    color: colors.inkStrong,
    ...typography.micro800_10,
    textAlign: "center"
  },
  quickSymbol: {
    color: colors.white,
    ...typography.heading900_23
  },
  searchIcon: {
    width: 25,
    height: 25
  },
  searchCircle: {
    width: 17,
    height: 17,
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: 9 // ~half of width/height (circle) — do not snap to radii scale
  },
  searchHandle: {
    position: "absolute",
    right: 2,
    bottom: 3,
    width: 11,
    height: 3,
    borderRadius: 2, // ~half of height (pill end-cap) — do not snap to radii scale
    backgroundColor: colors.white,
    transform: [{ rotate: "45deg" }]
  },
  personIcon: {
    alignItems: "center"
  },
  personHead: {
    width: 13,
    height: 13,
    borderRadius: 7, // ~half of width/height (circle) — do not snap to radii scale
    backgroundColor: colors.white
  },
  personBody: {
    width: 23,
    height: 13,
    marginTop: spacing.s2,
    // ~half of width, shape-defining dome (not exact — see OwnerTabs iconSlotActive precedent) —
    // do not snap to radii scale
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: colors.white
  },
  sectionHeader: {
    marginTop: spacing.s16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.inkStrong,
    ...typography.heading800_17
  },
  seeAll: {
    color: colors.teal,
    ...typography.label800_12
  },
  petCard: {
    // Card (Task 8) already matches this block's backgroundColor/shadowColor exactly — layout,
    // height, marginTop, borderRadius, padding, and the slightly heavier shadow need overriding
    // here since this is a compact row card rather than Card's default all-around-padded block.
    height: 68,
    marginTop: spacing.s8,
    borderRadius: radii.r12,
    alignItems: "center",
    flexDirection: "row",
    padding: 0,
    paddingHorizontal: spacing.s12,
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
  rescueTitle: {
    marginTop: spacing.s32
  },
  rescueCard: {
    // Same Card override rationale as petCard above.
    height: 68,
    marginTop: spacing.s16,
    borderRadius: radii.r12,
    alignItems: "center",
    flexDirection: "row",
    padding: 0,
    paddingHorizontal: spacing.s12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  urgentBadge: {
    width: 68,
    height: 28,
    borderRadius: 14, // exactly half of height (pill) — do not snap to radii scale
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.warningTint
  },
  urgentText: {
    color: colors.warning,
    ...typography.label800_12
  },
  lockedNote: {
    marginTop: spacing.s12,
    color: colors.muted,
    ...typography.body11,
    textAlign: "center"
  }
});
