// US-H2 · direct-placement review + confirm. recipientEmail rides in from RescuePlaceScreen;
// city/fee are collected right here (same fee-cap framing as RescueListScreen/ListingFormScreen)
// so the whole placement — who, where, how much — is visible in one glance before the
// irreversible POST /cases/{caseId}/place fires.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";


type Props = NativeStackScreenProps<RootStackParamList, "rescuePlaceConfirm">;

export function RescuePlaceConfirmScreen({ navigation, route }: Props) {
  const api = useApi();
  const { city: homeCity } = useAuth();
  const { caseId, recipientEmail } = route.params;

  const [city, setCity] = useState(homeCity ?? "");
  const [fee, setFee] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function confirm() {
    if (submitting) return;
    setSubmitting(true);
    setError(undefined);

    const res = await api.post(`/cases/${caseId}/place`, {
      recipient_email: recipientEmail,
      city: city.trim() || undefined,
      adoption_fee: fee || "0"
    });

    setSubmitting(false);
    if (res.ok) {
      navigation.navigate("rescuePlaceSent");
      return;
    }
    const code = res.data?.error?.code;
    setError(
      code === "recipient_not_verified" ? "That person isn't a verified member or shelter yet."
      : res.status === 404 && code === "recipient_not_found" ? "No account with that email."
      : code === "fee_over_cap" ? `The adoption fee can't exceed ₱${res.data.error.details?.cap ?? 500}.`
      : code === "case_not_safe" ? "This case isn't marked safe yet — update its status first."
      : res.data?.error?.message ?? "Couldn't place this animal. Try again."
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Review placement" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.recipientCard}>
          <Text style={styles.recipientLabel}>Placing with</Text>
          <Text style={styles.recipientEmail}>{recipientEmail}</Text>
        </View>

        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Marikina"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Adoption fee (₱)</Text>
        <TextInput
          style={styles.input}
          value={fee}
          onChangeText={setFee}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.fine}>
          Tier-1 rescues and individual Verified Members are capped at ₱500. Registered NGOs aren't capped.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Confirm placement" onPress={confirm} loading={submitting} style={styles.submit} />
      </ScrollView>
    </View>
  );
}

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  recipientCard: { marginTop: 8, padding: 18, borderRadius: radii.field, backgroundColor: colors.soft },
  recipientLabel: { color: colors.teal, ...typography.meta, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  recipientEmail: { marginTop: 6, color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  label: { marginTop: 20, marginBottom: 10, color: colors.ink, ...typography.strong, fontWeight: "700" },
  input: { height: 52, borderRadius: radii.field, paddingHorizontal: 16, color: colors.ink, ...typography.subtitle, ...card },
  fine: { marginTop: 8, color: colors.muted, ...typography.meta, lineHeight: 18 },
  error: { marginTop: 18, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 26 }
});
