// US-B2 · My Impact: the four impact aggregates as stat tiles + the badge grid. Earned badges
// render bright; unearned ones are dimmed but still show their criteria (never rendered as
// earned — the Reliable-chip trust rule). Tap a badge for its detail.
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { impactTiles, Impact } from "../community";
import { BadgeShape, RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", tealDk: "#14504F", page: "#F4F5F2", muted: "#5F5E5A",
  white: "#FFFFFF", soft: "#E7F0EF", dim: "#EDEDE8", dimInk: "#A6A49C"
};
const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

type Badge = BadgeShape;
type Props = NativeStackScreenProps<RootStackParamList, "impact">;

export function ImpactScreen({ navigation }: Props) {
  const api = useApi();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [badges, setBadges] = useState<Badge[] | null>(null);

  const load = useCallback(() => {
    api.get("/me/impact").then((r) => {
      if (r.ok) { setImpact(r.data.impact); setBadges(r.data.badges); }
      else setBadges([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFocusEffect(load);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My impact</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {impact ? (
          <View style={styles.statRow}>
            {impactTiles(impact).map((t) => (
              <View key={t.label} style={styles.statTile}>
                <Text style={styles.statValue}>{t.value}</Text>
                <Text style={styles.statLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Badges</Text>
        {badges === null ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={colors.teal} />
        ) : (
          <View style={styles.grid}>
            {badges.map((b) => (
              <TouchableOpacity key={b.badge_code} activeOpacity={0.8}
                style={[styles.badgeTile, b.earned ? null : styles.badgeTileDim]}
                onPress={() => navigation.navigate("badgeComparison", { badge: b })}>
                <View style={[styles.medal, b.earned ? styles.medalOn : styles.medalOff]}>
                  {/* One glyph, dimmed when unearned — no emoji (design rule); dimming, not a
                      lock icon, signals "not yet earned". */}
                  <Text style={[styles.medalGlyph, b.earned ? null : styles.medalGlyphOff]}>★</Text>
                </View>
                <Text style={[styles.badgeName, b.earned ? null : styles.dimText]}
                  numberOfLines={2}>{b.name}</Text>
                <Text style={styles.badgeCriteria} numberOfLines={2}>{b.criteria}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  statRow: { flexDirection: "row", gap: 10 },
  statTile: { flex: 1, paddingVertical: 16, borderRadius: 18, alignItems: "center", ...card },
  statValue: { color: colors.teal, fontSize: 26, fontWeight: "800" },
  statLabel: { marginTop: 4, color: colors.muted, fontSize: 12, fontWeight: "600" },
  sectionTitle: { marginTop: 28, marginBottom: 14, color: colors.ink, fontSize: 20, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  badgeTile: { width: "48%", marginBottom: 14, padding: 16, borderRadius: 22, alignItems: "center", ...card },
  badgeTileDim: { backgroundColor: colors.dim, shadowOpacity: 0 },
  medal: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  medalOn: { backgroundColor: colors.soft },
  medalOff: { backgroundColor: "#E0DFD9" },
  medalGlyph: { color: colors.teal, fontSize: 28, fontWeight: "800" },
  medalGlyphOff: { color: colors.dimInk, fontSize: 22 },
  badgeName: { marginTop: 12, color: colors.ink, fontSize: 15, fontWeight: "800", textAlign: "center" },
  badgeCriteria: { marginTop: 6, color: colors.muted, fontSize: 12.5, textAlign: "center", lineHeight: 17 },
  dimText: { color: colors.dimInk }
});
