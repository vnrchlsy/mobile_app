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
import { colors, maxFontScale, pill, radii, spacing, squircle, typography } from "../theme";
import { Button, Field, ScreenHeader } from "../components/ui";
import { TAP_SLOP } from "../touch";
import {
  MAX_CAPTION, MAX_PHOTOS, canAddPhoto, captionCount, hasUnsavedStory, photoPickOutcome, photosBody, storyPostFailure, withCover, withoutPhoto, withPhoto
} from "../storyCompose";
import { hasUnsavedEdit, storyEditFailure } from "../storyAuthor";

type Props = NativeStackScreenProps<RootStackParamList, "storyCompose">;

export function StoryComposeScreen({ navigation, route }: Props) {
  const api = useApi();
  const prefillListing = route.params?.adoptionListingId;
  // Stories review step 6 · edit mode: the caption of a story you posted. The photo and the link are what was shared, and stay.
  const edit = route.params?.edit;
  const [caption, setCaption] = useState(edit?.caption ?? "");
  // Stories review step 8 · up to MAX_PHOTOS photos; the FIRST is the cover (what the wall shows). Editing never changes them.
  const [photoUrls, setPhotoUrls] = useState<string[]>(edit?.photoUrl ? [edit.photoUrl] : []);
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
    if (posted.current || !(edit ? hasUnsavedEdit(caption, edit.caption) : hasUnsavedStory(caption, photoUrls))) return;
    e.preventDefault();
    Alert.alert(edit ? "Discard your changes?" : "Discard this story?",
      edit ? "Your caption will go back to what it was." : "What you've written and the photos you added will be lost.", [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => navigation.dispatch(e.data.action) }
      ]);
  }), [navigation, caption, photoUrls, edit]);

  async function addPhoto() {
    if (uploading || !canAddPhoto(photoUrls)) return;
    setUploading(true);
    setPhotoError(null);
    setError(null);
    const outcome = photoPickOutcome(await pickAndUpload(api, "story_photo"));
    setUploading(false);
    // ST11 · backing out of the picker is a choice, not a failure: nothing to say.
    if (outcome.kind === "added") setPhotoUrls((list) => withPhoto(list, outcome.url));
    else if (outcome.kind === "failed") setPhotoError(outcome.message);
  }

  async function save() {
    if (!edit || posting.current) return;
    posting.current = true;
    setBusy(true);
    setError(null);
    setCaptionError(null);
    const res = await api.patch(`/stories/${edit.storyId}`, { caption: caption.trim() });
    posting.current = false;
    setBusy(false);
    if (res.ok) { posted.current = true; navigation.goBack(); return; }
    // The caption stays so a retry costs nothing; a blocked one is said under the caption, the rest by the button.
    const failure = storyEditFailure(res);
    if (failure.field === "caption") setCaptionError(failure.message);
    else setError(failure.message);
  }

  async function post() {
    if (posting.current) return;
    if (photoUrls.length === 0) { setPhotoError("A story needs at least one photo."); return; }
    posting.current = true;
    setBusy(true);
    setError(null);
    setPhotoError(null);
    setCaptionError(null);
    const body: Record<string, any> = { caption: caption.trim(), photos: photosBody(photoUrls) };
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
      <ScreenHeader title={edit ? "Edit your story" : "Share a story"} onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1} maxFontSizeMultiplier={maxFontScale.title}>{edit ? "Change what you wrote" : "A photo makes the story"}</Text>
        <TouchableOpacity style={[styles.photoTile, photoUrls.length ? styles.photoTileSet : null]} testID="btn.storyCompose.addPhoto"
          onPress={edit || !canAddPhoto(photoUrls) ? undefined : addPhoto} activeOpacity={edit || !canAddPhoto(photoUrls) ? 1 : 0.85}>
          {/* ST13 · the cover, so the person is not posting blind. */}
          {photoUrls.length ? <Image source={{ uri: photoUrls[0] }} style={styles.preview} resizeMode="cover" accessibilityLabel="Your cover photo" /> : null}
          <Text style={styles.photoLabel}>
            {edit ? "The photos stay as you shared them"
              : uploading ? "Adding…"
              : photoUrls.length === 0 ? "Add a photo · required"
              : canAddPhoto(photoUrls) ? `${photoUrls.length} of ${MAX_PHOTOS} photos · tap to add another`
              : `${MAX_PHOTOS} of ${MAX_PHOTOS} photos`}
          </Text>
        </TouchableOpacity>
        {/* Step 8 · every photo, the first is the cover. Tap one to make it the cover; the cross removes it. */}
        {!edit && photoUrls.length > 1 ? (
          <View style={styles.thumbRow}>
            {photoUrls.map((url, i) => (
              <View key={url} style={styles.thumbWrap}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => setPhotoUrls(withCover(photoUrls, i))} accessibilityRole="button"
                  accessibilityLabel={i === 0 ? `Photo ${i + 1} of ${photoUrls.length}, the cover` : `Make photo ${i + 1} of ${photoUrls.length} the cover`}>
                  <Image source={{ uri: url }} style={[styles.thumb, i === 0 ? styles.thumbCover : null]} resizeMode="cover" />
                  {i === 0 ? <Text style={styles.coverTag}>Cover</Text> : null}
                </TouchableOpacity>
                <TouchableOpacity hitSlop={TAP_SLOP} style={styles.thumbX} onPress={() => setPhotoUrls(withoutPhoto(photoUrls, i))} accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${i + 1}`} testID={`btn.storyCompose.removePhoto.${i}`}>
                  <Text style={styles.thumbXLabel}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
        {!edit && photoUrls.length === 1 ? (
          <TouchableOpacity hitSlop={TAP_SLOP} style={styles.removeOnly} onPress={() => setPhotoUrls([])} accessibilityRole="button"
            accessibilityLabel="Remove the photo" testID="btn.storyCompose.removePhoto.0">
            <Text style={styles.removeOnlyLabel}>Remove photo</Text>
          </TouchableOpacity>
        ) : null}
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
          maxLength={MAX_CAPTION}
          multiline
          placeholder="Tell people what happened — how you met, how it's going now."
        />

        {captionCount(caption) ? <Text style={styles.count} accessibilityLiveRegion="polite">{captionCount(caption)}</Text> : null}

        {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}

        <Button label={edit ? "Save changes" : "Post story"} onPress={edit ? save : post} loading={busy} style={styles.primaryBtn} />
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
  thumbRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  thumbWrap: { width: 72 },
  thumb: { width: 72, height: 72, borderRadius: squircle(72), backgroundColor: colors.placeholder, borderWidth: 2, borderColor: "transparent" },
  thumbCover: { borderColor: colors.teal },
  coverTag: { position: "absolute", left: 4, bottom: 4, color: colors.white, backgroundColor: colors.teal, ...typography.meta, fontWeight: "700", paddingHorizontal: 6, borderRadius: radii.chip, overflow: "hidden" },
  thumbX: { position: "absolute", right: -6, top: -6, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  thumbXLabel: { color: colors.white, fontWeight: "800", lineHeight: 18 },
  removeOnly: { alignSelf: "flex-start", marginTop: 8, minHeight: 44, justifyContent: "center" },
  removeOnlyLabel: { color: colors.muted, ...typography.meta, fontWeight: "700", textDecorationLine: "underline" },
  count: { marginTop: 6, textAlign: "right", color: colors.muted, ...typography.meta },
  photoLabel: { color: colors.teal, ...typography.subtitle, fontWeight: "700" },
  linkedPill: { alignSelf: "flex-start", marginTop: 16, minHeight: 32, paddingVertical: 6, paddingHorizontal: 14, justifyContent: "center", borderRadius: pill(32), backgroundColor: "#EAF3DE" },
  linkedText: { color: "#27500A", ...typography.meta, fontWeight: "700" },
  error: { marginTop: 10, color: colors.danger, ...typography.meta, fontWeight: "600" },
  primaryBtn: { marginTop: 28 }
});
