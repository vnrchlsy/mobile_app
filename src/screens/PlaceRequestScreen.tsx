// US-H3 · the recipient's side of a direct placement (US-H2): accept or decline the animal
// a rescuer/shelter placed with them. The route carries only `inquiryId` (see
// RootStackParamList) — there's no GET /inquiries/{id}, so this screen resolves the listing
// the same way MyInquiriesScreen does (GET /me/inquiries, matched by id) and then fetches the
// public listing detail for the richer view (photo/fee/description), same call ListingDetailScreen
// makes. POST /inquiries/{id}/accept | /decline (PlacementDecisionView) does the actual decision;
// its guard (select_for_update + a status re-check) is what makes double-tap and cross-tab
// races safe — this screen just needs to not let a second tap for the SAME session double-fire,
// which the shared `deciding` busy flag below covers.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { ListingDetail, MyInquiry } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";


type Decision = "accept" | "decline";

type Props = NativeStackScreenProps<RootStackParamList, "placeRequest">;

export function PlaceRequestScreen({ navigation, route }: Props) {
  const api = useApi();
  const { inquiryId } = route.params;

  const [inquiry, setInquiry] = useState<MyInquiry | null>(null);
  // US-R4 · a FAILED /me/inquiries left `found` undefined exactly like a successful one that
  // does not contain this offer, so both rendered "This placement offer wasn't found." —
  // telling someone offline that a real, live offer of a home for their pet does not exist.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [deciding, setDeciding] = useState<Decision | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    setRes(null);
    api.get("/me/inquiries").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      const found: MyInquiry | undefined = r.ok
        ? (r.data?.results ?? []).find((iq: MyInquiry) => iq.inquiry_id === inquiryId)
        : undefined;
      setInquiry(found ?? null);
      if (found) {
        // Secondary, per US-R2's multi-fetch rule: the photo and city are decoration on a
        // decision the inquiry itself already carries. Its failure degrades this panel, and
        // must not take down a screen someone is using to accept or decline a home.
        api.get(`/listings/${found.listing.listing_id}`).then((lr) => {
          if (lr.ok) setListing(lr.data);
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [inquiryId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function decide(action: Decision) {
    if (deciding) return; // busy guard — one decision in flight at a time
    setDeciding(action);
    setError(undefined);
    const res = await api.post(`/inquiries/${inquiryId}/${action}`, {});
    setDeciding(null);
    if (res.ok) {
      if (action === "accept") navigation.navigate("placeAccepted");
      else navigation.goBack();
      return;
    }
    const code = res.data?.error?.code;
    setError(
      code === "already_decided" ? "This placement has already been decided."
      : code === "not_your_placement" ? "This placement isn't addressed to you."
      : code === "not_a_placement" ? "This isn't a direct placement."
      : "Couldn't process that right now. Try again."
    );
  }

  const alreadyDecided = inquiry != null && inquiry.status !== "active";

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Placement offer" onBack={() => navigation.goBack()} />

      {!inquiry ? (
        // The list came back fine and this offer is not in it: withdrawn, or never addressed
        // to this account. That is `gone` — a real answer — not a network failure.
        <LoadStateView
          state={res?.ok ? ({ kind: "gone" } as const) : loadState(res)}
          subject="placement offer"
          onRetry={load}
          onBack={() => navigation.goBack()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {listing?.photos?.length ? (
            <Image source={{ uri: listing.photos[0] }} style={styles.photo} resizeMode="cover" />
          ) : null}

          <Text style={styles.name}>{inquiry.listing.name || "This pet"}</Text>
          <Text style={styles.sub}>{capitalize(inquiry.listing.species)}{listing?.city ? ` · ${listing.city}` : ""}</Text>

          {listing?.description ? <Text style={styles.body}>{listing.description}</Text> : null}

          <View style={styles.feeCard}>
            <Text style={styles.feeLabel}>Adoption fee</Text>
            <Text style={styles.feeValue}>
              {listing && Number(listing.adoption_fee) > 0
                ? `₱${Number(listing.adoption_fee).toLocaleString()}` : "Free"}
            </Text>
          </View>

          {listing?.poster ? (
            <Text style={styles.posterLine}>
              Offered by {listing.poster.name}{listing.poster.is_shelter ? " · Shelter" : ""}
            </Text>
          ) : null}

          {alreadyDecided ? (
            <Text style={styles.decidedNote}>
              {inquiry.status === "adopted" ? "You already accepted this placement."
                : inquiry.status === "declined" ? "You already declined this placement."
                : "This placement is no longer active."}
            </Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* A decided placement has no decision to make; the note above says which way it went.
              `decide` guards on `deciding`, so the other button stays tappable but inert. */}
          {!alreadyDecided && (
            <>
              <Button label="Accept" onPress={() => decide("accept")} loading={deciding === "accept"} style={styles.acceptBtn} />
              <Button label="Decline" onPress={() => decide("decline")} loading={deciding === "decline"} variant="destructive" style={styles.declineBtn} />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  photo: { width: "100%", height: 220, borderRadius: radii.card, marginBottom: 18, backgroundColor: colors.border },
  name: { color: colors.ink, ...typography.hero },
  sub: { marginTop: 6, color: colors.muted, ...typography.subtitle },
  body: { marginTop: 14, color: colors.ink, ...typography.body },
  feeCard: { marginTop: 18, padding: 18, borderRadius: radii.tile, flexDirection: "row",
             alignItems: "center", justifyContent: "space-between", ...card },
  feeLabel: { color: colors.muted, ...typography.strong, fontWeight: "700" },
  feeValue: { color: colors.ink, ...typography.section },
  posterLine: { marginTop: 14, color: colors.muted, ...typography.meta },
  decidedNote: { marginTop: 20, color: colors.muted, ...typography.strong, fontWeight: "700", textAlign: "center" },
  error: { marginTop: 18, color: colors.danger, ...typography.strong, fontWeight: "700" },
  acceptBtn: { marginTop: 26 },
  declineBtn: { marginTop: 12 }
});
