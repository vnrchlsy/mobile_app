// US-O1 · offer help on a report — the ladder's low-effort rung (decision 12). No
// verification badge required; that's what separates an offer from a claim.
// Reference: screens/user/screen-rescue-offer.png. POST /reports/{id}/offers.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { OfferType } from "../api/types";
import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { OFFER_TYPE_HINT, OFFER_TYPE_LABEL, OFFER_TYPES } from "../sagip";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  soft: "#E2EEF0", line: "#E3E1D9", danger: "#B23B3B", fine: "#9a988f"
};

type Props = NativeStackScreenProps<RootStackParamList, "rescueOffer">;

export function RescueOfferScreen({ navigation, route }: Props) {
  const api = useApi();
  const { reportId } = route.params;
  const [selected, setSelected] = useState<OfferType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function submit() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError(undefined);
    const res = await api.post(`/reports/${reportId}/offers`, { offer_type: selected });
    setSubmitting(false);
    if (res.ok) {
      navigation.replace("rescueOfferSent", { reportId, offerType: selected });
      return;
    }
    const code = res.data?.error?.code;
    setError(
      code === "already_offered" ? "You already offered this."
      : code === "report_not_open" ? "This report is no longer open for offers — someone may have already claimed it."
      : res.data?.error?.message ?? "Couldn't send the offer. Try again."
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Offer help</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.h1}>Can't claim it? Chip in instead.</Text>
        <Text style={styles.sub}>
          An offer doesn't commit you to the whole case — pick one thing you can do. Whoever
          claims this report gets your contact.
        </Text>

        <View style={styles.cardList}>
          {OFFER_TYPES.map((type) => {
            const active = type === selected;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.optionCard, active && styles.optionCardActive]}
                onPress={() => setSelected(type)}
                activeOpacity={0.85}
              >
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{OFFER_TYPE_LABEL[type]}</Text>
                  <Text style={styles.optionHint}>{OFFER_TYPE_HINT[type]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fine}>Offers stay open for 48 hours, or until the case is claimed.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submit, !selected && styles.submitIdle]}
          onPress={submit}
          activeOpacity={0.9}
          disabled={!selected || submitting}
        >
          {submitting ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.submitText}>Send offer</Text>}
        </TouchableOpacity>
      </View>
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
  content: { flex: 1, paddingHorizontal: 26, paddingTop: 12 },
  h1: { color: colors.ink, fontSize: 27, fontWeight: "800", letterSpacing: -0.5 },
  sub: { marginTop: 10, color: colors.muted, fontSize: 16, lineHeight: 22 },
  cardList: { marginTop: 24, gap: 12 },
  optionCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 20, borderWidth: 2, borderColor: "transparent", ...card },
  optionCardActive: { borderColor: colors.teal },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.teal },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.teal },
  optionTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  optionHint: { marginTop: 3, color: colors.muted, fontSize: 14 },
  fine: { marginTop: 18, color: colors.fine, fontSize: 13, lineHeight: 19 },
  error: { marginTop: 16, color: colors.danger, fontSize: 15, fontWeight: "600" },
  submit: { marginTop: 22, marginBottom: 30, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  submitIdle: { backgroundColor: "#7FA8A6" },
  submitText: { color: colors.white, fontSize: 22, fontWeight: "700" }
});
