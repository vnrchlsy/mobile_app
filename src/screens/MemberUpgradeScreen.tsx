// US-A4 step 1 — reference: screens/user/screen-member-upgrade.png.
// Explains what the Verified Member badge unlocks (adopting from partner shelters, not just
// rescue tooling — see Design Package decision: adoption is gated on the badge too) and hands off
// to MemberVerifyScreen for the actual submission.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AdoptIcon, UserBadgeIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";

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
 testID="btn.back"          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Get verified</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <UserBadgeIcon color="#FFFFFF" />
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

const colors = {
  ink: "#12213A",
  teal: "#1C6B6B",
  tealDark: "#14504F",
  page: "#F4F5F2",
  border: "#E3E1D9",
  muted: "#5F5E5A",
  paleTeal: "#E7F0EE"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  header: {
    height: 96,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 14
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
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  backText: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 28
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  content: {
    flex: 1,
    paddingHorizontal: 26
  },
  hero: {
    marginTop: 10,
    borderRadius: 20,
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
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800"
  },
  heroText: {
    marginTop: 8,
    color: "#D5ECE8",
    fontSize: 13,
    lineHeight: 19
  },
  sectionTitle: {
    marginTop: 26,
    color: colors.ink,
    fontSize: 17,
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
    fontSize: 14,
    fontWeight: "600"
  },
  lightCard: {
    marginTop: 26,
    borderRadius: 16,
    padding: 18,
    backgroundColor: colors.paleTeal
  },
  lightTitle: {
    color: colors.tealDark,
    fontSize: 14,
    fontWeight: "800"
  },
  lightText: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  cta: {
    height: 54,
    marginTop: 28,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  footnote: {
    marginTop: 12,
    marginBottom: 30,
    color: "#9A988F",
    fontSize: 12,
    textAlign: "center"
  }
});
