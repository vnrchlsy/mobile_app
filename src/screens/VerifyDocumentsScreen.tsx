// US-V2 · the applicant's document tracker. Reference: screens/user/screen-verify-documents.png
// (+ -member, -ngo). GET /me/verifications drives every row; each file carries its own status and,
// when rejected, the reviewer's note — written for the applicant, on the file it concerns.
// ⚠️ For a Verified Member this is the ONLY status surface there is (the rescuer path has no
// dashboard), so an empty/loading state must still read as "we're on it," not a blank screen.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { MeVerification, MeVerificationDoc } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { AlertIcon, CheckIcon, DocumentIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { docChip, docLabel, groupAttention, splitDocs } from "../verifications";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { ScreenHeader } from "../components/ui";


type Props = NativeStackScreenProps<RootStackParamList, "verifyDocuments">;

const CHIP_STYLE = {
  ok: { bg: colors.successBg, fg: colors.success },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  review: { bg: colors.warningBg, fg: colors.warningStrong }
} as const;

export function VerifyDocumentsScreen({ navigation }: Props) {
  const api = useApi();
  const [verification, setVerification] = useState<MeVerification | null>(null);
  // US-R4 · a failed fetch fell through to "No documents to track yet." — shown to a shelter
  // whose documents were REJECTED and whose org is sitting in draft because of it. The one
  // screen that exists to tell them what to fix was telling them there was nothing to fix.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const load = useCallback(() => {
    setRes(null);
    api.get("/me/verifications").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setVerification((r.data?.verifications ?? [])[0] ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus only
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const { attention, approved } = splitDocs(verification?.documents ?? []);
  const flagged = attention.filter((d) => d.status === "rejected");

  function onReplace(doc: MeVerificationDoc) {
    if (!verification) return;
    navigation.navigate("verifyResubmit", {
      verificationId: verification.verification_id,
      documentId: doc.document_id,
      docType: doc.doc_type,
      reviewNote: doc.review_note
    });
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="My documents" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Document status</Text>
        <Text style={styles.sub}>Each file is reviewed on its own.</Text>

        {!verification ? (
          <View style={styles.emptyCard}>
            {/* count IS passed here: "nothing submitted yet" is a true and useful answer this
                screen must still be able to give — it just may not be given about a request
                that never came back. */}
            <LoadStateView
              state={loadState(res, 0)}
              emptyTitle="No documents to track yet"
              emptyBody="Anything you submit for verification will show up here."
              subject="document status"
              onRetry={load}
            />
          </View>
        ) : (
          <>
            {verification.status === "rejected" ? (
              // US-V4 · a rejection always shows the reason and a next step.
              <View style={[styles.noteBanner, styles.noteBannerDanger]}>
                <AlertIcon color={colors.danger} size={30} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.noteBannerTitle}>Not verified</Text>
                  {verification.notes ? (
                    <Text style={styles.noteBannerBody}>{verification.notes}</Text>
                  ) : null}
                  <Text style={styles.noteBannerHint}>
                    Your org stays in draft — fix the flagged files below and resubmit.
                  </Text>
                </View>
              </View>
            ) : verification.status === "needs_info" && verification.notes ? (
              <View style={styles.noteBanner}>
                <AlertIcon color={colors.warningStrong} size={30} />
                <Text style={styles.noteBannerText}>{verification.notes}</Text>
              </View>
            ) : null}

            {attention.length > 0 ? (
              <>
                <Text style={styles.groupTitle}>Needs your attention</Text>
                {groupAttention(attention).map((group) => {
                  const doc = group.doc;
                  const chip = docChip(group.status);
                  const tone = CHIP_STYLE[chip.tone];
                  const countLabel = group.count > 1
                    ? `${group.count} ${group.docType === "rescue_photos" ? "photos" : "files"}`
                    : null;
                  return (
                    <View key={group.key} style={styles.docCard}>
                      <View style={styles.docRow}>
                        <View style={styles.docIconTile}>
                          <DocumentIcon color={colors.teal} />
                        </View>
                        <View style={styles.docMeta}>
                          <Text style={styles.docName}>{docLabel(group.docType)}</Text>
                          {countLabel ? <Text style={styles.docCount}>{countLabel}</Text> : null}
                          <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                            <Text style={[styles.chipText, { color: tone.fg }]}>{chip.label}</Text>
                          </View>
                        </View>
                      </View>
                      {doc.status === "rejected" && doc.review_note ? (
                        <Text style={styles.reviewNote}>{doc.review_note}</Text>
                      ) : null}
                      {doc.status === "rejected" ? (
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => onReplace(doc)}
                          style={styles.replaceBtn}
                        >
                          <Text style={styles.replaceBtnText}>Replace this file</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })}
              </>
            ) : null}

            {approved.length > 0 ? (
              <View style={styles.approvedCard}>
                <View style={styles.approvedDot}>
                  <CheckIcon color="#FFFFFF" size={13} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.approvedTitle}>
                    {approved.length} item{approved.length > 1 ? "s" : ""} approved
                  </Text>
                  <Text style={styles.approvedSub}>
                    {approved.map((d) => docLabel(d.doc_type)).join(", ")}
                  </Text>
                </View>
              </View>
            ) : null}

            {flagged.length === 0 && attention.length === 0 && verification.status === "approved" ? (
              <Text style={styles.allGood}>Everything's approved — you're all set.</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: {
    paddingTop: 58,
    paddingHorizontal: spacing.lg,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    ...elevation.soft
  },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  h1: { color: colors.ink, ...typography.display },
  sub: { marginTop: 8, color: colors.muted, ...typography.subtitle },
  emptyCard: {
    marginTop: 26,
    borderRadius: radii.card,
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
    backgroundColor: "#FFFFFF",
    ...elevation.soft
  },
  noteBanner: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
    borderRadius: radii.field,
    backgroundColor: colors.warningBg
  },
  noteBannerText: { flex: 1, color: colors.warningStrong, ...typography.strong, fontWeight: "700", lineHeight: 21 },
  noteBannerDanger: { backgroundColor: colors.dangerBg },
  noteBannerTitle: { color: colors.danger, ...typography.subtitle, fontWeight: "800" },
  noteBannerBody: { marginTop: 6, color: colors.danger, ...typography.strong, fontWeight: "700", lineHeight: 21 },
  noteBannerHint: { marginTop: 8, color: colors.muted, ...typography.meta, lineHeight: 20 },
  groupTitle: { marginTop: 26, marginBottom: 12, color: colors.ink, ...typography.section },
  docCard: {
    marginBottom: 14,
    borderRadius: radii.card,
    padding: 18,
    backgroundColor: "#FFFFFF",
    ...elevation.soft
  },
  docRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  docIconTile: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.infoBg
  },
  docMeta: { flex: 1, gap: 8 },
  docName: { color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  docCount: { color: colors.muted, ...typography.meta, fontWeight: "600", marginTop: -4 },
  chip: { alignSelf: "flex-start", paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  chipText: { ...typography.meta, fontWeight: "800" },
  reviewNote: { marginTop: 12, color: colors.danger, ...typography.body },
  replaceBtn: {
    marginTop: 14,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerBg
  },
  replaceBtnText: { color: colors.danger, ...typography.subtitle, fontWeight: "800" },
  approvedCard: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: radii.card,
    backgroundColor: colors.successBg
  },
  approvedDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success
  },
  approvedTitle: { color: colors.success, ...typography.subtitle, fontWeight: "800" },
  approvedSub: { marginTop: 4, color: "#3f5a2e", ...typography.meta },
  allGood: { marginTop: 24, color: colors.muted, ...typography.subtitle, textAlign: "center" }
});
