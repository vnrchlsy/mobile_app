// US-T2 · one story. React is optimistic (flip + count locally, reconcile from the response);
// flag confirms first (it's a report, not a like) then POSTs to the shared moderation pipeline.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { Avatar, ScreenHeader } from "../components/ui";
import { loadState } from "../net";
import { storyTypeChip, StoryType } from "../community";
import { RootStackParamList } from "../navigation/types";
import { colors, elevation, pill, radii, spacing, typography } from "../theme";

const card = {
  backgroundColor: colors.white, ...elevation.soft
};
const CHIP: Record<"ok" | "teal" | "muted", { bg: string; fg: string }> = {
  ok: { bg: colors.successBg, fg: colors.success },
  teal: { bg: colors.soft, fg: colors.teal },
  muted: { bg: colors.greyPill, fg: colors.muted }
};

type Story = {
  story_id: string; author: { name: string; city: string }; story_type: StoryType;
  caption: string; reaction_count: number; my_reaction: boolean;
  photos: { url: string; is_primary: boolean }[]; status: string;
};
type Props = NativeStackScreenProps<RootStackParamList, "storyDetail">;

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export function StoryDetailScreen({ navigation, route }: Props) {
  const api = useApi();
  const { storyId } = route.params;
  const [story, setStory] = useState<Story | null>(null);
  // US-R1 · keep the RESULT. The previous line discarded it (`r.ok && setStory(...)`), which
  // left `story` null forever on failure — and the `if (!story)` branch below rendered a
  // spinner, so a story that could never load span indefinitely. §13.3 names that outcome
  // specifically: "cached/empty states render (no infinite spinners)".
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const load = useCallback(() => {
    setRes(null);
    api.get(`/stories/${storyId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setStory(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);
  useEffect(load, [load]);

  async function toggleReact() {
    if (!story) return;
    const wasOn = story.my_reaction;
    // optimistic: flip + adjust count now, reconcile from the server's real count.
    setStory({ ...story, my_reaction: !wasOn, reaction_count: story.reaction_count + (wasOn ? -1 : 1) });
    const res = wasOn
      ? await api.del(`/stories/${storyId}/reactions`)
      : await api.post(`/stories/${storyId}/reactions`);
    if (res.ok) {
      setStory((s) => s ? { ...s, my_reaction: !wasOn, reaction_count: res.data.reaction_count } : s);
    } else {
      setStory((s) => s ? { ...s, my_reaction: wasOn, reaction_count: story.reaction_count } : s);
    }
  }

  function confirmFlag() {
    Alert.alert("Flag this story?",
      "It'll be sent to Kupkop for review. Use this for off-topic, misleading, or unsafe posts.",
      [{ text: "Cancel", style: "cancel" },
       { text: "Flag", style: "destructive", onPress: doFlag }]);
  }

  async function doFlag() {
    const res = await api.post("/moderation/flags",
      { target_type: "story", target_id: storyId, reason: "reported from story detail" });
    Alert.alert(res.ok ? "Thanks" : "Couldn't flag",
      res.ok ? "Our team will take a look." : "Please try again.");
  }

  // ⚠️ HOISTED OUT OF BOTH RETURNS ON PURPOSE. The back button does not depend on `story`, and
  // it is this screen's only way out. It used to live only in the loaded branch, so the offline
  // state rendered with no exit at all — found on a real device during US-PF3. This is the shape
  // ListingDetailScreen already uses: chrome outside the conditional, only the body switches.
  const header = (
    <ScreenHeader title="Story" onBack={() => navigation.goBack()} />
  );

  if (!story) {
    // No `count` argument: this is a DETAIL route, so `loadState` never returns "empty" —
    // "No stories yet" would be nonsense on a page about one specific story. Loading,
    // offline and error are the only outcomes that can happen here.
    return (
      <View style={styles.screen}>
        {header}
        <LoadStateView
          state={loadState(res)}
          subject="story"
          onRetry={load}
        />
      </View>
    );
  }
  const chip = storyTypeChip(story.story_type);
  return (
    <View style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {story.status === "hidden" ? (
          <View style={styles.hiddenBanner}>
            <Text style={styles.hiddenText}>Hidden by moderation — only you can see this.</Text>
          </View>
        ) : null}
        {story.photos[0]
          ? <Image source={{ uri: story.photos[0].url }} style={styles.photo} resizeMode="cover" />
          : <View style={styles.photo} />}
        <View style={styles.authorRow}>
          <Avatar initials={initials(story.author.name)} tinted size={50} />
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>{story.author.name}</Text>
            {story.author.city ? <Text style={styles.city}>{story.author.city}</Text> : null}
          </View>
          <View style={[styles.chip, { backgroundColor: CHIP[chip.tone].bg }]}>
            <Text style={[styles.chipText, { color: CHIP[chip.tone].fg }]}>{chip.label}</Text>
          </View>
        </View>
        {story.caption ? <Text style={styles.caption}>{story.caption}</Text> : null}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.reactBtn} onPress={toggleReact}>
            <Text style={[styles.heart, story.my_reaction ? styles.heartOn : null]}>♥</Text>
            <Text style={styles.reactLabel}>React · {story.reaction_count}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.flagBtn} onPress={confirmFlag}>
            <Text style={styles.flagLabel}>Flag</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  hiddenBanner: { marginBottom: 14, padding: 14, borderRadius: radii.notice, backgroundColor: "#FAEEDA" },
  hiddenText: { color: "#8A5A12", ...typography.meta, fontWeight: "600" },
  photo: { height: 280, borderRadius: radii.field, backgroundColor: colors.placeholder },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 },
  authorName: { color: colors.ink, ...typography.section },
  city: { color: colors.muted, ...typography.meta, marginTop: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radii.chip },
  chipText: { ...typography.meta, fontWeight: "700" },
  caption: { marginTop: 18, color: colors.ink, ...typography.body },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 26 },
  reactBtn: { flexDirection: "row", alignItems: "center", gap: 10, height: 44, paddingHorizontal: 22, borderRadius: pill(44), ...card },
  heart: { fontSize: 22, color: "#C9D3CF" },
  heartOn: { color: colors.teal },
  reactLabel: { color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  flagBtn: { height: 44, paddingHorizontal: 22, justifyContent: "center", borderRadius: pill(44), ...card },
  flagLabel: { color: colors.muted, ...typography.subtitle, fontWeight: "700" }
});
