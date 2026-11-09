// US-T2 · compose a success story. Min 1 photo (server-enforced 422 photo_required, guarded
// client-side too). story_type auto-derives from the linked object; when opened from the
// adopted-inquiry CTA the listing link rides in via route params and pre-selects "Adoption".
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { pickAndUpload } from "../media/pickAndUpload";
import { RootStackParamList } from "../navigation/types";
import { colors, maxFontScale, pill, radii, spacing, typography } from "../theme";
import { Button, Field, ScreenHeader } from "../components/ui";
import { hasUnsavedStory, photoPickOutcome, storyPostFailure } from "../storyCompose";

type Props = NativeStackScreenProps<RootStackParamList, "storyCompose">;

export function StoryComposeScreen({ navigation, route }: Props) {
  const api = useApi();
  const prefillListing = route.params?.adoptionListingId;
  const [caption, setCaption] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  // Stories review step 7 · where a message belongs (ST12): under the photo, under the caption, or by the button.
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A ref, not only `busy`: two taps in one frame both read busy === false, and the story posted twice (ST13).
  const posting = useRef(false);
  // Set once the story is posted, so leaving afterwards does not ask whether to throw it away.
  const posted = useRef(false);

  // ST13 · a stray back (the header, the edge swipe) used to discard a typed caption without a word.
  useEffect(() => navigation.addListener("beforeRemove", (e) => {
    if (posted.current || !hasUnsavedStory(caption, photoUrl)) return;
    e.preventDefault();
    Alert.alert("Discard this story?", "What you've written and the photo you added will be lost.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => navigation.dispatch(e.data.action) }
    ]);
  }), [navigation, caption, photoUrl]);

  async function addPhoto() {
    if (uploading) return;
    setUploading(true);
    setPhotoError(null);
    const outcome = photoPickOutcome(await pickAndUpload(api, "story_photo"));
    setUploading(false);
    // ST11 · backing out of the picker is a choice, not a failure: nothing to say.
    if (outcome.kind === "added") setPhotoUrl(outcome.url);
    else if (outcome.kind === "failed") setPhotoError(outcome.message);
  }

  async function post() {
    if (posting.current) return;
    if (!photoUrl) { setPhotoError("A story needs at least one photo."); return; }
    posting.current = true;
    setBusy(true);
    setError(null);
    setPhotoError(null);
    setCaptionError(null);
    const body: Record<string, any> = { caption: caption.trim(), photos: [{ file_url: photoUrl }] };
    if (prefillListing) body.adoption_listing_id = prefillListing;
    const res = await api.post("/stories", body);
    posting.current = false;
    setBusy(false);
    if (res.ok) { posted.current = true; navigation.goBack(); return; }
    // ST12 · said as what it was, in the place it belongs; the caption and photo stay so a retry costs nothing.
    const failure = storyPostFailure(res);
    if (failure.field === "photo") setPhotoError(failure.message);
    else if (failure.field === "caption") setCaptionError(failure.message);
    else setError(failure.message);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Share a story" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1} maxFontSizeMultiplier={maxFontScale.title}>A photo makes the story</Text>
        <TouchableOpacity style={[styles.photoTile, photoUrl ? styles.photoTileSet : null]}
          onPress={addPhoto} activeOpacity={0.85}>
          {/* ST13 · the picked photo, so the person is not posting blind. */}
          {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.preview} resizeMode="cover" accessibilityLabel="The photo you added" /> : null}
          <Text style={styles.photoLabel}>
            {uploading ? "Adding…" : photoUrl ? "Photo added · tap to replace" : "Add a photo · required"}
          </Text>
        </TouchableOpacity>
        {photoError ? <Text style={styles.error} accessibilityLiveRegion="polite">{photoError}</Text> : null}

        {prefillListing ? (
          <View style={styles.linkedPill}>
            <Text style={styles.linkedText}>Tagged as an Adoption story</Text>
          </View>
        ) : null}

        <Field
          label="Caption"
          value={caption}
          onChangeText={(t) => { setCaption(t); if (captionError) setCaptionError(null); }}
          error={captionError ?? undefined}
          multiline
          placeholder="Tell people what happened — how you met, how it's going now."
        />

        {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}

        <Button label="Post story" onPress={post} loading={busy} style={styles.primaryBtn} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  h1: { color: colors.ink, ...typography.hero, marginBottom: 14 },
  photoTile: { minHeight: 150, paddingVertical: 16, paddingHorizontal: 12, borderRadius: radii.field, borderWidth: 2, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  photoTileSet: { borderStyle: "solid", borderColor: colors.teal, backgroundColor: colors.soft },
  preview: { alignSelf: "stretch", height: 180, borderRadius: radii.field, marginBottom: 12, backgroundColor: colors.placeholder },
  photoLabel: { color: colors.teal, ...typography.subtitle, fontWeight: "700" },
  linkedPill: { alignSelf: "flex-start", marginTop: 16, minHeight: 32, paddingVertical: 6, paddingHorizontal: 14, justifyContent: "center", borderRadius: pill(32), backgroundColor: "#EAF3DE" },
  linkedText: { color: "#27500A", ...typography.meta, fontWeight: "700" },
  error: { marginTop: 10, color: colors.danger, ...typography.meta, fontWeight: "600" },
  primaryBtn: { marginTop: 28 }
});
