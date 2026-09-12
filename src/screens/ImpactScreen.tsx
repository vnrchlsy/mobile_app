// US-B2 · My Impact: the four impact aggregates as stat tiles + the badge grid. Earned badges
// render bright; unearned ones are dimmed but still show their criteria (never rendered as
// earned — the Reliable-chip trust rule). Tap a badge for its detail.
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { impactTiles, Impact } from "../community";
import { BadgeShape, RootStackParamList } from "../navigation/types";
import { colors, elevation, radii, spacing, squircle, typography } from "../theme";
import { ScreenHeader } from "../components/ui";

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

type Badge = BadgeShape;
type Props = NativeStackScreenProps<RootStackParamList, "impact">;

export function ImpactScreen({ navigation }: Props) {
  const api = useApi();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const load = useCallback(() => {
    setRes(null);
    // ⚠️ was `else setBadges([])` — a failure rendered an empty badge grid, showing someone
    // none of the badges they have actually earned.
    api.get("/me/impact").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) { setImpact(r.data.impact); setBadges(r.data.badges); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFocusEffect(load);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="My impact" onBack={() => navigation.goBack()} />
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
        {loadState(res, badges?.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, badges?.length)}
            emptyTitle="No badges yet"
            emptyBody="They appear here as you help."
            onRetry={load}
          />
        ) : (
          <View style={styles.grid}>
            {(badges ?? []).map((b) => (
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
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  statRow: { flexDirection: "row", gap: 10 },
  statTile: { flex: 1, paddingVertical: 16, borderRadius: radii.tile, alignItems: "center", ...card },
  statValue: { color: colors.teal, ...typography.hero },
  statLabel: { marginTop: 4, color: colors.muted, ...typography.meta, fontWeight: "600" },
  sectionTitle: { marginTop: 28, marginBottom: 14, color: colors.ink, ...typography.section },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  badgeTile: { width: "48%", marginBottom: 14, padding: 16, borderRadius: radii.card, alignItems: "center", ...card },
  badgeTileDim: { backgroundColor: colors.greyPill, shadowOpacity: 0 },
  medal: { width: 56, height: 56, borderRadius: squircle(56), alignItems: "center", justifyContent: "center" },
  medalOn: { backgroundColor: colors.soft },
  medalOff: { backgroundColor: "#E0DFD9" },
  medalGlyph: { color: colors.teal, fontSize: 28, fontWeight: "800" },
  medalGlyphOff: { color: colors.muted, fontSize: 22 },
  badgeName: { marginTop: 12, color: colors.ink, ...typography.strong, fontWeight: "800", textAlign: "center" },
  badgeCriteria: { marginTop: 6, color: colors.muted, ...typography.meta, textAlign: "center", lineHeight: 17 },
  dimText: { color: colors.muted }
});
