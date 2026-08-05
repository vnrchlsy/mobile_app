// US-A4 step 3 — reference: screens/user/screen-member-verify-submitted.png.
// Terminal success screen for the submission flow. "Back to home" resets the stack (not goBack/
// navigate) so HomeScreen remounts and its useFocusEffect refetches /me — that's what flips on
// the amber "Verified Member · Under review" banner built in M4.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ClockIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "memberSubmitted">;

export function MemberSubmittedScreen({ navigation }: Props) {
  function backToHome() {
    navigation.reset({ index: 0, routes: [{ name: "home" }] });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <View style={styles.checkMarkStem} />
          <View style={styles.checkMarkKick} />
        </View>

        <Text style={styles.heading}>Request submitted</Text>
        <Text style={styles.subheading}>We've got your ID and social link.</Text>

        <View style={styles.noticeBar}>
          <View style={styles.noticeIcon}>
            <ClockIcon color={colors.teal} size={26} />
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>This takes a few days</Text>
            <Text style={styles.noticeBody}>A person reviews every request — usually 2-3 business days. We'll notify you.</Text>
          </View>
        </View>

        <Text style={styles.hint}>You can use everything else while you wait.</Text>

        {/* Solid teal fill at height 54 / pill radius 27 — Button's primary variant renders a
            fixed height-50 teal→tealDark gradient (LinearGradient fill isn't resizable via the
            `style` prop, which only merges into the outer wrap). Swapping in Button would change
            both the height and the fill from solid to gradient, so this isn't a genuine shape
            match (Migration Protocol step 6) — kept as a plain TouchableOpacity. */}
        <TouchableOpacity activeOpacity={0.85} style={styles.doneButton} onPress={backToHome}>
          <Text style={styles.doneText}>Back to home</Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: spacing.s96,
    alignItems: "center"
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48, // circle/pill: borderRadius ≈ half of width/height — not snapped to radii scale (Migration Protocol step 3)
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.successTint
  },
  checkMarkStem: {
    position: "absolute",
    width: 5,
    height: 20,
    borderRadius: 3, // circle/pill: borderRadius ≈ half of width/height — not snapped to radii scale (Migration Protocol step 3)
    backgroundColor: colors.success,
    transform: [{ rotate: "45deg" }, { translateX: 8 }, { translateY: -2 }]
  },
  checkMarkKick: {
    position: "absolute",
    width: 5,
    height: 34,
    borderRadius: 3, // circle/pill: borderRadius ≈ half of width/height — not snapped to radii scale (Migration Protocol step 3)
    backgroundColor: colors.success,
    transform: [{ rotate: "-45deg" }, { translateX: -2 }, { translateY: -8 }]
  },
  heading: {
    marginTop: spacing.s20,
    color: colors.inkStrong,
    ...typography.heading800_26
  },
  subheading: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.body14
  },
  noticeBar: {
    width: "100%",
    marginTop: spacing.s32,
    borderRadius: radii.r16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s16,
    gap: spacing.s12,
    backgroundColor: colors.tealTint
  },
  noticeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22, // circle/pill: borderRadius ≈ half of width/height — not snapped to radii scale (Migration Protocol step 3)
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  noticeCopy: {
    flex: 1
  },
  noticeTitle: {
    color: colors.tealDark,
    ...typography.label800_14
  },
  noticeBody: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.body12,
    lineHeight: 17
  },
  hint: {
    marginTop: spacing.s20,
    color: colors.neutralMuted,
    ...typography.body12,
    textAlign: "center"
  },
  doneButton: {
    width: "100%",
    height: 54,
    marginTop: spacing.s24,
    borderRadius: 27, // circle/pill: borderRadius ≈ half of width/height — not snapped to radii scale (Migration Protocol step 3)
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  doneText: {
    color: colors.white,
    ...typography.label800_16
  }
});
