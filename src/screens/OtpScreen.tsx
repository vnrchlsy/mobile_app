// US-A1 step 3 / US-A5 unverified-resume — reference: screens/user/screen-otp.png,
// screens/user/screen-otp-unverified.png
// POST /auth/email/verify { email, code } -> 400 attempts_left | 410 expired | 423 locked | 200 { access, refresh }
// POST /auth/email/resend { email } -> 202
// mode: "signup" (post-signup verify, -> signupSuccess) | "unverified" (signin hit 403 because the
// account was never verified; amber banner explains why, success resets straight to home instead
// of the "You're in!" recap since this is a returning user, not someone finishing first signup).
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
import { useAuth } from "../auth/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { AuthHeader, PrimaryButton, SHELTER_STEP_COUNT, authColors } from "./AuthFormKit";
import { TAP_SLOP } from "../touch";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

type Props = NativeStackScreenProps<RootStackParamList, "otp">;

export function OtpScreen({ navigation, route }: Props) {
  const api = useApi();
  const { setTokens } = useAuth();
  const { email, mode, tier } = route.params;
  const isUnverifiedResume = mode === "unverified";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | undefined>(undefined);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const submittedRef = useRef(false);

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
    if (error) setError(undefined);

    if (nextDigit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function onKeyPress(event: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) {
    if (event.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  useEffect(() => {
    if (code.length === CODE_LENGTH && !submittedRef.current) {
      onVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires only when the 6th digit lands
  }, [code]);

  async function onVerify() {
    if (code.length !== CODE_LENGTH || submitting) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await api.post("/auth/email/verify", { email, code });
      if (res.status === 400) {
        const attemptsLeft = res.data?.error?.details?.attempts_left;
        setError(`Incorrect code. ${attemptsLeft} tries left.`);
        setDigits(Array(CODE_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
        return;
      }
      if (res.status === 410) {
        setError("That code expired. Request a new one.");
        return;
      }
      if (res.status === 423) {
        navigation.replace("otpLocked", { email });
        return;
      }
      if (res.ok) {
        await setTokens({ access: res.data.access, refresh: res.data.refresh });
        if (isUnverifiedResume) {
          // Resuming a signin, not finishing a fresh signup — land straight on home rather than
          // the "You're in!" recap. Single-stack nav doesn't auto-switch on token change.
          navigation.reset({ index: 0, routes: [{ name: "home" }] });
        } else if (tier) {
          // Shelter signup continues into org setup (US-B2), not the owner "You're in!" recap.
          navigation.navigate("shelterSetup", { tier });
        } else {
          navigation.navigate("signupSuccess");
        }
        return;
      }
      setError("Something went wrong. Please try again.");
    } finally {
      submittedRef.current = false;
      setSubmitting(false);
    }
  }

  async function onResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setResendNotice(undefined);
    try {
      await api.post("/auth/email/resend", { email });
      setResendNotice("We sent a new code.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.screen} testID="screen.otp">
      <AuthHeader
        title="Verify your email"
        activeStep={2}
        stepCount={tier ? SHELTER_STEP_COUNT : undefined}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
        {isUnverifiedResume && (
          <View style={styles.unverifiedBanner}>
            <Text style={styles.unverifiedIcon}>!</Text>
            <View style={styles.unverifiedCopy}>
              <Text style={styles.unverifiedTitle}>Your email isn't verified yet</Text>
              <Text style={styles.unverifiedBody}>Confirm your email to finish signing in.</Text>
            </View>
          </View>
        )}

        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.caption}>We emailed a 6-digit code to</Text>
        <Text style={styles.emailText}>{email}</Text>

        <View style={styles.otpRow}>
          {digits.map((digit, index) => (
            <TextInput
              // Per-box, because the code is six separate one-character inputs — a flow has
              // to place each digit, and there is no single field to type into.
              testID={`field.otp.${index}`}
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
              style={[styles.otpBox, !!error && styles.otpBoxError]}
              textAlign="center"
            />
          ))}
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.resendHint}>Didn't get a code?</Text>
        <TouchableOpacity activeOpacity={0.75} onPress={onResend} disabled={cooldown > 0 || resending}>
          <Text style={[styles.resendAction, cooldown > 0 && styles.resendMuted]}>
            {cooldown > 0 ? `Resend in 0:${cooldown.toString().padStart(2, "0")}` : "Resend code"}
          </Text>
        </TouchableOpacity>
        {!!resendNotice && <Text style={styles.resendNotice}>{resendNotice}</Text>}

        <PrimaryButton testID="btn.otp.verify" label="Verify" onPress={onVerify} disabled={code.length !== CODE_LENGTH} loading={submitting} style={styles.verifyButton} />

        <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={() => navigation.goBack()}>
          <Text style={styles.changeEmail}>Wrong email? Change it</Text>
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
    paddingHorizontal: 28
  },
  unverifiedBanner: {
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FBE9CF"
  },
  unverifiedIcon: {
    width: 22,
    height: 22,
    marginRight: 12,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#7A5310",
    color: "#7A5310",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 19
  },
  unverifiedCopy: {
    flex: 1
  },
  unverifiedTitle: {
    color: "#7A5310",
    fontSize: 14,
    fontWeight: "800"
  },
  unverifiedBody: {
    marginTop: 3,
    color: "#7A5310",
    fontSize: 12,
    lineHeight: 17
  },
  title: {
    color: authColors.ink,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30
  },
  caption: {
    marginTop: 5,
    color: authColors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  emailText: {
    marginTop: 3,
    color: authColors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  otpRow: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  otpBox: {
    width: 46,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 12,
    padding: 0,
    backgroundColor: "#FFFFFF",
    color: authColors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  otpBoxError: {
    borderColor: authColors.danger
  },
  errorText: {
    marginTop: 14,
    color: authColors.danger,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center"
  },
  resendHint: {
    marginTop: 26,
    color: authColors.muted,
    fontSize: 12,
    textAlign: "center"
  },
  resendAction: {
    marginTop: 6,
    color: "#08716D",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  resendMuted: {
    color: "#B6B0A7"
  },
  resendNotice: {
    marginTop: 6,
    color: authColors.teal,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  verifyButton: {
    marginTop: 30
  },
  changeEmail: {
    marginTop: 22,
    color: "#08716D",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  }
});
