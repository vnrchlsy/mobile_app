// US-A3/A4 · a listing's detail + the gated Inquire action.
// GET /listings/{id}; POST /listings/{id}/inquiries.
// The inquiry gates (Verified Member, verified phone) are backend-enforced — this screen
// POSTs and handles the 403 codes rather than re-deriving who's allowed (the SEC1 pattern:
// the server owns the access decision, the client renders the outcome).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ListingDetail } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { useAuth } from "../auth/AuthContext";
import { SignupWall } from "../components/SignupWall";
import { setIntent } from "../guestIntent";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  line: "#E3E1D9", chipBg: "#E7F0EE", chipFg: "#14504F"
};

type Props = NativeStackScreenProps<RootStackParamList, "listingDetail">;

export function ListingDetailScreen({ navigation, route }: Props) {
  const api = useApi();
  const { tokens } = useAuth();
  const isGuest = tokens === null;
  const { listingId } = route.params;
  const [listing, setListing] = useState<ListingDetail | null>(null);
  // US-R4 · "{X} not found." was shown for EVERY failure, not just a missing row — so
  // someone offline, or hitting a 500, was told the thing does not exist. R2's `gone`
  // is what actually means "not found" (404/403); everything else keeps its own words
  // and a retry that can work.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [inquiring, setInquiring] = useState(false);
  const [inquired, setInquired] = useState(false);
  const [wallOpen, setWallOpen] = useState(false);

  const load = useCallback(() => {
    setRes(null);
    api.get(`/listings/${listingId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setListing(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [listingId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onInquirePressed() {
    // US-A1b/A3: a guest may VIEW this screen read-only, but Inquire is the gated action —
    // it raises the signup wall rather than hitting the API (which would just 401). A
    // signed-in user goes straight to the real inquiry.
    if (isGuest) {
      setWallOpen(true);
      return;
    }
    inquire();
  }

  async function inquire() {
    if (inquiring) return;
    setInquiring(true);
    const res = await api.post(`/listings/${listingId}/inquiries`, {});
    setInquiring(false);
    if (res.ok) {
      setInquired(true);
      Alert.alert("Inquiry sent", "The poster will see it and reach out. Track it under My inquiries.",
        [{ text: "OK" }, { text: "See my inquiries", onPress: () => navigation.navigate("myInquiries") }]);
      return;
    }
    const code = res.data?.error?.code;
    if (code === "already_inquired") {
      setInquired(true);
      Alert.alert("Already inquired", "You've already inquired on this listing.");
      return;
    }
    if (code === "member_badge_required") {
      Alert.alert("Get verified to adopt",
        "Adopting needs a Verified Member badge — it takes a gov ID and one social link.",
        [{ text: "Not now", style: "cancel" },
         { text: "Get verified", onPress: () => navigation.navigate("memberUpgrade") }]);
      return;
    }
    if (code === "phone_unverified") {
      Alert.alert("Verify your phone first",
        "The poster reaches you by phone — verify a mobile number, then send your inquiry.",
        [{ text: "Not now", style: "cancel" },
         { text: "Verify phone", onPress: () => navigation.navigate("verifyPhone") }]);
      return;
    }
    Alert.alert("Couldn't send the inquiry", res.data?.error?.message ?? "Try again.");
  }

  return (
    <View style={styles.screen} testID="screen.listingDetail">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Adopt</Text>
        {listing ? (
          <TouchableOpacity
            style={styles.flagLink}
            hitSlop={12}
            onPress={() => navigation.navigate("reportContent",
              { targetType: "listing", targetId: listing.listing_id })}
          >
            <Text style={styles.flagLinkText}>Report this</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {!listing ? (
        <LoadStateView state={loadState(res)} subject="listing" onRetry={load} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {listing.photos.length > 0 ? (
            <Image source={{ uri: listing.photos[0] }} style={styles.photo} resizeMode="cover" />
          ) : null}

          <Text style={styles.name}>{listing.pet.name}</Text>
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

          <View style={styles.feeCard}>
            <Text style={styles.feeLabel}>Adoption fee</Text>
            <Text style={styles.feeValue}>
              {Number(listing.adoption_fee) > 0 ? `₱${Number(listing.adoption_fee).toLocaleString()}` : "Free"}
            </Text>
          </View>

          {listing.description ? (
            <>
              <Text style={styles.sectionTitle}>About {listing.pet.name}</Text>
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

          {listing.poster.is_shelter ? (
            // US-Q2 · a 404 (org unapproved or no verified QR yet) is handled on the
            // donate screen itself — this link doesn't need to know which is true.
            <TouchableOpacity hitSlop={TAP_SLOP}
              style={styles.donateLink}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("donate",
                { accountId: listing.poster.account_id, orgName: listing.poster.name })}
            >
              <Text style={styles.donateLinkText}>Donate to {listing.poster.name} ›</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            testID="btn.listingDetail.inquire"
            style={[styles.inquireBtn, (inquiring || inquired) && styles.inquireBtnIdle]}
            activeOpacity={0.9}
            onPress={onInquirePressed}
            disabled={inquiring || inquired}
          >
            {inquiring ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.inquireText}>{inquired ? "Inquiry sent" : "Inquire to adopt"}</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      <SignupWall
        visible={wallOpen}
        action="adopt"
        subject={listing?.pet.name}
        onCreateAccount={() => { setIntent("adopt"); setWallOpen(false); navigation.navigate("accountType"); }}
        onLogin={() => { setWallOpen(false); navigation.navigate("signin"); }}
        onDismiss={() => setWallOpen(false)}
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

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  flagLink: { marginLeft: "auto" },
  flagLinkText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  photo: { width: "100%", height: 240, borderRadius: 22, marginBottom: 18, backgroundColor: colors.line },
  name: { color: colors.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  sub: { marginTop: 8, color: colors.muted, fontSize: 16 },
  donateLink: { marginTop: 10 },
  donateLinkText: { color: colors.teal, fontSize: 15, fontWeight: "700" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  tag: { backgroundColor: colors.chipBg, paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: "center" },
  tagText: { color: colors.chipFg, fontSize: 13, fontWeight: "700" },
  feeCard: { marginTop: 18, padding: 18, borderRadius: 18, flexDirection: "row",
             alignItems: "center", justifyContent: "space-between", ...card },
  feeLabel: { color: colors.muted, fontSize: 15, fontWeight: "600" },
  feeValue: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  sectionTitle: { marginTop: 24, marginBottom: 8, color: colors.ink, fontSize: 18, fontWeight: "800" },
  body: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  inquireBtn: { marginTop: 30, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  inquireBtnIdle: { backgroundColor: "#7FA8A6" },
  inquireText: { color: colors.white, fontSize: 19, fontWeight: "700" }
});
