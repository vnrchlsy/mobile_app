// US-S2 · "Adjust" — refine the stray report's exact location. Reference: screens/user/screen-report-stray.png.
// This is the ONE place the app deliberately works at precise-GPS granularity (decision 11): the
// reporter is placing *their own* report's pin so a rescuer can find the animal, having already been
// shown the precise-location disclosure on the report form. Needs react-native-maps + a dev build.
//
// Center-pin pattern: the pin is fixed dead-centre and the map moves under it, so the coordinate is
// always exactly what's under the pin — no fiddly marker-drag, and it reads the same on any device.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Region } from "react-native-maps";

import { LocationPinIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", tealDark: "#14504F", page: "#F4F5F2",
  muted: "#5F5E5A", white: "#FFFFFF", fine: "#9a988f"
};

type Props = NativeStackScreenProps<RootStackParamList, "adjustPin">;

export function AdjustPinScreen({ navigation, route }: Props) {
  const { lat, lng } = route.params;
  // The live centre of the map = where the pin points. Seeded with the incoming coords.
  const center = useRef<{ lat: number; lng: number }>({ lat, lng });
  const [ready, setReady] = useState(false);

  const initialRegion: Region = {
    latitude: lat, longitude: lng,
    latitudeDelta: 0.004, longitudeDelta: 0.004 // ~street level
  };

  function onRegionChangeComplete(r: Region) {
    center.current = { lat: r.latitude, lng: r.longitude };
  }

  function save() {
    // reportStray is already below us in the stack, so navigate() pops back to it and merges
    // these params — its effect picks them up and refreshes the pinned coords + address.
    navigation.navigate("reportStray", {
      adjustedLat: center.current.lat, adjustedLng: center.current.lng
    });
  }

  return (
    <View style={styles.screen}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        onMapReady={() => setReady(true)}
        showsUserLocation
        showsMyLocationButton={false}
      />

      {/* Fixed centre pin — the map slides under it. pointerEvents none so it never eats gestures. */}
      <View pointerEvents="none" style={styles.pinLayer}>
        <View style={styles.pin}>
          <LocationPinIcon color={colors.teal} size={44} />
        </View>
        <View style={styles.pinShadow} />
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Adjust the pin</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Move the map so the pin sits exactly where the animal is.</Text>
        <Text style={styles.cardSub}>This precise spot is shared only with rescuers on this report.</Text>
        <TouchableOpacity
          style={[styles.save, !ready && styles.saveIdle]}
          onPress={save}
          activeOpacity={0.9}
          disabled={!ready}
        >
          <Text style={styles.saveText}>Save this spot</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12, shadowRadius: 10, elevation: 4
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { position: "absolute", top: 0, left: 0, right: 0, paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800", textShadowColor: "rgba(244,245,242,0.9)", textShadowRadius: 6 },
  // Centre the pin, then lift it by half its height so its *tip* rests on the map centre.
  pinLayer: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  pin: { marginBottom: 44 },
  pinShadow: { position: "absolute", top: "50%", width: 12, height: 6, borderRadius: 6, backgroundColor: "rgba(18,33,58,0.28)" },
  card: { position: "absolute", left: 20, right: 20, bottom: 34, padding: 22, borderRadius: 24, ...card },
  cardTitle: { color: colors.ink, fontSize: 19, fontWeight: "800", lineHeight: 25 },
  cardSub: { marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 20 },
  save: { marginTop: 18, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  saveIdle: { backgroundColor: "#7FA8A6" },
  saveText: { color: colors.white, fontSize: 21, fontWeight: "700" }
});
