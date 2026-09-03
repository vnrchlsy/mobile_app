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

const colors = {
  ink: "#12213A", teal: "#1C6B6B", tealDark: "#14504F", page: "#F4F5F2", muted: "#5F5E5A",
  soft: "#E2EEF0", warnBg: "#FAEEDA", warn2: "#633806", danger: "#B23B3B", line: "#E3E1D9"
};

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
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
          style={styles.back}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Resubmit documents</Text>
      </View>

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

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={resubmit}
          style={[styles.submit, !fileUrl && styles.submitIdle]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Resubmit for review</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.submitSub}>Back to under review · usually 1–2 business days</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: {
    paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6,
    flexDirection: "row", alignItems: "center", gap: 16
  },
  back: {
    width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFFFF", shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
  },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  h1: { color: colors.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  sub: { marginTop: 8, color: colors.muted, fontSize: 17 },
  noteBox: {
    marginTop: 22, padding: 18, borderRadius: 20, backgroundColor: colors.warnBg
  },
  noteLabel: { color: colors.warn2, fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
  noteText: { marginTop: 8, color: colors.warn2, fontSize: 16, lineHeight: 23, fontWeight: "600" },
  fileCard: {
    marginTop: 20, padding: 20, borderRadius: 22, backgroundColor: "#FFFFFF",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08,
    shadowRadius: 7, elevation: 2
  },
  fileName: { color: colors.ink, fontSize: 18, fontWeight: "700", flex: 1 },
  replaceBtn: {
    paddingHorizontal: 22, height: 44, borderRadius: 22, alignItems: "center",
    justifyContent: "center", backgroundColor: colors.soft
  },
  replaceText: { color: colors.tealDark, fontSize: 16, fontWeight: "800" },
  readyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  readyDot: {
    width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.teal
  },
  readyText: { color: colors.tealDark, fontSize: 15, fontWeight: "800" },
  fine: { marginTop: 14, color: "#9a988f", fontSize: 14 },
  error: { marginTop: 16, color: colors.danger, fontSize: 15, fontWeight: "600" },
  submit: {
    marginTop: 26, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.teal, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 3
  },
  submitIdle: { backgroundColor: "#7FA8A6" },
  submitText: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  submitSub: { marginTop: 12, color: colors.muted, fontSize: 14, textAlign: "center" }
});
