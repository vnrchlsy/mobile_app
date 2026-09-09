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
      <View style={styles.header}>
        <TouchableOpacity
 testID="btn.back"          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
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
                <CheckIcon color="#FFFFFF" size={12} />
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
            placeholderTextColor="#9A988F"
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
            {consent && <CheckIcon color="#FFFFFF" size={13} />}
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
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Submit for review</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const colors = {
  ink: "#12213A",
  teal: "#1C6B6B",
  tealDark: "#14504F",
  page: "#F4F5F2",
  border: "#E3E1D9",
  muted: "#5F5E5A",
  danger: "#B23B3B",
  paleTeal: "#E7F0EE"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  header: {
    height: 96,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 14
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
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  backText: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 28
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  content: {
    paddingHorizontal: 26,
    paddingBottom: 60
  },
  heading: {
    marginTop: 6,
    color: colors.ink,
    fontSize: 24,
    fontWeight: "800"
  },
  subheading: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 14
  },
  docCard: {
    minHeight: 84,
    marginTop: 24,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paleTeal
  },
  docCopy: {
    flex: 1,
    marginLeft: 14
  },
  docTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  docSubtitle: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 11
  },
  docUploadLink: {
    color: colors.teal,
    fontSize: 13,
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
    backgroundColor: "#5B8A3A"
  },
  docDoneText: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700"
  },
  fieldLabel: {
    marginTop: 22,
    marginBottom: 8,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  socialField: {
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  socialInput: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    padding: 0
  },
  consentRow: {
    marginTop: 26,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
    backgroundColor: colors.paleTeal
  },
  consentBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  consentBoxChecked: {
    backgroundColor: colors.teal
  },
  consentText: {
    flex: 1,
    color: colors.tealDark,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
  },
  formError: {
    marginTop: 14,
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700"
  },
  reviewNote: {
    marginTop: 18,
    color: colors.muted,
    fontSize: 12,
    textAlign: "center"
  },
  submitButton: {
    height: 54,
    marginTop: 16,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  submitButtonDisabled: {
    opacity: 0.5
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  }
});
