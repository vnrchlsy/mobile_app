// US-C1 step 2 of 2 — the NGO papers. Reference: screens/user/screen-shelter-verify-tier2.png
// PATCH /shelter/profile { vet_name, vet_prc_number } (PRC 6–8 digits, format only) then
// POST /verifications { type:"shelter_org", bai_pending, documents:[...base, sec_dti, bai_cert?] }.
// Server enforces tier1 -> tier2 (409 tier1_incomplete) and the required set (422 missing_docs).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { pickAndUpload } from "../media/pickAndUpload";
import { CheckIcon, DocumentIcon } from "../components/AppIcons";
import { DOC_CONSENT_VERSION } from "../consent";
import { RootStackParamList, ShelterDoc } from "../navigation/types";
import { authColors } from "./AuthFormKit";

const PRC_RE = /^\d{6,8}$/;

type Props = NativeStackScreenProps<RootStackParamList, "shelterVerifyNgo">;

export function ShelterVerifyNgoScreen({ navigation, route }: Props) {
  const api = useApi();
  const { baseDocs, socialUrl } = route.params;

  const [sec, setSec] = useState<string | null>(null);
  const [bai, setBai] = useState<string | null>(null);
  const [baiPending, setBaiPending] = useState(false);
  const [vetName, setVetName] = useState("");
  const [prc, setPrc] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const prcValid = PRC_RE.test(prc.trim());
  // BAI is required unless the shelter is submitting SEC now and BAI later.
  const docsReady = !!sec && (baiPending || !!bai);
  const canSubmit = docsReady && vetName.trim().length > 0 && prcValid && !submitting;

  async function presign(): Promise<string | null> {
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

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const patch = await api.patch("/shelter/profile", { vet_name: vetName.trim(), vet_prc_number: prc.trim() });
      if (patch.status === 400) {
        setError("PRC number must be 6–8 digits.");
        return;
      }
      if (!patch.ok) {
        setError(patch.data?.error?.message ?? "Couldn't save the vet details. Try again.");
        return;
      }
      const documents: ShelterDoc[] = [...baseDocs, { doc_type: "sec_dti", file_url: sec! }];
      if (!baiPending && bai) documents.push({ doc_type: "bai_cert", file_url: bai });
      const res = await api.post("/verifications", {
        type: "shelter_org",
        social_proof_url: socialUrl,
        consent_version: DOC_CONSENT_VERSION,
        bai_pending: baiPending,
        documents
      });
      if (res.status === 409) {
        setError("Please add your base documents (Step 1) first.");
        return;
      }
      if (res.status === 422) {
        setError("Some required documents are missing. Check SEC and BAI and try again.");
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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NGO papers</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>NGO papers</Text>
        <Text style={styles.subheading}>Step 2 of 2 — the registration and vet details for a Verified Shelter.</Text>

        <DocSlot label="SEC / DTI registration" hint="Your registration certificate · Required" done={!!sec} busy={busy === "sec"} onPress={() => uploadInto("sec", setSec)} />
        <DocSlot
          label="BAI certificate"
          hint={baiPending ? "You'll send this later" : "Annual BAI licence · Required"}
          done={!!bai}
          busy={busy === "bai"}
          disabled={baiPending}
          onPress={() => uploadInto("bai", setBai)}
        />

        <TouchableOpacity activeOpacity={0.85} style={styles.pendingRow} onPress={() => setBaiPending((v) => !v)}>
          <View style={[styles.consentBox, baiPending && styles.consentBoxChecked]}>{baiPending && <CheckIcon color="#FFFFFF" size={13} />}</View>
          <Text style={styles.pendingText}>Our BAI licence is still processing — I'll send it later.</Text>
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>Vet name</Text>
        <View style={styles.field}>
          <TextInput value={vetName} onChangeText={setVetName} placeholder="Dr. Juan Cruz" placeholderTextColor="#9A988F" style={styles.input} />
        </View>
        <Text style={styles.fieldLabel}>Vet PRC number</Text>
        <View style={styles.field}>
          <TextInput value={prc} onChangeText={setPrc} placeholder="6–8 digits" placeholderTextColor="#9A988F" keyboardType="number-pad" style={styles.input} />
        </View>
        {prc.trim().length > 0 && !prcValid && <Text style={styles.formError}>PRC number must be 6–8 digits.</Text>}

        {!!error && <Text style={styles.formError}>{error}</Text>}

        <TouchableOpacity activeOpacity={0.85} style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} onPress={onSubmit} disabled={!canSubmit}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Submit for review</Text>}
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
  disabled
}: {
  label: string;
  hint: string;
  done: boolean;
  busy: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={[styles.docCard, disabled && styles.docCardDisabled]} onPress={onPress} disabled={busy || disabled}>
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
          <Text style={styles.docDoneText}>Done</Text>
        </View>
      ) : disabled ? (
        <Text style={styles.docMuted}>Later</Text>
      ) : (
        <Text style={styles.docUploadLink}>Upload</Text>
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
  docCardDisabled: { opacity: 0.55 },
  docIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.paleTeal },
  docCopy: { flex: 1, marginLeft: 14 },
  docTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  docSubtitle: { marginTop: 5, color: colors.muted, fontSize: 11 },
  docUploadLink: { color: authColors.teal, fontSize: 13, fontWeight: "800" },
  docMuted: { color: "#9A988F", fontSize: 13, fontWeight: "800" },
  docDone: { alignItems: "center" },
  docCheck: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#5B8A3A" },
  docDoneText: { marginTop: 5, color: colors.muted, fontSize: 10, fontWeight: "700" },
  pendingRow: {
    marginTop: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    backgroundColor: "#FAEEDA"
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
  pendingText: { flex: 1, color: "#633806", fontSize: 13, fontWeight: "700", lineHeight: 19 },
  fieldLabel: { marginTop: 20, marginBottom: 8, color: colors.muted, fontSize: 12, fontWeight: "800" },
  field: {
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
  input: { color: colors.ink, fontSize: 15, fontWeight: "800", padding: 0 },
  formError: { marginTop: 12, color: authColors.danger, fontSize: 13, fontWeight: "700" },
  submitButton: { height: 54, marginTop: 22, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: authColors.teal },
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" }
});
