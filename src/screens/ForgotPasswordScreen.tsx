// US-A6 — reference: screens/user/screen-forgot-password.png
// POST /auth/password/forgot { email } -> always advance to resetOtp regardless of response;
// never reveal whether the email is registered.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { FormField, SimpleHeader } from "./AuthFormKit";
import { Button } from "../components/Button";
import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "forgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const api = useApi();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
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

        <Button label="Send code" onPress={onSubmit} disabled={!canSubmit} loading={submitting} style={styles.submitButton} />

        <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.navigate("signin")}>
          <Text style={styles.linkCentered}>Remembered it? Log in</Text>
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
  iconCircle: {
    width: 88,
    height: 88,
    marginTop: spacing.s20,
    borderRadius: 44, // exactly half of width/height (circle) — do not snap to radii scale
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tealTint
  },
  lockShackle: {
    position: "absolute",
    top: 24,
    width: 22,
    height: 18,
    borderWidth: 4,
    borderColor: colors.teal,
    borderBottomWidth: 0,
    borderTopLeftRadius: 11, // exactly half of width (arc/shackle shape) — do not snap to radii scale
    borderTopRightRadius: 11 // exactly half of width (arc/shackle shape) — do not snap to radii scale
  },
  lockBody: {
    position: "absolute",
    top: 38,
    width: 34,
    height: 26,
    borderRadius: radii.r4,
    backgroundColor: colors.teal
  },
  title: {
    marginTop: spacing.s20,
    color: colors.ink,
    ...typography.heading800_24,
    textAlign: "center"
  },
  caption: {
    marginTop: spacing.s8,
    color: colors.muted,
    ...typography.body14,
    lineHeight: 20,
    textAlign: "center"
  },
  helper: {
    marginTop: spacing.s8,
    alignSelf: "flex-start",
    color: colors.muted,
    ...typography.body12
  },
  submitButton: {
    alignSelf: "stretch",
    marginTop: spacing.s24
  },
  linkCentered: {
    marginTop: spacing.s20,
    color: colors.teal,
    ...typography.label800_13,
    textAlign: "center"
  }
});
