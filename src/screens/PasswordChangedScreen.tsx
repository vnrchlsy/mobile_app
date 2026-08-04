// US-A6 — reference: screens/user/screen-password-changed.png
// Terminal success screen for the recovery chain. No API call — /auth/password/reset already
// completed the change (and, per the backend, invalidated other sessions) one screen back.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { RootStackParamList } from "../navigation/types";
import { SimpleHeader } from "./AuthFormKit";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "passwordChanged">;

export function PasswordChangedScreen({ navigation }: Props) {
  function onDone() {
    navigation.reset({ index: 0, routes: [{ name: "signin" }] });
  }

  return (
    <View style={styles.screen}>
      <SimpleHeader />

      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <View style={styles.checkMarkStem} />
          <View style={styles.checkMarkKick} />
        </View>

        <Text style={styles.heading}>Password changed</Text>
        <Text style={styles.subheading}>Log in with your new password.</Text>

        <Card style={styles.noticeBar}>
          <View style={styles.noticeIcon}>
            <View style={styles.lockShackle} />
            <View style={styles.lockBody} />
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Signed out everywhere else</Text>
            <Text style={styles.noticeBody}>For your security, other devices were logged out.</Text>
          </View>
        </Card>

        <Button label="Log in" onPress={onDone} style={styles.doneButton} />

        <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.navigate("support")}>
          <Text style={styles.linkCentered}>Need help? Contact support</Text>
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
    alignItems: "center"
  },
  checkCircle: {
    width: 96,
    height: 96,
    marginTop: spacing.s56,
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
  noticeBar: {
    // Card (Task 8) already matches this block's backgroundColor/borderRadius/padding/
    // shadowColor/shadowOpacity/elevation exactly — only layout, width, marginTop and the
    // slightly larger shadowRadius/shadowOffset need overriding here.
    width: "100%",
    marginTop: spacing.s32,
    flexDirection: "row",
    alignItems: "center",
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }
  },
  noticeIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.r12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tealTint
  },
  lockShackle: {
    position: "absolute",
    top: 10,
    width: 14,
    height: 11,
    borderWidth: 2.5,
    borderColor: colors.teal,
    borderBottomWidth: 0,
    borderTopLeftRadius: 7, // exactly half of width (arc/shackle shape) — do not snap to radii scale
    borderTopRightRadius: 7 // exactly half of width (arc/shackle shape) — do not snap to radii scale
  },
  lockBody: {
    position: "absolute",
    top: 18,
    width: 20,
    height: 16,
    borderRadius: radii.r4,
    backgroundColor: colors.teal
  },
  noticeCopy: {
    flex: 1,
    marginLeft: spacing.s12
  },
  noticeTitle: {
    color: colors.ink,
    ...typography.label800_14
  },
  noticeBody: {
    marginTop: spacing.s2,
    color: colors.muted,
    ...typography.body12,
    lineHeight: 17
  },
  doneButton: {
    width: "100%",
    marginTop: spacing.s28
  },
  linkCentered: {
    marginTop: spacing.s20,
    color: colors.teal,
    ...typography.label800_13,
    textAlign: "center"
  }
});
