// US-A3 · the Adopt tab — browse public listings. GET /listings?city=&species=&page=.
// Reference: design/mobile-v3/Adopt.dc.html (the V3 deck; screens/user/screen-adopt.png was the
// V2 list it replaced). Replaces the M8 placeholder.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AdoptDeck } from "../components/AdoptDeck";
import { InquiryList } from "../components/InquiryList";
import { PressScale, SegmentedControl } from "../components/ui";
import { motion, spacing, tabBarClearance, typography } from "../theme";

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
import { ScreenBackdrop } from "../components/ScreenBackground";
import { colors } from "../theme";


/** The canvas's Adopt artboard: ["Browse", "My inquiries"]. */
const SEGMENTS = ["Browse", "My inquiries"];

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

  const [segment, setSegment] = useState(0);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen} testID="screen.adopt">
      <ScreenBackdrop />
      <View style={styles.header}>
        <Text style={styles.title}>Adopt</Text>
        <View style={styles.headerLinks}>
          <TouchableOpacity onPress={() => navigation.navigate("listingForm", undefined)} hitSlop={TAP_SLOP}>
            <Text style={styles.headerLink}>+ List</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* The canvas's Adopt artboard puts these two views behind a segmented control rather
          than sending "My inquiries" to a screen of its own. The route still exists — see
          components/InquiryList.tsx for why — this is the in-place view. */}
      <SegmentedControl
        segments={SEGMENTS}
        index={segment}
        onChange={setSegment}
        testID="seg.adopt"
        style={styles.segmented}
      />

      {segment === 1 ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <InquiryList />
        </ScrollView>
      ) : (
      <>
      {/* "Chip select · scale .94 · 340ms" from the canvas's Motion panel — a chip is small,
          so it takes a deeper scale than the .978 a card or button uses. */}
      <View style={styles.filterRow}>
        {SPECIES.map((f) => (
          <PressScale hitSlop={TAP_SLOP}
            key={f.key || "all"}
            scale={motion.chipScale}
            style={[styles.filterChip, species === f.key && styles.filterChipActive]}
            onPress={() => setSpecies(f.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: species === f.key }}
          >
            <Text style={[styles.filterText, species === f.key && styles.filterTextActive]}>{f.label}</Text>
          </PressScale>
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
          {/* The canvas's Browse view is a deck, not a list — see components/AdoptDeck.tsx.
              The species chips above still drive the query; the deck is what the result
              becomes. `card.adopt.0` stays the top card, so 20-browse-and-inquire.yaml holds. */}
          <AdoptDeck
            listings={listings ?? []}
            city={city}
            onOpen={(listingId) => navigation.navigate("listingDetail", { listingId })}
          />
          </>
        )}
      </ScrollView>
      </>
      )}

      <OwnerTabs active="adopt" />
    </View>
  );
}



const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  header: { paddingTop: 58, paddingHorizontal: spacing.lg, paddingBottom: 4, flexDirection: "row",
            alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.ink, ...typography.hero },
  headerLinks: { flexDirection: "row", gap: 16 },
  headerLink: { color: colors.teal, ...typography.meta, fontWeight: "700" },
  segmented: { marginHorizontal: 26, marginTop: 14 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.lg, paddingTop: 14, paddingBottom: 4 },
  filterChip: { paddingHorizontal: 16, height: 36, borderRadius: 18, alignItems: "center",
               justifyContent: "center", backgroundColor: colors.white },
  filterChipActive: { backgroundColor: colors.teal },
  filterText: { color: colors.muted, ...typography.meta, fontWeight: "700" },
  filterTextActive: { color: colors.white },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: tabBarClearance },
  empty: { marginTop: 50, color: colors.muted, ...typography.body, textAlign: "center" }
});
