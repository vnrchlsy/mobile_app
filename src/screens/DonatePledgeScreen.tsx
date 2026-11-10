// US-W2 · pledge to a shelter's wishlist need. A quantity stepper, then POST
// /needs/{id}/pledges; on success the screen becomes its own "pledged" confirmation
// (screen-donate-pledge -> screen-donate-pledged) rather than bouncing the giver away.
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ReactNode, useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { MAX_QTY, overPledgeWarning, pledgeErrorCopy, pledgeNextSteps, quantityLabel, remainingAfter } from "../community";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { SignupWall } from "../components/SignupWall";
import { setIntent } from "../guestIntent";
import { RootStackParamList } from "../navigation/types";
import { requestPushPrompt } from "../pushPrompt";
import { TAP_SLOP } from "../touch";
import { colors, dangerOnSurface, maxFontScale, pill, spacing, squircle, typography } from "../theme";
import { Button, Card, Field, ScreenHeader } from "../components/ui";


type Props = NativeStackScreenProps<RootStackParamList, "donatePledge">;

// What GET /needs/{id} adds to what the wishlist row already told us.
type NeedDetail = {
  status: string; unit?: string; quantity_needed: number; quantity_received: number;
  quantity_pledged: number; donation_instructions?: string | null;
};

// The shelter's own words on where and when to bring the items. Nothing renders when it is blank.
function DropOff({ text }: { text?: string | null }): ReactNode {
  const body = text?.trim();
  if (!body) return null;
  return (
    <Card style={styles.dropOff}>
      <Text style={styles.dropOffTitle} accessibilityRole="header">How to drop off</Text>
      <Text style={styles.dropOffBody}>{body}</Text>
    </Card>
  );
}

export function DonatePledgeScreen({ navigation, route }: Props) {
  const api = useApi();
  const { tokens } = useAuth();
  // AW8 · a guest sees the wall instead of a form that could only 401.
  const isGuest = tokens === null;
  const { needId, needTitle, shelterName } = route.params;
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [need, setNeed] = useState<NeedDetail | null>(null);
  const [needRes, setNeedRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [wallOpen, setWallOpen] = useState(isGuest);

  // The unit, what is already promised and the shelter's drop-off words. Secondary: if it fails (offline, a 500)
  // the form still works, it just has less to say. Only a 404 — the need or its shelter is gone — replaces the form. Refetched on focus and after a stale-data refusal.
  const loadNeed = useCallback(() => {
    if (isGuest) return;
    api.get(`/needs/${needId}`).then((r) => {
      setNeedRes({ ok: r.ok, status: r.status });
      if (r.ok) setNeed(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- api changes with the tokens; isGuest covers that
  }, [needId, isGuest]);
  useFocusEffect(useCallback(() => { loadNeed(); }, [loadNeed]));

  const needGone = loadState(needRes).kind === "gone";
  // B3 · the need is closed or fulfilled (the 409 reload tells us): the form could only 409 again, so it is not offered.
  const closedNeed = !!need && need.status !== "open";
  const unit = need?.unit || undefined;
  const remaining = need ? remainingAfter(need.quantity_needed, need.quantity_received, need.quantity_pledged) : 0;
  const overPledge = need ? overPledgeWarning(qty, remaining) : null;

  async function submit() {
    if (busy) return;
    if (isGuest) { setWallOpen(true); return; }
    setBusy(true);
    setError(null);
    const trimmed = note.trim();
    const res = await api.post(`/needs/${needId}/pledges`, { quantity: qty, ...(trimmed ? { note: trimmed } : {}) });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      requestPushPrompt("pledge");   // NQ6
      return;
    }
    const copy = pledgeErrorCopy(res.status, res.data?.error?.code);
    setError(copy.message);
    if (copy.reload) loadNeed();
    if (copy.wall) setWallOpen(true);
  }

  const wallSheet = (
    <SignupWall
      visible={wallOpen}
      action="donate"
      onCreateAccount={() => { setIntent("donate"); setWallOpen(false); navigation.navigate("accountType"); }}
      onLogin={() => { setWallOpen(false); navigation.navigate("signin"); }}
      onDismiss={() => setWallOpen(false)}
    />
  );

  if (done) {
    return (
      <View style={styles.screen}>
        <ScreenBackdrop />
        <ScrollView contentContainerStyle={styles.confirmWrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <View style={styles.checkTile}><Text style={styles.checkGlyph} allowFontScaling={false}>✓</Text></View>
          <Text style={styles.confirmTitle} maxFontSizeMultiplier={maxFontScale.title}>Pledge recorded</Text>
          <Text style={styles.confirmBody}>
            You pledged {quantityLabel(qty, unit)} to “{needTitle}”. Salamat sa pagtulong!
          </Text>
          {/* D1 (owner, 2026-10-27) · the wireframe's strip; not its summary row or Pledged chip — the sentence above names all that. */}
          <Card style={styles.nextCard}>
            <Text style={styles.nextTitle}>What happens next</Text>
            {pledgeNextSteps(shelterName).map((step, i) => (
              <View key={step} style={styles.nextRow}>
                <View style={styles.stepNumberDisc}>
                  <Text style={styles.stepNumber} allowFontScaling={false}>{i + 1}</Text>
                </View>
                <Text style={styles.nextText}>{step}</Text>
              </View>
            ))}
          </Card>
          <DropOff text={need?.donation_instructions} />
          <Button
            label="See my donations"
            onPress={() => navigation.navigate("myDonations")}
            style={styles.primaryBtn}
          />
          <Button label="Back to wishlist" onPress={() => navigation.goBack()} variant="secondary" style={styles.secondaryBtn} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="Pledge" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.needTitle} maxFontSizeMultiplier={maxFontScale.title}>{needTitle}</Text>
        <Text style={styles.shelter}>{shelterName}</Text>
        <Text style={styles.note}>
          A pledge is a promise to bring these — the shelter confirms once they receive them.
          You can cancel anytime before then.
        </Text>

        {isGuest ? (
          <Button label="Create an account or log in" onPress={() => setWallOpen(true)} style={styles.primaryBtn} />
        ) : needGone ? (
          <>
            {/* submit()'s own refusal (e.g. "This shelter's wishlist isn't available right now.") survives the reload that 404s too */}
            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
            <LoadStateView state={{ kind: "gone" }} subject="need" onBack={() => navigation.goBack()} />
          </>
        ) : closedNeed ? (
          <>
            <Text style={styles.error} accessibilityRole="alert">
              {error ?? pledgeErrorCopy(409, "need_not_open").message}
            </Text>
            <Button label="Back to wishlist" onPress={() => navigation.goBack()} variant="secondary" style={styles.secondaryBtn} />
          </>
        ) : (
          <>
            <Text style={styles.label}>How many can you give?</Text>
            <Card style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setQty((q) => Math.max(1, q - 1))} hitSlop={TAP_SLOP}
                accessibilityRole="button" accessibilityLabel="Decrease pledge quantity"
                accessibilityValue={{ now: qty }}>
                <Text style={styles.stepGlyph} allowFontScaling={false}>–</Text>
              </TouchableOpacity>
              <View style={styles.qtyBlock}>
                <Text style={styles.qty} maxFontSizeMultiplier={maxFontScale.code}>{qty}</Text>
                {unit ? <Text style={styles.unit} maxFontSizeMultiplier={maxFontScale.code}>{unit}</Text> : null}
              </View>
              <TouchableOpacity
                style={styles.stepBtn} onPress={() => setQty((q) => Math.min(MAX_QTY, q + 1))} hitSlop={TAP_SLOP}
                accessibilityRole="button" accessibilityLabel="Increase pledge quantity"
                accessibilityValue={{ now: qty }}>
                <Text style={styles.stepGlyph} allowFontScaling={false}>+</Text>
              </TouchableOpacity>
            </Card>
            {overPledge ? <Text style={styles.nudge}>{overPledge}</Text> : null}

            <Field label="Note for the shelter (optional)" value={note} onChangeText={setNote}
              maxLength={280} multiline numberOfLines={3} style={styles.noteField} />

            <DropOff text={need?.donation_instructions} />

            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

            <Button label="Pledge this" onPress={submit} loading={busy} style={styles.primaryBtn} />
          </>
        )}
      </ScrollView>
      {wallSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  needTitle: { color: colors.ink, ...typography.hero },
  shelter: { marginTop: 4, color: colors.teal, ...typography.strong, fontWeight: "700" },
  note: { marginTop: 14, color: colors.muted, ...typography.body, lineHeight: 21 },
  label: { marginTop: 26, marginBottom: 12, color: colors.muted, ...typography.meta, fontWeight: "600", letterSpacing: 0.4 },
  // A control track is a pill of its height, as SegmentedControl's is: 8 + 52 + 8.
  stepper: { flexDirection: "row", alignItems: "center", gap: 24, alignSelf: "flex-start", minHeight: 68, padding: 8, borderRadius: pill(68) },
  stepBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  stepGlyph: { color: colors.teal, fontSize: 30, fontWeight: "800", marginTop: -2 },
  qtyBlock: { alignItems: "center", minWidth: 40 },
  qty: { color: colors.ink, fontSize: 30, fontWeight: "800", minWidth: 40, textAlign: "center" },
  unit: { color: colors.muted, ...typography.meta, textAlign: "center" },
  nudge: { marginTop: 10, color: colors.muted, ...typography.meta, lineHeight: 20 },
  noteField: { marginTop: 22 },
  dropOff: { alignSelf: "stretch", marginTop: 18, padding: 18 },
  dropOffTitle: { color: colors.ink, ...typography.strong, fontWeight: "800" },
  dropOffBody: { marginTop: 6, color: colors.muted, ...typography.body, lineHeight: 21 },
  error: { marginTop: 18, color: colors.danger, ...typography.strong, fontWeight: "700", ...dangerOnSurface },
  primaryBtn: { marginTop: 30 },
  secondaryBtn: { marginTop: 14 },
  confirmWrap: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: 140, paddingBottom: 60, alignItems: "center" },
  checkTile: { width: 84, height: 84, borderRadius: squircle(84), backgroundColor: colors.successBg, alignItems: "center", justifyContent: "center" },
  checkGlyph: { color: colors.success, fontSize: 44, fontWeight: "800" },
  confirmTitle: { marginTop: 22, color: colors.ink, ...typography.hero },
  confirmBody: { marginTop: 12, color: colors.muted, ...typography.body, textAlign: "center" },
  nextCard: { alignSelf: "stretch", marginTop: 24, padding: 18 },
  nextTitle: { color: colors.ink, ...typography.strong, fontWeight: "800" },
  // Top-anchored, so at AX5 the number sits by a step's first line, not halfway down a wrapped one.
  nextRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 12 },
  // A fixed-shape disc (the number does not scale, like the ✓ tile); the step's own text does.
  stepNumberDisc: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  stepNumber: { color: colors.tealDark, ...typography.meta, fontWeight: "800" },
  // paddingTop 3.5: (28 pt disc − the body's 21 pt line) / 2, so a one-line step still centres on its disc.
  nextText: { flex: 1, paddingTop: 3.5, color: colors.ink, ...typography.body }
});
