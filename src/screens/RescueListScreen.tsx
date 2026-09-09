// US-H1 · list an adoption from a SAFE rescue case. POST /cases/{caseId}/list — species is
// inherited server-side from the report, so this form only asks for city, fee, and an
// optional name. Fee capping mirrors ListingFormScreen (same fee_cap_for on the backend).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  line: "#E3E1D9", danger: "#B23B3B", fine: "#9a988f"
};

type Props = NativeStackScreenProps<RootStackParamList, "rescueList">;

export function RescueListScreen({ navigation, route }: Props) {
  const api = useApi();
  const { city: homeCity } = useAuth();
  const { caseId } = route.params;

  const [name, setName] = useState("");
  const [city, setCity] = useState(homeCity ?? "");
  const [fee, setFee] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(undefined);

    const res = await api.post(`/cases/${caseId}/list`, {
      name: name.trim() || undefined,
      city: city.trim() || undefined,
      adoption_fee: fee || "0"
    });

    setSubmitting(false);
    if (res.ok) {
      navigation.navigate("rescueListed");
      return;
    }
    const code = res.data?.error?.code;
    setError(
      code === "fee_over_cap" ? `The adoption fee can't exceed ₱${res.data.error.details?.cap ?? 500}.`
      : code === "case_not_safe" ? "This case isn't marked safe yet — update its status first."
      : res.data?.error?.message ?? "Couldn't create the listing. Try again."
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>List for adoption</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.draftNote}>
          The animal's species carries over from the rescue report — just fill in where it's going and any fee.
        </Text>

        <Text style={styles.label}>Name (optional)</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Bantay"
          placeholderTextColor={colors.fine}
        />

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

        <TouchableOpacity style={styles.submit} onPress={submit} activeOpacity={0.9} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.submitText}>List for adoption</Text>}
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
  draftNote: { marginTop: 4, marginBottom: 6, color: colors.muted, fontSize: 14, lineHeight: 20 },
  label: { marginTop: 20, marginBottom: 10, color: colors.ink, fontSize: 15, fontWeight: "700" },
  input: { height: 52, borderRadius: 16, paddingHorizontal: 16, color: colors.ink, fontSize: 16, ...card },
  fine: { marginTop: 8, color: colors.fine, fontSize: 13, lineHeight: 18 },
  error: { marginTop: 18, color: colors.danger, fontSize: 15, fontWeight: "600" },
  submit: { marginTop: 26, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  submitText: { color: colors.white, fontSize: 20, fontWeight: "700" }
});
