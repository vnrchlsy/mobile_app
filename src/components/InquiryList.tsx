// US-A4 · the adopter's own inquiries with each one's stage progress. GET /me/inquiries.
//
// ⚠️ EXTRACTED SO TWO PLACES CAN SHOW ONE LIST. The V3 canvas puts a "Browse / My inquiries"
// segmented control on Adopt, which means the list has to render INSIDE Adopt. It cannot simply
// move there: `myInquiries` is still a real route that NotificationsScreen and
// ListingDetailScreen navigate to, so deleting it would break two entry points that have
// nothing to do with the Adopt tab. One component, two hosts.
//
// US-H3: a direct placement (US-H2) is also an AdoptionInquiry with `adopter_account` set to
// the recipient — CasePlaceView creates every stage row and immediately marks it SKIPPED (the
// bypass), so "every stage is skipped" is the client-side signal that this row is a placement
// awaiting the recipient's decision, not a real inquiry working through the normal ladder.
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { MyInquiry } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "./LoadStateView";
import { loadState } from "../net";
import { closedChipTone, inquiryIsClosed, inquiryProgressLabel, inquiryStatusLabel } from "../adoption";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { useLargeText } from "../useLargeText";
import { colors, elevation, maxFontScale, pill, radii, typography } from "../theme";
import { Chip, type ChipTone } from "./ui";
import { listingTitle } from "../shelterAnimals";

// inquiry_status (not stage state): active/adopted/declined/withdrawn.
// Mapped onto the SHARED status vocabulary (chipTones) rather than carrying its own colours.
// adopted/declined/withdrawn were already exact matches for success/danger/neutral.
// ⚠️ `active` is the one value that moves: its tint goes from `soft` (#E7F0EF) to the shared
// `info` (#E2EEF0). Same foreground, and the design system's own rule is that a status reuses
// this mapping rather than inventing a colour per feature. Contrast is unchanged in practice —
// tealDark clears 7:1 on both.
// D15 · the LABEL is not here: it comes from inquiryStatusLabel (adoption.ts), so it can't drift.
const STATUS_TONE: Record<string, ChipTone> = {
  active: "info",
  adopted: "success",
  declined: "danger",
  withdrawn: "neutral"
};

// AD22 · the server says which it is (`kind`). An older server omits it, so the old inference
// stands as the fallback: every stage SKIPPED is the direct-placement bypass. The length guard
// stops an inquiry with no stage rows at all ("every" on an empty array is vacuously true)
// reading as a false-positive placement.
function isPlacement(iq: MyInquiry): boolean {
  return iq.kind ? iq.kind === "placement" : iq.stages.length > 0 && iq.stages.every((s) => s.state === "skipped");
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function InquiryList() {
  // ⚠️ Reads navigation from context rather than taking it as a prop. A screen-specific
  // `NativeStackNavigationProp<RootStackParamList, "myInquiries">` is not assignable to the
  // generic one (setParams is invariant), so a prop would have forced every host to cast.
  // OwnerTabs already does it this way.
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // At Dynamic Type AX3 and up a card's name | status chip row cannot share a line, so it stacks.
  const large = useLargeText();
  const api = useApi();
  const [inquiries, setInquiries] = useState<MyInquiry[]>([]);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [next, setNext] = useState<number | null>(null);

  // The server pages this list (`{results, next}`, newest first, `?page=N`), so one fetch is only the newest page: an older
  // pending placement offer could sit beyond it with no way to reach it. Page 1 replaces; later pages append. A failed
  // "Load more" leaves the list and the button in place (only page 1 drives the load state) so it can be tapped again.
  const load = useCallback((page: number) => {
    if (page === 1) setRes(null);
    api.get(`/me/inquiries?page=${page}`).then((r) => {
      if (page === 1) setRes({ ok: r.ok, status: r.status });
      if (!r.ok) return;
      setInquiries((prev) => (page === 1 ? r.data?.results ?? [] : [...prev, ...(r.data?.results ?? [])]));
      setNext(r.data?.next ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []);
  useFocusEffect(useCallback(() => { load(1); }, [load]));

  return (
    <>
      {loadState(res, inquiries.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, inquiries.length)}
            emptyTitle="You haven't inquired on any pets yet."
            onRetry={() => load(1)}
          />
        ) : (
          inquiries.map((iq) => {
            const tone =
              iq.status === "declined" || iq.status === "withdrawn"
                ? closedChipTone(iq.status, iq.end_reason)
                : STATUS_TONE[iq.status] ?? STATUS_TONE.active;
            const closed = inquiryIsClosed(iq.status);
            const placement = isPlacement(iq);
            const pendingPlacement = placement && iq.status === "active";
            // A placement still awaiting the recipient's decision goes to the accept/decline
            // screen; everything else goes to the ladder, which links on to the listing. (It
            // went straight to the listing before the ladder existed.)
            function onPress() {
              if (pendingPlacement) navigation.navigate("placeRequest", { inquiryId: iq.inquiry_id });
              else navigation.navigate("inquiry", { inquiryId: iq.inquiry_id });
            }
            return (
              <TouchableOpacity
                key={iq.inquiry_id}
                testID={`card.inquiry.${iq.inquiry_id}`}
                style={styles.card}
                activeOpacity={0.85}
                onPress={onPress}
              >
                <View style={[styles.cardTop, large && styles.cardTopLarge]}>
                  <View style={large ? styles.cardCopyLarge : styles.cardCopy}>
                    <Text style={styles.cardName} maxFontSizeMultiplier={maxFontScale.title}>{listingTitle(iq.listing.name)}</Text>
                    <Text style={styles.cardMeta}>{capitalize(iq.listing.species)}</Text>
                  </View>
                  <Chip label={inquiryStatusLabel(iq.status, iq.end_reason)} tone={tone} />
                </View>
                {pendingPlacement ? (
                  <Text style={styles.placementNote}>Placement offer — tap to accept or decline</Text>
                ) : closed ? null : ( // D15 · a closed inquiry has no progress to report
                  <Text style={styles.progress}>{inquiryProgressLabel(iq.stages)}</Text>
                )}
                {/* US-T2 · the "Share your adoption story" CTA goes live on an adopted inquiry
                    (was a dead control), opening compose prefilled with this listing. */}
                {iq.status === "adopted" ? (
                  <TouchableOpacity hitSlop={TAP_SLOP}
                    style={styles.shareStory}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate("storyCompose",
                      { adoptionListingId: iq.listing.listing_id, source: "adoption_cta" })}
                  >
                    <Text style={styles.shareStoryLabel}>Share your adoption story ›</Text>
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      {next && loadState(res, inquiries.length).kind === "ready" ? (
        <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" testID="btn.inquiryList.loadMore"
          style={styles.more} onPress={() => load(next)}>
          <Text style={styles.moreLabel}>Load more</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: radii.field, marginBottom: 12, ...card },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  // large: stacked. The base copy column is `flex: 1`, which survives in a style array and would collapse the text in a column (`flex: 0` is what works, #189).
  cardTopLarge: { flexDirection: "column", alignItems: "flex-start" },
  cardCopy: { flex: 1 },
  cardCopyLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  cardName: { color: colors.ink, ...typography.section },
  cardMeta: { marginTop: 4, color: colors.muted, ...typography.meta },
  progress: { marginTop: 12, color: colors.teal, ...typography.meta, fontWeight: "700" },
  placementNote: { marginTop: 12, color: colors.teal, ...typography.meta, fontWeight: "800" },
  shareStory: { marginTop: 14, alignSelf: "flex-start", minHeight: 38, paddingVertical: 8, paddingHorizontal: 16, justifyContent: "center", borderRadius: pill(38), backgroundColor: colors.successBg },
  more: { alignSelf: "center", marginTop: 4, minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
  moreLabel: { color: colors.teal, ...typography.strong, fontWeight: "700" },
  shareStoryLabel: { color: colors.success, ...typography.strong, fontWeight: "700" }
});
