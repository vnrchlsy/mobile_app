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

const colors = {
  ink: "#12213A",
  teal: "#1C6B6B",
  page: "#F4F5F2",
  muted: "#5F5E5A",
  soft: "#E2EEF0",
  warnBg: "#FAEEDA",
  warn2: "#633806",
  danger: "#B23B3B",
  dangerBg: "#FBEEEC",
  ok: "#27500A",
  okBg: "#EAF3DE"
};

type Props = NativeStackScreenProps<RootStackParamList, "verifyDocuments">;

const CHIP_STYLE = {
  ok: { bg: colors.okBg, fg: colors.ok },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  review: { bg: colors.warnBg, fg: colors.warn2 }
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
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
          style={styles.back}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My documents</Text>
      </View>

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
                <AlertIcon color={colors.warn2} size={30} />
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
    paddingHorizontal: 26,
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
    shadowColor: "#1F3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  h1: { color: colors.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  sub: { marginTop: 8, color: colors.muted, fontSize: 17 },
  emptyCard: {
    marginTop: 26,
    borderRadius: 24,
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  noteBanner: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.warnBg
  },
  noteBannerText: { flex: 1, color: colors.warn2, fontSize: 15, fontWeight: "600", lineHeight: 21 },
  noteBannerDanger: { backgroundColor: colors.dangerBg },
  noteBannerTitle: { color: colors.danger, fontSize: 17, fontWeight: "800" },
  noteBannerBody: { marginTop: 6, color: colors.danger, fontSize: 15, fontWeight: "600", lineHeight: 21 },
  noteBannerHint: { marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 20 },
  groupTitle: { marginTop: 26, marginBottom: 12, color: colors.ink, fontSize: 20, fontWeight: "800" },
  docCard: {
    marginBottom: 14,
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  docRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  docIconTile: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft
  },
  docMeta: { flex: 1, gap: 8 },
  docName: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  docCount: { color: colors.muted, fontSize: 14, fontWeight: "600", marginTop: -4 },
  chip: { alignSelf: "flex-start", paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "800" },
  reviewNote: { marginTop: 12, color: colors.danger, fontSize: 15, lineHeight: 21 },
  replaceBtn: {
    marginTop: 14,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerBg
  },
  replaceBtnText: { color: colors.danger, fontSize: 16, fontWeight: "800" },
  approvedCard: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: colors.okBg
  },
  approvedDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ok
  },
  approvedTitle: { color: colors.ok, fontSize: 17, fontWeight: "800" },
  approvedSub: { marginTop: 4, color: "#3f5a2e", fontSize: 14 },
  allGood: { marginTop: 24, color: colors.muted, fontSize: 16, textAlign: "center" }
});
