// US-A1 step 2 — reference: screens/user/screen-signup.png
// POST /auth/signup { account_type, display_name, email, password } -> 201 { account_id, email, next }
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { TERMS_VERSION } from "../consent";
import { passwordError } from "../passwordRules";
import { RootStackParamList } from "../navigation/types";
import { AuthHeader, FormField, PrimaryButton, SHELTER_STEP_COUNT, authColors } from "./AuthFormKit";
import { TAP_SLOP } from "../touch";

type Props = NativeStackScreenProps<RootStackParamList, "signup">;

export function SignupScreen({ navigation, route }: Props) {
  const api = useApi();
  const { accountType, tier } = route.params;
  const isShelter = accountType === "shelter";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordFieldError, setPasswordFieldError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const [nameError, setNameError] = useState<string | undefined>(undefined);

  /**
   * Design-system rule: NEVER disable a submit button because of validation. A greyed
   * button gives a person nothing to press and no explanation; an enabled one answers the
   * question the moment they press it, and is the affordance a screen reader can reach.
   * `submitting` still blocks — a request in flight is not a validation error, and
   * PrimaryButton derives `isDisabled` from `loading` on its own.
   */
  async function onSubmit() {
    if (submitting) return;
    setFormError(undefined);
    // ⚠️ The comment here used to claim "the button stays enabled per the app's interaction
    // rule" while the button carried `disabled={!canSubmit}`. The claim is now true.
    const missingName = name.trim().length === 0 ? "Enter your name." : undefined;
    const missingEmail = email.trim().length === 0 ? "Enter your email." : undefined;
    setNameError(missingName);
    setEmailError(missingEmail);
    if (password.length === 0) {
      setPasswordFieldError("Enter a password.");
      return;
    }
    if (missingName || missingEmail) return;
    // Client-side strength check (server enforces the same rule as a backstop).
    const pwError = passwordError(password);
    setPasswordFieldError(pwError);
    if (pwError) return;
    setSubmitting(true);
    try {
      const res = await api.post("/auth/signup", {
        account_type: accountType,
        display_name: name.trim(),
        email: email.trim(),
        password,
        // RA 10173: record the terms version actually shown below, so the consent is
        // demonstrable rather than merely rendered (US-A1).
        consent_version: TERMS_VERSION
      });
      if (res.status === 409) {
        setEmailError("That email is already registered.");
        return;
      }
      if (res.ok) {
        navigation.navigate("otp", { email: email.trim(), mode: "signup", tier });
        return;
      }
      setFormError(res.data?.error?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen} testID="screen.signup">
      <AuthHeader
        title="Create account"
        activeStep={1}
        stepCount={isShelter ? SHELTER_STEP_COUNT : undefined}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
        <Text style={styles.title}>Let's get you set up</Text>
        <Text style={styles.caption}>{isShelter ? "Use your organisation's email." : "A few details and you're in."}</Text>

        <FormField
          testID="field.signup.name"
          label={isShelter ? "Organization name" : "Full name"}
          value={name}
          error={nameError}
          onChangeText={(value) => {
            setName(value);
            if (nameError) setNameError(undefined);
          }}
          autoCapitalize="words"
          autoComplete={isShelter ? undefined : "name"}
        />
        <FormField
          testID="field.signup.email"
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (emailError) setEmailError(undefined);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          error={emailError}
        />
        <FormField
          testID="field.signup.password"
          label="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (passwordFieldError) setPasswordFieldError(undefined);
          }}
          secure={!passwordVisible}
          onToggleSecure={() => setPasswordVisible((visible) => !visible)}
          autoComplete="password-new"
          error={passwordFieldError}
        />

        <Text style={styles.helper}>At least 8 characters, including a number. We'll email a 6-digit code to verify it.</Text>

        {!!formError && <Text style={styles.formError}>{formError}</Text>}

        <PrimaryButton testID="btn.signup.submit" label="Send code" onPress={onSubmit} loading={submitting} style={styles.submitButton} />

        <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={() => navigation.navigate("signin")}>
          <Text style={styles.linkCentered}>Already have an account? Log in</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>By creating an account you agree to our Terms & Privacy Policy.</Text>
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
  helper: {
    marginTop: 16,
    color: authColors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  formError: {
    marginTop: 14,
    color: authColors.danger,
    fontSize: 13,
    fontWeight: "700"
  },
  submitButton: {
    marginTop: 26
  },
  linkCentered: {
    marginTop: 20,
    color: "#08716D",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  terms: {
    marginTop: 18,
    color: "#9A988F",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center"
  }
});
