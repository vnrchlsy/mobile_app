// US-N5 · Delete account. DELETE /me.
//
// Built for INFORMED consent rather than friction. The two columns say what is removed and
// what is kept anonymously (D-S7-1 keeps the welfare record because the FKs and §12.7 both
// require it), and the reason is stated plainly instead of buried in a policy.
//
// Per the design system the destructive button stays ENABLED even before the confirmation
// matches — a greyed-out button with no explanation gives the user nothing to press and no
// way to learn why. Pressing it without the word says what is missing.
//
// The 409 `has_active_commitments` renders IN PLACE as the blocked state (the designed
// `screen-delete-blocked`), because the list of what to close is the answer to the question
// the user just asked.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { Blocker, blockerCopy, blockerHeadline, confirmationMatches, CONFIRM_WORD } from "../settings";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  line: "#E3E1D9", danger: "#B23B3B", dangerBg: "#FBEEEC", ok: "#27500A",
  warn: "#8A5A12", warnBg: "#FAEEDA",
};
const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2,
};

const REMOVED = ["Your name and photo", "Phone, email and address", "Your pets and listings", "Saved places"];
const KEPT = ["Rescues you resolved", "Adoptions completed", "Shifts you volunteered", "Shown as “Deleted user”"];

type Props = NativeStackScreenProps<RootStackParamList, "deleteAccount">;

export function DeleteAccountScreen({ navigation }: Props) {
  const api = useApi();
  const { signOut } = useAuth();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [blockers, setBlockers] = useState<Blocker[] | null>(null);

  async function submit() {
    if (busy) return;
    if (!confirmationMatches(typed)) {
      // The button stayed enabled, so pressing it has to TEACH rather than do nothing.
      setError(`Type ${CONFIRM_WORD} above to confirm.`);
      return;
    }
    setBusy(true);
    setError(undefined);
    const res = await api.del("/me");
    setBusy(false);

    if (res.status === 204) {
      // Every token is already dead server-side; clearing them locally drops us straight to
      // the signed-out shell rather than bouncing off a 401 on the next screen.
      await signOut();
      return;
    }
    if (res.status === 409 && res.data?.error?.code === "has_active_commitments") {
      setBlockers(res.data.error.details?.blockers ?? []);
      return;
    }
    setError(res.status === 0 ? "You're offline — try again when you're connected."
                              : "That didn't work. Try again.");
  }

  if (blockers) return <Blocked blockers={blockers} navigation={navigation} onBack={() => setBlockers(null)} />;

  return (
    <View style={styles.screen}>
      <Header title="Delete account" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1} accessibilityRole="header">This can't be undone</Text>
        <Text style={styles.lede}>
          You have 30 days to change your mind. After that, your personal details are erased
          for good.
        </Text>

        <View style={styles.columns}>
          <Column heading="REMOVED" headingColor={colors.danger} dot={colors.danger} items={REMOVED} />
          <Column heading="KEPT, ANONYMOUS" headingColor={colors.ok} dot={colors.ok} items={KEPT} />
        </View>

        <Text style={styles.reason}>
          These stay so the animals' records stay whole. Nothing in them points back to you.
        </Text>

        <Text style={styles.fieldLabel}>TYPE {CONFIRM_WORD} TO CONFIRM</Text>
        <View style={styles.field}>
          <Text style={styles.fieldCaption}>CONFIRMATION</Text>
          <TextInput
            value={typed}
            onChangeText={(v) => { setTyped(v); setError(undefined); }}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
            placeholder={CONFIRM_WORD}
            placeholderTextColor="#C6C4BC"
            accessibilityLabel={`Type ${CONFIRM_WORD} to confirm deleting your account`}
          />
        </View>
        {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={submit}
          style={styles.dangerBtn}
          accessibilityRole="button"
          accessibilityLabel="Delete my account"
        >
          {busy ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.dangerBtnLabel}>Delete my account</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
          style={styles.outlineBtn}
          accessibilityRole="button"
          accessibilityLabel="Keep my account"
        >
          <Text style={styles.outlineBtnLabel}>Keep my account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Blocked({
  blockers, navigation, onBack,
}: {
  blockers: Blocker[];
  navigation: Props["navigation"];
  onBack: () => void;
}) {
  return (
    <View style={styles.screen}>
      <Header title="Delete account" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.warnCard} accessible accessibilityRole="alert">
          <Text style={styles.warnTitle}>{blockerHeadline(blockers.length)}</Text>
          <Text style={styles.warnBody}>
            People are counting on these. Close them and you can delete right after.
          </Text>
        </View>

        <Text style={styles.groupTitle}>OPEN COMMITMENTS</Text>
        {blockers.map((blocker) => {
          const copy = blockerCopy(blocker);
          return (
            <View key={blocker.id} style={styles.blockerCard} accessible
                  accessibilityLabel={`${copy.title}. ${blocker.detail ?? ""}. ${copy.action}`}>
              <Text style={styles.blockerTitle}>{copy.title}</Text>
              {blocker.detail ? <Text style={styles.blockerDetail}>{blocker.detail}</Text> : null}
              <Text style={styles.blockerAction}>{copy.action}</Text>
            </View>
          );
        })}

        <TouchableOpacity activeOpacity={0.85} onPress={onBack} style={styles.tealBtn}
                          accessibilityRole="button" accessibilityLabel="Try again">
          <Text style={styles.tealBtnLabel}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.goBack()} style={styles.outlineBtn}
                          accessibilityRole="button" accessibilityLabel="Back to settings">
          <Text style={styles.outlineBtnLabel}>Back to settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Column({
  heading, headingColor, dot, items,
}: {
  heading: string; headingColor: string; dot: string; items: string[];
}) {
  return (
    <View style={styles.column}>
      <Text style={[styles.columnHeading, { color: headingColor }]}>{heading}</Text>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View style={[styles.bullet, { backgroundColor: dot }]} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function Header({ title, navigation }: { title: string; navigation: Props["navigation"] }) {
  return (
    <View style={styles.header}>
      <Text style={styles.back} onPress={() => navigation.goBack()}
            accessibilityRole="button" accessibilityLabel="Go back">‹</Text>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  back: { width: 44, height: 44, borderRadius: 22, textAlign: "center", lineHeight: 42, fontSize: 26, fontWeight: "700", color: colors.ink, ...card },
  title: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "800", color: colors.ink, marginRight: 44 },
  content: { padding: 20, paddingBottom: 48 },
  h1: { fontSize: 26, fontWeight: "800", color: colors.ink, letterSpacing: -0.4 },
  lede: { fontSize: 15, color: colors.muted, marginTop: 8, lineHeight: 21 },
  columns: { flexDirection: "row", gap: 12, marginTop: 20 },
  column: { flex: 1, borderRadius: 18, padding: 16, ...card },
  columnHeading: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6, marginBottom: 12 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6, marginRight: 8 },
  bulletText: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 18 },
  reason: { fontSize: 13, color: colors.muted, marginTop: 16, lineHeight: 19 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 1.2, marginTop: 26 },
  field: { borderRadius: 18, paddingHorizontal: 18, paddingVertical: 12, marginTop: 8, ...card },
  fieldCaption: { fontSize: 11, fontWeight: "600", color: colors.muted, letterSpacing: 0.4 },
  input: { fontSize: 18, fontWeight: "700", color: colors.ink, paddingVertical: 4 },
  error: { fontSize: 13, color: colors.danger, marginTop: 8 },
  dangerBtn: { marginTop: 22, height: 56, borderRadius: 28, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },
  dangerBtnLabel: { fontSize: 17, fontWeight: "700", color: colors.white },
  outlineBtn: { marginTop: 12, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", ...card },
  outlineBtnLabel: { fontSize: 16, fontWeight: "700", color: colors.ink },
  tealBtn: { marginTop: 22, height: 56, borderRadius: 28, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  tealBtnLabel: { fontSize: 17, fontWeight: "700", color: colors.white },
  warnCard: { borderRadius: 18, backgroundColor: colors.warnBg, padding: 18 },
  warnTitle: { fontSize: 17, fontWeight: "800", color: colors.warn },
  warnBody: { fontSize: 14, color: colors.warn, marginTop: 6, lineHeight: 20 },
  groupTitle: { fontSize: 12, fontWeight: "700", color: colors.muted, letterSpacing: 1.4, marginTop: 24, marginBottom: 8 },
  blockerCard: { borderRadius: 18, padding: 16, marginBottom: 12, ...card },
  blockerTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
  blockerDetail: { fontSize: 13, color: colors.muted, marginTop: 4 },
  blockerAction: { fontSize: 13, fontWeight: "700", color: colors.teal, marginTop: 8 },
});
