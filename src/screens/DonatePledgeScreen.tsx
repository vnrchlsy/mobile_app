// US-W2 · pledge to a shelter's wishlist need. A quantity stepper, then POST
// /needs/{id}/pledges; on success the screen becomes its own "pledged" confirmation
// (screen-donate-pledge -> screen-donate-pledged) rather than bouncing the giver away.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { colors, elevation, pill, spacing, squircle, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";


const card = {
  backgroundColor: colors.white, ...elevation.soft
};

type Props = NativeStackScreenProps<RootStackParamList, "donatePledge">;

export function DonatePledgeScreen({ navigation, route }: Props) {
  const api = useApi();
  const { needId, needTitle, shelterName } = route.params;
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await api.post(`/needs/${needId}/pledges`, { quantity: qty });
    setBusy(false);
    if (res.ok) {
      setDone(true);
    } else if (res.status === 409) {
      setError("This need is no longer open for pledges.");
    } else {
      setError("Couldn't record your pledge. Please try again.");
    }
  }

  if (done) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.confirmWrap}>
          <View style={styles.checkTile}><Text style={styles.checkGlyph}>✓</Text></View>
          <Text style={styles.confirmTitle}>Pledge recorded</Text>
          <Text style={styles.confirmBody}>
            You pledged {qty} to “{needTitle}”. {shelterName} will confirm once it arrives —
            you'll get a notification then. Salamat sa pagtulong!
          </Text>
          <Button
            label="See my donations"
            onPress={() => navigation.navigate("myDonations")}
            style={styles.primaryBtn}
          />
          <Button label="Back to wishlist" onPress={() => navigation.goBack()} variant="secondary" style={styles.secondaryBtn} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Pledge" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.needTitle}>{needTitle}</Text>
        <Text style={styles.shelter}>{shelterName}</Text>
        <Text style={styles.note}>
          A pledge is a promise to bring these — the shelter confirms once they receive them.
          You can cancel anytime before then.
        </Text>

        <Text style={styles.label}>How many can you give?</Text>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => setQty((q) => Math.max(1, q - 1))} hitSlop={TAP_SLOP}
            accessibilityRole="button" accessibilityLabel="Decrease pledge quantity"
            accessibilityValue={{ now: qty }}>
            <Text style={styles.stepGlyph}>–</Text>
          </TouchableOpacity>
          <Text style={styles.qty}>{qty}</Text>
          <TouchableOpacity
            style={styles.stepBtn} onPress={() => setQty((q) => q + 1)} hitSlop={TAP_SLOP}
            accessibilityRole="button" accessibilityLabel="Increase pledge quantity"
            accessibilityValue={{ now: qty }}>
            <Text style={styles.stepGlyph}>+</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Pledge this" onPress={submit} loading={busy} style={styles.primaryBtn} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  needTitle: { color: colors.ink, ...typography.hero },
  shelter: { marginTop: 4, color: colors.teal, ...typography.strong, fontWeight: "700" },
  note: { marginTop: 14, color: colors.muted, ...typography.body, lineHeight: 21 },
  label: { marginTop: 26, marginBottom: 12, color: colors.muted, ...typography.meta, fontWeight: "600", letterSpacing: 0.4 },
  // A control track is a pill of its height, as SegmentedControl's is: 8 + 52 + 8.
  stepper: { flexDirection: "row", alignItems: "center", gap: 24, alignSelf: "flex-start", height: 68, padding: 8, borderRadius: pill(68), ...card },
  stepBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  stepGlyph: { color: colors.teal, fontSize: 30, fontWeight: "800", marginTop: -2 },
  qty: { color: colors.ink, fontSize: 30, fontWeight: "800", minWidth: 40, textAlign: "center" },
  error: { marginTop: 18, color: "#B23B3B", ...typography.strong, fontWeight: "700" },
  primaryBtn: { marginTop: 30 },
  secondaryBtn: { marginTop: 14 },
  confirmWrap: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: 140, paddingBottom: 60, alignItems: "center" },
  checkTile: { width: 84, height: 84, borderRadius: squircle(84), backgroundColor: colors.successBg, alignItems: "center", justifyContent: "center" },
  checkGlyph: { color: colors.success, fontSize: 44, fontWeight: "800" },
  confirmTitle: { marginTop: 22, color: colors.ink, ...typography.hero },
  confirmBody: { marginTop: 12, color: colors.muted, ...typography.body, textAlign: "center" }
});
