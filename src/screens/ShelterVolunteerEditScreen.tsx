// US-V9 · edit a posted activity. Reference: ShelterVolunteerActivityScreen for style,
// ShelterVolunteerCreateScreen for the form fields (same shape, minus the "no title/animal"
// note — this edits the same {type, starts_at, ends_at, capacity}).
// GET /shelter/shifts/{shiftId} prefills; PATCH /shelter/shifts/{shiftId} sends only the
// fields that changed from what was loaded.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { ShiftType, shiftTypeLabel } from "../volunteer";

const SHIFT_TYPES: ShiftType[] = ["walking", "feeding", "visitor", "event", "facility", "transport"];

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  line: "#E3E1D9", danger: "#B23B3B", fine: "#9a988f", chipBg: "#E7F0EE"
};

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

type Initial = { type: ShiftType; starts_at: string; ends_at: string; capacity: number };

type Props = NativeStackScreenProps<RootStackParamList, "shelterVolunteerEdit">;

export function ShelterVolunteerEditScreen({ navigation, route }: Props) {
  const api = useApi();
  const { shiftId } = route.params;

  const [type, setType] = useState<ShiftType>("walking");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("1");
  const [initial, setInitial] = useState<Initial | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoaded(false);
    setLoadError(false);
    api.get(`/shelter/shifts/${shiftId}`).then((r) => {
      if (r.ok) {
        const d = r.data;
        setType(d.type);
        setStartsAt(d.starts_at);
        setEndsAt(d.ends_at);
        setCapacity(String(d.capacity));
        setInitial({ type: d.type, starts_at: d.starts_at, ends_at: d.ends_at, capacity: d.capacity });
      } else {
        setLoadError(true);
      }
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus, keyed by shiftId
  }, [shiftId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submit() {
    if (submitting || !initial) return;
    setError(undefined);

    if (!startsAt.trim() || !endsAt.trim()) {
      setError("Enter a start and end time.");
      return;
    }
    const cap = parseInt(capacity, 10);
    if (!Number.isFinite(cap) || cap < 1) {
      setError("Capacity must be at least 1.");
      return;
    }

    const patch: Record<string, unknown> = {};
    if (type !== initial.type) patch.type = type;
    if (startsAt.trim() !== initial.starts_at) patch.starts_at = startsAt.trim();
    if (endsAt.trim() !== initial.ends_at) patch.ends_at = endsAt.trim();
    if (cap !== initial.capacity) patch.capacity = cap;

    if (Object.keys(patch).length === 0) {
      navigation.goBack();
      return;
    }

    setSubmitting(true);
    const res = await api.patch(`/shelter/shifts/${shiftId}`, patch);
    setSubmitting(false);

    if (res.ok) {
      navigation.goBack();
      return;
    }
    const code = res.data?.error?.code;
    if (res.status === 409 && code === "shift_closed") {
      setError("This activity is closed and can't be edited.");
      return;
    }
    if (res.status === 422 && code === "bad_window") {
      setError("End time must be after start time.");
      return;
    }
    setError(res.data?.error?.message ?? "Couldn't save changes. Try again.");
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit activity</Text>
      </View>

      {!loaded ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.teal} />
        </View>
      ) : loadError || !initial ? (
        <View style={styles.centerFill}>
          <Text style={styles.empty}>Couldn't load this activity. Pull down or go back and try again.</Text>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Activity type</Text>
          <TypeChips value={type} onChange={setType} />

          <Text style={styles.label}>Starts</Text>
          <TextInput
            style={styles.input}
            value={startsAt}
            onChangeText={setStartsAt}
            placeholder="2026-08-30T09:00"
            placeholderTextColor={colors.fine}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Ends</Text>
          <TextInput
            style={styles.input}
            value={endsAt}
            onChangeText={setEndsAt}
            placeholder="2026-08-30T11:00"
            placeholderTextColor={colors.fine}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Capacity</Text>
          <TextInput
            style={styles.input}
            value={capacity}
            onChangeText={setCapacity}
            placeholder="1"
            placeholderTextColor={colors.fine}
            keyboardType="number-pad"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.submit} onPress={submit} activeOpacity={0.9} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Save changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function TypeChips({ value, onChange }: { value: ShiftType; onChange: (t: ShiftType) => void }) {
  return (
    <View style={styles.chipGrid}>
      {SHIFT_TYPES.map((t) => {
        const active = t === value;
        return (
          <TouchableOpacity
            key={t}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(t)}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{shiftTypeLabel(t)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  empty: { color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 21 },
  backLink: { marginTop: 18 },
  backLinkText: { color: colors.teal, fontSize: 15, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  label: { marginTop: 20, marginBottom: 10, color: colors.ink, fontSize: 15, fontWeight: "700" },
  input: { height: 52, borderRadius: 16, paddingHorizontal: 16, color: colors.ink, fontSize: 16, ...card },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    minWidth: "47%", height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 12, ...card
  },
  chipActive: { backgroundColor: colors.chipBg },
  chipText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  chipTextActive: { color: colors.teal },
  error: { marginTop: 18, color: colors.danger, fontSize: 15, fontWeight: "600" },
  submit: { marginTop: 26, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  submitText: { color: colors.white, fontSize: 20, fontWeight: "700" }
});
