// US-A4 step 2 — reference: screens/user/screen-member-verify.png.
// File upload is a DEV STUB (see backend POST /media/presign): tapping "Valid government ID"
// just asks the backend for a placeholder file_url — there's no real picker, no image bytes, no
// expo-image-picker. Submit is gated on three things: a presigned gov-ID file_url, a non-empty
// social_proof_url, and the DPA consent checkbox. A 422 from POST /verifications means consent
// wasn't accepted server-side, surfaced as a friendly inline error.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { CheckIcon, DocumentIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "memberVerify">;

export function MemberVerifyScreen({ navigation }: Props) {
  const api = useApi();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [socialUrl, setSocialUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const canSubmit = !!fileUrl && socialUrl.trim().length > 0 && consent;

  async function presignDoc() {
    const res = await api.post("/media/presign", { purpose: "verification_doc", content_type: "image/jpeg" });
    return res;
  }

  async function handleUpload() {
    if (uploading) return;
    setUploading(true);
    setError(undefined);
    try {
      const res = await presignDoc();
      if (res.ok) {
        setFileUrl(res.data.file_url);
      } else {
        setError(res.data?.error?.message ?? "Couldn't prepare the upload. Try again.");
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      // fileUrl is already presigned via the upload tap, but fall back to presigning here too in
      // case a future picker lets the docs step change without re-uploading.
      let url = fileUrl;
      if (!url) {
        const pre = await presignDoc();
        if (!pre.ok) {
          setError(pre.data?.error?.message ?? "Couldn't prepare the upload. Try again.");
          return;
        }
        url = pre.data.file_url;
      }

      const res = await api.post("/verifications", {
        type: "rescuer",
        social_proof_url: socialUrl.trim(),
        consent_version: "2026-08-01",
        documents: [{ doc_type: "gov_id", file_url: url }]
      });

      if (res.status === 422) {
        setError("Please agree to the consent notice to submit.");
        return;
      }
      if (res.ok) {
        navigation.navigate("memberSubmitted");
        return;
      }
      setError(res.data?.error?.message ?? "Couldn't submit for review. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Get verified</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Quick verification</Text>
        <Text style={styles.subheading}>Two things and you're set.</Text>

        <TouchableOpacity activeOpacity={0.8} style={styles.docCard} onPress={handleUpload} disabled={uploading}>
          <View style={styles.docIcon}>
            <DocumentIcon color={colors.teal} />
          </View>
          <View style={styles.docCopy}>
            <Text style={styles.docTitle}>Valid government ID</Text>
            <Text style={styles.docSubtitle}>A clear photo of your ID · Required</Text>
          </View>
          {uploading ? (
            <ActivityIndicator color={colors.teal} />
          ) : fileUrl ? (
            <View style={styles.docDone}>
              <View style={styles.docCheck}>
                <CheckIcon color={colors.white} size={12} />
              </View>
              <Text style={styles.docDoneText}>Uploaded</Text>
            </View>
          ) : (
            <Text style={styles.docUploadLink}>Upload</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>Social link</Text>
        <View style={styles.socialField}>
          <TextInput
            value={socialUrl}
            onChangeText={setSocialUrl}
            placeholder="facebook.com/your.name"
            placeholderTextColor={colors.neutralMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.socialInput}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.consentRow}
          onPress={() => setConsent((v) => !v)}
        >
          <View style={[styles.consentBox, consent && styles.consentBoxChecked]}>
            {consent && <CheckIcon color={colors.white} size={13} />}
          </View>
          <Text style={styles.consentText}>
            I consent to Kupkop PH collecting these documents solely to verify my identity.
          </Text>
        </TouchableOpacity>

        {!!error && <Text style={styles.formError}>{error}</Text>}

        <Text style={styles.reviewNote}>A Kupkop admin reviews this — usually within a day.</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>Submit for review</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  header: {
    height: 96,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: spacing.s12
  },
  backButton: {
    position: "absolute",
    left: 26,
    bottom: 12,
    width: 42,
    height: 42,
    // circle/pill: borderRadius ≈ half of width/height — not snapped to radii scale (Migration Protocol step 3)
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  backText: {
    color: colors.inkStrong,
    ...typography.heading700_26,
    lineHeight: 28
  },
  headerTitle: {
    color: colors.inkStrong,
    ...typography.heading800_18
  },
  content: {
    paddingHorizontal: spacing.s24,
    paddingBottom: spacing.s56
  },
  heading: {
    marginTop: spacing.s4,
    color: colors.inkStrong,
    ...typography.heading800_24
  },
  subheading: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.body14
  },
  docCard: {
    minHeight: 84,
    marginTop: spacing.s24,
    borderRadius: radii.r16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s12,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.r12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tealTint
  },
  docCopy: {
    flex: 1,
    marginLeft: spacing.s12
  },
  docTitle: {
    color: colors.inkStrong,
    ...typography.label800_15
  },
  docSubtitle: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.body11
  },
  docUploadLink: {
    color: colors.teal,
    ...typography.label800_13
  },
  docDone: {
    alignItems: "center"
  },
  docCheck: {
    width: 24,
    height: 24,
    // circle/pill: borderRadius ≈ half of width/height — not snapped to radii scale (Migration Protocol step 3)
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.successAccent
  },
  docDoneText: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.micro700_10
  },
  fieldLabel: {
    marginTop: spacing.s20,
    marginBottom: spacing.s8,
    color: colors.muted,
    ...typography.label800_12
  },
  socialField: {
    height: 54,
    borderRadius: radii.r12,
    justifyContent: "center",
    paddingHorizontal: spacing.s16,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  socialInput: {
    color: colors.inkStrong,
    ...typography.label800_15,
    padding: 0
  },
  consentRow: {
    marginTop: spacing.s24,
    borderRadius: radii.r12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s16,
    gap: spacing.s12,
    backgroundColor: colors.tealTint
  },
  consentBox: {
    width: 26,
    height: 26,
    borderRadius: radii.r8,
    borderWidth: 1.5,
    borderColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  consentBoxChecked: {
    backgroundColor: colors.teal
  },
  consentText: {
    flex: 1,
    color: colors.tealDark,
    ...typography.label700_13,
    lineHeight: 19
  },
  formError: {
    marginTop: spacing.s12,
    color: colors.danger,
    ...typography.label700_13
  },
  reviewNote: {
    marginTop: spacing.s16,
    color: colors.muted,
    ...typography.body12,
    textAlign: "center"
  },
  submitButton: {
    height: 54,
    marginTop: spacing.s16,
    // circle/pill: borderRadius ≈ half of width/height — not snapped to radii scale (Migration Protocol step 3)
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  submitButtonDisabled: {
    opacity: 0.5
  },
  submitText: {
    color: colors.white,
    ...typography.label800_16
  }
});
