// US-T2 · the success-story feed. Public, published-only, newest-first (GET /stories). Cards
// show the author's city (never a location, D-S6-4), a story-type chip, caption, and reaction
// count. Compose from the header; tap a card for its detail.
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import {
  ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { StaleBanner } from "../components/StaleBanner";
import { isOffline, loadState } from "../net";
import { storyTypeChip, StoryType } from "../community";
import { RootStackParamList } from "../navigation/types";
import { useCachedFeed } from "../useCachedFeed";
import { TAP_SLOP } from "../touch";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  soft: "#E7F0EF", dim: "#DBE6E2", okBg: "#EAF3DE", ok: "#27500A", greyPill: "#ECEAE3"
};
const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};
const CHIP: Record<"ok" | "teal" | "muted", { bg: string; fg: string }> = {
  ok: { bg: colors.okBg, fg: colors.ok },
  teal: { bg: colors.soft, fg: colors.teal },
  muted: { bg: colors.greyPill, fg: colors.muted }
};

export type StoryCard = {
  story_id: string; author: { name: string; city: string }; story_type: StoryType;
  caption: string; reaction_count: number; my_reaction: boolean;
  photos: { url: string; is_primary: boolean }[];
};
type Props = NativeStackScreenProps<RootStackParamList, "stories">;

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export function StoriesScreen({ navigation }: Props) {
  const api = useApi();
  const { rows: stories, res, stale, load: loadFeed } =
    useCachedFeed<StoryCard>(api, (d) => d?.results ?? []);
  // US-O1 · keep the RESULT, not just the rows. Collapsing a failure into `[]` told an
  // offline person "No stories yet — be the first to share one", which is untrue and makes
  // the community look dead.

  const load = useCallback(() => {
    // US-X1 · this used to be `setStories(r.ok ? r.data.results : [])`, so a failed REFETCH
    // replaced stories the person was reading with an empty list. The hook keeps them.
    loadFeed("/stories");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFocusEffect(load);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Stories</Text>
        <TouchableOpacity hitSlop={TAP_SLOP} style={styles.share} onPress={() => navigation.navigate("storyCompose", {})}>
          <Text style={styles.shareLabel}>+ Share</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loadState(res, stories?.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, stories?.length)}
            emptyTitle="No stories yet"
            emptyBody="Be the first to share one."
            onRetry={load}
          />
        ) : (
          <>
          {stale ? <StaleBanner offline={isOffline(res)} /> : null}
          {(stories ?? []).map((s) => {
            const chip = storyTypeChip(s.story_type);
            return (
              <TouchableOpacity key={s.story_id} style={styles.storyCard} activeOpacity={0.85}
                onPress={() => navigation.navigate("storyDetail", { storyId: s.story_id })}>
                {s.photos[0]
                  ? <Image source={{ uri: s.photos[0].url }} style={styles.photo} resizeMode="cover" />
                  : <View style={styles.photo} />}
                <View style={styles.authorRow}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{initials(s.author.name)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.authorName}>{s.author.name}</Text>
                    {s.author.city ? <Text style={styles.city}>{s.author.city}</Text> : null}
                  </View>
                  <View style={[styles.chip, { backgroundColor: CHIP[chip.tone].bg }]}>
                    <Text style={[styles.chipText, { color: CHIP[chip.tone].fg }]}>{chip.label}</Text>
                  </View>
                </View>
                {s.caption ? <Text style={styles.caption} numberOfLines={2}>{s.caption}</Text> : null}
                <View style={styles.reactRow}>
                  <Text style={[styles.heart, s.my_reaction ? styles.heartOn : null]}>♥</Text>
                  <Text style={styles.reactCount}>{s.reaction_count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 14 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { flex: 1, color: colors.ink, fontSize: 22, fontWeight: "800" },
  share: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 22, backgroundColor: colors.teal },
  shareLabel: { color: colors.white, fontSize: 15, fontWeight: "700" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, textAlign: "center" },
  storyCard: { marginBottom: 16, padding: 16, borderRadius: 22, ...card },
  photo: { height: 150, borderRadius: 16, backgroundColor: colors.dim },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 },
  avatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.teal, fontSize: 17, fontWeight: "800" },
  authorName: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  city: { color: colors.muted, fontSize: 13.5, marginTop: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  chipText: { fontSize: 12.5, fontWeight: "700" },
  caption: { marginTop: 12, color: colors.ink, fontSize: 15, lineHeight: 21 },
  reactRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  heart: { fontSize: 20, color: "#C9D3CF" },
  heartOn: { color: colors.teal },
  reactCount: { color: colors.muted, fontSize: 14, fontWeight: "700" }
});
