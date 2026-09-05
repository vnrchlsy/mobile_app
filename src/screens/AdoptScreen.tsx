// US-A3 · the Adopt tab — browse public listings. GET /listings?city=&species=&page=.
// Reference: screens/user/screen-adopt.png. Replaces the M8 placeholder.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Listing } from "../api/types";
import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { StaleBanner } from "../components/StaleBanner";
import { isOffline, loadState } from "../net";
import { useAuth } from "../auth/AuthContext";
import { OwnerTabs } from "../components/OwnerTabs";
import { RootStackParamList } from "../navigation/types";
import { useCachedFeed } from "../useCachedFeed";
import { TAP_SLOP } from "../touch";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  line: "#E3E1D9", chipBg: "#E7F0EE"
};

const SPECIES: Array<{ key: string; label: string }> = [
  { key: "", label: "All" }, { key: "dog", label: "Dogs" },
  { key: "cat", label: "Cats" }, { key: "other", label: "Other" }
];

type Props = NativeStackScreenProps<RootStackParamList, "adopt">;

export function AdoptScreen({ navigation }: Props) {
  const api = useApi();
  const { city } = useAuth();
  // US-X1 · cache-first. `listings` is now `Listing[] | null` — the empty-array init could
  // not tell "not loaded" from "genuinely none", which only stayed safe because `res` was
  // tracked alongside it. With a cache the distinction does real work: null means show the
  // load state, [] means the city really has no pets.
  const { rows: listings, res, stale, load: loadFeed } =
    useCachedFeed<Listing>(api, (d) => d?.results ?? []);

  const [species, setSpecies] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (species) params.set("species", species);
    loadFeed(`/listings?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus + filter change
  }, [city, species]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen} testID="screen.adopt">
      <View style={styles.header}>
        <Text style={styles.title}>Adopt</Text>
        <View style={styles.headerLinks}>
          <TouchableOpacity onPress={() => navigation.navigate("listingForm", undefined)} hitSlop={TAP_SLOP}>
            <Text style={styles.headerLink}>+ List</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("myInquiries")} hitSlop={TAP_SLOP}>
            <Text style={styles.headerLink}>My inquiries ›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterRow}>
        {SPECIES.map((f) => (
          <TouchableOpacity hitSlop={TAP_SLOP}
            key={f.key || "all"}
            style={[styles.filterChip, species === f.key && styles.filterChipActive]}
            onPress={() => setSpecies(f.key)}
            activeOpacity={0.85}
          >
            <Text style={[styles.filterText, species === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loadState(res, listings?.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, listings?.length)}
            emptyTitle={city ? `No pets up for adoption in ${city} yet.`
              : "Set your city to see nearby pets."}
            onRetry={load}
          />
        ) : (
          <>
          {stale ? <StaleBanner offline={isOffline(res)} /> : null}
          {(listings ?? []).map((l, i) => (
            <TouchableOpacity
              // Indexed, so a flow can tap "the first listing" without knowing the fixture's
              // id. `card.adopt.0` is the contract; which animal is in it is the seed's business.
              testID={`card.adopt.${i}`}
              key={l.listing_id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("listingDetail", { listingId: l.listing_id })}
            >
              {l.photo_url ? (
                <Image source={{ uri: l.photo_url }} style={styles.cardPhoto} resizeMode="cover" />
              ) : (
                <View style={[styles.cardPhoto, styles.cardPhotoEmpty]} />
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{l.pet.name}</Text>
                <Text style={styles.cardMeta}>
                  {[capitalize(l.pet.species), l.pet.breed, l.city].filter(Boolean).join(" · ")}
                </Text>
                <Text style={styles.cardFee}>
                  {l.adoption_fee && Number(l.adoption_fee) > 0
                    ? `Adoption fee · ₱${Number(l.adoption_fee).toLocaleString()}`
                    : "No adoption fee"}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          </>
        )}
      </ScrollView>

      <OwnerTabs active="adopt" />
    </View>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 4, flexDirection: "row",
            alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.ink, fontSize: 26, fontWeight: "800" },
  headerLinks: { flexDirection: "row", gap: 16 },
  headerLink: { color: colors.teal, fontSize: 14, fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 26, paddingTop: 14, paddingBottom: 4 },
  filterChip: { paddingHorizontal: 16, height: 36, borderRadius: 18, alignItems: "center",
               justifyContent: "center", backgroundColor: colors.white },
  filterChipActive: { backgroundColor: colors.teal },
  filterText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  filterTextActive: { color: colors.white },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 130 },
  card: { borderRadius: 22, marginBottom: 14, overflow: "hidden", ...card },
  cardPhoto: { width: "100%", height: 170, backgroundColor: colors.line },
  cardPhotoEmpty: { alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 16 },
  cardName: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  cardMeta: { marginTop: 4, color: colors.muted, fontSize: 14 },
  cardFee: { marginTop: 8, color: colors.teal, fontSize: 14, fontWeight: "700" },
  empty: { marginTop: 50, color: colors.muted, fontSize: 16, textAlign: "center", lineHeight: 22 }
});
