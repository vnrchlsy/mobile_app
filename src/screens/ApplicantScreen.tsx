// Adoption · one applicant, from the poster's side (spec 2026-10-06 §2; artboard
// design/mobile-v3/Applicant.dc.html). Renders from GET /inquiries/{id}'s poster tier alone —
// no listing fetch, so an AD16-hidden listing never blanks it. Every decision is a pure helper
// in ../applicant.ts; this file only lays them out.
import { applicationRows } from "../inquireApplication";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";

import { PosterInquiry } from "../api/types";
import { useApi } from "../api/useApi";
import {
  ApplicantFooter, CHANGED_NOTE, FooterAction, actionPath, applicantFooter, applicantRefusal, askedAgo,
  confirmCopy, firstName, petName, posterLadderHeader, showStepsCard
} from "../applicant";
import { STAGE_ORDER, STAGE_STEP, ladderStageTone, stageMeta } from "../adoption";
import { CheckIcon } from "../components/AppIcons";
import { ConfirmModal } from "../components/ConfirmModal";
import { LoadStateView } from "../components/LoadStateView";
import { PersonActions } from "../components/PersonActions";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { DeclineSheet } from "../components/applicant/DeclineSheet";
import { StepSheet } from "../components/applicant/StepSheet";
import { Avatar, Button, Card, Chip, ScreenHeader } from "../components/ui";
import { loadState } from "../net";
import { composeForAdoptionPoster } from "../storyShare";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { colors, radii, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "applicant">;
type Pending = FooterAction | "release";

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("");
}

export function ApplicantScreen({ navigation, route }: Props) {
  const api = useApi();
  const { inquiryId } = route.params;
  const [row, setRow] = useState<PosterInquiry | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [stepKey, setStepKey] = useState<string | null>(null);
  // R6-F4 · at a large font scale (AX3 and up) the rows below wrap instead of squeezing a
  // `flex: 1` column beside a chip, a phone number or a step's meta text. Default size is untouched.
  const { fontScale } = useWindowDimensions();
  const large = fontScale > 1.5;

  const load = useCallback(() => {
    api.get(`/inquiries/${inquiryId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (!r.ok) return;
      if (r.data?.viewer === "adopter") { navigation.replace("inquiry", { inquiryId }); return; }
      setRow(r.data as PosterInquiry);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [inquiryId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function send(path: string, body: object = {}) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    const r = await api.post(`/inquiries/${inquiryId}/${path}`, body);
    setBusy(false);
    if (!r.ok) {
      const name = firstName(row?.adopter.display_name ?? "");
      const kind = applicantRefusal(r.data?.error?.code);
      if (kind === "phone") {
        Alert.alert("Add a phone number first", `So ${name} can reach you.`, [
          { text: "Not now", style: "cancel" },
          { text: "Verify phone", onPress: () => navigation.navigate("verifyPhone") }
        ]);
      } else if (kind === "badge") {
        setNotice(`We've asked ${name} to get verified.`);
      } else if (kind === "changed") {
        setNotice(CHANGED_NOTE);
      } else if (kind === "suspended") {
        setNotice(`${name}'s account is suspended. You can still decline.`);
      } else {
        Alert.alert("Couldn't do that", "Try again.");
      }
    }
    load();
  }

  function onPrimary(action: FooterAction) {
    if (action === "askVerify") { void send(actionPath(action)); return; }
    setConfirm(action);
  }

  if (!row) {
    return (
      <View style={styles.screen} testID="screen.applicant">
        <ScreenBackdrop />
        <ScreenHeader title="Applicant" onBack={() => navigation.goBack()} />
        <LoadStateView state={loadState(res)} subject="applicant" onRetry={load} onBack={() => navigation.goBack()} />
      </View>
    );
  }

  const footer: ApplicantFooter = applicantFooter(row);
  const storyParams = composeForAdoptionPoster(row);
  const header = posterLadderHeader(row);
  const pet = petName(row);
  const name = row.adopter.display_name;
  const open = row.status === "active";
  const canMove = open && row.kind !== "placement" && !!row.accepted_at;
  const byKey = new Map(row.stages.map((s) => [s.stage_key, s]));
  const confirmText = confirm ? confirmCopy(confirm, row) : null;

  return (
    <View style={styles.screen} testID="screen.applicant">
      <ScreenBackdrop />
      <ScreenHeader title="Applicant" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card} testID="card.applicant.adopter">
          <View style={[styles.personRow, large && styles.personRowLarge]}>
            <Avatar initials={initials(name)} size={52} />
            <View style={[styles.personText, large && styles.personTextLarge]}>
              <Text style={styles.name}>{name}</Text>
              {row.adopter.city ? <Text style={styles.meta}>{row.adopter.city}</Text> : null}
            </View>
            {row.adopter.verified_member ? <Chip label="Verified Member" tone="info" dot={false} /> : null}
          </View>
          <Text style={styles.forLine}>For {pet}{row.created_at ? ` · asked ${askedAgo(row.created_at, new Date())}` : ""}</Text>
          <PersonActions testID="row.applicant.person"
            person={{ name, accountId: row.adopter.account_id }}
            onReport={() => navigation.navigate("reportContent", {
              targetType: "account", targetId: row.adopter.account_id, subject: name,
              person: { name, accountId: row.adopter.account_id } })} />
        </Card>

        {row.message ? (
          <Card style={[styles.card, styles.quote]} testID="card.applicant.message">
            <Text style={styles.body}>“{row.message}”</Text>
          </Card>
        ) : null}

        {applicationRows(row.application).length > 0 ? (
          // AD8 · what the adopter said about their home, to screen them with.
          <Card style={styles.card} testID="card.applicant.answers">
            <Text style={styles.label}>Answers</Text>
            {applicationRows(row.application).map((a) => (
              <View key={a.label} style={styles.answerRow}>
                <Text style={styles.answerLabel}>{a.label}</Text>
                <Text style={styles.body}>{a.value}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {row.message || applicationRows(row.application).length > 0 ? (
          // Review step 7e · the one free-text channel between users. Only the poster sees it, so only the poster can report it.
          <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" testID="btn.applicant.reportMessage"
            accessibilityLabel={`Report ${name}'s message`} style={styles.reportMessage}
            onPress={() => navigation.navigate("reportContent", {
              targetType: "inquiry", targetId: inquiryId, subject: `${name}'s message`,
              person: { name, accountId: row.adopter.account_id } })}>
            <Text style={styles.reportMessageText}>Report this message</Text>
          </TouchableOpacity>
        ) : null}

        {open || row.status === "adopted" ? (
          <Card style={styles.card} testID="card.applicant.contact">
            <Text style={styles.label}>Contact</Text>
            {row.adopter_contact ? (
              row.adopter_contact.phone ? (
                <View style={[styles.contactRow, large && styles.contactRowLarge]}>
                  <View style={styles.contactText}>
                    <Text style={styles.contactName} testID="text.applicant.contactName">
                      {row.adopter_contact.name || name}
                    </Text>
                    <Text style={styles.phone} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} testID="text.applicant.phone">{row.adopter_contact.phone}</Text>
                  </View>
                  <Button label="Call" size="small" variant="secondary" testID="btn.applicant.call"
                    accessibilityLabel={`Call ${name}`}
                    onPress={() => { void Linking.openURL(`tel:${row.adopter_contact?.phone ?? ""}`); }} />
                </View>
              ) : (
                <Text style={styles.meta}>They haven&apos;t verified a phone number yet.</Text>
              )
            ) : (
              <Text style={styles.meta} testID="text.applicant.contactLocked">
                Their phone number appears once you accept them for screening.
              </Text>
            )}
          </Card>
        ) : null}

        {showStepsCard(row) ? (
          <Card style={styles.card}>
            <View style={[styles.stepsHead, large && styles.stepsHeadLarge]}>
              <Text style={styles.label}>Steps</Text>
              {header ? <Chip label={header.label} tone={header.tone} dot={false} /> : null}
            </View>
            {STAGE_ORDER.map((key) => {
              const stage = byKey.get(key);
              const st = stage?.state ?? "not_started";
              const tappable = canMove && key !== "inquiry";
              const tone = ladderStageTone(st, !open);
              return (
                <TouchableOpacity key={key} hitSlop={TAP_SLOP} accessibilityRole="button"
                  accessibilityState={{ disabled: !tappable }} testID={`row.applicant.${key}`}
                  style={styles.stepRow} onPress={tappable ? () => setStepKey(key) : undefined}>
                  <View style={[styles.stepDot, tone === "done" && styles.stepDone, tone === "active" && styles.stepActive]} />
                  <View style={[styles.stepText, large && styles.stepTextLarge]}>
                    <Text style={[styles.stepTitle, large && styles.stepTitleLarge]}>{STAGE_STEP[key].title}</Text>
                    <Text style={styles.stepMeta}>{stageMeta(st, stage?.updated_at)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {open && row.kind !== "placement" && !row.accepted_at ? (
              <Text style={styles.hint} testID="text.applicant.stepsHint">Accept them for screening to start the steps.</Text>
            ) : null}
          </Card>
        ) : null}

        {footer.doneNote ? (
          <Card
            style={[styles.card, footer.doneTone === "success" ? styles.doneSuccess : styles.doneNeutral]}
            testID="card.applicant.done"
          >
            {footer.doneTone === "success" ? (
              <View style={styles.doneRow}>
                <CheckIcon color={colors.success} size={18} />
                <Text style={[styles.body, styles.doneSuccessText]}>{footer.doneNote}</Text>
              </View>
            ) : (
              <Text style={styles.body}>{footer.doneNote}</Text>
            )}
            {/* Stories review step 11 (§5.7) · a completed adoption prompts a story for the poster or shelter too, not only the adopter: the same persistent
                button the adopter has, because an alert is gone the moment it is dismissed. */}
            {storyParams ? (
              <TouchableOpacity hitSlop={TAP_SLOP} style={styles.shareStory} activeOpacity={0.8} testID="btn.applicant.shareStory" accessibilityRole="button"
                onPress={() => navigation.navigate("storyCompose", storyParams)}>
                <Text style={styles.shareStoryLabel}>Share this adoption's story ›</Text>
              </TouchableOpacity>
            ) : null}
          </Card>
        ) : null}
        {notice || footer.note ? (
          <Text style={styles.note} testID="text.applicant.note">{notice ?? footer.note}</Text>
        ) : null}
        {footer.primary ? (
          <Button label={footer.primary.label} loading={busy} testID="btn.applicant.primary"
            onPress={() => onPrimary(footer.primary!.action)} style={styles.primary} />
        ) : null}
        {footer.secondary.includes("release") ? (
          <Button label="Release reservation" variant="secondary" testID="btn.applicant.release"
            onPress={() => setConfirm("release")} style={styles.secondary} />
        ) : null}
        {footer.secondary.includes("decline") ? (
          <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" testID="btn.applicant.decline"
            style={styles.declineLink} onPress={() => setDeclineOpen(true)}>
            <Text style={styles.declineLabel}>Decline applicant</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <ConfirmModal visible={!!confirm} title={confirmText?.title ?? ""} body={confirmText?.body ?? ""}
        confirmLabel={confirmText?.confirmLabel ?? "OK"} tone={confirmText?.tone}
        onConfirm={() => { const a = confirm!; setConfirm(null); void send(actionPath(a)); }}
        onCancel={() => setConfirm(null)} />
      <DeclineSheet visible={declineOpen} name={firstName(name)} busy={busy}
        onDecline={(reason) => { setDeclineOpen(false); void send("reject", { reason }); }}
        onClose={() => setDeclineOpen(false)} />
      <StepSheet stageKey={stepKey} state={stepKey ? byKey.get(stepKey)?.state ?? "not_started" : ""}
        name={firstName(name)} pet={pet} busy={busy}
        onMove={(state, note) => { const k = stepKey!; setStepKey(null); void send(`stages/${k}`, note ? { state, note } : { state }); }}
        onClose={() => setStepKey(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 48 },
  card: { marginTop: 14, padding: spacing.lg },
  quote: { backgroundColor: colors.soft },
  reportMessage: { marginTop: 12, alignSelf: "flex-start" },
  reportMessageText: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  answerRow: { marginTop: 10 },
  answerLabel: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  personRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  personText: { flex: 1 },
  personRowLarge: { flexWrap: "wrap", rowGap: 10 },
  personTextLarge: { flexGrow: 1, flexShrink: 1, flexBasis: 140 },
  name: { color: colors.ink, ...typography.title },
  meta: { marginTop: 3, color: colors.muted, ...typography.meta },
  forLine: { marginTop: 12, color: colors.muted, ...typography.meta, fontWeight: "700" },
  body: { color: colors.ink, ...typography.body },
  label: { color: colors.muted, ...typography.label },
  contactRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  contactText: { flex: 1 },
  contactRowLarge: { flexWrap: "wrap", rowGap: 10 },
  contactName: { color: colors.ink, ...typography.body, fontWeight: "800" },
  phone: { marginTop: 2, color: colors.teal, ...typography.body, fontWeight: "700" },
  doneSuccess: { backgroundColor: colors.successBg },
  doneNeutral: { backgroundColor: colors.greyPill },
  doneRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  shareStory: { alignSelf: "flex-start", marginTop: 12, minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: radii.chip, backgroundColor: colors.successBg },
  shareStoryLabel: { color: colors.success, ...typography.strong, fontWeight: "700" },
  doneSuccessText: { flex: 1, color: colors.success, fontWeight: "700" },
  stepsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  stepsHeadLarge: { flexWrap: "wrap", rowGap: 8 },
  stepRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 },
  // R6-F4 · title and meta share a row; at a large font scale they stack so the title gets the whole width
  stepText: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  stepTextLarge: { flexDirection: "column", alignItems: "flex-start", gap: 2, paddingVertical: 6 },
  stepDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.border },
  stepDone: { backgroundColor: colors.teal },
  stepActive: { backgroundColor: colors.tealBright },
  stepTitle: { flex: 1, color: colors.ink, ...typography.strong },
  stepTitleLarge: { flexGrow: 0, flexShrink: 1, flexBasis: "auto" },
  stepMeta: { color: colors.muted, ...typography.meta },
  hint: { marginTop: 8, color: colors.muted, ...typography.meta },
  note: { marginTop: 18, padding: 14, borderRadius: radii.notice, backgroundColor: colors.warningBg, color: colors.warningStrong, ...typography.meta, fontWeight: "700" },
  primary: { marginTop: 18 },
  secondary: { marginTop: 12 },
  declineLink: { alignSelf: "center", marginTop: 14, minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
  declineLabel: { color: colors.danger, ...typography.strong, fontWeight: "700" }
});
