// US-M1 · "Report this" on a stray report or listing. One small screen reused for
// every flaggable target type (route.params.targetType) — POST /moderation/flags.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  line: "#E3E1D9", danger: "#B23B3B", fine: "#9a988f"
};

type Props = NativeStackScreenProps<RootStackParamList, "reportContent">;

export function ReportContentScreen({ navigation, route }: Props) {
  const api = useApi();
  const { targetType, targetId } = route.params;
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function submit() {
    if (submitting) return;
    if (!reason.trim()) { setError("Tell us what's wrong."); return; }
    setSubmitting(true);
    setError(undefined);
    const res = await api.post("/moderation/flags",
      { target_type: targetType, target_id: targetId, reason: reason.trim() });
    setSubmitting(false);
    if (res.ok) {
      Alert.alert("Reported", "Thanks — our team will take a look.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
      return;
    }
    setError(res.data?.error?.message ?? "Couldn't send the report. Try again.");
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Report this</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>What's wrong?</Text>
        <TextInput
          style={styles.notes}
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder="Spam, a fake listing, abusive contact…"
          placeholderTextColor={colors.fine}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.submit} onPress={submit} activeOpacity={0.9} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.submitText}>Send report</Text>}
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
  content: { paddingHorizontal: 26, paddingTop: 20 },
  label: { marginBottom: 10, color: colors.ink, fontSize: 15, fontWeight: "700" },
  notes: { minHeight: 120, borderRadius: 18, padding: 16, color: colors.ink, fontSize: 16, textAlignVertical: "top", ...card },
  error: { marginTop: 14, color: colors.danger, fontSize: 15, fontWeight: "600" },
  submit: { marginTop: 26, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  submitText: { color: colors.white, fontSize: 20, fontWeight: "700" }
});
