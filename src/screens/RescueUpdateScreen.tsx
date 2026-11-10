// US-K2 · work a claimed case toward safe/resolved. Reference: screens/user/screen-rescue-update.png.
// S8/S9 (dev/sagip-build-review.md) · this is the screen a rescuer has open in the field, so it
// carries what finding the animal takes — the photo, the reporter's notes and landmark, a way
// into Maps — and, while the claim can still lapse, how long is left to post an update.
// POST /cases/{id}/status. Forward-only (the backend allows skipping ahead, not just one
// step at a time — see advanceableStatuses in ../sagip) and `resolved` is terminal.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { ReportDetail, StrayStatus } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { ReportRemovedCard } from "../components/sagip/ReportRemovedCard";
import { loadState } from "../net";
import { pickAndUpload } from "../media/pickAndUpload";
import { uploadErrorMessage } from "../upload";
import { RootStackParamList } from "../navigation/types";
import {
  RELEASE_REASONS, ReleaseReason, advanceableStatuses, caseScreenState, claimDeadline, directionsUrl, endedCaseLine,
  handoffCancelMessage, handoffCard, closeInquiriesPrompt, closedInquiriesDone, isReportRemoved, sagipTitle, strayChip,
} from "../sagip";
import { useLargeText } from "../useLargeText";
import { colors, maxFontScale, radii, spacing, typography } from "../theme";
import { composeForRescue } from "../storyShare";
import { TAP_SLOP } from "../touch";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Card, Field, ScreenHeader } from "../components/ui";
import { ContactShareRow } from "../components/sagip/ContactShareRow";
import { RescuePeople } from "../components/sagip/RescuePeople";

const TONE = {
  amber: { bg: colors.warningBg, fg: colors.warningStrong }, teal: { bg: colors.infoBg, fg: colors.tealDark },
  green: { bg: colors.successBg, fg: colors.success }, grey: { bg: colors.greyPill, fg: colors.muted }
} as const;
const STATUS_LABEL: Record<StrayStatus, string> = {
  reported: "Reported", claimed: "Claimed", rescued: "Rescued", safe: "Safe", resolved: "Resolved"
};

type Props = NativeStackScreenProps<RootStackParamList, "rescueUpdate">;

export function RescueUpdateScreen({ navigation, route }: Props) {
  // At Dynamic Type AX3 and up the two hand-off buttons cannot share a line, so they stack.
  const large = useLargeText();
  const api = useApi();
  const { caseId, reportId } = route.params;
  const [report, setReport] = useState<ReportDetail | null>(null);
  // US-R5 · "Case not found." was shown for every failure — to a RESCUER HOLDING AN ACTIVE
  // CLAIM on a stray, on the one screen that exists to advance that case. Offline read as
  // the case having vanished.
  //
  // The gate stays `!report`, which is also what protects typed work: this screen refetches
  // on focus and after each successful update, and `setReport` only runs on success, so a
  // failed refetch leaves the form (and the note being typed into it) exactly where it was.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  // P2 · the error code of a failed load — a 410 is "removed by moderation" only with this code.
  const [resCode, setResCode] = useState<string | undefined>(undefined);
  const [target, setTarget] = useState<StrayStatus | null>(null);
  const [note, setNote] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [outcomePhotoUrl, setOutcomePhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    setRes(null);
    api.get(`/reports/${reportId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      setResCode(r.data?.error?.code);
      if (r.ok) setReport(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [reportId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const options = report ? advanceableStatuses(report.status) : [];
  // C11 · what this screen offers follows the caller's own claim, not the report's status.
  const state = report ? caseScreenState(report) : null;
  const holdsClaim = state === "active" || state === "custody";
  // US-H1/H2 · the handoff is the claimer's, once the animal is safe in their care.
  const canHandOff = state === "custody" && report?.status === "safe";
  // AD20 · when the animal is already listed or offered, say where that stands instead of offering to start another.
  const handoff = handoffCard(report?.my_case?.handoff);

  async function addOutcomePhoto() {
    if (uploadingPhoto) return;
    setUploadingPhoto(true);
    // (S3 is still a dev seam), but the client-side wiring is real.
    const res = await pickAndUpload(api, "rescue_outcome_photo");
    setUploadingPhoto(false);
    // C24 · a failed upload says why (shown under the button); a cancel (null) says nothing.
    // PR3-F5 · a good pick clears the earlier failure's message.
    if (res?.ok) { setOutcomePhotoUrl(res.fileUrl); setError(undefined); }
    else if (res) setError(uploadErrorMessage(res.reason));
  }

  async function submit(confirmedResolve = false) {
    if (submitting) return;
    // PR3-F5 · sending now would drop the outcome photo still on its way up.
    if (uploadingPhoto) { setError("The photo is still uploading — one moment."); return; }
    // ⚠️ Explains rather than blocks. This condition used to live in the early return while
    // the button was also disabled on it, so tapping with nothing chosen did nothing and
    // said nothing. The fade stays — it is a hint (see colors.tealIdle), not a block.
    if (!target) { setError("Choose the new status first."); return; }
    // C23 · resolving ends the case for everyone and can't be reopened — ask first. This returns
    // before `setSubmitting(true)`; the confirmed call re-enters with the busy guard intact.
    if (target === "resolved" && !confirmedResolve) {
      Alert.alert("Mark this rescue resolved?",
        "This ends the case for you, the reporter and the helpers. It can't be reopened.",
        [{ text: "Not yet", style: "cancel" },
         { text: "Mark resolved", onPress: () => { void submit(true); } }]);
      return;
    }
    setSubmitting(true);
    setError(undefined);
    const body: Record<string, string> = { status: target };
    if (note.trim()) body.note = note.trim();
    if (target === "resolved" && outcomeNotes.trim()) body.outcome_notes = outcomeNotes.trim();
    if (target === "resolved" && outcomePhotoUrl) body.outcome_photo_url = outcomePhotoUrl;
    const res = await api.post(`/cases/${caseId}/status`, body);
    setSubmitting(false);
    if (res.ok) {
      setNote(""); setTarget(null); setOutcomeNotes(""); setOutcomePhotoUrl(null);
      load(); // refetch — the report's status (and so the remaining options) just changed
      return;
    }
    const code = res.data?.error?.code;
    setError(
      code === "case_expired" ? "This claim lapsed — it's back on the map for someone else to claim."
      : code === "case_resolved" ? "This case is already resolved."
      : code === "not_forward" ? "That's not a forward move from where this case is now."
      : res.data?.error?.message ?? "Couldn't update the case. Try again."
    );
  }

  const chip = report ? strayChip(report.status) : null;
  const tone = chip ? TONE[chip.tone] : null;
  const deadline = claimDeadline(report?.my_case?.claim_due_at);

  // D1 · the claimer's own consent to be contacted by the reporter and matched helpers.
  const [consentBusy, setConsentBusy] = useState(false);
  async function setCaseConsent(share: boolean) {
    if (consentBusy) return;
    setConsentBusy(true);
    const res = await api.post(`/cases/${caseId}/contact`, { share });
    setConsentBusy(false);
    if (!res.ok) setError(res.data?.error?.code === "case_expired"
      ? "This claim lapsed — it's back on the map for someone else to claim."
      : res.data?.error?.message ?? "Couldn't update that. Try again.");
    load();
  }

  // D3 · "I can't make it" — the reasons open inline (four is too many for an Android alert).
  // Only while `claimed`: once rescued, the way out is a handoff, and the server refuses a
  // release (409 in_custody).
  const [releasing, setReleasing] = useState(false);
  const [releaseBusy, setReleaseBusy] = useState(false);
  async function release(reason: ReleaseReason) {
    if (releaseBusy) return;
    setReleaseBusy(true);
    const res = await api.post(`/cases/${caseId}/release`, { reason });
    setReleaseBusy(false);
    if (res.ok) {
      Alert.alert("Released", "It's back on the map for another rescuer, and the reporter has been told.");
      navigation.goBack();
      return;
    }
    const code = res.data?.error?.code;
    setReleasing(false);
    setError(code === "in_custody" ? "The animal is in your care now — list or place them instead."
      : code === "case_expired" ? "This claim already lapsed — it's back on the map."
      : res.data?.error?.message ?? "Couldn't release the claim. Try again.");
    load();
  }

  // C14 · take a handoff back: a draft listing or an unanswered placement. The server refuses
  // once it is adopted (see handoffCancelMessage); if people have asked, D15 confirms first and
  // resends with close_inquiries.
  const [cancelBusy, setCancelBusy] = useState(false);
  function confirmCancelHandoff() {
    if (cancelBusy) return;
    Alert.alert("Take it back?",
      "A draft or an unanswered placement is withdrawn at once. The person you offered them to is told.",
      [{ text: "Not now", style: "cancel" },
       { text: "Take back", onPress: () => { void cancelHandoff(); } }]);
  }
  async function cancelHandoff(closeInquiries = false, confirmedN?: number) {
    if (cancelBusy) return; // busy guard — one cancel in flight at a time
    setCancelBusy(true);
    setError(undefined);
    const res = await api.post(`/cases/${caseId}/handoff/cancel`, closeInquiries ? { close_inquiries: true } : {});
    setCancelBusy(false);
    if (res.ok) {
      if (closeInquiries) {
        // D15 · N can exceed what was confirmed (someone inquired in between): trust the server.
        const closed = res.data?.closed_inquiries;
        const done = closedInquiriesDone(typeof closed === "number" ? closed : confirmedN ?? 0);
        Alert.alert(done.title, done.body);
      } else {
        Alert.alert("Taken back", "You can list or place them again.");
      }
      load();
      return;
    }
    // D15 · people have asked: not a refusal but a confirm. Without details.active_inquiries
    // (an older server) fall through to the plain refusal below.
    const active = res.data?.error?.details?.active_inquiries;
    if (!closeInquiries && res.data?.error?.code === "has_active_inquiries" && typeof active === "number") {
      const p = closeInquiriesPrompt(active);
      Alert.alert(p.title, p.body,
        [{ text: p.keep, style: "cancel" },
         { text: p.confirm, style: "destructive", onPress: () => { void cancelHandoff(true, active); } }]);
      return;
    }
    // An Alert, not setError: the error line renders far below, inside the status form.
    Alert.alert("Couldn't take that back", handoffCancelMessage(res.data?.error?.code));
    load(); // a lapsed claim or an adoption changes what this screen offers
  }

  function openInMaps() {
    const at = report?.precise_location;
    if (!at) return;
    void Linking.openURL(directionsUrl(at.lat, at.lng, Platform.OS));
  }

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title="Update case" onBack={() => navigation.goBack()} />

      {!report ? (
        // P2 · a removed report (410 report_removed) says so, rather than "gone".
        isReportRemoved(res, resCode) ? <ReportRemovedCard onBack={() => navigation.goBack()} /> : (
        <LoadStateView state={loadState(res)} subject="case" onRetry={load}
          onBack={() => navigation.goBack()} />
        )
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {holdsClaim && deadline ? (
            <Card accent={deadline.urgent ? colors.warningStrong : colors.tealDark} style={styles.deadlineCard}>
              <Text style={[styles.deadlineText, deadline.urgent && styles.deadlineUrgent]}>{deadline.text}</Text>
            </Card>
          ) : null}
          <Card>
            {report.photos.length > 0 ? (
              <Image source={{ uri: report.photos[0] }} style={styles.photo} resizeMode="cover"
                accessibilityLabel="Photo from the report" />
            ) : null}
            <Text style={styles.h1} maxFontSizeMultiplier={maxFontScale.title}>{sagipTitle(report.species, report.condition)}</Text>
            {report.city ? <Text style={styles.sub}>{report.city}</Text> : null}
            {state !== "ended" && chip && tone ? (
              <View style={[styles.currentChip, { backgroundColor: tone.bg }]}>
                <Text style={[styles.currentChipText, { color: tone.fg }]}>Currently: {chip.label}</Text>
              </View>
            ) : null}

            {state !== "ended" ? (
              <>
                {/* US-SEC1 — GET /reports/{id} already includes precise_location for the
                    active claimer (that's you, on this screen), so no second fetch is needed. */}
                {report.precise_location ? (
                  <View style={styles.mapWrap}>
                    <MapView
                      style={styles.map}
                      pointerEvents="none"
                      initialRegion={{
                        latitude: report.precise_location.lat, longitude: report.precise_location.lng,
                        latitudeDelta: 0.01, longitudeDelta: 0.01
                      }}
                    >
                      <Marker coordinate={{ latitude: report.precise_location.lat, longitude: report.precise_location.lng }} />
                    </MapView>
                  </View>
                ) : null}
                {report.location_text ? (
                  <Text style={styles.landmark}>Near: {report.location_text}</Text>
                ) : null}
                {report.notes ? <Text style={styles.notes}>{report.notes}</Text> : null}
                {report.precise_location ? (
                  <Button label="Open in Maps" variant="secondary" onPress={openInMaps}
                    testID="btn.rescueUpdate.directions" style={styles.directions} />
                ) : null}
              </>
            ) : null}
          </Card>

          {state === "ended" ? (
            <Card accent={colors.muted} style={styles.endedCard} testID="card.rescueUpdate.ended">
              <Text style={styles.endedTitle}>Your claim on this report has ended</Text>
              <Text style={styles.endedBody}>{endedCaseLine(report.status)}</Text>
              <Button label="Open the report" variant="secondary"
                onPress={() => navigation.replace("reportDetail", { reportId })} />
            </Card>
          ) : null}

          {state === "resolved" ? (
            <Text style={styles.resolvedNote}>This case is resolved — there's nothing left to update.</Text>
          ) : null}
          {/* Stories review step 11 (§5.7) · a resolved rescue prompts a story for the person who rescued, with the same persistent button the adopter has. */}
          {report && state === "resolved" && composeForRescue(report) ? (
            <TouchableOpacity hitSlop={TAP_SLOP} style={styles.shareStory} activeOpacity={0.8} testID="btn.rescueUpdate.shareStory"
              accessibilityRole="button" onPress={() => navigation.navigate("storyCompose", composeForRescue(report)!)}>
              <Text style={styles.shareStoryLabel}>Share this rescue's story ›</Text>
            </TouchableOpacity>
          ) : null}

          {/* D1 + D8 · the reporter (or that they chose anonymity) and every matched helper.
              PR3-F4 · shown on a resolved case too: the backend keeps consented contact for 7 days
              after resolution (C2). Only a claimer whose claim ended loses it. */}
          {state !== "ended" && report.people ? <RescuePeople people={report.people} /> : null}

          {holdsClaim ? (
            <>
              {report.my_case ? (
                <ContactShareRow
                  label="Share my contact"
                  hint="Lets the reporter and the people who offered help see your phone and email."
                  value={!!report.my_case.contact_shared}
                  disabled={consentBusy}
                  onValueChange={setCaseConsent}
                  testID="switch.rescueUpdate.shareContact"
                />
              ) : null}

              {/* US-H1/US-H2 — once the case's report is safe, the claiming rescuer can hand it
                  off, either publicly (adoption listing) or directly to someone they already
                  know. Shown alongside the forward-status options below (a safe case can still be
                  moved on to resolved), not instead of them. */}
              {canHandOff ? (
                <>
                  {handoff ? (
                    <TouchableOpacity activeOpacity={0.85} accessibilityRole={handoff.opensListing ? "button" : "text"}
                      disabled={!handoff.opensListing} testID="card.rescueUpdate.handoff"
                      onPress={() => navigation.navigate("posterListing", { listingId: report!.my_case!.handoff!.listing_id })}>
                      <Card style={styles.handoffCard}>
                        <Text style={styles.handoffTitle}>{handoff.title}</Text>
                        <Text style={styles.handoffLine}>{handoff.line}{handoff.opensListing ? " ›" : ""}</Text>
                      </Card>
                    </TouchableOpacity>
                  ) : (
                  <View style={[styles.handoffRow, large && styles.handoffRowLarge]}>
                    <Button
                      label="List for adoption"
                      onPress={() => navigation.navigate("rescueList", { caseId })}
                      variant="secondary"
                    />
                    <Button
                      label="Place with someone"
                      onPress={() => navigation.navigate("rescuePlace", { caseId })}
                      variant="secondary"
                    />
                  </View>
                  )}
                  <TouchableOpacity style={styles.releaseLink} accessibilityRole="button"
                    testID="btn.rescueUpdate.cancelHandoff" disabled={cancelBusy} onPress={confirmCancelHandoff}
                    accessibilityState={{ disabled: cancelBusy, busy: cancelBusy }}>
                    {cancelBusy ? <ActivityIndicator color={colors.muted} /> : (
                      <Text style={styles.releaseLinkText}>Take back a listing or placement</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : null}

              {options.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>Move it forward to</Text>
                  <View style={styles.radioList}>
                    {options.map((status) => {
                      const active = status === target;
                      return (
                        <TouchableOpacity
                          key={status}
                          onPress={() => setTarget(status)}
                          activeOpacity={0.85}
                        >
                          <Card style={[styles.radioRow, active && styles.radioRowActive]}>
                            <View style={[styles.radio, active && styles.radioActive]}>
                              {active ? <View style={styles.radioDot} /> : null}
                            </View>
                            <Text style={styles.radioLabel}>{STATUS_LABEL[status]}</Text>
                          </Card>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Field
                    label="Note (optional)"
                    value={note}
                    onChangeText={setNote}
                    placeholder="What happened at this step?"
                    multiline
                  />

                  {target === "resolved" ? (
                    <>
                      <Field
                        label="Outcome"
                        value={outcomeNotes}
                        onChangeText={setOutcomeNotes}
                        placeholder="How this case ended — reunited, adopted, in foster care…"
                        multiline
                      />
                      {/* IQ3 · skippable, but a rescue with neither a note nor a photo does not count toward My impact. */}
                      <Text style={styles.impactHint} testID="text.rescueUpdate.impactHint">
                        Add a note or a photo so this rescue counts toward your impact.
                      </Text>
                      <TouchableOpacity style={styles.photoBtn} onPress={addOutcomePhoto} activeOpacity={0.85}>
                        {uploadingPhoto ? <ActivityIndicator color={colors.teal} />
                          : <Text style={styles.photoText}>{outcomePhotoUrl ? "✓ Photo added" : "Add an outcome photo"}</Text>}
                      </TouchableOpacity>
                    </>
                  ) : null}

                  {error ? <Text style={styles.error}>{error}</Text> : null}

                  <Button
                    label={target ? `Mark ${STATUS_LABEL[target]}` : "Pick a status above"}
                    onPress={() => { void submit(); }}
                    loading={submitting}
                    accessibilityHint={target ? undefined : "Choose the new status first"}
                    style={styles.submit}
                  />
                </>
              ) : null}

              {state === "active" ? (
                releasing ? (
                  <Card style={styles.releaseCard}>
                    <Text style={styles.releaseTitle}>Why can't you make it?</Text>
                    <Text style={styles.releaseSub}>It goes back on the map at once and the reporter is told.</Text>
                    {RELEASE_REASONS.map((r) => (
                      <TouchableOpacity
                        key={r.key}
                        style={styles.releaseOption}
                        disabled={releaseBusy}
                        accessibilityRole="button"
                        onPress={() => release(r.key)}
                      >
                        <Text style={styles.releaseOptionText}>{r.label}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.releaseCancel} accessibilityRole="button"
                      onPress={() => setReleasing(false)}>
                      <Text style={styles.releaseCancelText}>I'm still going</Text>
                    </TouchableOpacity>
                  </Card>
                ) : (
                  <TouchableOpacity style={styles.releaseLink} accessibilityRole="button"
                    testID="btn.rescueUpdate.release" onPress={() => setReleasing(true)}>
                    <Text style={styles.releaseLinkText}>I can't make it</Text>
                  </TouchableOpacity>
                )
              ) : null}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  h1: { color: colors.ink, ...typography.display },
  sub: { marginTop: 6, color: colors.muted, ...typography.subtitle },
  currentChip: { marginTop: 14, alignSelf: "flex-start", paddingHorizontal: 14, minHeight: 30, paddingVertical: 4, borderRadius: 15, justifyContent: "center" },
  mapWrap: { marginTop: 18, height: 150, borderRadius: radii.field, overflow: "hidden", backgroundColor: colors.soft },
  map: { ...StyleSheet.absoluteFillObject },
  currentChipText: { ...typography.meta, fontWeight: "800" },
  photo: { width: "100%", height: 180, borderRadius: radii.field, marginBottom: 16, backgroundColor: colors.soft },
  landmark: { marginTop: 12, color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  notes: { marginTop: 8, color: colors.ink, ...typography.body },
  directions: { marginTop: 16 },
  deadlineCard: { marginBottom: 14 },
  deadlineText: { color: colors.tealDark, ...typography.subtitle, fontWeight: "700" },
  deadlineUrgent: { color: colors.warningStrong, fontWeight: "800" },
  endedCard: { marginTop: 14 },
  endedTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  endedBody: { marginTop: 6, marginBottom: 14, color: colors.muted, ...typography.body },
  handoffCard: { marginTop: 20, padding: 16 },
  handoffTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  handoffLine: { marginTop: 4, color: colors.muted, ...typography.meta, lineHeight: 18 },
  handoffRow: { marginTop: 20, flexDirection: "row", gap: 12 },
  handoffRowLarge: { flexDirection: "column" },
  handoffBtn: { flex: 1 },
  impactHint: { marginTop: 4, marginBottom: 8, color: colors.muted, ...typography.meta },
  shareStory: { alignSelf: "flex-start", marginTop: 14, minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: radii.chip, backgroundColor: colors.successBg },
  shareStoryLabel: { color: colors.success, ...typography.strong, fontWeight: "700" },
  resolvedNote: { marginTop: 24, color: colors.muted, ...typography.body },
  releaseLink: { marginTop: 8, minHeight: 44, alignItems: "center", justifyContent: "center" },
  releaseLinkText: { color: colors.muted, ...typography.subtitle, fontWeight: "700", textDecorationLine: "underline" },
  releaseCard: { marginTop: 16, padding: spacing.lg },
  releaseTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  releaseSub: { marginTop: 4, marginBottom: 6, color: colors.muted, ...typography.meta },
  releaseOption: { minHeight: 48, justifyContent: "center", borderTopWidth: 1, borderTopColor: colors.border },
  releaseOptionText: { color: colors.ink, ...typography.subtitle },
  releaseCancel: { minHeight: 48, justifyContent: "center", alignItems: "center", marginTop: 4 },
  releaseCancelText: { color: colors.teal, ...typography.subtitle, fontWeight: "700" },
  sectionTitle: { marginTop: 26, marginBottom: 12, color: colors.ink, ...typography.section },
  radioList: { gap: 10 },
  radioRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderWidth: 2, borderColor: "transparent" },
  radioRowActive: { borderColor: colors.teal },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.teal },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.teal },
  radioLabel: { color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  photoBtn: { marginTop: 14, minHeight: 64, paddingVertical: 12, paddingHorizontal: 12, borderRadius: radii.tile, borderWidth: 2, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoText: { color: colors.teal, ...typography.strong, fontWeight: "700" },
  error: { marginTop: 16, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 26 }
});
