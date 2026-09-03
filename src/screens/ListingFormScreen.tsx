// US-A2 · create (no listingId) or edit (listingId) a listing. One screen for both —
// they share the same fields; edit just pre-fills from GET /listings/{id} and PATCHes
// instead of POSTs. Reference: screens/user/screen-shelter-list-animal-rescue.png.
//
// Creation is gated on being signed in, NOT verification (decision 2 — draft-only,
// gated-public): an unverified poster's listing saves fine, it just won't appear in
// GET /listings until they're verified. This screen doesn't re-check verification
// itself; it just says so plainly when the listing isn't public yet.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { pickAndUpload } from "../media/pickAndUpload";
import { useAuth } from "../auth/AuthContext";
import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  line: "#E3E1D9", danger: "#B23B3B", fine: "#9a988f"
};

const SPECIES = ["dog", "cat", "other"] as const;
const SEX = ["male", "female", "unknown"] as const;

type Props = NativeStackScreenProps<RootStackParamList, "listingForm">;

export function ListingFormScreen({ navigation, route }: Props) {
  const api = useApi();
  const { city: homeCity } = useAuth();
  const listingId = route.params?.listingId;
  const isEdit = !!listingId;

  const [name, setName] = useState("");
  const [species, setSpecies] = useState<string>("dog");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState<string>("unknown");
  const [birthdate, setBirthdate] = useState(""); // YYYY-MM-DD, optional
  const [description, setDescription] = useState("");
  const [fee, setFee] = useState("0");
  const [city, setCity] = useState(homeCity ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [wasPublic, setWasPublic] = useState<string | null>(null); // listing.status, edit mode only

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/listings/${listingId}`).then((r) => {
      if (r.ok) {
        const d = r.data;
        setName(d.pet.name);
        setSpecies(d.pet.species);
        setBreed(d.pet.breed ?? "");
        setSex(d.pet.sex ?? "unknown");
        setBirthdate(d.pet.birthdate ?? "");
        setDescription(d.description ?? "");
        setFee(d.adoption_fee ?? "0");
        setCity(d.city ?? "");
        setWasPublic(d.status);
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once, keyed by listingId
  }, [listingId]);

  async function addPhoto() {
    if (uploadingPhoto) return;
    setUploadingPhoto(true);
    const res = await pickAndUpload(api, "listing_photo");
    setUploadingPhoto(false);
    if (res?.ok) setPhotoUrl(res.fileUrl);
  }

  async function submit() {
    if (submitting) return;
    if (!name.trim()) { setError("Give the listing a name."); return; }
    setSubmitting(true);
    setError(undefined);

    const res = isEdit
      ? await api.patch(`/listings/${listingId}`, {
          name: name.trim(), species, breed: breed.trim(), sex,
          birthdate: birthdate.trim() || null,
          description: description.trim(), adoption_fee: fee || "0", city: city.trim()
        })
      : await api.post("/listings", {
          pet: { name: name.trim(), species, breed: breed.trim() || undefined,
                sex, birthdate: birthdate.trim() || undefined },
          description: description.trim(), adoption_fee: fee || "0", city: city.trim(),
          photos: photoUrl ? [{ file_url: photoUrl }] : []
        });

    setSubmitting(false);
    if (res.ok) {
      const id = isEdit ? listingId! : res.data.listing_id;
      navigation.replace("listingDetail", { listingId: id });
      return;
    }
    const code = res.data?.error?.code;
    if (code === "fee_over_cap") {
      setError(`The adoption fee can't exceed ₱${res.data.error.details?.cap ?? 500}.`);
      return;
    }
    if (res.status === 403) {
      Alert.alert("Not your listing", "Only the poster can edit this listing.");
      return;
    }
    setError(res.data?.error?.message ?? "Couldn't save. Try again.");
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}>
            <Text style={styles.backGlyph}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit listing</Text>
        </View>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.teal} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}>
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? "Edit listing" : "List an animal"}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isEdit && wasPublic && wasPublic !== "available" ? (
          <View style={styles.statusNote}>
            <Text style={styles.statusNoteText}>
              This listing is currently {wasPublic} — it won't show as available while you edit it.
            </Text>
          </View>
        ) : null}
        {!isEdit ? (
          <Text style={styles.draftNote}>
            Saved as a draft until your account is verified — it goes public automatically once approved.
          </Text>
        ) : null}

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Bantay"
          placeholderTextColor={colors.fine}
        />

        <Text style={styles.label}>Animal</Text>
        <Segmented options={SPECIES} value={species} onChange={setSpecies} />

        <Text style={styles.label}>Breed (optional)</Text>
        <TextInput
          style={styles.input}
          value={breed}
          onChangeText={setBreed}
          placeholder="Aspin"
          placeholderTextColor={colors.fine}
        />

        <Text style={styles.label}>Sex</Text>
        <Segmented options={SEX} value={sex} onChange={setSex} />

        <Text style={styles.label}>Birthdate (optional)</Text>
        <TextInput
          style={styles.input}
          value={birthdate}
          onChangeText={setBirthdate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.fine}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={styles.notes}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Friendly, house-trained, good with kids…"
          placeholderTextColor={colors.fine}
        />

        <Text style={styles.label}>Adoption fee (₱)</Text>
        <TextInput
          style={styles.input}
          value={fee}
          onChangeText={setFee}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.fine}
        />
        <Text style={styles.fine}>
          Tier-1 rescues and individual Verified Members are capped at ₱500. Registered NGOs aren't capped.
        </Text>

        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Marikina"
          placeholderTextColor={colors.fine}
        />

        {!isEdit ? (
          <>
            <Text style={styles.label}>Photo (optional)</Text>
            <TouchableOpacity style={styles.photoBtn} onPress={addPhoto} activeOpacity={0.85}>
              {uploadingPhoto ? <ActivityIndicator color={colors.teal} />
                : <Text style={styles.photoText}>{photoUrl ? "✓ Photo added" : "Add a photo"}</Text>}
            </TouchableOpacity>
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.submit} onPress={submit} activeOpacity={0.9} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.submitText}>{isEdit ? "Save changes" : "Create listing"}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Segmented({ options, value, onChange }: {
  options: readonly string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={styles.segTrack}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.segItem, active && styles.segItemActive]}
            onPress={() => onChange(opt)}
            activeOpacity={0.85}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  draftNote: { marginTop: 4, marginBottom: 6, color: colors.teal, fontSize: 13, fontWeight: "600", lineHeight: 19 },
  statusNote: { marginTop: 4, marginBottom: 6, padding: 14, borderRadius: 14, backgroundColor: "#FAEEDA" },
  statusNoteText: { color: "#633806", fontSize: 13, fontWeight: "600", lineHeight: 18 },
  label: { marginTop: 20, marginBottom: 10, color: colors.ink, fontSize: 15, fontWeight: "700" },
  input: { height: 52, borderRadius: 16, paddingHorizontal: 16, color: colors.ink, fontSize: 16, ...card },
  notes: { minHeight: 90, borderRadius: 18, padding: 16, color: colors.ink, fontSize: 16, textAlignVertical: "top", ...card },
  segTrack: { flexDirection: "row", backgroundColor: "#ECEAE3", borderRadius: 16, padding: 4, gap: 4 },
  segItem: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  segItemActive: { ...card },
  segText: { color: colors.muted, fontSize: 15, fontWeight: "700" },
  segTextActive: { color: colors.ink },
  fine: { marginTop: 8, color: colors.fine, fontSize: 13, lineHeight: 18 },
  photoBtn: { height: 90, borderRadius: 20, borderWidth: 2, borderColor: colors.line, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoText: { color: colors.teal, fontSize: 16, fontWeight: "700" },
  error: { marginTop: 18, color: colors.danger, fontSize: 15, fontWeight: "600" },
  submit: { marginTop: 26, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  submitText: { color: colors.white, fontSize: 20, fontWeight: "700" }
});
