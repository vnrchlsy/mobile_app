// US-B2 — set up the organisation. Reference: screens/user/screen-shelter-setup.png
// POST /shelter/profile { org_name, org_type, tier, registration_type?, registration_number?,
//   address:{ line1?, barangay?, city } } -> 201 { shelter_profile_id } · 409 if it already exists.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { AuthHeader, FormField, PrimaryButton, SHELTER_STEP_COUNT, authColors } from "./AuthFormKit";
import { TAP_SLOP } from "../touch";

type Props = NativeStackScreenProps<RootStackParamList, "shelterSetup">;

const ORG_TYPES = [
  { value: "shelter", label: "Shelter" },
  { value: "rescue", label: "Rescue" },
  { value: "pound", label: "Pound" }
];
const REG_TYPES = [
  { value: "", label: "None" },
  { value: "SEC", label: "SEC" },
  { value: "DTI", label: "DTI" },
  { value: "BIR", label: "BIR" }
];

export function ShelterSetupScreen({ navigation, route }: Props) {
  const api = useApi();
  const { tier } = route.params;

  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("shelter");
  const [regType, setRegType] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [city, setCity] = useState("");
  const [line1, setLine1] = useState("");
  const [barangay, setBarangay] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const [orgNameError, setOrgNameError] = useState<string | undefined>(undefined);
  const [cityError, setCityError] = useState<string | undefined>(undefined);

  /**
   * Design-system rule: NEVER disable a submit button because of validation. A greyed button
   * gives a person nothing to press and no explanation. `submitting` still blocks — a request
   * in flight is not a validation error.
   */
  async function onSubmit() {
    if (submitting) return;
    setError(undefined);
    const missingOrg = orgName.trim().length === 0 ? "Enter your organization's name." : undefined;
    const missingCity = city.trim().length === 0 ? "Enter your city." : undefined;
    setOrgNameError(missingOrg);
    setCityError(missingCity);
    if (missingOrg || missingCity) return;
    // registration_number is required only when a registration type is chosen (a community
    // rescue may have neither) — mirror the server rule so the user isn't bounced by a 400.
    if (regType && !regNumber.trim()) {
      setError("Enter your registration number, or set the type to None.");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        org_name: orgName.trim(),
        org_type: orgType,
        tier,
        address: {
          city: city.trim(),
          ...(line1.trim() ? { line1: line1.trim() } : {}),
          ...(barangay.trim() ? { barangay: barangay.trim() } : {})
        }
      };
      if (regType) {
        body.registration_type = regType;
        body.registration_number = regNumber.trim();
      }
      const res = await api.post("/shelter/profile", body);
      if (res.status === 409) {
        // A profile already exists (e.g. resuming) — move on rather than dead-ending.
        navigation.navigate("shelterContact", { tier });
        return;
      }
      if (res.ok) {
        navigation.navigate("shelterContact", { tier });
        return;
      }
      setError(res.data?.error?.message ?? "Couldn't save your organisation. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AuthHeader title="Set up your shelter" activeStep={1} stepCount={SHELTER_STEP_COUNT} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Tell us about your org</Text>
        <Text style={styles.caption}>This is what adopters and donors will see.</Text>

        <FormField label="Organization name" value={orgName} error={orgNameError}
          onChangeText={(v) => { setOrgName(v); if (orgNameError) setOrgNameError(undefined); }}
          autoCapitalize="words" />

        <Text style={styles.groupLabel}>Type</Text>
        <ChipRow options={ORG_TYPES} value={orgType} onChange={setOrgType} />

        <Text style={styles.groupLabel}>Registration (optional)</Text>
        <ChipRow options={REG_TYPES} value={regType} onChange={setRegType} />
        {!!regType && (
          <FormField label={`${regType} registration no.`} value={regNumber} onChangeText={setRegNumber} autoCapitalize="characters" />
        )}

        <FormField label="City" value={city} error={cityError}
          onChangeText={(v) => { setCity(v); if (cityError) setCityError(undefined); }}
          autoCapitalize="words" />
        <FormField label="Street address (optional)" value={line1} onChangeText={setLine1} autoCapitalize="words" />
        <FormField label="Barangay (optional)" value={barangay} onChangeText={setBarangay} autoCapitalize="words" />

        {!!error && <Text style={styles.formError}>{error}</Text>}

        <PrimaryButton label="Continue" onPress={onSubmit} loading={submitting} style={styles.submit} />
        <Text style={styles.next}>Next: how people reach you</Text>
      </ScrollView>
    </View>
  );
}

function ChipRow({
  options,
  value,
  onChange
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity hitSlop={TAP_SLOP}
            key={opt.label}
            activeOpacity={0.85}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.page },
  content: { paddingHorizontal: 28, paddingBottom: 60 },
  title: { color: authColors.ink, fontSize: 24, fontWeight: "800", lineHeight: 30 },
  caption: { marginTop: 5, color: authColors.muted, fontSize: 14, lineHeight: 20 },
  groupLabel: { marginTop: 20, marginBottom: 4, color: authColors.ink, fontSize: 12, fontWeight: "800" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: "#FFFFFF"
  },
  chipActive: { borderColor: authColors.teal, backgroundColor: authColors.paleTeal },
  chipText: { color: authColors.muted, fontSize: 13, fontWeight: "800" },
  chipTextActive: { color: authColors.tealDark },
  formError: { marginTop: 14, color: authColors.danger, fontSize: 13, fontWeight: "700" },
  submit: { marginTop: 26 },
  next: { marginTop: 14, color: "#9A988F", fontSize: 12, textAlign: "center" }
});
