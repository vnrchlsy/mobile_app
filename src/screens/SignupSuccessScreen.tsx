// US-A1 step 4 — reference: screens/user/screen-signup-success.png
// Informational recap of what the account unlocks; NOT an action menu — "Start exploring" is the only exit.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AdoptIcon, VolunteerIcon } from "../components/AppIcons";
import { TopStatus } from "../components/TopStatus";
import { RootStackParamList } from "../navigation/types";
import { PrimaryButton, authColors } from "./AuthFormKit";

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
      icon: <AdoptIcon color={authColors.teal} size={26} />,
      needsVerify: true
    },
    {
      key: "rescue",
      title: "Report & rescue strays",
      body: "Sagip — spot a stray, get it help",
      icon: <PinIcon color={authColors.teal} />,
      needsVerify: true
    },
    {
      key: "volunteer",
      title: "Volunteer with shelters",
      body: "Kawang-Gawa — walk, feed, lend a hand",
      icon: <VolunteerIcon color={authColors.teal} size={26} />
    }
  ];

  function onStartExploring() {
    // justSignedUp gates HomeScreen's guest-intent resume (see HomeScreen.tsx) — this is the only
    // route that should ever set it, since it's the sole confirmation that a signup actually
    // completed (SigninScreen's reset to "home" must NOT carry this flag).
    navigation.reset({ index: 0, routes: [{ name: "home", params: { justSignedUp: true } }] });
  }

  return (
    <View style={styles.screen} testID="screen.signupSuccess">
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
          <View key={step.key} style={styles.stepCard}>
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
          </View>
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

        <PrimaryButton testID="btn.signupSuccess.continue" label="Start exploring" onPress={onStartExploring} style={styles.startButton} />
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
    backgroundColor: authColors.page
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center"
  },
  checkCircle: {
    width: 96,
    height: 96,
    marginTop: 40,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCEED0"
  },
  checkMarkStem: {
    position: "absolute",
    width: 5,
    height: 20,
    borderRadius: 3,
    backgroundColor: "#2E5B1E",
    transform: [{ rotate: "45deg" }, { translateX: 8 }, { translateY: -2 }]
  },
  checkMarkKick: {
    position: "absolute",
    width: 5,
    height: 34,
    borderRadius: 3,
    backgroundColor: "#2E5B1E",
    transform: [{ rotate: "-45deg" }, { translateX: -2 }, { translateY: -8 }]
  },
  heading: {
    marginTop: 22,
    color: authColors.ink,
    fontSize: 26,
    fontWeight: "800"
  },
  subheading: {
    marginTop: 6,
    color: authColors.muted,
    fontSize: 14
  },
  sectionTitle: {
    alignSelf: "flex-start",
    marginTop: 34,
    color: authColors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  stepCard: {
    width: "100%",
    marginTop: 14,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1
  },
  iconTile: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: authColors.paleTeal
  },
  stepCopy: {
    flex: 1,
    marginLeft: 14
  },
  stepTitle: {
    color: authColors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  stepBody: {
    marginTop: 3,
    color: authColors.muted,
    fontSize: 12
  },
  verifyBadge: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F3DFB0"
  },
  verifyText: {
    color: "#7A5310",
    fontSize: 12,
    fontWeight: "800"
  },
  noticeBar: {
    width: "100%",
    marginTop: 22,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: authColors.paleTeal
  },
  noticeCheck: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: authColors.teal
  },
  noticeCheckMark: {
    width: 10,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#FFFFFF",
    transform: [{ rotate: "-45deg" }, { translateY: -1 }]
  },
  noticeCopy: {
    flex: 1,
    marginLeft: 12
  },
  noticeTitle: {
    color: authColors.tealDark,
    fontSize: 13,
    fontWeight: "800"
  },
  noticeBody: {
    marginTop: 3,
    color: authColors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  startButton: {
    width: "100%",
    marginTop: 26,
    marginBottom: 24
  }
});
