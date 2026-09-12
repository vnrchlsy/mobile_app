// US-A4 step 2 — reference: screens/user/screen-member-verify.png.
// just asks the backend for a placeholder file_url — there's no real picker, no image bytes, no
// expo-image-picker. Submit is gated on three things: a presigned gov-ID file_url, a non-empty
// social_proof_url, and the DPA consent checkbox. A 422 from POST /verifications means consent
// wasn't accepted server-side, surfaced as a friendly inline error.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { pickAndUpload } from "../media/pickAndUpload";
import { uploadErrorMessage } from "../upload";
import { CheckIcon, DocumentIcon } from "../components/AppIcons";
import { DOC_CONSENT_VERSION } from "../consent";
import { RootStackParamList } from "../navigation/types";
import { colors, elevation, radii, spacing, squircle, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";

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
    const res = await pickAndUpload(api, "verification_doc");
    return res;
  }

  async function handleUpload() {
    if (uploading) return;
    setUploading(true);
    setError(undefined);
    try {
      const res = await presignDoc();
      if (res === null) return;                 // cancelled — not an error, say nothing
      if (res.ok) setFileUrl(res.fileUrl);
      else setError(uploadErrorMessage(res.reason));
    } finally {
      setUploading(false);
    }
  }

  /**
   * Design-system rule: never disable a submit button because of validation — say what is
   * missing instead. `submitting` still blocks, because that is a request in flight.
   *
   * Three separate things can be missing here and the old dead button named none of them,
   * which on a verification form is the difference between finishing and giving up.
   */
  async function handleSubmit() {
    if (submitting) return;
    if (!fileUrl) {
      setError("Upload a photo of your ID first.");
      return;
    }
    if (socialUrl.trim().length === 0) {
      setError("Add a link to your Facebook profile.");
      return;
    }
    if (!consent) {
      setError("Tick the consent box to continue.");
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      // fileUrl is already presigned via the upload tap, but fall back to presigning here too in
      // case a future picker lets the docs step change without re-uploading.
      let url = fileUrl;
      if (!url) {
        const pre = await presignDoc();
        if (!pre) return;                       // cancelled — say nothing, change nothing
        if (!pre.ok) {
          setError(uploadErrorMessage(pre.reason));
          return;
        }
        url = pre.fileUrl;
      }

      const res = await api.post("/verifications", {
        type: "rescuer",
        social_proof_url: socialUrl.trim(),
        consent_version: DOC_CONSENT_VERSION,
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
      <ScreenHeader title="Get verified" onBack={() => navigation.goBack()} />

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
            placeholderTextColor={colors.muted}
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

        <Button
          label="Submit for review"
          onPress={handleSubmit}
          loading={submitting}
          style={styles.submitButton}
        />
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  backButton: {
    position: "absolute",
    left: 26,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    ...elevation.soft
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 60
  },
  heading: {
    marginTop: 6,
    color: colors.ink,
    ...typography.hero
  },
  subheading: {
    marginTop: 6,
    color: colors.muted,
    ...typography.meta
  },
  docCard: {
    minHeight: 84,
    marginTop: 24,
    borderRadius: radii.card,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    ...elevation.soft
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: squircle(48),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft
  },
  docCopy: {
    flex: 1,
    marginLeft: 14
  },
  docTitle: {
    color: colors.ink,
    ...typography.strong,
    fontWeight: "800"
  },
  docSubtitle: {
    marginTop: 5,
    color: colors.muted,
    ...typography.caption, fontWeight: "600"
  },
  docUploadLink: {
    color: colors.teal,
    ...typography.meta,
    fontWeight: "800"
  },
  docDone: {
    alignItems: "center"
  },
  docCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success
  },
  docDoneText: {
    marginTop: 5,
    color: colors.muted,
    ...typography.caption,
    fontWeight: "700"
  },
  fieldLabel: {
    marginTop: 22,
    marginBottom: 8,
    color: colors.muted,
    ...typography.meta,
    fontWeight: "800"
  },
  socialField: {
    height: 54,
    borderRadius: radii.field,
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    ...elevation.soft
  },
  socialInput: {
    color: colors.ink,
    ...typography.strong,
    fontWeight: "800",
    padding: 0
  },
  consentRow: {
    marginTop: 26,
    borderRadius: radii.notice,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
    backgroundColor: colors.soft
  },
  consentBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
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
    ...typography.meta,
    fontWeight: "700",
    lineHeight: 19
  },
  formError: {
    marginTop: 14,
    color: colors.danger,
    ...typography.meta,
    fontWeight: "700"
  },
  reviewNote: {
    marginTop: 18,
    color: colors.muted,
    ...typography.meta,
    textAlign: "center"
  },
  submitButton: { marginTop: 16 }
});
