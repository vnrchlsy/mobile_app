// US-A1 step 4 — reference: screens/user/screen-signup-success.png
// Informational recap of what the account unlocks; NOT an action menu — "Start exploring" is the only exit.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AdoptIcon, VolunteerIcon } from "../components/AppIcons";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { TopStatus } from "../components/TopStatus";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "signupSuccess">;

type NextStep = {
  key: string;
  title: string;
  body: string;
  icon: ReactNode;
  needsVerify?: boolean;
};

export function SignupSuccessScreen({ navigation }: Props) {
  const steps: NextStep[] = [
    {
      key: "adopt",
      title: "Adopt a pet",
      body: "Give a rescue a loving home",
      icon: <AdoptIcon color={colors.teal} size={26} />,
      needsVerify: true
    },
    {
      key: "rescue",
      title: "Report & rescue strays",
      body: "Sagip — spot a stray, get it help",
      icon: <PinIcon color={colors.teal} />,
      needsVerify: true
    },
    {
      key: "volunteer",
      title: "Volunteer with shelters",
      body: "Kawang-Gawa — walk, feed, lend a hand",
      icon: <VolunteerIcon color={colors.teal} size={26} />
    }
  ];

  function onStartExploring() {
    // justSignedUp gates HomeScreen's guest-intent resume (see HomeScreen.tsx) — this is the only
    // route that should ever set it, since it's the sole confirmation that a signup actually
    // completed (SigninScreen's reset to "home" must NOT carry this flag).
    navigation.reset({ index: 0, routes: [{ name: "home", params: { justSignedUp: true } }] });
  }

  return (
    <View style={styles.screen}>
      <TopStatus />

      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <View style={styles.checkMarkStem} />
          <View style={styles.checkMarkKick} />
        </View>

        <Text style={styles.heading}>You're in!</Text>
        <Text style={styles.subheading}>Your email is verified.</Text>

        <Text style={styles.sectionTitle}>Here's what you can do</Text>

        {steps.map((step) => (
          <Card key={step.key} style={styles.stepCard}>
            <View style={styles.iconTile}>{step.icon}</View>
            <View style={styles.stepCopy}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
            </View>
            {step.needsVerify && (
              <View style={styles.verifyBadge}>
                <Text style={styles.verifyText}>Verify</Text>
              </View>
            )}
          </Card>
        ))}

        <View style={styles.noticeBar}>
          <View style={styles.noticeCheck}>
            <View style={styles.noticeCheckMark} />
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Adopting & rescuing need a quick check</Text>
            <Text style={styles.noticeBody}>One ID + a social link. Do it anytime from You.</Text>
          </View>
        </View>

        <Button label="Start exploring" onPress={onStartExploring} style={styles.startButton} />
      </View>
    </View>
  );
}

function PinIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: size * 0.62,
          height: size * 0.62,
          backgroundColor: color,
          borderRadius: size * 0.62,
          borderBottomLeftRadius: 0,
          transform: [{ rotate: "135deg" }]
        }}
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
    flex: 1,
    paddingHorizontal: spacing.s28,
    alignItems: "center"
  },
  checkCircle: {
    width: 96,
    height: 96,
    marginTop: spacing.s40,
    borderRadius: 48, // exactly half of width/height (circle) — do not snap to radii scale
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.successTint
  },
  checkMarkStem: {
    position: "absolute",
    width: 5,
    height: 20,
    borderRadius: 3, // ~half of width (rounded bar end) — do not snap to radii scale
    backgroundColor: colors.success,
    transform: [{ rotate: "45deg" }, { translateX: 8 }, { translateY: -2 }]
  },
  checkMarkKick: {
    position: "absolute",
    width: 5,
    height: 34,
    borderRadius: 3, // ~half of width (rounded bar end) — do not snap to radii scale
    backgroundColor: colors.success,
    transform: [{ rotate: "-45deg" }, { translateX: -2 }, { translateY: -8 }]
  },
  heading: {
    marginTop: spacing.s20,
    color: colors.ink,
    ...typography.heading800_26
  },
  subheading: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.body14
  },
  sectionTitle: {
    alignSelf: "flex-start",
    marginTop: spacing.s32,
    color: colors.ink,
    ...typography.label800_16
  },
  stepCard: {
    // Card (Task 8) already matches this block's backgroundColor/borderRadius/padding/
    // shadowColor/shadowOpacity/elevation exactly — only layout, width, marginTop and the
    // slightly larger shadowRadius/shadowOffset need overriding here.
    width: "100%",
    marginTop: spacing.s12,
    alignItems: "center",
    flexDirection: "row",
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }
  },
  iconTile: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.r12,
    backgroundColor: colors.tealTint
  },
  stepCopy: {
    flex: 1,
    marginLeft: spacing.s12
  },
  stepTitle: {
    color: colors.ink,
    ...typography.label800_15
  },
  stepBody: {
    marginTop: spacing.s2,
    color: colors.muted,
    ...typography.body12
  },
  verifyBadge: {
    marginLeft: spacing.s8,
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s4,
    borderRadius: radii.r12,
    backgroundColor: colors.warningTint
  },
  verifyText: {
    color: colors.warning,
    ...typography.label800_12
  },
  noticeBar: {
    width: "100%",
    marginTop: spacing.s20,
    borderRadius: radii.r12,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s12,
    backgroundColor: colors.tealTint
  },
  noticeCheck: {
    width: 24,
    height: 24,
    marginTop: spacing.s2,
    borderRadius: 12, // exactly half of width/height (circle) — do not snap to radii scale
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  noticeCheckMark: {
    width: 10,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.white,
    transform: [{ rotate: "-45deg" }, { translateY: -1 }]
  },
  noticeCopy: {
    flex: 1,
    marginLeft: spacing.s12
  },
  noticeTitle: {
    color: colors.tealDark,
    ...typography.label800_13
  },
  noticeBody: {
    marginTop: spacing.s2,
    color: colors.muted,
    ...typography.body12,
    lineHeight: 17
  },
  startButton: {
    width: "100%",
    marginTop: spacing.s24,
    marginBottom: spacing.s24
  }
});
