// US-B5 / US-X1 / US-X2 — shelter shell home. Reference: screens/user/screen-shelter-dashboard-pending.png,
// screen-shelter-dashboard-incomplete.png. GET /shelter/dashboard drives the amber banner + gates;
// GET /me carries the tier (for the "Finish verifying" route) and the org name. Everything is derived —
// listings stay drafts, donations are locked, no badge — until the request is approved (Sprint 2).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Me, ShelterDashboard, ShelterTier } from "../api/types";
import { useApi } from "../api/useApi";
import { AlertIcon, CheckIcon, ClockIcon } from "../components/AppIcons";
import { ShelterTabs } from "../components/ShelterTabs";
import { RootStackParamList } from "../navigation/types";
import { ShelterBannerState, shelterBannerState } from "../shelterDashboard";
import { TAP_SLOP } from "../touch";

type Props = NativeStackScreenProps<RootStackParamList, "shelterDashboard">;

const BANNER: Record<"pending" | "incomplete", { title: string; l1: string; l2: string; cta: string }> = {
  pending: {
    title: "Under review",
    l1: "Listings stay hidden & donations off",
    l2: "until approved.",
    cta: "Status ›"
  },
  incomplete: {
    title: "Documents not sent yet",
    l1: "We can't start checking until you",
    l2: "upload them.",
    cta: "Upload ›"
  }
};

export function ShelterDashboardScreen({ navigation }: Props) {
  const api = useApi();
  const [dash, setDash] = useState<ShelterDashboard | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.get("/shelter/dashboard").then((r) => r.ok && setDash(r.data));
      api.get("/me").then((r) => r.ok && setMe(r.data));
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus only
    }, [])
  );

  const state: ShelterBannerState = dash ? shelterBannerState(dash) : "incomplete";
  const verified = state === "verified";
  const banner = verified ? null : BANNER[state];
  const tier: ShelterTier = me?.shelter?.tier ?? "community_rescue";
  const badge = tier === "community_rescue" ? "Verified Rescue" : "Verified Shelter";
  const counts = dash?.counts ?? { draft_listings: 0, adopted: 0, donations: 0 };

  function onBannerPress() {
    // US-D4 audit (2026-08-24) · was a dead tap for "pending" — the banner's own CTA
    // reads "Status ›" but nothing navigated, same shape as the dead Google-signup and
    // "+ List an animal" buttons earlier audits found. ShelterProfileScreen's "Under
    // review" accent already reached verifyDocuments for the same gated state; this
    // banner (the first thing a pending shelter sees) is the more obvious entry point.
    if (state === "incomplete") navigation.navigate("shelterVerify", { tier });
    else if (state === "pending") navigation.navigate("verifyDocuments");
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.orgName}>{me?.display_name ?? "Your shelter"}</Text>
          {verified ? (
            <View style={styles.verifiedPill}>
              <View style={styles.verifiedPillDot}>
                <CheckIcon color="#FFFFFF" size={10} />
              </View>
              <Text style={styles.verifiedPillText}>{badge}</Text>
            </View>
          ) : (
            <View style={styles.unverifiedPill}>
              <View style={styles.pillDot} />
              <Text style={styles.pillText}>Unverified</Text>
            </View>
          )}
        </View>
        {/* Per-tier label (the -rescue variants): a community rescue is not a "Shelter". */}
        <Text style={styles.subLabel}>
          {tier === "community_rescue" ? "Rescue dashboard" : "Shelter dashboard"}
        </Text>

        {verified ? (
          // US-V5 · the "you're verified" hero replaces the amber under-review banner.
          <View style={styles.verifiedHero}>
            <View style={styles.verifiedHeroIcon}>
              <CheckIcon color="#FFFFFF" size={20} />
            </View>
            <View style={styles.bannerCopy}>
              <Text style={styles.verifiedHeroTitle}>You're verified</Text>
              <Text style={styles.verifiedHeroBody}>Your listings are live and donations are on.</Text>
            </View>
          </View>
        ) : banner ? (
          <TouchableOpacity activeOpacity={0.85} style={styles.banner} onPress={onBannerPress}>
            <View style={styles.bannerIcon}>
              {state === "pending" ? <ClockIcon color="#633806" size={34} /> : <AlertIcon color="#633806" size={34} />}
            </View>
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle}>{banner.title}</Text>
              <Text style={styles.bannerBody}>{banner.l1}</Text>
              <Text style={styles.bannerBody}>{banner.l2}</Text>
            </View>
            <Text style={styles.bannerCta}>{banner.cta}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.statRow}>
          <Stat n={counts.draft_listings} label="Drafts" />
          <Stat n={counts.adopted} label="Adopted" />
          <Stat n={counts.donations} label="Donations" />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.primaryButton}
          onPress={() => navigation.navigate("listingForm", undefined)}
        >
          <Text style={styles.primaryText}>+  List an animal</Text>
        </TouchableOpacity>
        <Text style={styles.primaryHint}>
          {verified ? "Your listings are public." : "Saved as a draft until you're verified."}
        </Text>

        {!verified ? (
          <View style={styles.footCard}>
            <View style={styles.footCopy}>
              <Text style={styles.footTitle}>{state === "pending" ? "Draft your listings while you wait" : "Finish verifying to go live"}</Text>
              <Text style={styles.footBody}>
                {state === "pending" ? "They go live the moment you're approved." : "Upload your documents to get approved."}
              </Text>
            </View>
            <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.8} onPress={onBannerPress}>
              <Text style={styles.footCta}>{state === "pending" ? "Start ›" : "Continue ›"}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      <ShelterTabs active="home" onTabPress={(t) => t === "profile" && navigation.navigate("shelterProfile")} />
    </View>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statNum}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const colors = {
  ink: "#12213A",
  teal: "#1C6B6B",
  page: "#F4F5F2",
  muted: "#5F5E5A",
  warnBg: "#FAEEDA",
  warn2: "#633806",
  paleTeal: "#E7F0EE",
  grey: "#ECEAE3"
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: 26, paddingTop: 24, paddingBottom: 120 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orgName: { flex: 1, color: colors.ink, fontSize: 26, fontWeight: "800" },
  unverifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.grey
  },
  pillDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.muted },
  pillText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  verifiedPill: {
    flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, height: 34,
    borderRadius: 17, backgroundColor: colors.paleTeal
  },
  verifiedPillDot: {
    width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.teal
  },
  verifiedPillText: { color: "#14504F", fontSize: 13, fontWeight: "800" },
  verifiedHero: {
    marginTop: 20, flexDirection: "row", alignItems: "center", gap: 16, padding: 20,
    borderRadius: 24, backgroundColor: colors.teal
  },
  verifiedHeroIcon: {
    width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  verifiedHeroTitle: { color: "#FFFFFF", fontSize: 21, fontWeight: "800" },
  verifiedHeroBody: { marginTop: 4, color: "#DCEDEB", fontSize: 15, lineHeight: 21 },
  subLabel: { marginTop: 6, color: colors.muted, fontSize: 16 },
  banner: {
    minHeight: 108,
    marginTop: 20,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: colors.warnBg
  },
  bannerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E1BE"
  },
  bannerCopy: { flex: 1, marginLeft: 18 },
  bannerTitle: { color: colors.warn2, fontSize: 19, fontWeight: "800" },
  bannerBody: { marginTop: 2, color: "#8a6d3b", fontSize: 13 },
  bannerCta: { color: colors.warn2, fontSize: 15, fontWeight: "700" },
  statRow: { marginTop: 22, flexDirection: "row", justifyContent: "space-between" },
  statCard: {
    width: "31%",
    height: 104,
    borderRadius: 22,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  statNum: { color: colors.ink, fontSize: 26, fontWeight: "800" },
  statLabel: { marginTop: 6, color: colors.muted, fontSize: 13 },
  primaryButton: {
    height: 56,
    marginTop: 22,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  primaryText: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  primaryHint: { marginTop: 12, color: colors.muted, fontSize: 15, textAlign: "center" },
  footCard: {
    marginTop: 26,
    minHeight: 100,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: colors.paleTeal
  },
  footCopy: { flex: 1 },
  footTitle: { color: "#14504F", fontSize: 17, fontWeight: "800" },
  footBody: { marginTop: 6, color: "#5f6b6a", fontSize: 13 },
  footCta: { color: "#14504F", fontSize: 16, fontWeight: "800", marginLeft: 12 }
});
