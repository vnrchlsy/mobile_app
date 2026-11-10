// US-T2 · compose a success story. Min 1 photo (server-enforced 422 photo_required, guarded
// client-side too). story_type auto-derives from the linked object; when opened from the
// adopted-inquiry CTA the listing link rides in via route params and pre-selects "Adoption".
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  Alert, Image, ScrollView, StyleSheet, Text, View
} from "react-native";

import { useApi } from "../api/useApi";
import { pickAndUpload } from "../media/pickAndUpload";
import { RootStackParamList } from "../navigation/types";
import { colors, maxFontScale, radii, spacing, squircle, typography } from "../theme";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Card, Chip, Field, PressScale, ScreenHeader } from "../components/ui";
import {
  MAX_CAPTION, MAX_PHOTOS, THUMB_SIZE, THUMB_X_OFFSET, THUMB_X_SIZE, THUMB_X_SLOP, acquire, canAddPhoto, captionCount, hasUnsavedStory, photoPickOutcome, photosBody, storyPostFailure, withCover, withoutPhoto, withPhoto
} from "../storyCompose";
import { hasUnsavedEdit, storyEditFailure } from "../storyAuthor";

type Props = NativeStackScreenProps<RootStackParamList, "storyCompose">;

export function StoryComposeScreen({ navigation, route }: Props) {
  const api = useApi();
  const prefillListing = route.params?.adoptionListingId;
  const prefillCase = route.params?.rescueCaseId;          // step 11 · opened from a resolved rescue: the story is about that rescue
  const source = route.params?.source;          // step 10 · which entry point opened this (sent with a NEW story only)
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
    if (!edit || !acquire(posting)) return;
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
    if (photoUrls.length === 0) { setPhotoError("A story needs at least one photo."); return; }
    if (!acquire(posting)) return;
    setBusy(true);
    setError(null);
    setPhotoError(null);
    setCaptionError(null);
    const body: Record<string, any> = { caption: caption.trim(), photos: photosBody(photoUrls) };
    if (prefillListing) body.adoption_listing_id = prefillListing;
    if (prefillCase) body.rescue_case_id = prefillCase;
    if (source) body.source = source;
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

  const addable = !edit && canAddPhoto(photoUrls);
  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title={edit ? "Edit your story" : "Share a story"} onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1} maxFontSizeMultiplier={maxFontScale.title}>{edit ? "Change what you wrote" : "A photo makes the story"}</Text>
        <Card style={styles.photoCard}>
          <PressScale style={[styles.photoTile, edit && styles.dim]} testID="btn.storyCompose.addPhoto" accessibilityRole="button"
            accessibilityLabel={photoUrls.length ? "Add another photo" : "Add a photo"}
            onPress={addable ? addPhoto : undefined}>
            {/* ST13 · the cover, so the person is not posting blind. */}
            {photoUrls.length ? <Image source={{ uri: photoUrls[0] }} style={styles.preview} resizeMode="cover" accessibilityLabel="Your cover photo" /> : <View style={[styles.preview, styles.previewEmpty]} />}
            <Text style={styles.photoLabel}>
              {edit ? "The photos stay as you shared them"
                : uploading ? "Adding…"
                : photoUrls.length === 0 ? "Add a photo · required"
                : canAddPhoto(photoUrls) ? `${photoUrls.length} of ${MAX_PHOTOS} photos · tap to add another`
                : `${MAX_PHOTOS} of ${MAX_PHOTOS} photos`}
            </Text>
          </PressScale>
          {/* Step 8 · every photo, the first is the cover. Tap one to make it the cover; the cross removes it; the + slot adds. */}
          {!edit && photoUrls.length > 0 ? (
            <View style={styles.thumbRow}>
              {photoUrls.map((url, i) => (
                <View key={url} style={styles.thumbWrap}>
                  <PressScale onPress={() => setPhotoUrls(withCover(photoUrls, i))} accessibilityRole="button"
                    accessibilityLabel={i === 0 ? `Photo ${i + 1} of ${photoUrls.length}, the cover` : `Make photo ${i + 1} of ${photoUrls.length} the cover`}>
                    <Image source={{ uri: url }} style={[styles.thumb, i === 0 ? styles.thumbCover : null]} resizeMode="cover" />
                    {i === 0 ? <Text style={styles.coverTag}>Cover</Text> : null}
                  </PressScale>
                  <PressScale hitSlop={THUMB_X_SLOP} style={styles.thumbX} onPress={() => setPhotoUrls(withoutPhoto(photoUrls, i))} accessibilityRole="button"
                    accessibilityLabel={`Remove photo ${i + 1}`} testID={`btn.storyCompose.removePhoto.${i}`}>
                    <Text style={styles.thumbXLabel}>×</Text>
                  </PressScale>
                </View>
              ))}
              {addable ? (
                <PressScale style={styles.addSlot} onPress={addPhoto} accessibilityRole="button" accessibilityLabel="Add another photo" testID="btn.storyCompose.addPhotoSlot">
                  <Text style={styles.addSlotLabel}>+</Text>
                </PressScale>
              ) : null}
            </View>
          ) : null}
        </Card>
        {photoError ? <Text style={styles.error} accessibilityLiveRegion="polite">{photoError}</Text> : null}

        {prefillListing ? <Chip label="Tagged as an Adoption story" tone="success" dot={false} style={styles.linkedPill} /> : null}
        {prefillCase ? <Chip label="Tagged as a Rescue story" tone="success" dot={false} style={styles.linkedPill} /> : null}

        <Field
          label="Caption"
          value={caption}
          onChangeText={(t) => { setCaption(t); if (captionError) setCaptionError(null); }}
          error={captionError ?? undefined}
          maxLength={MAX_CAPTION}
          multiline
          placeholder="Tell people what happened — how you met, how it's going now."
        />

        {/* SQ8 · what is shown with the story; the counter shares the line once it is near the limit. */}
        <View style={styles.metaRow}>
          <Text style={styles.cityLine}>Shown with your city</Text>
          {captionCount(caption) ? <Text style={styles.count} accessibilityLiveRegion="polite">{captionCount(caption)}</Text> : null}
        </View>

        {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
      </ScrollView>
      {/* Pinned: a long caption scrolls inside the form and never pushes Post off the screen. Always enabled; errors sit with their field.
          The keyboard covers it while typing, on purpose: lifting it above the keyboard left the caption a sliver of room (walked), so dragging the form or tapping away shows it again. */}
      <View style={styles.footer}>
        <Button label={edit ? "Save changes" : "Post story"} onPress={edit ? save : post} loading={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 24 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 30 },
  h1: { color: colors.ink, ...typography.hero, marginBottom: 14 },
  photoCard: { padding: 8 },
  photoTile: { paddingBottom: 6 },
  dim: { opacity: 0.6 },
  preview: { alignSelf: "stretch", height: 176, borderRadius: radii.card, backgroundColor: colors.placeholder },
  previewEmpty: { backgroundColor: colors.soft },
  photoLabel: { marginTop: 11, paddingHorizontal: 10, minHeight: 20, color: colors.muted, ...typography.meta, fontWeight: "700" },
  thumbRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 6 },
  thumbWrap: { width: THUMB_SIZE },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: squircle(THUMB_SIZE), backgroundColor: colors.placeholder, borderWidth: 2, borderColor: "transparent" },
  thumbCover: { borderColor: colors.teal },
  coverTag: { position: "absolute", left: 3, right: 3, bottom: 3, textAlign: "center", color: colors.white, backgroundColor: colors.ink, ...typography.label, fontWeight: "800", borderRadius: radii.chip, overflow: "hidden" },
  thumbX: { position: "absolute", right: THUMB_X_OFFSET, top: THUMB_X_OFFSET, width: THUMB_X_SIZE, height: THUMB_X_SIZE, borderRadius: THUMB_X_SIZE / 2, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  thumbXLabel: { color: colors.white, fontWeight: "800", lineHeight: 18 },
  addSlot: { width: 46, height: 46, borderRadius: squircle(46), alignItems: "center", justifyContent: "center", backgroundColor: colors.soft },
  addSlotLabel: { color: colors.teal, ...typography.hero, lineHeight: 28 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 8, marginHorizontal: 6 },
  cityLine: { flex: 1, color: colors.muted, ...typography.meta, fontWeight: "700" },
  count: { color: colors.warning, ...typography.meta, fontWeight: "800" },
  linkedPill: { alignSelf: "flex-start", marginTop: 14, marginBottom: 2 },
  error: { marginTop: 10, color: colors.danger, ...typography.meta, fontWeight: "600" }
});
