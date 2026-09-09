// US-A6 — reference: screens/user/screen-forgot-password.png
// POST /auth/password/forgot { email } -> always advance to resetOtp regardless of response;
// never reveal whether the email is registered.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { FormField, PrimaryButton, SimpleHeader, authColors } from "./AuthFormKit";
import { TAP_SLOP } from "../touch";

type Props = NativeStackScreenProps<RootStackParamList, "forgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const api = useApi();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);

  /**
   * Design-system rule: NEVER disable a submit button because of validation. A greyed
   * button gives a person nothing to press and no explanation; an enabled one answers the
   * question the moment they press it, and is the affordance a screen reader can reach.
   * `submitting` still blocks — a request in flight is not a validation error, and
   * PrimaryButton derives `isDisabled` from `loading` on its own.
   */
  async function onSubmit() {
    if (submitting) return;
    if (email.trim().length === 0) {
      setEmailError("Enter your email.");
      return;
    }
    setEmailError(undefined);
    setSubmitting(true);
    try {
      await api.post("/auth/password/forgot", { email: email.trim() });
    } finally {
      setSubmitting(false);
      // Generic on purpose: advance the same way whether or not the email exists.
      navigation.navigate("resetOtp", { email: email.trim() });
    }
  }

  return (
    <View style={styles.screen}>
      <SimpleHeader title="Forgot password" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <View style={styles.lockShackle} />
          <View style={styles.lockBody} />
        </View>

        <Text style={styles.title}>Forgot your password?</Text>
        <Text style={styles.caption}>No worries — we'll email you a code to reset it.</Text>

        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Text style={styles.helper}>Use the email you signed up with.</Text>

        <PrimaryButton label="Send code" onPress={onSubmit} loading={submitting} style={styles.submitButton} />

        <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={() => navigation.navigate("signin")}>
          <Text style={styles.linkCentered}>Remembered it? Log in</Text>
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
  iconCircle: {
    width: 88,
    height: 88,
    marginTop: 20,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: authColors.paleTeal
  },
  lockShackle: {
    position: "absolute",
    top: 24,
    width: 22,
    height: 18,
    borderWidth: 4,
    borderColor: authColors.teal,
    borderBottomWidth: 0,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11
  },
  lockBody: {
    position: "absolute",
    top: 38,
    width: 34,
    height: 26,
    borderRadius: 6,
    backgroundColor: authColors.teal
  },
  title: {
    marginTop: 20,
    color: authColors.ink,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center"
  },
  caption: {
    marginTop: 10,
    color: authColors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  helper: {
    marginTop: 10,
    alignSelf: "flex-start",
    color: authColors.muted,
    fontSize: 12
  },
  submitButton: {
    alignSelf: "stretch",
    marginTop: 26
  },
  linkCentered: {
    marginTop: 22,
    color: "#08716D",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  }
});
