// US-O1 · offer help on a report — the ladder's low-effort rung (decision 12). No
// verification badge required; that's what separates an offer from a claim.
// Reference: screens/user/screen-rescue-offer.png. POST /reports/{id}/offers.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { OfferType } from "../api/types";
import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { OFFER_TYPE_HINT, OFFER_TYPE_LABEL, OFFER_TYPES } from "../sagip";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";


type Props = NativeStackScreenProps<RootStackParamList, "rescueOffer">;

export function RescueOfferScreen({ navigation, route }: Props) {
  const api = useApi();
  const { reportId } = route.params;
  const [selected, setSelected] = useState<OfferType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function submit() {
    if (submitting) return;
    // ⚠️ Explains rather than blocks. This condition used to live in the early return while
    // the button was also disabled on it, so tapping with nothing chosen did nothing and
    // said nothing. The fade stays — it is a hint (see colors.tealIdle), not a block.
    if (!selected) { setError("Choose how you can help first."); return; }
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
      <ScreenHeader title="Offer help" onBack={() => navigation.goBack()} />

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

        <Button
          label="Send offer"
          onPress={submit}
          loading={submitting}
          accessibilityHint={selected ? undefined : "Choose how you can help first"}
          style={styles.submit}
        />
      </View>
    </View>
  );
}

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 12 },
  h1: { color: colors.ink, ...typography.display },
  sub: { marginTop: 10, color: colors.muted, ...typography.body },
  cardList: { marginTop: 24, gap: 12 },
  optionCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: radii.field, borderWidth: 2, borderColor: "transparent", ...card },
  optionCardActive: { borderColor: colors.teal },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.teal },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.teal },
  optionTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  optionHint: { marginTop: 3, color: colors.muted, ...typography.meta },
  fine: { marginTop: 18, color: colors.muted, ...typography.meta, lineHeight: 19 },
  error: { marginTop: 16, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 22, marginBottom: 30 }
});
