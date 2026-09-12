// US-B5 · the shelter "You" tab, gated. Reference: screens/user/screen-shelter-profile.png,
// -rescue.png, -pending.png, -rescue-pending.png (gen-screens.js :: shelterProfile).
//
// The SAME derivation as the dashboard — verified iff an approved shelter_org verification_request
// exists (§3.5, Decision B). Until then the org is draft-only, gated-public: the donation and
// volunteer rows are LOCKED (not hidden — a hidden row can't explain itself), there is no trust
// badge, and the fourth Organization slot becomes an amber "Under review · Track your documents".
//
// Before this screen existed the shelter "You" tab landed on the OWNER profile, which showed an
// owner's rows to an org and no gated state at all.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Me, ShelterDashboard } from "../api/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { useAuth } from "../auth/AuthContext";
import { CheckIcon, ClockIcon, LockIcon } from "../components/AppIcons";
import { ShelterTabs } from "../components/ShelterTabs";
import { RootStackParamList } from "../navigation/types";
import { colors, elevation, radii, spacing, squircle, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "shelterProfile">;

export function ShelterProfileScreen({ navigation }: Props) {
  // The status bar is real now (App.tsx), so the first thing on screen has to start below
  // it. This block used to pad 24pt, which was right while the bar was hidden and
  // put the profile heading under the clock once it was not.
  const insets = useSafeAreaInsets();
  const api = useApi();
  const { signOut } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [dash, setDash] = useState<ShelterDashboard | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  // US-C1 · a REAL count, not the hardcoded "3 active". Active = shifts still open or full.
  const [activeShifts, setActiveShifts] = useState<number | null>(null);

  // US-R1 · named so the same function serves the focus refetch AND the retry button.
  const load = useCallback(() => {
      // US-R2 · PRIMARY. This screen is about the shelter's own identity and gating, both
      // derived from /me — so /me failing takes the whole screen, while the dashboard
      // counts below are SECONDARY and degrade on their own.
      // US-R1 · keep the RESULT. Discarding it left `me` null, and `gated` below is derived
      // as `me?.shelter?.verification_status !== "approved"` — so a failed /me showed an
      // APPROVED shelter its own account as unverified and gated, with every capability
      // apparently revoked. The counts fell back to zero on the same failure.
      api.get("/me").then((r) => {
        setRes({ ok: r.ok, status: r.status });
        if (r.ok) setMe(r.data);
      });
      api.get("/shelter/dashboard").then((r) => { if (r.ok) setDash(r.data); });
      api.get("/shelter/shifts").then((r) => {
        if (r.ok) {
          const rows: Array<{ status: string }> = r.data.results ?? [];
          setActiveShifts(rows.filter((s) => s.status === "open" || s.status === "full").length);
        }
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus only
    }, []);
  useFocusEffect(load);

  const volunteerValue = activeShifts === null
    ? undefined
    : activeShifts === 0 ? "None" : `${activeShifts} active`;

  const tier = me?.shelter?.tier ?? "community_rescue";
  const isTier1 = tier === "community_rescue";
  // Gated until APPROVED — pending, needs_info, rejected and "never submitted" all gate.
  const gated = me?.shelter?.verification_status !== "approved";
  const badge = isTier1 ? "Verified Rescue" : "Verified Shelter";
  const sub = isTier1 ? "Community rescue" : "Registered NGO";
  const counts = dash?.counts ?? { draft_listings: 0, adopted: 0, donations: 0 };

  // US-R1 · when the load FAILED and we have nothing, say so instead of rendering the
  // `?? ` fallbacks below as fact. Those fallbacks are correct defaults for a shelter that
  // genuinely has no listings yet; they are a lie for one whose request didn't arrive.
  // (Full per-panel treatment for partial failure is US-R5's decision — this is only the
  // "don't state something false" half.)
  if (!me && loadState(res).kind !== "ready" && loadState(res).kind !== "empty") {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* The inset belongs here, not in LoadStateView: this branch replaces the whole
            body, and most LoadStateView call sites are inline placeholders in a ScrollView.
            See __tests__/safeAreaOnFailure.test.ts. */}
        <LoadStateView state={loadState(res)} onRetry={load} />
        {/* ⚠️ THE TAB BAR BELONGS IN THIS BRANCH TOO. It does not depend on the data this
            branch is missing, and it is this screen's only VISIBLE way out — the screen is
            reached by a tab, so there is no back button either. Without it the offline state
            is a dead end to look at: the iOS edge-swipe still pops the screen, which is why
            this survived review and every automated check, but a person sees no exit. Found
            on a real device during US-PF3 by someone who could not get past it. */}
        <ShelterTabs
          active="profile"
          onTabPress={(t) => t === "home" && navigation.navigate("shelterDashboard")}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="screen.shelterProfile">
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Profile</Text>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarGlyph}>{isTier1 ? "♥" : "▦"}</Text>
          </View>
          <Text style={styles.orgName}>{me?.display_name ?? "Your shelter"}</Text>

          {gated ? (
            <View style={[styles.chip, styles.chipWarn]}>
              <ClockIcon color={colors.warningStrong} size={16} />
              <Text style={styles.chipWarnText}>Under review</Text>
            </View>
          ) : (
            <View style={[styles.chip, styles.chipVerified]}>
              <View style={styles.verifiedDot}>
                <CheckIcon color="#FFFFFF" size={10} />
              </View>
              <Text style={styles.chipVerifiedText}>{badge}</Text>
            </View>
          )}

          <Text style={styles.orgSub}>{sub}</Text>
        </View>

        <View style={styles.statRow}>
          <Stat n={counts.draft_listings} label={gated ? (isTier1 ? "Draft" : "Drafts") : "Listings"} />
          <Stat n={counts.adopted} label="Adopted" />
          <Stat n={0} label="Volunteers" />
        </View>

        <Text style={styles.groupTitle}>Organization</Text>
        <View style={styles.group}>
          <Row label="Organization details" />
          {/* US-Q1 · was a dead row (no onPress at all, same shape as the "+ List an
              animal" dead button US-A2 found) — upload works pre-approval (decision 2's
              draft-first pattern), donations just stay off until the org is approved. */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate("donationQr")}>
            <Row label="Donation QR" locked={gated} value={gated ? undefined : "On"} />
          </TouchableOpacity>
          {/* US-W3 · the real Abot-tulong wishlist manager (needs + pledges), distinct from
              the QR row above; gated until the org is approved, same as donations. */}
          <TouchableOpacity activeOpacity={0.8} disabled={gated}
            onPress={() => navigation.navigate("shelterNeeds")}>
            <Row label="Wishlist" locked={gated} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={gated}
            onPress={() => navigation.navigate("shelterVolunteer")}
          >
            <Row label="Volunteer program" locked={gated} value={gated ? undefined : volunteerValue} last={gated || isTier1} />
          </TouchableOpacity>

          {gated ? (
            // The one outstanding thing — an accent, not a row, so it reads as the next action.
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.accentWarn}
              onPress={() => navigation.navigate("verifyDocuments")}
            >
              <View style={styles.accentCopy}>
                <Text style={styles.accentWarnTitle}>Under review</Text>
                <Text style={styles.accentWarnBody}>Track your documents</Text>
              </View>
              <Text style={styles.accentWarnChev}>›</Text>
            </TouchableOpacity>
          ) : isTier1 ? (
            <View style={styles.accentTeal}>
              <View style={styles.accentCopy}>
                <Text style={styles.accentTealTitle}>Upgrade to Verified Shelter</Text>
                <Text style={styles.accentTealBody}>Unlock uncapped fees & escalation</Text>
              </View>
              <Text style={styles.accentTealChev}>›</Text>
            </View>
          ) : (
            <Row label="Verification" value={badge} last />
          )}
        </View>

        <Text style={styles.groupTitle}>Account</Text>
        <View style={styles.group}>
          <Row label="Account settings" />
          <Row label="Help & support" />
          <TouchableOpacity activeOpacity={0.8} style={styles.row} onPress={signOut}>
            <Text style={styles.rowDanger}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ShelterTabs
        active="profile"
        onTabPress={(t) => t === "home" && navigation.navigate("shelterDashboard")}
      />
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

function Row({
  label,
  value,
  locked,
  last
}: {
  label: string;
  value?: string;
  locked?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowRule]}>
      <Text style={[styles.rowLabel, locked && styles.rowLabelLocked]}>{label}</Text>
      {locked ? (
        // Locked, not hidden: a row that vanishes can't tell the shelter *why* it's unavailable.
        <LockIcon color={colors.muted} size={15} />
      ) : (
        <View style={styles.rowRight}>
          {!!value && <Text style={styles.rowValue}>{value}</Text>}
          <Text style={styles.chev}>›</Text>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 24, paddingBottom: 120 },
  pageTitle: { color: colors.ink, ...typography.display },
  identityCard: {
    marginTop: 16,
    borderRadius: radii.card,
    alignItems: "center",
    paddingVertical: 26,
    backgroundColor: "#FFFFFF",
    ...elevation.soft
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: squircle(96),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  avatarGlyph: { color: "#FFFFFF", fontSize: 40, fontWeight: "900" },
  orgName: { marginTop: 16, color: colors.ink, ...typography.hero },
  chip: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    height: 38,
    borderRadius: 19
  },
  chipWarn: { backgroundColor: colors.warningBg },
  chipWarnText: { color: colors.warningStrong, ...typography.strong, fontWeight: "800" },
  chipVerified: { backgroundColor: colors.infoBg },
  verifiedDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  chipVerifiedText: { color: colors.tealDark, ...typography.strong, fontWeight: "800" },
  orgSub: { marginTop: 10, color: colors.muted, ...typography.body },
  statRow: { marginTop: 20, flexDirection: "row", justifyContent: "space-between" },
  statCard: {
    width: "31%",
    height: 100,
    borderRadius: radii.card,
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    ...elevation.soft
  },
  statNum: { color: colors.ink, ...typography.hero },
  statLabel: { marginTop: 6, color: colors.muted, ...typography.meta },
  groupTitle: { marginTop: 26, marginBottom: 12, color: colors.ink, ...typography.section },
  group: {
    borderRadius: radii.card,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    ...elevation.soft
  },
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg
  },
  rowRule: { borderBottomWidth: 1.5, borderBottomColor: colors.border },
  rowLabel: { color: colors.ink, ...typography.subtitle, fontWeight: "600" },
  rowLabelLocked: { color: colors.muted },
  rowDanger: { color: colors.danger, ...typography.subtitle, fontWeight: "600" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowValue: { color: colors.muted, ...typography.strong, fontWeight: "700" },
  chev: { color: "#C9CEC7", fontSize: 19, fontWeight: "700" },
  accentWarn: {
    margin: 12,
    minHeight: 52,
    borderRadius: radii.notice,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    backgroundColor: colors.warningBg
  },
  accentCopy: { flex: 1 },
  accentWarnTitle: { color: colors.warningStrong, ...typography.subtitle, fontWeight: "800" },
  accentWarnBody: { marginTop: 3, color: "#8a6d3b", ...typography.meta },
  accentWarnChev: { color: colors.warningStrong, fontSize: 19, fontWeight: "700" },
  accentTeal: {
    margin: 12,
    minHeight: 52,
    borderRadius: radii.notice,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    backgroundColor: colors.infoBg
  },
  accentTealTitle: { color: colors.tealDark, ...typography.subtitle, fontWeight: "800" },
  accentTealBody: { marginTop: 3, color: "#5f6b6a", ...typography.meta },
  accentTealChev: { color: colors.tealDark, fontSize: 19, fontWeight: "700" }
});
