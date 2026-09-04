import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { DocumentIcon } from "./components/AppIcons";
import { TopStatus } from "./components/TopStatus";
import { TAP_SLOP } from "./touch";

type ShelterScreenProps = {
  onBack: () => void;
  onNext: () => void;
};

type OrgType = "Shelter" | "Rescue" | "Clinic";

const orgTypes: OrgType[] = ["Shelter", "Rescue", "Clinic"];

export function ShelterSetupScreen({ onBack, onNext }: ShelterScreenProps) {
  const [organizationName, setOrganizationName] = useState("PAWS Manila");
  const [organizationType, setOrganizationType] = useState<OrgType>("Shelter");
  const [registrationNumber, setRegistrationNumber] = useState("CN-2019-0482");
  const [address, setAddress] = useState("12 Aurora Blvd, Marikina City");
  const [contactNumber, setContactNumber] = useState("917 123 4567");

  return (
    <View style={styles.screen}>
      <Header title="Set up your shelter" activeStep={0} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Tell us about your org</Text>
        <Text style={styles.caption}>This helps adopters trust your listings.</Text>

        <TouchableOpacity activeOpacity={0.82} style={styles.logoRow}>
          <View style={styles.logoCircle}><Text style={styles.pawGlyph}>♣</Text></View>
          <View>
            <Text style={styles.logoTitle}>Add organization logo</Text>
            <Text style={styles.logoCaption}>PNG or JPG, square works best.</Text>
          </View>
        </TouchableOpacity>

        <Field label="Organization name" value={organizationName} onChangeText={setOrganizationName} />

        <Text style={styles.label}>Organization type</Text>
        <View style={styles.chipRow}>
          {orgTypes.map((type) => (
            <TouchableOpacity hitSlop={TAP_SLOP} key={type} activeOpacity={0.8} onPress={() => setOrganizationType(type)} style={[styles.choiceChip, organizationType === type && styles.choiceChipActive]}>
              <Text style={[styles.choiceText, organizationType === type && styles.choiceTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Registration no. (SEC / DTI / LGU)" value={registrationNumber} onChangeText={setRegistrationNumber} />
        <Field label="Address" value={address} onChangeText={setAddress} />
        <PhoneField label="Contact number" value={contactNumber} onChangeText={setContactNumber} />

        <PrimaryButton label="Continue" onPress={onNext} style={styles.setupButton} />
      </ScrollView>
    </View>
  );
}

export function ShelterVerifyDocsScreen({ onBack, onNext }: ShelterScreenProps) {
  return (
    <View style={styles.screen}>
      <Header title="Verify your shelter" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.docsContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Upload documents</Text>
        <Text style={styles.caption}>Our admins review these to verify your org.{"\n"}Only Kupkop reviewers can see them.</Text>

        <DocumentRow title="Government ID" subtitle="Contact person's valid ID · Required" filename="juan-id.jpg" done />
        <DocumentRow title="SEC / DTI / LGU registration" subtitle="Proof your org is registered · Required" filename="sec-cert.pdf" done />
        <DocumentRow title="Proof of address" subtitle="Utility bill or clinic photo · Optional" />

        <Text style={styles.securityNote}>Files are stored securely (access-restricted).</Text>
        <PrimaryButton label="Submit for review" onPress={onNext} style={styles.docsButton} />
        <Text style={styles.reviewNote}>We'll notify you once it's reviewed.</Text>
      </ScrollView>
    </View>
  );
}

export function ShelterPendingScreen({ onBack, onNext }: ShelterScreenProps) {
  return (
    <View style={styles.screen}>
      <Header title="Verification" onBack={onBack} />
      <View style={styles.pendingContent}>
        <View style={styles.clockBig}>
          <View style={styles.clockFace}>
            <View style={styles.clockHandTall} />
            <View style={styles.clockHandWide} />
          </View>
        </View>
        <Text style={styles.pendingTitle}>Under review</Text>
        <Text style={styles.pendingText}>We're checking your documents.{"\n"}This usually takes 1–2 business days.</Text>

        <View style={styles.progressRow}>
          <ProgressStep status="done" label="Submitted" />
          <View style={styles.progressLine} />
          <ProgressStep status="active" label="In review" />
          <View style={styles.progressLine} />
          <ProgressStep status="idle" label="Approved" />
        </View>

        <View style={styles.waitCard}>
          <Text style={styles.waitTitle}>Keep going while you wait</Text>
          <Text style={styles.waitText}>Draft your listings now — they go live automatically once you're approved.</Text>
        </View>

        <PrimaryButton label="Go to dashboard" onPress={onNext} style={styles.dashboardButton} />
        <Text style={styles.submittedText}>Submitted 9 Jul 2026 · PAWS Manila</Text>
      </View>
    </View>
  );
}

function Header({ title, activeStep, onBack }: { title: string; activeStep?: 0 | 1 | 2; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TopStatus />
      <TouchableOpacity activeOpacity={0.75} onPress={onBack} style={styles.backButton} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {activeStep !== undefined && (
        <View style={styles.steps}>
          {[0, 1, 2].map((step) => <View key={step} style={[styles.stepDot, step <= activeStep && styles.stepActive]} />)}
        </View>
      )}
    </View>
  );
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} />
    </View>
  );
}

function PhoneField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.phoneInput}>
        <View style={styles.countryCode}><Text style={styles.countryCodeText}>+63</Text></View>
        <TextInput value={value} onChangeText={onChangeText} keyboardType="phone-pad" style={styles.phoneTextInput} />
      </View>
    </View>
  );
}

function DocumentRow({ title, subtitle, filename, done }: { title: string; subtitle: string; filename?: string; done?: boolean }) {
  return (
    <View style={styles.documentCard}>
      <View style={styles.documentBubble}><DocumentIcon color={colors.teal} /></View>
      <View style={styles.documentCopy}>
        <Text style={styles.documentTitle}>{title}</Text>
        <Text style={styles.documentSubtitle}>{subtitle}</Text>
      </View>
      {done ? (
        <View style={styles.doneBadge}><Text style={styles.doneText}>✓</Text></View>
      ) : (
        <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.8} style={styles.uploadButton}><Text style={styles.uploadText}>Upload</Text></TouchableOpacity>
      )}
      {filename && <Text style={styles.fileName}>{filename}</Text>}
    </View>
  );
}

function ProgressStep({ status, label }: { status: "done" | "active" | "idle"; label: string }) {
  return (
    <View style={styles.progressStep}>
      <View style={[styles.progressDot, status === "done" && styles.progressDone, status === "active" && styles.progressActive]}>
        {status === "done" && <Text style={styles.progressCheck}>✓</Text>}
        {status === "active" && <View style={styles.progressInner} />}
      </View>
      <Text style={[styles.progressLabel, status === "active" && styles.progressLabelActive]}>{label}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, style }: { label: string; onPress: () => void; style?: object }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.primaryButton, style]}>
      <Text style={styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

const colors = {
  ink: "#1F3A5F",
  teal: "#1C7876",
  page: "#F7F7F4",
  border: "#E3E1D9",
  muted: "#62615C",
  paleTeal: "#E5F0EE",
  green: "#2F681D"
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { height: 121 },
  backButton: { position: "absolute", left: 25, top: 45, width: 42, height: 42, zIndex: 10, justifyContent: "center" },
  backText: { color: colors.ink, fontSize: 34, fontWeight: "700", lineHeight: 34 },
  headerTitle: { marginTop: -3, color: colors.ink, fontSize: 16, fontWeight: "800", textAlign: "center" },
  steps: { marginTop: 23, flexDirection: "row", justifyContent: "center", gap: 18 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#D6DEDB" },
  stepActive: { backgroundColor: colors.teal },
  content: { paddingHorizontal: 26, paddingBottom: 32 },
  docsContent: { paddingHorizontal: 26, paddingTop: 35, paddingBottom: 36 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800", lineHeight: 28 },
  caption: { marginTop: 8, color: colors.muted, fontSize: 12, lineHeight: 18 },
  logoRow: { marginTop: 20, flexDirection: "row", alignItems: "center" },
  logoCircle: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: colors.paleTeal },
  pawGlyph: { color: colors.teal, fontSize: 24, fontWeight: "900", transform: [{ rotate: "180deg" }] },
  logoTitle: { marginLeft: 15, color: colors.teal, fontSize: 13, fontWeight: "800" },
  logoCaption: { marginTop: 8, marginLeft: 15, color: colors.muted, fontSize: 11 },
  fieldGroup: { marginTop: 14 },
  label: { marginBottom: 8, color: colors.ink, fontSize: 12, fontWeight: "800" },
  input: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 16, color: colors.ink, fontSize: 15, fontWeight: "800", backgroundColor: "#FFFFFF" },
  chipRow: { flexDirection: "row", gap: 10 },
  choiceChip: { height: 40, minWidth: 74, borderWidth: 1, borderColor: colors.border, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, backgroundColor: "#FFFFFF" },
  choiceChipActive: { borderColor: colors.teal, backgroundColor: colors.teal },
  choiceText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  choiceTextActive: { color: "#FFFFFF" },
  phoneInput: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, flexDirection: "row", overflow: "hidden", backgroundColor: "#FFFFFF" },
  countryCode: { width: 61, alignItems: "center", justifyContent: "center", backgroundColor: colors.paleTeal },
  countryCodeText: { color: colors.teal, fontSize: 15, fontWeight: "800" },
  phoneTextInput: { flex: 1, paddingHorizontal: 12, color: colors.ink, fontSize: 15, fontWeight: "800" },
  primaryButton: { height: 51, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  setupButton: { marginTop: 37 },
  documentCard: { minHeight: 84, marginTop: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 13, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#FFFFFF" },
  documentBubble: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: colors.paleTeal },
  documentCopy: { flex: 1, marginLeft: 16, paddingRight: 8 },
  documentTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  documentSubtitle: { marginTop: 8, color: colors.muted, fontSize: 10 },
  doneBadge: { position: "absolute", right: 18, top: 18, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#E1F2D3" },
  doneText: { color: colors.green, fontSize: 16, fontWeight: "900" },
  fileName: { position: "absolute", right: 17, bottom: 17, color: colors.muted, fontSize: 10 },
  uploadButton: { width: 70, height: 34, borderWidth: 1, borderColor: colors.teal, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  uploadText: { color: colors.teal, fontSize: 12, fontWeight: "800" },
  securityNote: { marginTop: 29, color: colors.muted, fontSize: 10 },
  docsButton: { marginTop: 42 },
  reviewNote: { marginTop: 13, color: "#B9B5AA", fontSize: 10, textAlign: "center" },
  pendingContent: { flex: 1, paddingHorizontal: 26, alignItems: "center", paddingTop: 91 },
  clockBig: { width: 106, height: 106, borderRadius: 53, alignItems: "center", justifyContent: "center", backgroundColor: colors.paleTeal },
  clockFace: { width: 62, height: 62, borderWidth: 3, borderColor: colors.teal, borderRadius: 31, alignItems: "center", justifyContent: "center" },
  clockHandTall: { width: 3, height: 23, backgroundColor: colors.teal, transform: [{ translateY: -8 }] },
  clockHandWide: { width: 16, height: 3, marginTop: -5, marginLeft: 13, backgroundColor: colors.teal },
  pendingTitle: { marginTop: 21, color: colors.ink, fontSize: 22, fontWeight: "800" },
  pendingText: { marginTop: 12, color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center" },
  progressRow: { width: "100%", marginTop: 45, flexDirection: "row", alignItems: "flex-start", justifyContent: "center" },
  progressStep: { width: 72, alignItems: "center" },
  progressDot: { width: 25, height: 25, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#CFD9D6" },
  progressDone: { backgroundColor: colors.teal },
  progressActive: { backgroundColor: colors.teal },
  progressInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" },
  progressCheck: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  progressLine: { flex: 1, height: 2, marginTop: 12, backgroundColor: colors.border },
  progressLabel: { marginTop: 7, color: colors.muted, fontSize: 10, textAlign: "center" },
  progressLabelActive: { color: colors.ink, fontWeight: "800" },
  waitCard: { width: "100%", minHeight: 95, marginTop: 36, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, backgroundColor: "#FFFFFF" },
  waitTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  waitText: { marginTop: 10, color: colors.muted, fontSize: 12, lineHeight: 20 },
  dashboardButton: { width: "100%", marginTop: 41 },
  submittedText: { marginTop: 12, color: "#B9B5AA", fontSize: 10 }
});
