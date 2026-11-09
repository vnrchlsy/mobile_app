// US-T2 · the success-story feed. Public, published-only, newest-first (GET /stories). Cards
// show the author's city (never a location, D-S6-4), a story-type chip, caption, and reaction
// count. Compose from the header; tap a card for its detail.
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { SignupWall } from "../components/SignupWall";
import { setIntent } from "../guestIntent";
import { LoadStateView } from "../components/LoadStateView";
import { Avatar, ScreenHeader } from "../components/ui";
import { StaleBanner } from "../components/StaleBanner";
import { isOffline } from "../net";
import { storyTypeChip, StoryType } from "../community";
import { RootStackParamList } from "../navigation/types";
import { feedState, useCachedFeed } from "../useCachedFeed";
import { TAP_SLOP } from "../touch";
import { useLargeText } from "../useLargeText";
import { colors, elevation, pill, radii, spacing, typography } from "../theme";

const card = {
  backgroundColor: colors.white, ...elevation.soft
};
const CHIP: Record<"ok" | "teal" | "muted", { bg: string; fg: string }> = {
  ok: { bg: colors.successBg, fg: colors.success },
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
  // At Dynamic Type AX3 and up the author row (avatar | name | chip) cannot share a line, so it stacks.
  const large = useLargeText();
  const api = useApi();
  // Stories review step 7 (ST13) · stories are readable as a guest, so "+ Share" is drawn for one too. Compose then
  // failed at the photo step with "Couldn't add photo". A guest gets the sign-up wall here, as the detail's React does (G16).
  const { tokens } = useAuth();
  const isGuest = tokens === null;
  const [wallOpen, setWallOpen] = useState(false);
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

  const state = feedState(res, stories, stale);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Stories"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity hitSlop={TAP_SLOP} style={styles.share} onPress={() => isGuest ? setWallOpen(true) : navigation.navigate("storyCompose", {})}>
            <Text style={styles.shareLabel}>+ Share</Text>
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {state.kind !== "ready" ? (
          <LoadStateView
            state={state}
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
                <View style={[styles.authorRow, large && styles.authorRowLarge]}>
                  <Avatar initials={initials(s.author.name)} tinted size={46} />
                  <View style={large ? styles.authorCopyLarge : styles.authorCopy}>
                    <Text style={styles.authorName}>{s.author.name}</Text>
                    {s.author.city ? <Text style={styles.city}>{s.author.city}</Text> : null}
                  </View>
                  <View style={[styles.chip, { backgroundColor: CHIP[chip.tone].bg }]}>
                    <Text style={[styles.chipText, { color: CHIP[chip.tone].fg }]}>{chip.label}</Text>
                  </View>
                </View>
                {s.caption ? <Text style={styles.caption} numberOfLines={large ? undefined : 2}>{s.caption}</Text> : null}
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
      <SignupWall
        visible={wallOpen}
        action="share_story"
        onCreateAccount={() => { setIntent("share_story"); setWallOpen(false); navigation.navigate("accountType"); }}
        onLogin={() => { setWallOpen(false); navigation.navigate("signin"); }}
        onDismiss={() => setWallOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  share: { minHeight: 38, paddingVertical: 8, paddingHorizontal: 18, justifyContent: "center", borderRadius: pill(38), backgroundColor: colors.teal },
  shareLabel: { color: colors.white, ...typography.strong, fontWeight: "700" },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  empty: { marginTop: 40, color: colors.muted, ...typography.subtitle, textAlign: "center" },
  storyCard: { marginBottom: 16, padding: 16, borderRadius: radii.card, ...card },
  photo: { height: 150, borderRadius: radii.card, backgroundColor: colors.placeholder },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 },
  // large: stacked. The base copy column is `flex: 1`, which survives in a style array and would collapse the text in a column (`flex: 0` is what works, #189).
  authorRowLarge: { flexDirection: "column", alignItems: "flex-start" },
  authorCopy: { flex: 1 },
  authorCopyLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  authorName: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  city: { color: colors.muted, ...typography.meta, marginTop: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radii.chip },
  chipText: { ...typography.meta, fontWeight: "700" },
  caption: { marginTop: 12, color: colors.ink, ...typography.body },
  reactRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  heart: { fontSize: 20, color: "#C9D3CF" },
  heartOn: { color: colors.teal },
  reactCount: { color: colors.muted, ...typography.meta, fontWeight: "700" }
});
