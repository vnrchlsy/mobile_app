// US-A6 — reference: screens/user/screen-reset-otp.png
// Collects the 6-digit reset code only — no API call here. The code isn't checked until
// ResetPasswordScreen submits it alongside the new password to POST /auth/password/reset;
// checking it early here would need its own endpoint, which doesn't exist. "Resend" re-triggers
// POST /auth/password/forgot (the same call that sends the first code) rather than a dedicated
// resend endpoint — there isn't one for password reset.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  TouchableOpacity,
  View
} from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { SimpleHeader } from "./AuthFormKit";
import { Button } from "../components/Button";
import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

type Props = NativeStackScreenProps<RootStackParamList, "resetOtp">;

export function ResetOtpScreen({ navigation, route }: Props) {
  const api = useApi();
  const { email } = route.params;

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | undefined>(undefined);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const advancedRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const code = digits.join("");

  function updateDigit(text: string, index: number) {
    const nextDigit = text.replace(/\D/g, "").slice(-1);
    setDigits((current) => {
      const next = [...current];
      next[index] = nextDigit;
      return next;
    });
    if (nextDigit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function onKeyPress(event: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) {
    if (event.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function onContinue() {
    if (code.length !== CODE_LENGTH || advancedRef.current) return;
    advancedRef.current = true;
    navigation.navigate("resetPassword", { email, code });
  }

  useEffect(() => {
    if (code.length === CODE_LENGTH) onContinue();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires only when the 6th digit lands
  }, [code]);

  async function onResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setResendNotice(undefined);
    try {
      await api.post("/auth/password/forgot", { email });
      setResendNotice("We sent a new code.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setDigits(Array(CODE_LENGTH).fill(""));
      advancedRef.current = false;
      inputRefs.current[0]?.focus();
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SimpleHeader title="Reset password" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.caption}>We emailed a 6-digit code to</Text>
        <Text style={styles.emailText}>{email}</Text>

        <View style={styles.otpRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(input) => {
                inputRefs.current[index] = input;
              }}
              value={digit}
              onChangeText={(text) => updateDigit(text, index)}
              onKeyPress={(event) => onKeyPress(event, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              style={styles.otpBox}
              textAlign="center"
            />
          ))}
        </View>

        <Text style={styles.resendHint}>Didn't get a code?</Text>
        <TouchableOpacity activeOpacity={0.75} onPress={onResend} disabled={cooldown > 0 || resending}>
          <Text style={[styles.resendAction, cooldown > 0 && styles.resendMuted]}>
            {cooldown > 0 ? `Resend in 0:${cooldown.toString().padStart(2, "0")}` : "Resend code"}
          </Text>
        </TouchableOpacity>
        {!!resendNotice && <Text style={styles.resendNotice}>{resendNotice}</Text>}

        <Button label="Verify" onPress={onContinue} disabled={code.length !== CODE_LENGTH} style={styles.verifyButton} />

        <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.goBack()}>
          <Text style={styles.changeEmail}>Wrong email? Change it</Text>
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
    padding: 0,
    backgroundColor: colors.white,
    color: colors.ink,
    ...typography.heading800_22
  },
  resendHint: {
    marginTop: spacing.s24,
    color: colors.muted,
    ...typography.body12,
    textAlign: "center"
  },
  resendAction: {
    marginTop: spacing.s4,
    color: colors.teal,
    ...typography.label800_13,
    textAlign: "center"
  },
  resendMuted: {
    color: colors.neutralMuted
  },
  resendNotice: {
    marginTop: spacing.s4,
    color: colors.teal,
    ...typography.label700_12,
    textAlign: "center"
  },
  verifyButton: {
    marginTop: spacing.s28
  },
  changeEmail: {
    marginTop: spacing.s20,
    color: colors.teal,
    ...typography.label800_13,
    textAlign: "center"
  }
});
