// US-V3 · replace one rejected file and resubmit. Reference: screens/user/screen-shelter-verify-resubmit.png.
// POST /verifications/{id}/documents { replaces, doc_type, file_url } supersedes the rejected row
// (kept for audit) and returns the request to pending. Only the flagged file is touched — the rest stay.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { pickAndUpload } from "../media/pickAndUpload";
import { CheckIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { docLabel } from "../verifications";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";


type Props = NativeStackScreenProps<RootStackParamList, "verifyResubmit">;

export function VerifyResubmitScreen({ navigation, route }: Props) {
  const api = useApi();
  const { verificationId, documentId, docType, reviewNote } = route.params;
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function replaceFile() {
    if (uploading) return;
    setUploading(true);
    setError(undefined);
    try {
      const res = await pickAndUpload(api, "verification_doc");
      if (res?.ok) setFileUrl(res.fileUrl);
      else setError("Couldn't prepare the upload. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function resubmit() {
    if (!fileUrl || submitting) return;
    setSubmitting(true);
    setError(undefined);
    const res = await api.post(`/verifications/${verificationId}/documents`, {
      replaces: documentId, doc_type: docType, file_url: fileUrl
    });
    setSubmitting(false);
    if (res.ok) {
      // The tracker refetches on focus and shows the file back "In review".
      navigation.goBack();
    } else {
      setError(res.data?.error?.message ?? "Couldn't resubmit. Try again.");
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Resubmit documents" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>One document needs a fix</Text>
        <Text style={styles.sub}>Replace it and resubmit — the rest are fine.</Text>

        {reviewNote ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>REVIEWER NOTE</Text>
            <Text style={styles.noteText}>{reviewNote}</Text>
          </View>
        ) : null}

        <View style={styles.fileCard}>
          <Text style={styles.fileName}>{docLabel(docType)}</Text>
          {fileUrl ? (
            <View style={styles.readyRow}>
              <View style={styles.readyDot}>
                <CheckIcon color="#FFFFFF" size={12} />
              </View>
              <Text style={styles.readyText}>New file ready</Text>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={replaceFile}
              style={styles.replaceBtn}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={colors.teal} />
              ) : (
                <Text style={styles.replaceText}>Replace</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.fine}>Only the flagged file is replaced — the others stay.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Resubmit for review" onPress={resubmit} loading={submitting} style={styles.submit} />
        <Text style={styles.submitSub}>Back to under review · usually 1–2 business days</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: {
    paddingTop: 58, paddingHorizontal: spacing.lg, paddingBottom: 6,
    flexDirection: "row", alignItems: "center", gap: 16
  },
  back: {
    width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFFFF", ...elevation.soft
  },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  h1: { color: colors.ink, ...typography.display },
  sub: { marginTop: 8, color: colors.muted, ...typography.subtitle },
  noteBox: {
    marginTop: 22, padding: 18, borderRadius: radii.field, backgroundColor: colors.warningBg
  },
  noteLabel: { color: colors.warningStrong, ...typography.meta, fontWeight: "800", letterSpacing: 0.6 },
  noteText: { marginTop: 8, color: colors.warningStrong, ...typography.strong, lineHeight: 23, fontWeight: "700" },
  fileCard: {
    marginTop: 20, padding: 20, borderRadius: radii.card, backgroundColor: "#FFFFFF",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    ...elevation.soft
  },
  fileName: { color: colors.ink, ...typography.subtitle, fontWeight: "700", flex: 1 },
  replaceBtn: {
    paddingHorizontal: 22, height: 44, borderRadius: 22, alignItems: "center",
    justifyContent: "center", backgroundColor: colors.infoBg
  },
  replaceText: { color: colors.tealDark, ...typography.subtitle, fontWeight: "800" },
  readyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  readyDot: {
    width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.teal
  },
  readyText: { color: colors.tealDark, ...typography.strong, fontWeight: "800" },
  fine: { marginTop: 14, color: "#9a988f", ...typography.meta },
  error: { marginTop: 16, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 26 },
  submitSub: { marginTop: 12, color: colors.muted, ...typography.meta, textAlign: "center" }
});
