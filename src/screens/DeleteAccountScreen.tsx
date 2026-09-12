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
import { colors, elevation, radii, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";

const card = {
  backgroundColor: colors.white, ...elevation.soft,
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
    <View style={styles.screen} testID="screen.deleteAccount">
      <Header title="Delete account" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1} accessibilityRole="header">This can't be undone</Text>
        <Text style={styles.lede}>
          You have 30 days to change your mind. After that, your personal details are erased
          for good.
        </Text>

        <View style={styles.columns}>
          <Column heading="REMOVED" headingColor={colors.danger} dot={colors.danger} items={REMOVED} />
          <Column heading="KEPT, ANONYMOUS" headingColor={colors.success} dot={colors.success} items={KEPT} />
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

        <Button
          label="Delete my account"
          onPress={submit}
          loading={busy}
          variant="destructive"
          style={styles.dangerBtn}
        />
        <Button
          testID="btn.back"
          label="Keep my account"
          onPress={() => navigation.goBack()}
          variant="secondary"
          style={styles.outlineBtn}
        />
      </ScrollView>
    </View>
  );
}

// Its own testID, and deliberately `state.` rather than `screen.` — the e2eSelectors guard
// enforces that every `screen.X` matches a registered route, which is what makes a failing
// flow point at the right screen. "Blocked from deleting" is a STATE of the deleteAccount
// route, not a route of its own, so it is named as one. US-W2 names this state explicitly,
// and sharing the screen's id would let a flow assert it reached the delete screen while it
// was actually looking at the refusal.
function Blocked({
  blockers, navigation, onBack,
}: {
  blockers: Blocker[];
  navigation: Props["navigation"];
  onBack: () => void;
}) {
  return (
      <View style={styles.screen} testID="state.deleteAccount.blocked">
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

        <Button label="Try again" onPress={onBack} style={styles.tealBtn} />
        <Button label="Back to settings" onPress={() => navigation.goBack()} variant="secondary" style={styles.outlineBtn} />
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
    <ScreenHeader title={title} onBack={() => navigation.goBack()} align="center" />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { padding: 20, paddingBottom: 48 },
  h1: { ...typography.hero, color: colors.ink },
  lede: { ...typography.body, color: colors.muted, marginTop: 8 },
  columns: { flexDirection: "row", gap: 12, marginTop: 20 },
  column: { flex: 1, borderRadius: radii.tile, padding: 16, ...card },
  columnHeading: { ...typography.meta, fontWeight: "800", letterSpacing: 0.6, marginBottom: 12 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6, marginRight: 8 },
  bulletText: { flex: 1, ...typography.meta, color: colors.ink, lineHeight: 18 },
  reason: { ...typography.meta, color: colors.muted, marginTop: 16, lineHeight: 19 },
  fieldLabel: { ...typography.label, color: colors.muted, marginTop: 26 },
  field: { borderRadius: radii.tile, paddingHorizontal: 18, paddingVertical: 12, marginTop: 8, ...card },
  fieldCaption: { ...typography.caption, fontWeight: "600", color: colors.muted, letterSpacing: 0.4 },
  input: { ...typography.subtitle, fontWeight: "700", color: colors.ink, paddingVertical: 4 },
  error: { ...typography.meta, color: colors.danger, marginTop: 8 },
  dangerBtn: { marginTop: 22 },
  outlineBtn: { marginTop: 12 },
  tealBtn: { marginTop: 22 },
  warnCard: { borderRadius: radii.tile, backgroundColor: colors.warningBg, padding: 18 },
  warnTitle: { ...typography.subtitle, fontWeight: "800", color: colors.warning },
  warnBody: { ...typography.meta, color: colors.warning, marginTop: 6, lineHeight: 20 },
  groupTitle: { ...typography.meta, fontWeight: "700", color: colors.muted, letterSpacing: 1.4, marginTop: 24, marginBottom: 8 },
  blockerCard: { borderRadius: radii.tile, padding: 16, marginBottom: 12, ...card },
  blockerTitle: { ...typography.subtitle, fontWeight: "800", color: colors.ink },
  blockerDetail: { ...typography.meta, color: colors.muted, marginTop: 4 },
  blockerAction: { ...typography.meta, fontWeight: "700", color: colors.teal, marginTop: 8 }
});
