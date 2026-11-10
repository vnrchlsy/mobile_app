// US-B5 / US-X1 / US-X2 — shelter shell home. Reference: screens/user/screen-shelter-dashboard-pending.png,
// screen-shelter-dashboard-incomplete.png. GET /shelter/dashboard drives the amber banner + gates;
// GET /shelter/profile carries the org name and tier (SH13; /me is the fallback). Everything is derived —
// listings stay drafts, donations are locked, no badge — until the request is approved (Sprint 2).
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Me, ShelterDashboard, ShelterProfileSummary } from "../api/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApi } from "../api/useApi";
import { createLatestOnly } from "../latestOnly";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { AlertIcon, CheckIcon, ClockIcon, LocationPinIcon, VolunteerIcon } from "../components/AppIcons";
import { NotificationBell } from "../components/NotificationBell";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { ShelterTabScreenProps } from "../navigation/types";
import { useRefreshOnFocus } from "../useRefreshOnFocus";
import { RESUME_SETUP, setupNeeded } from "../shelterSetup";
import { rescueSummary, shelterIdentity, shelterShellState, volunteerSummary, wishlistSummary } from "../shelterDashboard";
import { TAP_SLOP } from "../touch";
import { useLargeText } from "../useLargeText";
import { colors, maxFontScale, radii, spacing, typography } from "../theme";
import { Button, Card } from "../components/ui";
import { setAppBadge } from "../push/badge";

type Props = ShelterTabScreenProps<"shelterDashboard">;

const BANNER: Record<"pending" | "rejected" | "incomplete", { title: string; l1: string; l2: string; cta: string }> = {
  pending: {
    title: "Under review",
    l1: "Listings stay hidden & donations off",
    l2: "until approved.",
    cta: "Status ›"
  },
  rejected: {
    title: "Not verified",
    l1: "Fix the flagged files and",
    l2: "resubmit.",
    cta: "Fix ›"
  },
  incomplete: {
    title: "Documents not sent yet",
    l1: "We can't start checking until you",
    l2: "upload them.",
    cta: "Upload ›"
  }
};

export function ShelterDashboardScreen({ navigation }: Props) {
  // At Dynamic Type AX3 and up the dashboard's rows of icon | text | action cannot share a line (the stat tiles, the
  // verified hero, the header with its pill and bell), so they stack. Default size is untouched.
  const large = useLargeText();
  // The status bar is real now (App.tsx), so the first thing on screen has to start below
  // it. This block used to pad 24pt, which was right while the bar was hidden and
  // put the dashboard heading under the clock once it was not.
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [latest] = useState(createLatestOnly);
  const [dash, setDash] = useState<ShelterDashboard | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<ShelterProfileSummary | null>(null);
  // NT-14 · the account has no organization profile yet (it quit onboarding after the email code).
  const [needsSetup, setNeedsSetup] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [hasUnread, setHasUnread] = useState(false);

  // US-R1 · named so the same function serves the focus refetch AND the retry button.
  const load = useCallback(() => {
      // NT-4 · only the latest focus's answers apply: a slow answer from an earlier visit is dropped.
      const only = latest.begin();
      // US-R2 · PRIMARY. This screen is about the counts, so a failed /shelter/dashboard
      // takes the whole screen. /me below is SECONDARY (name and tier, not substance) and
      // is allowed to fail quietly rather than blank a dashboard that otherwise loaded.
      // US-R1 · keep the RESULT of both. Discarding them left `dash` and `me` null, and the
      // `?? ` fallbacks below then rendered "0 listings, 0 adopted, 0 donations" and a
      // community_rescue tier as FACT — a verified shelter shown its own work as zero.
      // Same class as the rescue map's "No strays reported": a failed request rendered as
      // a confident statement about the world.
      // SQ5 · resolves to the PRIMARY request's outcome: a failed one makes `useRefreshOnFocus` try again on the next focus
      // instead of waiting out the stale window. `dash` is never cleared, so a failed refresh leaves the last good counts.
      const primary = api.get("/shelter/dashboard").then(only((r) => {
        setRes({ ok: r.ok, status: r.status });
        if (r.ok) setDash(r.data);
        return r.ok;
      }));
      api.get("/me").then(only((r) => { if (r.ok) setMe(r.data); }));
      // SH13 · the ORGANISATION's name and tier, the same source You reads. Secondary like /me: a 404
      // (no profile yet, SH9) or a failure leaves `profile` null and /me answers instead.
      api.get("/shelter/profile").then(only((r) => {
        if (r.ok) setProfile({ org_name: r.data.org_name, tier: r.data.tier });
        setNeedsSetup(setupNeeded(r));
      }));
      // F-R3-4 · the bell's dot, same query and same focus refetch as HomeScreen's — so it
      // clears on return from NotificationsScreen (which marks everything read on open).
      // SH12 · one count, not the whole feed.
      api.get("/me/notifications/unread-count").then(only((r) => {
        if (r.ok) { setHasUnread((r.data?.unread ?? 0) > 0); void setAppBadge(r.data?.unread); }   // NP22 · keep the icon true
      }));
      return primary;
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus only
    }, []);
  useRefreshOnFocus(load);

  // SH1 · the shell's ONE verified state (shared with You and the Rescue card): "any approved"
  // from the server's gates, not the latest request's status — an approved tier-1 rescue with a
  // tier-2 upgrade in review is verified, and sees a quiet "Upgrade under review" accent.
  const shell = shelterShellState(dash, me);
  const verified = shell.verified;
  const state = shell.banner;
  // NT-14 · no profile yet: the banner leads back into setup instead of to documents it cannot send.
  const banner = needsSetup && !verified
    ? { title: RESUME_SETUP.title, l1: RESUME_SETUP.body, l2: "", cta: RESUME_SETUP.cta }
    : state === "pending" || state === "rejected" || state === "incomplete" ? BANNER[state] : null;
  // SH13 · never a defaulted tier: while it is unknown the badge and the Upload CTA stay hidden.
  const id = shelterIdentity(profile, me);
  const badge = id.tier === "community_rescue" ? "Verified Rescue" : "Verified Shelter";
  const counts = dash?.counts ?? { draft_listings: 0, adopted: 0, donations: 0 };

  // W5 (shelter home test plan) · the foot card's Continue goes where the banner goes, so it hides when that does
  // nothing: never a dead tap while the tier, and so the document set, is unknown.
  const footContinue = !(state === "incomplete" && !id.tier);

  function onBannerPress() {
    if (needsSetup) {
      navigation.navigate("shelterTier", { resume: true });
      return;
    }
    // US-D4 audit (2026-08-24) · was a dead tap for "pending" — the banner's own CTA
    // reads "Status ›" but nothing navigated, same shape as the dead Google-signup and
    // the old draft-a-listing button earlier audits found (that one has since moved to
    // ShelterAnimalsScreen — Task B2). ShelterProfileScreen's "Under review" accent
    // already reached verifyDocuments for the same gated state; this banner (the first
    // thing a pending shelter sees) is the more obvious entry point.
    if (state === "incomplete" && !id.tier) return;   // which document set is unknown until the tier is
    if (state === "incomplete") navigation.navigate("shelterVerify", { tier: id.tier! });
    else navigation.navigate("verifyDocuments");
  }

  // US-R1 · when the load FAILED and we have nothing, say so instead of rendering the
  // `?? ` fallbacks below as fact. Those fallbacks are correct defaults for a shelter that
  // genuinely has no listings yet; they are a lie for one whose request didn't arrive.
  // (Full per-panel treatment for partial failure is US-R5's decision — this is only the
  // "don't state something false" half.)
  if (!dash && loadState(res).kind !== "ready" && loadState(res).kind !== "empty") {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScreenBackdrop />
        {/* The inset belongs here, not in LoadStateView: this branch replaces the whole
            body, and most LoadStateView call sites are inline placeholders in a ScrollView.
            See __tests__/safeAreaOnFailure.test.ts. */}
        <LoadStateView state={loadState(res)} onRetry={load} />
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="screen.shelterDashboard">
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerRow, large && styles.headerRowLarge]}>
          <Text style={[styles.orgName, large && styles.orgNameLarge]} maxFontSizeMultiplier={maxFontScale.title}>{id.name ?? "Your shelter"}</Text>
          {verified ? (
            id.tier ? (
              <View style={styles.verifiedPill}>
                <View style={styles.verifiedPillDot}>
                  <CheckIcon color={colors.white} size={10} />
                </View>
                <Text style={styles.verifiedPillText}>{badge}</Text>
              </View>
            ) : null
          ) : (
            <View style={styles.unverifiedPill}>
              <View style={styles.pillDot} />
              <Text style={styles.pillText}>Unverified</Text>
            </View>
          )}
          {/* F-R3-4 · the shelter's ONLY way into its notification feed. Before this, every
              signup_requested / attendance_due / signup_cancelled_by_volunteer was push-only:
              dismiss the push (or deny the permission) and it was gone. Same bell as HomeScreen's. */}
          <NotificationBell hasUnread={hasUnread} onPress={() => navigation.navigate("notifications")} />
        </View>
        {/* Per-tier label (the -rescue variants): a community rescue is not a "Shelter". Plain while unknown. */}
        <Text style={styles.subLabel}>
          {id.tier === "community_rescue" ? "Rescue dashboard" : id.tier ? "Shelter dashboard" : "Dashboard"}
        </Text>

        {verified ? (
          // US-V5 · the "you're verified" hero replaces the amber under-review banner.
          <View style={[styles.verifiedHero, large && styles.stackLarge]}>
            <View style={styles.verifiedHeroIcon}>
              <CheckIcon color={colors.white} size={20} />
            </View>
            <View style={[styles.bannerCopy, large && styles.bannerCopyLarge]}>
              <Text style={styles.verifiedHeroTitle} maxFontSizeMultiplier={maxFontScale.title}>You're verified</Text>
              <Text style={styles.verifiedHeroBody}>Your listings are live.</Text>
              {/* SH2 · donations are a two-key gate (approved AND a live QR, US-X3): never say they are on
                  for an approved shelter with no QR yet. */}
              {shell.donationsOn ? (
                <Text style={styles.verifiedHeroBody}>Donations are on.</Text>
              ) : (
                <TouchableOpacity testID="btn.shelterDashboard.addQr" accessibilityRole="button" hitSlop={TAP_SLOP}
                  activeOpacity={0.8} onPress={() => navigation.navigate("donationQr")}>
                  <Text style={[styles.verifiedHeroBody, styles.verifiedHeroLink]}>Add a donation QR to turn donations on ›</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : banner ? (
          <TouchableOpacity activeOpacity={0.85} onPress={onBannerPress}>
            <Card tone="hero" accent={colors.warningStrong} style={[styles.banner, large && styles.stackLarge]}>
              <View style={styles.bannerIcon}>
                {state === "pending" ? <ClockIcon color={colors.warningStrong} size={34} /> : <AlertIcon color={colors.warningStrong} size={34} />}
              </View>
              <View style={[styles.bannerCopy, large && styles.bannerCopyLarge]}>
                <Text style={styles.bannerTitle} maxFontSizeMultiplier={maxFontScale.title}>{banner.title}</Text>
                <Text style={styles.bannerBody}>{banner.l1}</Text>
                {banner.l2 ? <Text style={styles.bannerBody}>{banner.l2}</Text> : null}
              </View>
              {state === "incomplete" && !id.tier && !needsSetup ? null : <Text style={styles.bannerCta}>{banner.cta}</Text>}
            </Card>
          </TouchableOpacity>
        ) : null}

        {state === "upgrade_in_review" ? (
          // SH1 · an approved org whose LATEST request is still with the reviewer: the upgrade (US-X4), not a gate.
          // Same accent and destination as You's.
          <Card accent={colors.teal} style={[styles.footCard, large && styles.stackLarge]}>
            <View style={[styles.footCopy, large && styles.footCopyLarge]}>
              <Text style={styles.footTitle}>Upgrade under review</Text>
              <Text style={styles.footBody}>You stay verified while we check your new documents.</Text>
            </View>
            <TouchableOpacity testID="btn.shelterDashboard.trackUpgrade" hitSlop={TAP_SLOP} activeOpacity={0.8}
              onPress={() => navigation.navigate("verifyDocuments")}>
              <Text style={styles.footCta}>Track ›</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        <View style={[styles.statRow, large && styles.statRowLarge]}>
          <Stat n={counts.draft_listings} label="Drafts" large={large} />
          <Stat n={counts.adopted} label="Adopted" large={large} />
          {/* AT19 · was a hard-coded "Donations" 0 (QR gifts leave no record, OQ6). The artboard keeps three tiles, so the third is a real count: listings live now. */}
          <Stat n={counts.live_listings ?? 0} label="Live" large={large} />
        </View>

        {/* Task 10 (K8/G12) · the Volunteers card — only once `dash` has actually loaded, so a
            failed /shelter/dashboard (this screen's PRIMARY fetch, per US-R2) never shows a
            confident "0 waiting" the way the stat row's `?? ` fallbacks would if applied here. */}
        {dash && (
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("shelterVolunteer")}>
            <Card style={styles.volunteerCard}>
              <View style={styles.volunteerHeaderRow}>
                <View style={styles.volunteerIcon}>
                  <VolunteerIcon color={colors.teal} size={20} />
                </View>
                <Text style={styles.volunteerTitle} maxFontSizeMultiplier={maxFontScale.title}>Volunteers</Text>
              </View>
              {(() => {
                const summary = volunteerSummary(dash.volunteer);
                return (
                  <>
                    <Text style={styles.volunteerLine}>{summary.line1}</Text>
                    {summary.line2 ? <Text style={styles.volunteerWarning}>{summary.line2}</Text> : null}
                  </>
                );
              })()}
            </Card>
          </TouchableOpacity>
        )}

        {/* US-W3 · the Wishlist line — what is waiting on the shelter (pledges a giver says arrived). Only for a shelter
            with an approved org, and only once the dashboard has loaded, so a failed request never reads as
            "nothing to confirm". The gate is the shell's `verified` ("any approved"), the SAME source as the Profile
            tab's Wishlist row, NOT the latest request's status: an approved tier-1 shelter with an
            upgrade in review is pending there and must keep its wishlist. */}
        {shell.verified && dash?.wishlist ? (() => {
          const summary = wishlistSummary(dash.wishlist);
          return (
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("shelterNeeds")}
              accessibilityRole="button">
              <Card style={styles.volunteerCard}>
                <Text style={styles.volunteerTitle} maxFontSizeMultiplier={maxFontScale.title}>Wishlist</Text>
                {summary
                  ? <Text style={styles.volunteerWarning}>{summary}</Text>
                  : <Text style={styles.volunteerLine}>Nothing to confirm right now</Text>}
              </Card>
            </TouchableOpacity>
          );
        })() : null}

        {/* S16 · the Rescue card. A verified shelter may claim strays and is paged about them, but
            the shell had no rescue surface — and a case it claimed was unreachable once it left
            the screen. Same load rule as Volunteers: only once `dash` has loaded, and the copy
            never states a count the server didn't make (rescueSummary). */}
        {dash?.rescue ? (() => {
          const rescue = rescueSummary(dash.rescue, shell.verified);
          return (
            <Card style={styles.volunteerCard}>
              <View style={styles.volunteerHeaderRow}>
                <View style={styles.volunteerIcon}>
                  <LocationPinIcon color={colors.teal} size={20} />
                </View>
                <Text style={styles.volunteerTitle} maxFontSizeMultiplier={maxFontScale.title}>Rescue</Text>
              </View>
              <Text style={styles.volunteerLine}>{rescue.line1}</Text>
              <Text style={styles.volunteerLine}>{rescue.line2}</Text>
              {rescue.note ? <Text style={styles.volunteerWarning}>{rescue.note}</Text> : null}
              <View style={styles.rescueActions}>
                {rescue.mapCity ? (
                  <Button
                    size="small"
                    label="See strays nearby"
                    testID="btn.shelterDashboard.rescueMap"
                    onPress={() => navigation.navigate("rescueMap", { city: rescue.mapCity! })}
                  />
                ) : null}
                <Button
                  size="small"
                  variant="secondary"
                  label="Our rescue cases"
                  testID="btn.shelterDashboard.myRescues"
                  onPress={() => navigation.navigate("myRescues")}
                />
              </View>
            </Card>
          );
        })() : null}

        {/* NT-14 · while setup is not finished the banner is the one next step; the foot card would repeat it. */}
        {!verified && banner && !needsSetup ? (
          <Card accent={colors.teal} style={[styles.footCard, large && styles.stackLarge]}>
            <View style={[styles.footCopy, large && styles.footCopyLarge]}>
              <Text style={styles.footTitle}>{state === "pending" ? "Draft your listings while you wait" : "Finish verifying to go live"}</Text>
              <Text style={styles.footBody}>
                {state === "pending" ? "They go live the moment you're approved." : state === "rejected" ? "Fix the flagged files to get approved." : "Upload your documents to get approved."}
              </Text>
            </View>
            {footContinue ? (
              <TouchableOpacity testID="btn.shelterDashboard.continueVerify" hitSlop={TAP_SLOP} activeOpacity={0.8} onPress={onBannerPress}>
                <Text style={styles.footCta}>{state === "pending" ? "Start ›" : "Continue ›"}</Text>
              </TouchableOpacity>
            ) : null}
          </Card>
        ) : null}
      </ScrollView>

    </View>
  );
}

function Stat({ n, label, large }: { n: number; label: string; large: boolean }) {
  return (
    <Card style={[styles.statCard, large && styles.statCardLarge]}>
      <Text style={styles.statNum}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 24, paddingBottom: 120 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },

  orgName: { flex: 1, color: colors.ink, ...typography.hero },
  // large: stacked. The base `orgName` / `bannerCopy` / `footCopy` are `flex: 1`, which survives in a style array and would
  // collapse the text in a column, so the large styles cancel it.
  headerRowLarge: { flexDirection: "column", alignItems: "flex-start", gap: 10 },
  orgNameLarge: { alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  stackLarge: { flexDirection: "column", alignItems: "flex-start" },
  bannerCopyLarge: { marginLeft: 0, marginTop: 12, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  footCopyLarge: { marginLeft: 0, marginTop: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  statRowLarge: { flexDirection: "column" },
  unverifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.greyPill
  },
  pillDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.muted },
  pillText: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  verifiedPill: {
    flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 6, minHeight: 34,
    borderRadius: 17, backgroundColor: colors.soft
  },
  verifiedPillDot: {
    width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.teal
  },
  verifiedPillText: { color: colors.tealDark, ...typography.meta, fontWeight: "800" },
  verifiedHero: {
    marginTop: 20, flexDirection: "row", alignItems: "center", gap: 16, padding: 20,
    borderRadius: radii.card, backgroundColor: colors.teal
  },
  verifiedHeroIcon: {
    width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  verifiedHeroTitle: { color: colors.white, ...typography.title },
  verifiedHeroBody: { marginTop: 4, color: colors.onHeroMuted, ...typography.body },
  verifiedHeroLink: { fontWeight: "700", textDecorationLine: "underline" },
  subLabel: { marginTop: 6, color: colors.muted, ...typography.subtitle },
  banner: {
    minHeight: 108,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  bannerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.warningBg
  },
  bannerCopy: { flex: 1, marginLeft: 18 },
  bannerTitle: { color: colors.warningStrong, ...typography.section },
  bannerBody: { marginTop: 2, color: colors.warning, ...typography.meta },
  bannerCta: { color: colors.warningStrong, ...typography.strong, fontWeight: "700" },
  statRow: { marginTop: 22, flexDirection: "row", justifyContent: "space-between" },
  statCard: {
    width: "31%",
    minHeight: 104,
    paddingVertical: 12,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  statCardLarge: { width: "100%", marginTop: 12 },
  statNum: { color: colors.ink, ...typography.hero },
  statLabel: { marginTop: 6, color: colors.muted, ...typography.meta },
  volunteerCard: { marginTop: 16, padding: 18 },
  rescueActions: { marginTop: 14, gap: 10 },
  volunteerHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  volunteerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  volunteerTitle: { color: colors.ink, ...typography.section },
  volunteerLine: { marginTop: 10, color: colors.muted, ...typography.meta, fontWeight: "700" },
  volunteerWarning: { marginTop: 6, color: colors.warningStrong, ...typography.meta, fontWeight: "800" },
  footCard: {
    marginTop: 26,
    minHeight: 100,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24
  },
  footCopy: { flex: 1 },
  footTitle: { color: colors.tealDark, ...typography.subtitle, fontWeight: "800" },
  footBody: { marginTop: 6, color: colors.muted, ...typography.meta },
  footCta: { color: colors.tealDark, ...typography.subtitle, fontWeight: "800", marginLeft: 12 }
});
