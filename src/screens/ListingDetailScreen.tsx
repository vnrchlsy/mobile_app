// US-A3/A4 · a listing's detail + the gated Inquire action.
// GET /listings/{id}; POST /listings/{id}/inquiries.
// The inquiry gates (Verified Member, verified phone) are backend-enforced — this screen
// POSTs and handles the 403 codes rather than re-deriving who's allowed (the SEC1 pattern:
// the server owns the access decision, the client renders the outcome).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button, Card, ScreenHeader } from "../components/ui";

import { ListingDetail } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { inquireBlockedCopy, inquireRefusalMessage, inquirySentCopy } from "../adoption";
import { useAuth } from "../auth/AuthContext";
import { accountIdFromAccessToken } from "../auth/idToken";
import { PersonActions } from "../components/PersonActions";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { InquireSheet } from "../components/InquireSheet";
import { SignupWall, SignupWallAction } from "../components/SignupWall";
import { setIntent } from "../guestIntent";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import { useLargeText } from "../useLargeText";
import { colors, maxFontScale, radii, spacing, typography } from "../theme";
import { listingTitle } from "../shelterAnimals";
import { requestPushPrompt } from "../pushPrompt";


type Props = NativeStackScreenProps<RootStackParamList, "listingDetail">;

export function ListingDetailScreen({ navigation, route }: Props) {
  // At Dynamic Type AX3 and up the fee card's label | value row cannot share a line, so it stacks.
  const large = useLargeText();
  const api = useApi();
  const { tokens } = useAuth();
  const isGuest = tokens === null;
  const myAccountId = accountIdFromAccessToken(tokens?.access);
  const { listingId } = route.params;
  const [listing, setListing] = useState<ListingDetail | null>(null);
  // US-R4 · "{X} not found." was shown for EVERY failure, not just a missing row — so
  // someone offline, or hitting a 500, was told the thing does not exist. R2's `gone`
  // is what actually means "not found" (404/403); everything else keeps its own words
  // and a retry that can work.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [inquiring, setInquiring] = useState(false);
  const [sheet, setSheet] = useState(false);          // AD8 · the Inquire bottom sheet
  const [isShelter, setIsShelter] = useState(false);  // AD14 · a shelter can't adopt: no Inquire for it
  const [inquired, setInquired] = useState(false);
  // Which gated tap raised the wall: Inquire → "adopt"; "Report this" → the generic
  // "account" copy (the "report" copy is about reporting a stray, not flagging a listing).
  // The action outlives `open` so the copy doesn't flip while the sheet slides out.
  const [wall, setWall] = useState<{ open: boolean; action: SignupWallAction }>(
    { open: false, action: "adopt" });
  const openWall = (action: SignupWallAction) => setWall({ open: true, action });
  const closeWall = () => setWall((w) => ({ ...w, open: false }));

  const load = useCallback(() => {
    setRes(null);
    if (!isGuest) api.get("/me").then((r) => { if (r.ok) setIsShelter(r.data?.account_type === "shelter"); });
    api.get(`/listings/${listingId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) {
        // Spec §3 · the poster never sees their own listing as a stranger would: drafts included,
        // their own view carries Publish, Edit and the applicants.
        if (r.data?.poster?.account_id === myAccountId) { navigation.replace("posterListing", { listingId }); return; }
        setListing(r.data);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [listingId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onInquirePressed() {
    // US-A1b/A3: a guest may VIEW this screen read-only, but Inquire is the gated action —
    // it raises the signup wall rather than hitting the API (which would just 401). A
    // signed-in user goes straight to the real inquiry.
    if (isGuest) {
      openWall("adopt");
      return;
    }
    setSheet(true);
  }

  async function inquire(body: object) {
    if (inquiring) return;
    setInquiring(true);
    const res = await api.post(`/listings/${listingId}/inquiries`, body);
    setInquiring(false);
    setSheet(false);
    if (res.ok) {
      setInquired(true);
      // AQ1/AQ2 · say what really happens next; a non-member hears about the badge now.
      const copy = inquirySentCopy(listing?.poster.name ?? "The poster", res.data?.verified_member);
      // NQ6 · ask about notifications once the person has dismissed this alert (a system alert and a modal cannot be up together).
      const ask = (go?: () => void) => () => { go?.(); requestPushPrompt("inquiry"); };
      const buttons: Array<{ text: string; onPress?: () => void }> = [
        { text: "OK", onPress: ask() },
        { text: "See my inquiries", onPress: ask(() => navigation.navigate("myInquiries")) }
      ];
      if (res.data?.verified_member === false) {
        buttons.push({ text: "Get verified", onPress: ask(() => navigation.navigate("memberUpgrade")) });
      }
      Alert.alert(copy.title, copy.body, buttons);
      return;
    }
    const code = res.data?.error?.code;
    // AQ2 / AD13 · the new gate's refusals. Before PR A a shelter fell into the pet-owner upgrade.
    const blocked = inquireBlockedCopy(code);
    if (blocked) {
      Alert.alert(blocked.title, blocked.body);
      return;
    }
    if (code === "already_inquired") {
      setInquired(true);
      Alert.alert("Already inquired", "You've already inquired on this listing.");
      return;
    }
    // A server older than AQ2 (2026-10-05) still asks for the badge at inquiry.
    if (code === "member_badge_required") {
      Alert.alert("Get verified to adopt",
        "Adopting needs a Verified Member badge — it takes a gov ID and one social link.",
        [{ text: "Not now", style: "cancel" },
         { text: "Get verified", onPress: () => navigation.navigate("memberUpgrade") }]);
      return;
    }
    if (code === "phone_unverified") {
      Alert.alert("Verify your phone first",
        "Verify a mobile number to inquire. It's shared with the poster only if they accept you for screening.",
        [{ text: "Not now", style: "cancel" },
         { text: "Verify phone", onPress: () => navigation.navigate("verifyPhone") }]);
      return;
    }
    // D15 · the rescuer took the animal back while this screen was open: say so, and refetch so
    // the listing shows its real status ("No longer available for adoption.") instead of an
    // Inquire button that can only fail.
    const refusal = inquireRefusalMessage(code);
    if (refusal) {
      Alert.alert("No longer available", refusal);
      load();
      return;
    }
    Alert.alert("Couldn't send the inquiry", res.data?.error?.message ?? "Try again.");
  }

  return (
    <View style={styles.screen} testID="screen.listingDetail">
      <ScreenBackdrop />
      <ScreenHeader
        title="Adopt"
        onBack={() => navigation.goBack()}
        // W1 · not on your own listing: the server would refuse it (own_content), so it is not offered.
        right={listing && !listing.mine ? (
          <TouchableOpacity
            hitSlop={TAP_SLOP}
            // A guest's report would 401 at /moderation/flags and dead-end on "Couldn't send
            // the report" — raise the signup wall instead, same as Inquire.
            onPress={() => isGuest ? openWall("account") : navigation.navigate("reportContent",
              { targetType: "listing", targetId: listing.listing_id, subject: listing.pet.name })}
          >
            <Text style={styles.flagLinkText}>Report this</Text>
          </TouchableOpacity>
        ) : null}
      />

      {!listing ? (
        <LoadStateView state={loadState(res)} subject="listing" onRetry={load} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {listing.photos.length > 0 ? (
            // AD9 · every photo, the main one first.
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}
              testID="strip.listingDetail.photos">
              {listing.photos.map((uri) => (
                <Image key={uri} source={{ uri }} style={[styles.photo, listing.photos.length > 1 && styles.photoOfMany]} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : null}

          <Text style={styles.name} maxFontSizeMultiplier={maxFontScale.title}>{listingTitle(listing.pet.name)}</Text>
          <Text style={styles.sub}>
            {[capitalize(listing.pet.species), listing.pet.breed,
              listing.pet.sex ? capitalize(listing.pet.sex) : null, listing.city]
              .filter(Boolean).join(" · ")}
          </Text>

          <View style={styles.tagRow}>
            {listing.pet.spayed_neutered ? <Tag text="Spayed/neutered" /> : null}
            {listing.pet.vaccinated ? <Tag text="Vaccinated" /> : null}
            {listing.pet.walkable ? <Tag text="Walkable" /> : null}
          </View>

          <Card style={[styles.feeCard, large && styles.feeCardLarge]}>
            <Text style={styles.feeLabel}>Adoption fee</Text>
            <Text style={styles.feeValue}>
              {Number(listing.adoption_fee) > 0 ? `₱${Number(listing.adoption_fee).toLocaleString()}` : "Free"}
            </Text>
          </Card>

          {listing.description ? (
            <>
              <Text style={styles.sectionTitle}>{`About ${listing.pet.name.trim() || "this animal"}`}</Text>
              <Text style={styles.body}>{listing.description}</Text>
            </>
          ) : null}

          {listing.requirements ? (
            <>
              <Text style={styles.sectionTitle}>Adoption requirements</Text>
              <Text style={styles.body}>{listing.requirements}</Text>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Posted by</Text>
          <Text style={styles.body}>
            {listing.poster.name}{listing.poster.is_shelter ? " · Shelter" : ""}
            {listing.poster.city ? ` · ${listing.poster.city}` : ""}
          </Text>
          {listing.mine ? null : (
            <PersonActions testID="row.listingDetail.person"
              person={{ name: listing.poster.name, accountId: listing.poster.account_id }}
              onReport={() => navigation.navigate("reportContent", {
                targetType: "account", targetId: listing.poster.account_id, subject: listing.poster.name,
                person: { name: listing.poster.name, accountId: listing.poster.account_id }, leaveContent: true })}
              onBlocked={() => navigation.goBack()} />
          )}

          {listing.poster.is_shelter ? (
            // US-Q2 · a 404 (org unapproved or no verified QR yet) is handled on the
            // donate screen itself — this link doesn't need to know which is true.
            <TouchableOpacity hitSlop={TAP_SLOP}
              style={styles.donateLink}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("donate",
                { accountId: listing.poster.account_id, orgName: listing.poster.name, city: listing.city })}
            >
              <Text style={styles.donateLinkText}>Donate to {listing.poster.name} ›</Text>
            </TouchableOpacity>
          ) : null}

          {inquired ? (
            <>
              {/* e2e 20-browse-and-inquire asserts this copy: it is the signal the POST was accepted. */}
              <Text style={styles.inquiredNote}>Inquiry sent — they'll review it and get back to you.</Text>
              <Button
                label="See my inquiries"
                onPress={() => navigation.navigate("myInquiries")}
                variant="secondary"
                style={styles.inquireBtn}
              />
            </>
          ) : listing.status !== "available" ? (
            // D15 · the server still serves a withdrawn (or pending/adopted) listing at 200, so
            // Inquire is offered only while it is AVAILABLE.
            <Text style={styles.inquiredNote} testID="text.listingDetail.unavailable">
              {listing.status === "pending" ? "Reserved for an applicant." : "No longer available for adoption."}
            </Text>
          ) : isShelter ? (
            // AD14 · Inquire would only answer 403 shelter_cannot_adopt; say so up front instead.
            <Text style={styles.inquiredNote} testID="text.listingDetail.shelterNote">
              Shelters can't adopt through Kupkop, so there's nothing to send here.
            </Text>
          ) : (
            <Button
              testID="btn.listingDetail.inquire"
              label="Inquire to adopt"
              onPress={onInquirePressed}
              loading={inquiring}
              style={styles.inquireBtn}
            />
          )}
        </ScrollView>
      )}

      <InquireSheet
        visible={sheet} petName={listing?.pet.name ?? "this animal"} posterName={listing?.poster.name ?? "The poster"}
        sending={inquiring} onSend={inquire} onCancel={() => setSheet(false)} />
      <SignupWall
        visible={wall.open}
        action={wall.action}
        subject={wall.action === "adopt" ? listing?.pet.name : undefined}
        onCreateAccount={() => { setIntent(wall.action); closeWall(); navigation.navigate("accountType"); }}
        onLogin={() => { closeWall(); navigation.navigate("signin"); }}
        onDismiss={closeWall}
      />
    </View>
  );
}

function Tag({ text }: { text: string }) {
  return <View style={styles.tag}><Text style={styles.tagText}>{text}</Text></View>;
}

function capitalize(s: string | null | undefined): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  flagLinkText: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  photoStrip: { marginBottom: 18 },
  photo: { width: "100%", height: 240, borderRadius: radii.card, backgroundColor: colors.border },
  photoOfMany: { width: 320, marginRight: 12 },
  name: { color: colors.ink, ...typography.hero },
  sub: { marginTop: 8, color: colors.muted, ...typography.subtitle },
  donateLink: { marginTop: 10 },
  donateLinkText: { color: colors.teal, ...typography.strong, fontWeight: "700" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  tag: { backgroundColor: colors.soft, paddingHorizontal: 12, minHeight: 30, paddingVertical: 4, borderRadius: 15, justifyContent: "center" },
  tagText: { color: colors.tealDark, ...typography.meta, fontWeight: "700" },
  feeCard: { marginTop: 18, padding: 18, flexDirection: "row",
             alignItems: "center", justifyContent: "space-between" },
  // large: label above value (a longer fee or label would not share the line).
  feeCardLarge: { flexDirection: "column", alignItems: "flex-start" },
  feeLabel: { color: colors.muted, ...typography.strong, fontWeight: "700" },
  feeValue: { color: colors.ink, ...typography.section },
  sectionTitle: { marginTop: 24, marginBottom: 8, color: colors.ink, ...typography.section },
  body: { color: colors.ink, ...typography.body },
  inquiredNote: { marginTop: 30, color: colors.muted, ...typography.strong, fontWeight: "700", textAlign: "center" },
  inquireBtn: { marginTop: 14 }
});
