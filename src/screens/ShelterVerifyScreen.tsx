// US-B4 (tier 1) / US-C1 step 1 (tier 2) — shelter documents.
// Reference: screens/user/screen-shelter-verify-tier1.png, screen-shelter-verify-tier1-ngo.png
// tier 1 (community_rescue): submit POST /verifications now, or defer -> shelter-dashboard-incomplete.
// tier 2 (registered_ngo): NEVER "Submit for review" here — gather the base set and Continue to the
//   NGO papers (step 2), which submits base + SEC/BAI in one request (server enforces tier1 -> tier2).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { pickAndUpload } from "../media/pickAndUpload";
import { CheckIcon, DocumentIcon } from "../components/AppIcons";
import { DOC_CONSENT_VERSION } from "../consent";
import { RootStackParamList, ShelterDoc } from "../navigation/types";
import { authColors } from "./AuthFormKit";

const MIN_PHOTOS = 3;

type Props = NativeStackScreenProps<RootStackParamList, "shelterVerify">;

export function ShelterVerifyScreen({ navigation, route }: Props) {
  const api = useApi();
  const isNgo = route.params.tier === "registered_ngo";

  const [govId, setGovId] = useState<string | null>(null);
  const [billing, setBilling] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [social, setSocial] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const baseComplete = !!govId && !!billing && photos.length >= MIN_PHOTOS && social.trim().length > 0 && consent;

  async function presign(): Promise<string | null> {
    // null = the person cancelled or declined the permission — an ordinary outcome, not an
    // error, and the caller renders nothing for it.
    const res = await pickAndUpload(api, "verification_doc");
    return res?.ok ? res.fileUrl : null;
  }

  async function uploadInto(slot: string, set: (url: string) => void) {
    if (busy) return;
    setBusy(slot);
    setError(undefined);
    try {
      const url = await presign();
      if (url) set(url);
      else setError("Couldn't prepare the upload. Try again.");
    } finally {
      setBusy(null);
    }
  }

  function baseDocs(): ShelterDoc[] {
    return [
      { doc_type: "gov_id", file_url: govId! },
      { doc_type: "proof_billing", file_url: billing! },
      ...photos.map((file_url) => ({ doc_type: "rescue_photos", file_url }))
    ];
  }

  async function onPrimary() {
    if (!baseComplete || submitting) return;
    if (isNgo) {
      // Step 1 of 2: hand the base set to the NGO step; it submits everything together.
      navigation.navigate("shelterVerifyNgo", { baseDocs: baseDocs(), socialUrl: social.trim() });
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await api.post("/verifications", {
        type: "shelter_org",
        social_proof_url: social.trim(),
        consent_version: DOC_CONSENT_VERSION,
        documents: baseDocs()
      });
      if (res.status === 422) {
        setError("Some required documents are missing. Add all three photos and try again.");
        return;
      }
      if (res.ok) {
        navigation.reset({ index: 0, routes: [{ name: "shelterDashboard" }] });
        return;
      }
      setError(res.data?.error?.message ?? "Couldn't submit for review. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function onDefer() {
    // Deferral persists NO verification_request — the dashboard derives "Documents not sent yet".
    navigation.reset({ index: 0, routes: [{ name: "shelterDashboard" }] });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Get verified</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{isNgo ? "Base checks" : "Prove you're real"}</Text>
        <Text style={styles.subheading}>{isNgo ? "Step 1 of 2 — the base documents every shelter shares." : "A few documents and our team takes it from here."}</Text>

        <DocSlot label="Government ID" hint="A clear photo of your ID · Required" done={!!govId} busy={busy === "gov"} onPress={() => uploadInto("gov", setGovId)} />
        <DocSlot label="Proof of billing" hint="Shows your real address · Required" done={!!billing} busy={busy === "bill"} onPress={() => uploadInto("bill", setBilling)} />
        <DocSlot
          label="Rescue-space photos"
          hint={`Where the animals are kept · ${photos.length}/${MIN_PHOTOS} added`}
          done={photos.length >= MIN_PHOTOS}
          busy={busy === "photo"}
          actionLabel={photos.length >= MIN_PHOTOS ? "Add more" : "Add photo"}
          onPress={() => uploadInto("photo", (url) => setPhotos((p) => [...p, url]))}
        />

        <Text style={styles.fieldLabel}>Social link</Text>
        <View style={styles.socialField}>
          <TextInput
            value={social}
            onChangeText={setSocial}
            placeholder="facebook.com/your.shelter"
            placeholderTextColor="#9A988F"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.socialInput}
          />
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.consentRow} onPress={() => setConsent((v) => !v)}>
          <View style={[styles.consentBox, consent && styles.consentBoxChecked]}>{consent && <CheckIcon color="#FFFFFF" size={13} />}</View>
          <Text style={styles.consentText}>I consent to Kupkop PH collecting these documents solely to verify our organisation.</Text>
        </TouchableOpacity>

        {!!error && <Text style={styles.formError}>{error}</Text>}

        <TouchableOpacity activeOpacity={0.85} style={[styles.submitButton, !baseComplete && styles.submitButtonDisabled]} onPress={onPrimary} disabled={!baseComplete || submitting}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{isNgo ? "Continue to NGO papers" : "Submit for review"}</Text>}
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.75} onPress={onDefer}>
          <Text style={styles.deferLink}>I'll upload these later</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function DocSlot({
  label,
  hint,
  done,
  busy,
  onPress,
  actionLabel = "Upload"
}: {
  label: string;
  hint: string;
  done: boolean;
  busy: boolean;
  onPress: () => void;
  actionLabel?: string;
}) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.docCard} onPress={onPress} disabled={busy}>
      <View style={styles.docIcon}>
        <DocumentIcon color={authColors.teal} />
      </View>
      <View style={styles.docCopy}>
        <Text style={styles.docTitle}>{label}</Text>
        <Text style={styles.docSubtitle}>{hint}</Text>
      </View>
      {busy ? (
        <ActivityIndicator color={authColors.teal} />
      ) : done ? (
        <View style={styles.docDone}>
          <View style={styles.docCheck}>
            <CheckIcon color="#FFFFFF" size={12} />
          </View>
          <Text style={styles.docDoneText}>{actionLabel === "Add more" ? "Add more" : "Done"}</Text>
        </View>
      ) : (
        <Text style={styles.docUploadLink}>{actionLabel}</Text>
      )}
    </TouchableOpacity>
  );
}

const colors = { ink: "#12213A", muted: "#5F5E5A", tealDark: "#14504F", paleTeal: "#E7F0EE" };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F5F2" },
  header: { height: 96, alignItems: "center", justifyContent: "flex-end", paddingBottom: 14 },
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
  backText: { color: colors.ink, fontSize: 26, fontWeight: "700", lineHeight: 28 },
  headerTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingBottom: 60 },
  heading: { marginTop: 6, color: colors.ink, fontSize: 24, fontWeight: "800" },
  subheading: { marginTop: 6, color: colors.muted, fontSize: 14, lineHeight: 20 },
  docCard: {
    minHeight: 84,
    marginTop: 16,
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
  docIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.paleTeal },
  docCopy: { flex: 1, marginLeft: 14 },
  docTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  docSubtitle: { marginTop: 5, color: colors.muted, fontSize: 11 },
  docUploadLink: { color: authColors.teal, fontSize: 13, fontWeight: "800" },
  docDone: { alignItems: "center" },
  docCheck: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#5B8A3A" },
  docDoneText: { marginTop: 5, color: colors.muted, fontSize: 10, fontWeight: "700" },
  fieldLabel: { marginTop: 22, marginBottom: 8, color: colors.muted, fontSize: 12, fontWeight: "800" },
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
  socialInput: { color: colors.ink, fontSize: 15, fontWeight: "800", padding: 0 },
  consentRow: {
    marginTop: 22,
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
    borderColor: authColors.teal,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  consentBoxChecked: { backgroundColor: authColors.teal },
  consentText: { flex: 1, color: colors.tealDark, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  formError: { marginTop: 14, color: authColors.danger, fontSize: 13, fontWeight: "700" },
  submitButton: { height: 54, marginTop: 20, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: authColors.teal },
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  deferLink: { marginTop: 18, color: "#08716D", fontSize: 13, fontWeight: "800", textAlign: "center" }
});
