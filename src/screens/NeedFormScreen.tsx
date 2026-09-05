// US-W3 · post or edit a wishlist need. Filled-pill fields, an inline error under the field
// that needs attention, and a submit that stays enabled (Kupkop's rule — never a dead button).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { PrefillWarning } from "../components/PrefillWarning";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  soft: "#E7F0EF", danger: "#B23B3B"
};
const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};
const CATEGORIES = ["food", "medicine", "supplies", "funds", "other"] as const;

type Props = NativeStackScreenProps<RootStackParamList, "needForm">;

/** Shown in the banner (rule 1) and on a blocked submit (rule 3) — one wording, one place. */
const PREFILL_FAILED = "We couldn't load your shelter profile, so this form can't be saved yet. "
  + "Check your connection and reopen it.";

export function NeedFormScreen({ navigation, route }: Props) {
  const api = useApi();
  const editing = route.params?.need;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [category, setCategory] = useState<string>(editing?.category ?? "food");
  const [qty, setQty] = useState(editing?.quantity_needed ?? 1);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [myId, setMyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ⚠️ A form is the one place a full-screen error state is WRONG (US-R2's rule): it
  // would throw away whatever the shelter has already typed. Warn inline and refuse
  // to submit instead — an empty editable form over real data invites overwriting it
  // with blanks.
  const [prefillFailed, setPrefillFailed] = useState(false);

  useEffect(() => {
    // US-R1 · keep the RESULT. The previous line was `r.ok && setMyId(...)`, which discarded
    // the failure — leaving `myId` null and the submit below POSTing to
    // `/shelters/null/needs`. The server 404s, and the catch-all error told the shelter
    // "Couldn't save. Please try again." — blaming their network for a prefill we never
    // loaded, and inviting them to retry a request that can never succeed.
    if (!editing) {
      api.get("/me").then((r) => {
        if (r.ok) setMyId(r.data.account_id);
        else setPrefillFailed(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (busy) return;
    // Rule 3: same words as the banner, from the same constant — two hand-written variants
    // of one message drift, and the drift always lands on the less-clear one.
    if (!editing && !myId) { setError(PREFILL_FAILED); return; }
    if (!title.trim()) { setError("Give the need a short title."); return; }
    setBusy(true);
    setError(null);
    const body = { title: title.trim(), quantity_needed: qty, description: description.trim() };
    const res = editing
      ? await api.patch(`/needs/${editing.need_id}`, body)
      : await api.post(`/shelters/${myId}/needs`, { ...body, category });
    setBusy(false);
    if (res.ok) navigation.goBack();
    else setError("Couldn't save. Please try again.");
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{editing ? "Edit need" : "Add a need"}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* US-R5 · moved ABOVE the first field. It was rendered under it, which is rule 1
            only by half — someone scanning down starts typing before they reach the notice
            that nothing they type can be saved. */}
        {prefillFailed ? <PrefillWarning message={PREFILL_FAILED} /> : null}
        <View style={[styles.field, !title.trim() && error ? styles.fieldError : null]}>
          <Text style={styles.fieldLabel}>What do you need?</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle}
            placeholder="e.g. Dog food (adult, dry)" placeholderTextColor="#9A988F" />
        </View>
        {!title.trim() && error ? <Text style={styles.error}>{error}</Text> : null}

        {!editing ? (
          <>
            <Text style={styles.groupLabel}>Category</Text>
            <View style={styles.segments}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity hitSlop={TAP_SLOP} key={c} onPress={() => setCategory(c)}
                  accessibilityRole="button"
                  accessibilityLabel={c}
                  accessibilityState={{ selected: category === c }}
                  style={[styles.segment, category === c ? styles.segmentOn : null]}>
                  <Text style={[styles.segmentText, category === c ? styles.segmentTextOn : null]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.groupLabel}>How many needed?</Text>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => setQty((q) => Math.max(1, q - 1))} hitSlop={TAP_SLOP}
            accessibilityRole="button" accessibilityLabel="Decrease quantity needed"
            accessibilityValue={{ now: qty }}><Text style={styles.stepGlyph}>–</Text></TouchableOpacity>
          <Text style={styles.qty}>{qty}</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={() => setQty((q) => q + 1)} hitSlop={TAP_SLOP}
            accessibilityRole="button" accessibilityLabel="Increase quantity needed"
            accessibilityValue={{ now: qty }}><Text style={styles.stepGlyph}>+</Text></TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Details (optional)</Text>
          <TextInput style={[styles.input, styles.multiline]} value={description}
            onChangeText={setDescription} multiline placeholder="Brand, size, anything specific"
            placeholderTextColor="#9A988F" />
        </View>

        {error && title.trim() ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={busy}>
          <Text style={styles.primaryLabel}>
            {busy ? "Saving…" : editing ? "Save changes" : "Post need"}
          </Text>
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
  field: { marginTop: 16, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8, borderRadius: 22, ...card },
  fieldError: { borderWidth: 1.5, borderColor: colors.danger },
  fieldLabel: { color: colors.muted, fontSize: 13, fontWeight: "600", letterSpacing: 0.4 },
  input: { color: colors.ink, fontSize: 18, fontWeight: "700", paddingVertical: 6 },
  multiline: { minHeight: 72, textAlignVertical: "top", fontWeight: "400", fontSize: 16 },
  error: { marginTop: 8, color: colors.danger, fontSize: 14, fontWeight: "600" },
  groupLabel: { marginTop: 22, marginBottom: 10, color: colors.muted, fontSize: 13, fontWeight: "600", letterSpacing: 0.4 },
  segments: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segment: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, ...card },
  segmentOn: { backgroundColor: colors.teal },
  segmentText: { color: colors.ink, fontSize: 14, fontWeight: "700", textTransform: "capitalize" },
  segmentTextOn: { color: colors.white },
  stepper: { flexDirection: "row", alignItems: "center", gap: 24, alignSelf: "flex-start", padding: 8, borderRadius: 22, ...card },
  stepBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  stepGlyph: { color: colors.teal, fontSize: 30, fontWeight: "800", marginTop: -2 },
  qty: { color: colors.ink, fontSize: 30, fontWeight: "800", minWidth: 40, textAlign: "center" },
  primaryBtn: { marginTop: 30, height: 58, borderRadius: 29, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  primaryLabel: { color: colors.white, fontSize: 18, fontWeight: "700" }
});
