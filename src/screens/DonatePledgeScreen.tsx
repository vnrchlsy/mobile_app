// US-W2 · pledge to a shelter's wishlist need. A quantity stepper, then POST
// /needs/{id}/pledges; on success the screen becomes its own "pledged" confirmation
// (screen-donate-pledge -> screen-donate-pledged) rather than bouncing the giver away.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  soft: "#E7F0EF", line: "#E3E1D9", ok: "#27500A", okBg: "#EAF3DE"
};

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
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
          <TouchableOpacity style={styles.primaryBtn}
            onPress={() => navigation.navigate("myDonations")}>
            <Text style={styles.primaryLabel}>See my donations</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryLabel}>Back to wishlist</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pledge</Text>
      </View>
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

        <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={busy}>
          <Text style={styles.primaryLabel}>{busy ? "Pledging…" : "Pledge this"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  needTitle: { color: colors.ink, fontSize: 26, fontWeight: "800" },
  shelter: { marginTop: 4, color: colors.teal, fontSize: 15, fontWeight: "700" },
  note: { marginTop: 14, color: colors.muted, fontSize: 14.5, lineHeight: 21 },
  label: { marginTop: 26, marginBottom: 12, color: colors.muted, fontSize: 13, fontWeight: "600", letterSpacing: 0.4 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 24, alignSelf: "flex-start", padding: 8, borderRadius: 22, ...card },
  stepBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  stepGlyph: { color: colors.teal, fontSize: 30, fontWeight: "800", marginTop: -2 },
  qty: { color: colors.ink, fontSize: 30, fontWeight: "800", minWidth: 40, textAlign: "center" },
  error: { marginTop: 18, color: "#B23B3B", fontSize: 14.5, fontWeight: "600" },
  primaryBtn: { marginTop: 30, height: 58, borderRadius: 29, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  primaryLabel: { color: colors.white, fontSize: 18, fontWeight: "700" },
  secondaryBtn: { marginTop: 14, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", ...card },
  secondaryLabel: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  confirmWrap: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 140, paddingBottom: 60, alignItems: "center" },
  checkTile: { width: 84, height: 84, borderRadius: 26, backgroundColor: colors.okBg, alignItems: "center", justifyContent: "center" },
  checkGlyph: { color: colors.ok, fontSize: 44, fontWeight: "800" },
  confirmTitle: { marginTop: 22, color: colors.ink, fontSize: 26, fontWeight: "800" },
  confirmBody: { marginTop: 12, color: colors.muted, fontSize: 15.5, lineHeight: 23, textAlign: "center" }
});
