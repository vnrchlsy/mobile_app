// US-B3 — be reachable, and prove it. Reference: screens/user/screen-shelter-setup-contact.png
// PATCH /shelter/profile { contact_person_name, contact_person_role, official_phone, website_url? }
// then POST /me/phone { phone } (sends SMS) -> phone is SMS-verified on the next screen.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { AuthHeader, FormField, PrimaryButton, SHELTER_STEP_COUNT, authColors } from "./AuthFormKit";

type Props = NativeStackScreenProps<RootStackParamList, "shelterContact">;

export function ShelterContactScreen({ navigation, route }: Props) {
  const api = useApi();
  const { tier } = route.params;

  const [name, setName] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  // ⚠️ US-R4 · NOT a detail route — this is FORM PREFILL, and it belongs to US-R5.
  // @loadStateExempt form prefill, not a detail route — a blank editable field is the
  // safe failure here; US-R5 owns the dangerous one (empty default saved over real data).
  //
  // The distinction matters: a detail route that fails should say so and offer a retry. A
  // form that fails to prefill must NOT, because the screen is still perfectly usable — the
  // field just stays blank and editable, which is the safe direction. What R5 has to check
  // is the opposite failure, an empty default rendered OVER real data and then saved.
  //
  // Prefilled from the signup name — without this the shelter is asked for a name it just
  // gave, which reads as the form having lost it. Editable, because the public contact isn't
  // always the admin who created the account.
  useEffect(() => {
    let alive = true;
    api.get("/me").then((r) => {
      if (alive && r.ok && r.data.display_name) {
        setName((current) => (current ? current : r.data.display_name));
        setPrefilled(true);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const canSubmit = name.trim().length > 0 && phone.trim().length > 0 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    setError(undefined);
    setSubmitting(true);
    try {
      const patch = await api.patch("/shelter/profile", {
        contact_person_name: name.trim(),
        contact_person_role: role.trim(),
        official_phone: phone.trim(),
        ...(website.trim() ? { website_url: website.trim() } : {})
      });
      if (!patch.ok) {
        setError(patch.data?.error?.message ?? "Couldn't save your contact details. Try again.");
        return;
      }
      const sms = await api.post("/me/phone", { phone: phone.trim() });
      if (sms.status === 409) {
        setError("That number can't be used. Try another.");
        return;
      }
      if (!sms.ok) {
        setError(sms.data?.error?.message ?? "Couldn't send the code. Try again.");
        return;
      }
      navigation.navigate("shelterPhoneVerify", { tier, phone: phone.trim() });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AuthHeader title="Contact details" activeStep={1} stepCount={SHELTER_STEP_COUNT} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>How can people reach you?</Text>
        <Text style={styles.caption}>Adopters see this — and our reviewers check it. We'll text a code to verify the number.</Text>

        <FormField
          label={prefilled ? "Contact person (from your account)" : "Contact person"}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <FormField label="Role (optional)" value={role} onChangeText={setRole} autoCapitalize="words" />
        <FormField label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <FormField label="Website / Facebook (optional)" value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" />

        {!!error && <Text style={styles.formError}>{error}</Text>}

        <PrimaryButton label="Send code" onPress={onSubmit} disabled={!canSubmit} loading={submitting} style={styles.submit} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.page },
  content: { paddingHorizontal: 28, paddingBottom: 60 },
  title: { color: authColors.ink, fontSize: 24, fontWeight: "800", lineHeight: 30 },
  caption: { marginTop: 5, color: authColors.muted, fontSize: 14, lineHeight: 20 },
  formError: { marginTop: 14, color: authColors.danger, fontSize: 13, fontWeight: "700" },
  submit: { marginTop: 26 }
});
