// US-A6 — reference: screens/user/screen-reset-password.png
// POST /auth/password/reset { email, code, new_password } -> 400 invalid code | 410 expired code | 200 ok
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { PASSWORD_RULE, passwordError } from "../passwordRules";
import { FormField, PrimaryButton, SimpleHeader, authColors } from "./AuthFormKit";
import { TAP_SLOP } from "../touch";

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

  // Same rule as signup, and the same rule the server now enforces on new_password —
  // previously this screen accepted "number OR symbol", which the server would reject.
  const hasLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const meetsRules = !passwordError(password);
  const [confirmError, setConfirmError] = useState<string | undefined>(undefined);
  /**
   * Design-system rule: NEVER disable a submit button because of validation. A greyed
   * button gives a person nothing to press and no explanation; an enabled one answers the
   * question the moment they press it, and is the affordance a screen reader can reach.
   * `submitting` still blocks — a request in flight is not a validation error, and
   * PrimaryButton derives `isDisabled` from `loading` on its own.
   */
  async function onSubmit() {
    if (submitting) return;
    // The rules are already listed live under the field (RuleRow), so an unmet rule needs
    // no new wording — only a button that can be pressed and will say what is missing.
    if (!meetsRules) {
      setError(PASSWORD_RULE);
      return;
    }
    if (confirm.length === 0) {
      setConfirmError("Re-enter your new password.");
      return;
    }
    if (password !== confirm) {
      setConfirmError("Those passwords don't match.");
      return;
    }
    setConfirmError(undefined);
    setError(undefined);
    setSubmitting(true);
    try {
      const res = await api.post("/auth/password/reset", { email, code, new_password: password });
      if (res.status === 400) {
        setError(res.data?.error?.field === "new_password" ? PASSWORD_RULE : "That code is invalid.");
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
            if (confirmError) setConfirmError(undefined);
          }}
          secure={!confirmVisible}
          onToggleSecure={() => setConfirmVisible((visible) => !visible)}
          autoComplete="password-new"
          error={confirmError}
        />

        <View style={styles.rulesGroup}>
          <RuleRow met={hasLength} label="At least 8 characters" />
          <RuleRow met={hasNumber} label="At least one number" />
        </View>

        {!!error && <Text style={styles.formError}>{error}</Text>}

        <PrimaryButton
          label="Save new password"
          onPress={onSubmit}
          loading={submitting}
          style={styles.submitButton}
        />

        <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={() => navigation.navigate("signin")}>
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
  rulesGroup: {
    marginTop: 16
  },
  ruleRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center"
  },
  ruleDot: {
    width: 20,
    height: 20,
    marginRight: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: authColors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  ruleDotMet: {
    borderColor: "#8FBB6E",
    backgroundColor: "#E3EFD8"
  },
  ruleCheck: {
    width: 6,
    height: 10,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#3F6B26",
    transform: [{ rotate: "45deg" }, { translateY: -1 }]
  },
  ruleText: {
    color: authColors.muted,
    fontSize: 13
  },
  ruleTextMet: {
    color: authColors.ink,
    fontWeight: "700"
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
    marginTop: 22,
    color: "#08716D",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  }
});
