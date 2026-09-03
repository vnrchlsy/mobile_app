// US-H3 · the recipient's own pets — the ones a rescuer/shelter placed with them, or that
// they adopted. Reference: sibling list screens (MyReportsScreen, MyOffersScreen). GET /me/pets.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { MyPet } from "../api/types";
import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF", line: "#E3E1D9"
};

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

type Props = NativeStackScreenProps<RootStackParamList, "myPets">;

export function MyPetsScreen({ navigation }: Props) {
  const api = useApi();
  const [pets, setPets] = useState<MyPet[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    api.get("/me/pets").then((r) => {
      if (r.ok) {
        setPets(r.data?.results ?? []);
        setError(false);
      } else {
        setError(true);
      }
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My pets</Text>
      </View>

      {!loaded ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.teal} />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.empty}>Couldn't load your pets. Pull down or go back and try again.</Text>
        </View>
      ) : pets.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.empty}>Pets you adopt will appear here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {pets.map((p) => (
            <View key={p.pet_id} style={styles.card}>
              {p.photo_url ? (
                <Image source={{ uri: p.photo_url }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{p.name}</Text>
                <Text style={styles.cardMeta}>{capitalize(p.species)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
  content: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 60 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 20, marginBottom: 12, ...card },
  thumb: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.line },
  thumbEmpty: {},
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  cardMeta: { marginTop: 6, color: colors.muted, fontSize: 14 },
  empty: { color: colors.muted, fontSize: 16, textAlign: "center" }
});
