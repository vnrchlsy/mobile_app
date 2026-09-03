// US-Q1 · upload (or replace) the shelter's donation QR. Draft-first like listings
// (decision 2's pattern) — this works before the org is approved; POST /shelter/
// donation-qr doesn't check verification. The public donate surface (US-Q2) is the
// separate, always-both-keys gate (org approved AND this QR reviewer-verified).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { pickAndUpload } from "../media/pickAndUpload";
import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  line: "#E3E1D9", danger: "#B23B3B", fine: "#9a988f"
};

const PROVIDERS = ["gcash", "maya"] as const;
const PROVIDER_LABEL: Record<(typeof PROVIDERS)[number], string> = { gcash: "GCash", maya: "Maya" };

type Props = NativeStackScreenProps<RootStackParamList, "donationQr">;

export function DonationQrScreen({ navigation }: Props) {
  const api = useApi();
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]>("gcash");
  const [accountName, setAccountName] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function addQrImage() {
    if (uploading) return;
    setUploading(true);
    const res = await pickAndUpload(api, "donation_qr");
    setUploading(false);
    if (res?.ok) setQrUrl(res.fileUrl);
  }

  async function submit() {
    if (submitting) return;
    if (!accountName.trim()) { setError("Enter the name on the receiving account."); return; }
    if (!qrUrl) { setError("Add the QR image."); return; }
    setSubmitting(true);
    setError(undefined);

    const res = await api.post("/shelter/donation-qr", {
      provider, account_name: accountName.trim(), file_url: qrUrl
    });

    setSubmitting(false);
    if (res.ok) {
      navigation.goBack();
      return;
    }
    setError(res.data?.error?.message ?? "Couldn't save. Try again.");
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}>
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Donation QR</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.draftNote}>
          Reviewed before donations go live. Replacing the QR image sends it back for review.
        </Text>

        <Text style={styles.label}>Payment app</Text>
        <View style={styles.segTrack}>
          {PROVIDERS.map((p) => {
            const active = p === provider;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.segItem, active && styles.segItemActive]}
                onPress={() => setProvider(p)}
                activeOpacity={0.85}
              >
                <Text style={[styles.segText, active && styles.segTextActive]}>{PROVIDER_LABEL[p]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Name on the account</Text>
        <TextInput
          style={styles.input}
          value={accountName}
          onChangeText={setAccountName}
          placeholder="Marikina Animal Welfare Group"
          placeholderTextColor={colors.fine}
        />

        <Text style={styles.label}>QR image</Text>
        <TouchableOpacity style={styles.photoBtn} onPress={addQrImage} activeOpacity={0.85}>
          {uploading ? <ActivityIndicator color={colors.teal} />
            : <Text style={styles.photoText}>{qrUrl ? "✓ QR added" : "Add the QR image"}</Text>}
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.submit} onPress={submit} activeOpacity={0.9} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.submitText}>Save</Text>}
        </TouchableOpacity>
      </ScrollView>
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
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  draftNote: { marginTop: 4, marginBottom: 6, color: colors.teal, fontSize: 13, fontWeight: "600", lineHeight: 19 },
  label: { marginTop: 20, marginBottom: 10, color: colors.ink, fontSize: 15, fontWeight: "700" },
  input: { height: 52, borderRadius: 16, paddingHorizontal: 16, color: colors.ink, fontSize: 16, ...card },
  segTrack: { flexDirection: "row", backgroundColor: "#ECEAE3", borderRadius: 16, padding: 4, gap: 4 },
  segItem: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  segItemActive: { ...card },
  segText: { color: colors.muted, fontSize: 15, fontWeight: "700" },
  segTextActive: { color: colors.ink },
  photoBtn: { height: 90, borderRadius: 20, borderWidth: 2, borderColor: colors.line, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoText: { color: colors.teal, fontSize: 16, fontWeight: "700" },
  error: { marginTop: 18, color: colors.danger, fontSize: 15, fontWeight: "600" },
  submit: { marginTop: 26, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  submitText: { color: colors.white, fontSize: 20, fontWeight: "700" }
});
