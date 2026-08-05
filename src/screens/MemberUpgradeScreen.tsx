// US-A4 step 1 — reference: screens/user/screen-member-upgrade.png.
// Explains what the Verified Member badge unlocks (adopting from partner shelters, not just
// rescue tooling — see Design Package decision: adoption is gated on the badge too) and hands off
// to MemberVerifyScreen for the actual submission.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AdoptIcon, UserBadgeIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

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
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Get verified</Text>
      </View>

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

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.cta}
          onPress={() => navigation.navigate("memberVerify")}
        >
          <Text style={styles.ctaText}>Get verified</Text>
        </TouchableOpacity>
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
  header: {
    height: 96,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: spacing.s12
  },
  backButton: {
    position: "absolute",
    left: 26,
    bottom: 12,
    width: 42,
    height: 42,
    // Circle (half of 42x42) — kept literal per Migration Protocol step 3.
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  backText: {
    ...typography.heading700_26,
    color: colors.inkStrong,
    lineHeight: 28
  },
  headerTitle: {
    ...typography.heading800_18,
    color: colors.inkStrong
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.s24
  },
  hero: {
    marginTop: spacing.s8,
    borderRadius: radii.r20,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.s20,
    backgroundColor: colors.teal
  },
  heroIcon: {
    width: 64,
    height: 64,
    // Circle (half of 64x64) — kept literal per Migration Protocol step 3.
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  heroCopy: {
    flex: 1,
    marginLeft: spacing.s16
  },
  heroTitle: {
    ...typography.heading800_19,
    color: colors.white
  },
  heroText: {
    marginTop: spacing.s8,
    ...typography.body13,
    color: colors.tealTint,
    lineHeight: 19
  },
  sectionTitle: {
    marginTop: spacing.s24,
    ...typography.heading800_17,
    color: colors.inkStrong
  },
  unlockRow: {
    marginTop: spacing.s16,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s12
  },
  unlockText: {
    flex: 1,
    ...typography.label600_14,
    color: colors.inkStrong
  },
  lightCard: {
    marginTop: spacing.s24,
    borderRadius: radii.r16,
    padding: spacing.s16,
    backgroundColor: colors.tealTint
  },
  lightTitle: {
    ...typography.label800_14,
    color: colors.tealDark
  },
  lightText: {
    marginTop: spacing.s4,
    ...typography.body13,
    color: colors.muted,
    lineHeight: 18
  },
  cta: {
    height: 54,
    marginTop: spacing.s28,
    // Pill (half of 54 height) — kept literal per Migration Protocol step 3.
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  ctaText: {
    ...typography.label800_16,
    color: colors.white
  },
  footnote: {
    marginTop: spacing.s12,
    marginBottom: spacing.s28,
    color: colors.neutralMuted,
    ...typography.body12,
    textAlign: "center"
  }
});
