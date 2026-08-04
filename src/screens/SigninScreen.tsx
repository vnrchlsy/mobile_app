// US-A5 — reference: screens/user/screen-signin.png
// POST /auth/login { email, password } -> 401 invalid | 403 unverified | 200 { access, refresh }
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { FormField, SimpleHeader } from "./AuthFormKit";
import { Button } from "../components/Button";
import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

const paw = require("../../assets/paw-white.png") as ImageSourcePropType;

type Props = NativeStackScreenProps<RootStackParamList, "signin">;

export function SigninScreen({ navigation }: Props) {
  const api = useApi();
  const { setTokens } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    setError(undefined);
    setSubmitting(true);
    try {
      const res = await api.post("/auth/login", { email: email.trim(), password });
      if (res.status === 401) {
        // Deliberately generic — never confirm whether the email itself is registered.
        setError("Email or password is incorrect.");
        return;
      }
      if (res.status === 403) {
        navigation.navigate("otp", { email: email.trim(), mode: "unverified" });
        return;
      }
      if (res.ok) {
        await setTokens({ access: res.data.access, refresh: res.data.refresh });
        // Single-stack nav doesn't auto-switch on token change — explicitly land on home.
        navigation.reset({ index: 0, routes: [{ name: "home" }] });
        return;
      }
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SimpleHeader onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <View style={styles.logoMark}>
          <LinearGradient colors={[colors.teal, colors.tealDark]} style={styles.logoGradient}>
            <Image source={paw} resizeMode="contain" style={styles.logoIcon} />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.caption}>Log in to keep helping.</Text>

        <FormField
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (error) setError(undefined);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <FormField
          label="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (error) setError(undefined);
          }}
          secure={!passwordVisible}
          onToggleSecure={() => setPasswordVisible((visible) => !visible)}
          autoComplete="password"
        />

        {!!error && <Text style={styles.formError}>{error}</Text>}

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.navigate("forgotPassword")}
          style={styles.forgotWrap}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <Button label="Log in" onPress={onSubmit} disabled={!canSubmit} loading={submitting} style={styles.submitButton} />

        <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.navigate("accountType")}>
          <Text style={styles.linkCentered}>New to Kupkop? Create account</Text>
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
  logoMark: {
    marginTop: spacing.s8
  },
  logoGradient: {
    width: 84,
    height: 84,
    borderRadius: radii.r24,
    alignItems: "center",
    justifyContent: "center"
  },
  logoIcon: {
    width: 42,
    height: 42
  },
  title: {
    marginTop: spacing.s20,
    color: colors.ink,
    ...typography.heading800_26
  },
  caption: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.body14
  },
  formError: {
    alignSelf: "stretch",
    marginTop: spacing.s12,
    color: colors.danger,
    ...typography.label700_13
  },
  forgotWrap: {
    alignSelf: "flex-end",
    marginTop: spacing.s12
  },
  forgotText: {
    color: colors.teal,
    ...typography.label800_13
  },
  submitButton: {
    alignSelf: "stretch",
    marginTop: spacing.s20
  },
  linkCentered: {
    marginTop: spacing.s20,
    color: colors.teal,
    ...typography.label800_13,
    textAlign: "center"
  }
});
