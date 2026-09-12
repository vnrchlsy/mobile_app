// US-A4 step 1 — reference: screens/user/screen-member-upgrade.png.
// Explains what the Verified Member badge unlocks (adopting from partner shelters, not just
// rescue tooling — see Design Package decision: adoption is gated on the badge too) and hands off
// to MemberVerifyScreen for the actual submission.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";

import { AdoptIcon, UserBadgeIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";

type Props = NativeStackScreenProps<RootStackParamList, "memberUpgrade">;

const UNLOCKS = [
  "Adopt from partner shelters",
  "Claim & update stray rescue cases",
  "Post rescued animals for adoption",
  "Keep everything you do as a fur parent"
];

export function MemberUpgradeScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Get verified" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <UserBadgeIcon color={colors.white} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Become a Verified Member</Text>
            <Text style={styles.heroText}>One quick check unlocks adopting & rescue tools.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>What you unlock</Text>
        {UNLOCKS.map((line) => (
          <View key={line} style={styles.unlockRow}>
            <AdoptIcon color={colors.teal} size={22} />
            <Text style={styles.unlockText}>{line}</Text>
          </View>
        ))}

        <View style={styles.lightCard}>
          <Text style={styles.lightTitle}>Light verification</Text>
          <Text style={styles.lightText}>A valid ID and one link to your social page.</Text>
        </View>

        <Button label="Get verified" onPress={() => navigation.navigate("memberVerify")} style={styles.cta} />
        <Text style={styles.footnote}>Free · takes a few minutes</Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  backButton: {
    position: "absolute",
    left: 26,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    ...elevation.soft
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg
  },
  hero: {
    marginTop: 10,
    borderRadius: radii.field,
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.teal
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  heroCopy: {
    flex: 1,
    marginLeft: 16
  },
  heroTitle: {
    color: colors.white,
    ...typography.section
  },
  heroText: {
    marginTop: 8,
    color: colors.soft,
    ...typography.meta,
    lineHeight: 19
  },
  sectionTitle: {
    marginTop: 26,
    color: colors.ink,
    ...typography.subtitle,
    fontWeight: "800"
  },
  unlockRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  unlockText: {
    flex: 1,
    color: colors.ink,
    ...typography.meta,
    fontWeight: "600"
  },
  lightCard: {
    marginTop: 26,
    borderRadius: radii.card,
    padding: 18,
    backgroundColor: colors.soft
  },
  lightTitle: {
    color: colors.tealDark,
    ...typography.meta,
    fontWeight: "800"
  },
  lightText: {
    marginTop: 6,
    color: colors.muted,
    ...typography.meta,
    lineHeight: 18
  },
  cta: { marginTop: 28 },
  footnote: {
    marginTop: 12,
    marginBottom: 30,
    color: colors.muted,
    ...typography.meta,
    textAlign: "center"
  }
});
