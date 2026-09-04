// US-A6 — reference: screens/user/screen-password-changed.png
// Terminal success screen for the recovery chain. No API call — /auth/password/reset already
// completed the change (and, per the backend, invalidated other sessions) one screen back.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { RootStackParamList } from "../navigation/types";
import { PrimaryButton, SimpleHeader, authColors } from "./AuthFormKit";
import { TAP_SLOP } from "../touch";

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

        <View style={styles.noticeBar}>
          <View style={styles.noticeIcon}>
            <View style={styles.lockShackle} />
            <View style={styles.lockBody} />
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Signed out everywhere else</Text>
            <Text style={styles.noticeBody}>For your security, other devices were logged out.</Text>
          </View>
        </View>

        <PrimaryButton label="Log in" onPress={onDone} style={styles.doneButton} />

        <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={() => navigation.navigate("support")}>
          <Text style={styles.linkCentered}>Need help? Contact support</Text>
        </TouchableOpacity>
      </View>
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
    marginTop: 60,
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
  noticeBar: {
    width: "100%",
    marginTop: 34,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1
  },
  noticeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: authColors.paleTeal
  },
  lockShackle: {
    position: "absolute",
    top: 10,
    width: 14,
    height: 11,
    borderWidth: 2.5,
    borderColor: authColors.teal,
    borderBottomWidth: 0,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7
  },
  lockBody: {
    position: "absolute",
    top: 18,
    width: 20,
    height: 16,
    borderRadius: 4,
    backgroundColor: authColors.teal
  },
  noticeCopy: {
    flex: 1,
    marginLeft: 14
  },
  noticeTitle: {
    color: authColors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  noticeBody: {
    marginTop: 3,
    color: authColors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  doneButton: {
    width: "100%",
    marginTop: 30
  },
  linkCentered: {
    marginTop: 22,
    color: "#08716D",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  }
});
