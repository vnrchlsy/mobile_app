// US-T2 · one story. React is optimistic (flip + count locally, reconcile from the response);
// flag confirms first (it's a report, not a like) then POSTs to the shared moderation pipeline.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  Image, ScrollView, StyleSheet, Text, View
} from "react-native";

import { useAuth } from "../auth/AuthContext";
import { useApi } from "../api/useApi";
import { PersonActions } from "../components/PersonActions";
import { LoadStateView } from "../components/LoadStateView";
import { SignupWall } from "../components/SignupWall";
import { setIntent } from "../guestIntent";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Avatar, Card, PressScale, ScreenHeader } from "../components/ui";
import { loadState } from "../net";
import { storyTypeChip, StoryType } from "../community";
import { RootStackParamList } from "../navigation/types";
import { useLargeText } from "../useLargeText";
import { colors, pill, radii, spacing, typography } from "../theme";

const CHIP: Record<"ok" | "teal" | "muted", { bg: string; fg: string }> = {
  ok: { bg: colors.successBg, fg: colors.success },
  teal: { bg: colors.soft, fg: colors.teal },
  muted: { bg: colors.greyPill, fg: colors.muted }
};

type Story = {
  story_id: string; author: { name: string; city: string }; story_type: StoryType;
  caption: string; reaction_count: number; my_reaction: boolean;
  photos: { url: string; is_primary: boolean }[]; status: string;
  /** Moderation walk W1 · this story is the viewer's own: Report and Block are not offered. Absent from an older server. */
  mine?: boolean;
};
type Props = NativeStackScreenProps<RootStackParamList, "storyDetail">;

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export function StoryDetailScreen({ navigation, route }: Props) {
  // At Dynamic Type AX3 and up the author row (avatar | name | chip) cannot share a line, so it stacks.
  const large = useLargeText();
  const api = useApi();
  const { tokens } = useAuth();
  const isGuest = tokens === null;
  const [wallOpen, setWallOpen] = useState(false);
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
    // G16 (from library/dev/test-plan-guest.md Run 3): a guest tap used to fire the
    // POST unauthenticated, get a silent 401 from the AllowAny-only sieve, and revert
    // the heart with no explanation to the user. Now: open the account wall so they
    // know why the tap didn't do what it looked like it did.
    if (isGuest) { setWallOpen(true); return; }
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

  // Review step 7g · "Report this", the same word and the same form as everywhere else (this screen used to say "Flag",
  // ask with an Alert, and send a fixed reason no moderator could use). G16, kept: a guest raises the sign-up wall
  // instead of tapping into a 401.
  function reportStory() {
    if (isGuest) { setWallOpen(true); return; }
    navigation.navigate("reportContent", {
      targetType: "story", targetId: storyId, subject: story ? `${story.author.name}'s story` : undefined,
    });
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
        <ScreenBackdrop />
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
      <ScreenBackdrop />
      {header}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {story.status === "hidden" ? (
          <View style={styles.hiddenBanner} testID="banner.storyDetail.hidden">
            <Text style={styles.hiddenText}>Hidden by moderation — only you can see this.</Text>
            {/* Review step 9 (MQ7) · the way to ask for a second look is on the page itself, not only in the notice. */}
            <PressScale onPress={() => navigation.navigate("support")} accessibilityRole="button"
              accessibilityLabel="Contact support about this story" testID="btn.storyDetail.appeal" style={styles.appeal}>
              <Text style={styles.appealText}>Think this was a mistake? Contact support</Text>
            </PressScale>
          </View>
        ) : null}
        {story.photos[0]
          ? <Image source={{ uri: story.photos[0].url }} style={styles.photo} resizeMode="cover" />
          : <View style={styles.photo} />}
        <Card style={styles.authorCard}>
        <View style={[styles.authorRow, large && styles.authorRowLarge]}>
          <Avatar initials={initials(story.author.name)} tinted size={50} />
          <View style={large ? styles.authorCopyLarge : styles.authorCopy}>
            <Text style={styles.authorName}>{story.author.name}</Text>
            {story.author.city ? <Text style={styles.city}>{story.author.city}</Text> : null}
          </View>
          <View style={[styles.chip, { backgroundColor: CHIP[chip.tone].bg }]}>
            <Text style={[styles.chipText, { color: CHIP[chip.tone].fg }]}>{chip.label}</Text>
          </View>
        </View>
        {story.caption ? <Text style={styles.caption}>{story.caption}</Text> : null}
        {story.mine ? null : (
          <PersonActions testID="row.storyDetail.person"
            person={{ name: story.author.name, via: { type: "story", id: storyId } }}
            onReport={() => navigation.navigate("reportContent", {
              targetType: "account", via: { type: "story", id: storyId }, subject: story.author.name,
              person: { name: story.author.name, via: { type: "story", id: storyId } }, leaveContent: true })}
            onBlocked={() => navigation.goBack()} />
        )}
        </Card>

        <View style={styles.actionRow}>
          <PressScale style={styles.reactBtn} onPress={toggleReact} accessibilityRole="button"
            accessibilityLabel={`React to this story. ${story.reaction_count} reactions.`}
            accessibilityState={{ selected: story.my_reaction }} testID="btn.storyDetail.react">
            <Text style={[styles.heart, story.my_reaction ? styles.heartOn : null]}>♥</Text>
            <Text style={styles.reactLabel}>React · {story.reaction_count}</Text>
          </PressScale>
          {story.mine ? null : (
            <PressScale style={styles.flagBtn} onPress={reportStory} accessibilityRole="button"
              accessibilityLabel="Report this story" testID="btn.storyDetail.report">
              <Text style={styles.flagLabel}>Report this</Text>
            </PressScale>
          )}
        </View>
      </ScrollView>
      <SignupWall
        visible={wallOpen}
        // G16 follow-up: owner ratified a dedicated "react" intent over the generic
        // "account" copy, so the wall now names the actual gated action ("React to
        // stories") and the post-signup Home toast says "You can now react to stories."
        // instead of the generic "You can now manage your profile."
        action="react"
        onCreateAccount={() => { setIntent("react"); setWallOpen(false); navigation.navigate("accountType"); }}
        onLogin={() => { setWallOpen(false); navigation.navigate("signin"); }}
        onDismiss={() => setWallOpen(false)}
      />
    </View>
  );
}

// A pressable pill sits on the page by its outline, not a shadow: a shadow is the card's, and these are controls.
const pillButton = { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  hiddenBanner: { marginBottom: 14, padding: 14, borderRadius: radii.notice, backgroundColor: colors.warningBg },
  hiddenText: { color: colors.warning, ...typography.meta, fontWeight: "600" },
  appeal: { marginTop: 10, minHeight: 44, justifyContent: "center" },
  appealText: { color: colors.warningStrong, ...typography.meta, fontWeight: "700", textDecorationLine: "underline" },
  authorCard: { marginTop: 18 },
  photo: { height: 280, borderRadius: radii.field, backgroundColor: colors.placeholder },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  // large: stacked. The base copy column is `flex: 1`, which survives in a style array and would collapse the text in a column (`flex: 0` is what works, #189).
  authorRowLarge: { flexDirection: "column", alignItems: "flex-start" },
  authorCopy: { flex: 1 },
  authorCopyLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  authorName: { color: colors.ink, ...typography.section },
  city: { color: colors.muted, ...typography.meta, marginTop: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radii.chip },
  chipText: { ...typography.meta, fontWeight: "700" },
  caption: { marginTop: 18, color: colors.ink, ...typography.body },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 26 },
  reactBtn: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, paddingVertical: 8, paddingHorizontal: 22, borderRadius: pill(44), ...pillButton },
  heart: { fontSize: 22, color: colors.muted },
  heartOn: { color: colors.teal },
  reactLabel: { color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  flagBtn: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 22, justifyContent: "center", borderRadius: pill(44), ...pillButton },
  flagLabel: { color: colors.muted, ...typography.subtitle, fontWeight: "700" }
});
