// US-A6 — reference: screens/user/screen-reset-password.png
// POST /auth/password/reset { email, code, new_password } -> 400 invalid code | 410 expired code | 200 ok
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { FormField, SimpleHeader } from "./AuthFormKit";
import { Button } from "../components/Button";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

const MIN_LENGTH = 8;
const HAS_NUMBER_OR_SYMBOL = /[0-9!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~]/;

type Props = NativeStackScreenProps<RootStackParamList, "resetPassword">;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const api = useApi();
  const { email, code } = route.params;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const hasLength = password.length >= MIN_LENGTH;
  const hasNumberOrSymbol = HAS_NUMBER_OR_SYMBOL.test(password);
  const meetsRules = hasLength && hasNumberOrSymbol;
  const canSubmit = meetsRules && confirm.length > 0 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      const res = await api.post("/auth/password/reset", { email, code, new_password: password });
      if (res.status === 400) {
        setError("That code is invalid.");
        return;
      }
      if (res.status === 410) {
        setError("That code expired.");
        return;
      }
      if (res.ok) {
        navigation.navigate("passwordChanged");
        return;
      }
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SimpleHeader title="Reset password" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.title}>Create a new password</Text>
        <Text style={styles.caption}>Make it something you'll remember.</Text>

        <FormField
          label="New password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (error) setError(undefined);
          }}
          secure={!passwordVisible}
          onToggleSecure={() => setPasswordVisible((visible) => !visible)}
          autoComplete="password-new"
        />
        <FormField
          label="Confirm new password"
          value={confirm}
          onChangeText={(value) => {
            setConfirm(value);
            if (error) setError(undefined);
          }}
          secure={!confirmVisible}
          onToggleSecure={() => setConfirmVisible((visible) => !visible)}
          autoComplete="password-new"
        />

        <View style={styles.rulesGroup}>
          <RuleRow met={hasLength} label="At least 8 characters" />
          <RuleRow met={hasNumberOrSymbol} label="One number or symbol" />
        </View>

        {!!error && <Text style={styles.formError}>{error}</Text>}

        <Button
          label="Save new password"
          onPress={onSubmit}
          disabled={!canSubmit}
          loading={submitting}
          style={styles.submitButton}
        />

        <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.navigate("signin")}>
          <Text style={styles.linkCentered}>Back to log in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RuleRow({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={[styles.ruleDot, met && styles.ruleDotMet]}>
        {met && <View style={styles.ruleCheck} />}
      </View>
      <Text style={[styles.ruleText, met && styles.ruleTextMet]}>{label}</Text>
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
  rulesGroup: {
    marginTop: spacing.s16
  },
  ruleRow: {
    marginTop: spacing.s8,
    flexDirection: "row",
    alignItems: "center"
  },
  ruleDot: {
    width: 20,
    height: 20,
    marginRight: spacing.s8,
    borderRadius: 10, // exactly half of width/height (circle) — do not snap to radii scale
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  ruleDotMet: {
    borderColor: colors.successAccent,
    backgroundColor: colors.successTint
  },
  ruleCheck: {
    width: 6,
    height: 10,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.success,
    transform: [{ rotate: "45deg" }, { translateY: -1 }]
  },
  ruleText: {
    color: colors.muted,
    ...typography.body13
  },
  ruleTextMet: {
    color: colors.ink,
    fontWeight: "700"
  },
  formError: {
    marginTop: spacing.s12,
    color: colors.danger,
    ...typography.label700_13
  },
  submitButton: {
    marginTop: spacing.s24
  },
  linkCentered: {
    marginTop: spacing.s20,
    color: colors.teal,
    ...typography.label800_13,
    textAlign: "center"
  }
});
