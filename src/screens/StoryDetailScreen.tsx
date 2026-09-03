// US-T2 · one story. React is optimistic (flip + count locally, reconcile from the response);
// flag confirms first (it's a report, not a like) then POSTs to the shared moderation pipeline.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { storyTypeChip, StoryType } from "../community";
import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  soft: "#E7F0EF", line: "#E3E1D9", dim: "#DBE6E2", okBg: "#EAF3DE", ok: "#27500A",
  greyPill: "#ECEAE3"
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

  useEffect(() => {
    api.get(`/stories/${storyId}`).then((r) => r.ok && setStory(r.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

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

  if (!story) {
    return <View style={styles.screen}><ActivityIndicator style={{ marginTop: 120 }} color={colors.teal} /></View>;
  }
  const chip = storyTypeChip(story.story_type);
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Story</Text>
      </View>
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
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials(story.author.name)}</Text></View>
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
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  hiddenBanner: { marginBottom: 14, padding: 14, borderRadius: 16, backgroundColor: "#FAEEDA" },
  hiddenText: { color: "#8A5A12", fontSize: 14, fontWeight: "600" },
  photo: { height: 280, borderRadius: 20, backgroundColor: colors.dim },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 },
  avatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.teal, fontSize: 18, fontWeight: "800" },
  authorName: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  city: { color: colors.muted, fontSize: 14, marginTop: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  chipText: { fontSize: 12.5, fontWeight: "700" },
  caption: { marginTop: 18, color: colors.ink, fontSize: 17, lineHeight: 25 },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 26 },
  reactBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 30, ...card },
  heart: { fontSize: 22, color: "#C9D3CF" },
  heartOn: { color: colors.teal },
  reactLabel: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  flagBtn: { paddingHorizontal: 22, paddingVertical: 14, borderRadius: 30, ...card },
  flagLabel: { color: colors.muted, fontSize: 16, fontWeight: "700" }
});
