// US-H2 · direct-placement review + confirm. recipientEmail rides in from RescuePlaceScreen;
// city/fee are collected right here (same fee-cap framing as RescueListScreen/ListingFormScreen)
// so the whole placement — who, where, how much — is visible in one glance before the
// irreversible POST /cases/{caseId}/place fires.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  line: "#E3E1D9", danger: "#B23B3B", fine: "#9a988f", chipBg: "#E7F0EE"
};

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Review placement</Text>
      </View>

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
          placeholderTextColor={colors.fine}
        />

        <Text style={styles.label}>Adoption fee (₱)</Text>
        <TextInput
          style={styles.input}
          value={fee}
          onChangeText={setFee}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.fine}
        />
        <Text style={styles.fine}>
          Tier-1 rescues and individual Verified Members are capped at ₱500. Registered NGOs aren't capped.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.submit} onPress={confirm} activeOpacity={0.9} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.submitText}>Confirm placement</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  recipientCard: { marginTop: 8, padding: 18, borderRadius: 20, backgroundColor: colors.chipBg },
  recipientLabel: { color: colors.teal, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  recipientEmail: { marginTop: 6, color: colors.ink, fontSize: 18, fontWeight: "700" },
  label: { marginTop: 20, marginBottom: 10, color: colors.ink, fontSize: 15, fontWeight: "700" },
  input: { height: 52, borderRadius: 16, paddingHorizontal: 16, color: colors.ink, fontSize: 16, ...card },
  fine: { marginTop: 8, color: colors.fine, fontSize: 13, lineHeight: 18 },
  error: { marginTop: 18, color: colors.danger, fontSize: 15, fontWeight: "600" },
  submit: { marginTop: 26, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  submitText: { color: colors.white, fontSize: 20, fontWeight: "700" }
});
