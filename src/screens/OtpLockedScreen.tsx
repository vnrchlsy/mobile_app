// US-A1/A5 — reference: screens/user/screen-otp-locked.png
// Reached via OtpScreen's 423 (code_locked) branch after 5 failed verify attempts. No API call on
// entry — only on "Send a new code" (POST /auth/email/resend), which hands back to OtpScreen for
// a fresh 6-digit code.
// Note: this screen takes only { email } (matches RootStackParamList) — the actual dead digits
// the user typed aren't threaded through, so the 6 boxes below are decorative placeholders, not
// a replay of their input. We always resume in "signup" mode: OtpScreen's unverified-resume path
// re-enters at signin after verifying anyway, so a fresh code from here is equivalent either way.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { SimpleHeader } from "./AuthFormKit";
import { Button } from "../components/Button";
import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

const CODE_LENGTH = 6;

type Props = NativeStackScreenProps<RootStackParamList, "otpLocked">;

export function OtpLockedScreen({ navigation, route }: Props) {
  const api = useApi();
  const { email } = route.params;
  const [sending, setSending] = useState(false);

  async function onSendNewCode() {
    if (sending) return;
    setSending(true);
    try {
      await api.post("/auth/email/resend", { email });
      navigation.replace("otp", { email, mode: "signup" });
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SimpleHeader title="Verify your email" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.caption}>We emailed a 6-digit code to</Text>
        <Text style={styles.emailText}>{email}</Text>

        <View style={styles.otpRow}>
          {Array.from({ length: CODE_LENGTH }).map((_, index) => (
            <View key={index} style={styles.otpBox}>
              <Text style={styles.otpDigit}>•</Text>
            </View>
          ))}
        </View>

        <View style={styles.noticeBar}>
          <Text style={styles.noticeIcon}>!</Text>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Too many tries — this code is dead</Text>
            <Text style={styles.noticeBody}>
              You used all 5 attempts. Nothing is wrong with your account — you just need a fresh code.
            </Text>
          </View>
        </View>

        <Button label="Send a new code" onPress={onSendNewCode} loading={sending} style={styles.sendButton} />

        <Text style={styles.capHint}>You can request 5 codes an hour.</Text>
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
    paddingHorizontal: spacing.s28
  },
  title: {
    color: colors.ink,
    ...typography.heading800_24,
    lineHeight: 30
  },
  caption: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.body14,
    lineHeight: 20
  },
  emailText: {
    marginTop: spacing.s2,
    color: colors.ink,
    ...typography.label800_15
  },
  otpRow: {
    marginTop: spacing.s28,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  otpBox: {
    width: 46,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.r12,
    backgroundColor: colors.neutralTint
  },
  otpDigit: {
    color: colors.neutralMuted,
    ...typography.heading800_22
  },
  noticeBar: {
    marginTop: spacing.s20,
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: radii.r12,
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s12,
    backgroundColor: colors.dangerTint
  },
  noticeIcon: {
    width: 22,
    height: 22,
    marginRight: spacing.s12,
    borderRadius: 11, // exactly half of width/height (circle) — do not snap to radii scale
    borderWidth: 1.5,
    // Darker dangerText variant, not plain danger — matches this screen's #8A3A33 usage below.
    borderColor: colors.dangerText,
    color: colors.dangerText,
    ...typography.label800_13,
    textAlign: "center",
    lineHeight: 19
  },
  noticeCopy: {
    flex: 1
  },
  noticeTitle: {
    color: colors.dangerText,
    ...typography.label800_14
  },
  noticeBody: {
    marginTop: spacing.s4,
    color: colors.dangerText,
    ...typography.body12,
    lineHeight: 17
  },
  sendButton: {
    marginTop: spacing.s24
  },
  capHint: {
    marginTop: spacing.s16,
    color: colors.neutralMuted,
    ...typography.body12,
    textAlign: "center"
  }
});
