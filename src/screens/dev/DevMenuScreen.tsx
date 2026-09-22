// Dev-only shortcut — reachable ONLY when Constants.expoConfig.extra.profile === "development"
// (see RootNavigator.tsx, which registers the "dev" route behind that same check, and
// WelcomeScreen.tsx, whose triple-tap-the-logo gesture is how a real device reaches this
// screen without a debug menu).
//
// WHY THIS EXISTS. The sim's Bridgeless dev-client routes any `text` input meant for a field
// into the RN dev menu instead, so a device run cannot type a password or an OTP code — every
// auth-gated test row was stuck. This screen mints a fresh access/refresh pair for a known e2e
// fixture account via `POST /auth/dev/seed_tokens` (team-kupkopph/backend#38), a tap-only path
// around the typing problem. The backend endpoint 404s identically to an unknown URL whenever
// DEBUG is off, so this can only ever do anything against a dev backend.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useApi } from "../../api/useApi";
import { useAuth } from "../../auth/AuthContext";
import { Button, Field, ScreenHeader, SegmentedControl } from "../../components/ui";
import { RootStackParamList } from "../../navigation/types";
import { colors, radii, spacing, typography } from "../../theme";

/** The two seeded e2e fixture accounts — owner first, since most deferred rows are on the
 * owner journey. */
const FIXTURE_EMAILS = ["e2e.owner@kupkop.invalid", "e2e.shelter@kupkop.invalid"];
const FIXTURE_LABELS = ["Owner", "Shelter"];

type Props = NativeStackScreenProps<RootStackParamList, "dev">;

export function DevMenuScreen({ navigation }: Props) {
  const api = useApi();
  const { setTokens } = useAuth();

  const [fixtureIndex, setFixtureIndex] = useState(0);
  const [customEmail, setCustomEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  async function onSeed() {
    if (submitting) return;
    // A custom address always wins over the picker — typing one is an explicit override.
    const email = customEmail.trim() || FIXTURE_EMAILS[fixtureIndex];
    setError(undefined);
    setSubmitting(true);
    try {
      const res = await api.post("/auth/dev/seed_tokens", { email });
      if (res.ok) {
        await setTokens({ access: res.data.access, refresh: res.data.refresh });
        // Single-stack nav doesn't auto-switch on token change — explicitly land on home,
        // same as SigninScreen/OtpScreen do after a real login.
        navigation.reset({ index: 0, routes: [{ name: "home", params: { justSignedUp: true } }] });
        return;
      }
      if (res.status === 0) {
        setError("Couldn't reach the server. Check your connection and try again.");
        return;
      }
      setError(res.data?.detail ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen} testID="screen.dev">
      <ScreenHeader title="Dev seed tokens" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.subtitle}>Dev-only shortcut for sim device runs.</Text>

        <SegmentedControl
          testID="seg.dev.fixture"
          segments={FIXTURE_LABELS}
          index={fixtureIndex}
          onChange={(i) => {
            setFixtureIndex(i);
            if (error) setError(undefined);
          }}
          style={styles.segmented}
        />
        <Text style={styles.fixtureEmail}>{FIXTURE_EMAILS[fixtureIndex]}</Text>

        <Field
          testID="field.dev.customEmail"
          label="Custom email"
          value={customEmail}
          onChangeText={(value) => {
            setCustomEmail(value);
            if (error) setError(undefined);
          }}
          placeholder="Leave blank to use the fixture above"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="go"
          onSubmitEditing={onSeed}
        />

        <Button
          testID="btn.dev.seed"
          label="Seed tokens"
          onPress={onSeed}
          loading={submitting}
          style={styles.submitButton}
        />

        {!!error && <Text style={styles.formError}>{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  subtitle: {
    color: colors.muted,
    ...typography.body,
    marginBottom: spacing.lg
  },
  segmented: { marginTop: spacing.sm },
  fixtureEmail: {
    marginTop: 10,
    color: colors.muted,
    ...typography.meta,
    textAlign: "center"
  },
  submitButton: { alignSelf: "stretch", marginTop: spacing.lg },
  formError: {
    alignSelf: "stretch",
    marginTop: 12,
    backgroundColor: colors.dangerBg,
    borderRadius: radii.chip,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
    color: colors.danger,
    ...typography.meta,
    fontWeight: "700"
  }
});
