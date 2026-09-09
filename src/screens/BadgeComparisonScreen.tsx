// US-B2 · a single badge's detail (screen-badge-comparison). Shows the badge large with its
// criteria and either when it was earned or that it's still locked — never claiming an unearned
// badge is earned.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  soft: "#E7F0EF", dim: "#E0DFD9", dimInk: "#A6A49C", ok: "#27500A", okBg: "#EAF3DE"
};
const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

type Props = NativeStackScreenProps<RootStackParamList, "badgeComparison">;

function earnedDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined,
      { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return null;
  }
}

export function BadgeComparisonScreen({ navigation, route }: Props) {
  const { badge } = route.params;
  const when = earnedDate(badge.earned_at);
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Badge</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.medal, badge.earned ? styles.medalOn : styles.medalOff]}>
          <Text style={[styles.medalGlyph, badge.earned ? null : styles.medalGlyphOff]}>★</Text>
        </View>
        <Text style={[styles.name, badge.earned ? null : styles.dimText]}>{badge.name}</Text>
        {badge.description ? <Text style={styles.description}>{badge.description}</Text> : null}

        <View style={styles.criteriaCard}>
          <Text style={styles.criteriaLabel}>How to earn it</Text>
          <Text style={styles.criteriaText}>{badge.criteria}</Text>
        </View>

        {badge.earned ? (
          <View style={styles.earnedPill}>
            <Text style={styles.earnedText}>
              Earned{when ? ` · ${when}` : ""}
            </Text>
          </View>
        ) : (
          <Text style={styles.lockedText}>Not earned yet — keep helping!</Text>
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
  content: { paddingHorizontal: 26, paddingTop: 24, paddingBottom: 60, alignItems: "center" },
  medal: { width: 108, height: 108, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  medalOn: { backgroundColor: colors.soft },
  medalOff: { backgroundColor: colors.dim },
  medalGlyph: { color: colors.teal, fontSize: 54, fontWeight: "800" },
  medalGlyphOff: { color: colors.dimInk },
  name: { marginTop: 20, color: colors.ink, fontSize: 26, fontWeight: "800", textAlign: "center" },
  dimText: { color: colors.dimInk },
  description: { marginTop: 10, color: colors.muted, fontSize: 15.5, lineHeight: 22, textAlign: "center" },
  criteriaCard: { marginTop: 24, alignSelf: "stretch", padding: 18, borderRadius: 22, ...card },
  criteriaLabel: { color: colors.muted, fontSize: 13, fontWeight: "600", letterSpacing: 0.4 },
  criteriaText: { marginTop: 6, color: colors.ink, fontSize: 16, fontWeight: "600" },
  earnedPill: { marginTop: 22, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 16, backgroundColor: colors.okBg },
  earnedText: { color: colors.ok, fontSize: 15, fontWeight: "700" },
  lockedText: { marginTop: 22, color: colors.muted, fontSize: 15, fontWeight: "600" }
});
