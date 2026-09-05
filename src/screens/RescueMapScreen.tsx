// US-S4 · the public rescue map. Reference: screens/user/screen-rescue-map.png. GET /reports/map.
// The map is a CITY-SCOPED backdrop only: it centres on the queried city and draws the search
// radius. It deliberately shows NO per-report pins — the backend withholds each report's precise
// geom (§12.5 / decision 11), so the strays live in the colour-coded list, not as map markers.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Circle } from "react-native-maps";

import { MapReport } from "../api/types";
import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { centroidFor } from "../cityCentroids";
import { LoadStateView } from "../components/LoadStateView";
import { StaleBanner } from "../components/StaleBanner";
import { RootStackParamList } from "../navigation/types";
import { useCachedFeed } from "../useCachedFeed";
import { isOffline, loadState } from "../net";
import { relTime, sagipTitle, strayChip } from "../sagip";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  amberBg: "#FAEEDA", amber: "#633806", tealBg: "#E2EEF0", tealFg: "#14504F",
  greenBg: "#EAF3DE", green: "#27500A", greyBg: "#ECEAE3", grey: "#5F5E5A", soft: "#E7F0EE"
};
const TONE = {
  amber: { bg: colors.amberBg, fg: colors.amber }, teal: { bg: colors.tealBg, fg: colors.tealFg },
  green: { bg: colors.greenBg, fg: colors.green }, grey: { bg: colors.greyBg, fg: colors.grey }
} as const;
const RADIUS_KM = 10;

type Props = NativeStackScreenProps<RootStackParamList, "rescueMap">;

export function RescueMapScreen({ navigation }: Props) {
  const api = useApi();
  const { city: savedCity } = useAuth();
  const city = savedCity ?? "Marikina";
  const center = centroidFor(city);
  // US-O1 · `null` until a request has actually come back. Initialising to `[]` made "never
  // loaded" indistinguishable from "loaded, and genuinely empty", which is half of the bug
  // the 2026-09-04 device walk found on this screen.
  // US-X1 · cache-first, and the screen that most needs it: a rescuer opening this on the
  // street has the worst connection of anyone using the app. `/reports/map` is coarsened to
  // a ~500m grid, which is why it may go to disk at all — see the §12.5 header in cache.ts.
  const { rows: reports, res, stale, load: loadFeed } =
    useCachedFeed<MapReport>(api, (d) => d?.reports ?? []);
  // The RESULT is kept, not just the rows — now inside the hook. The original line here was
  // `r.ok && setReports(...)`: on a failure that evaluates to false and records NOTHING, so
  // the screen could not tell a dead network from an empty city. It reads like ordinary
  // defensive code, which is exactly why it survived review — and why this screen told a
  // person "No strays reported near Marikina right now" while the server was unreachable and
  // eight reports sat within 10 km of them. On the rescue map that is not a cosmetic slip;
  // it is a false statement about whether an animal needs help.

  const load = useCallback(() => {
    // This used to end `setReports(r.ok ? ... : [])` — so a failed refetch on focus emptied
    // the list of nearby strays a rescuer was reading. The rows now survive the failure.
    loadFeed(`/reports/map?city=${encodeURIComponent(city)}&radius_km=${RADIUS_KM}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [city]);
  useFocusEffect(load);

  const state = loadState(res, reports?.length);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nearby strays</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* City-scoped backdrop: centred on the city + search radius. No per-report pins (§12.5) —
            the strays are in the list below; only rescuers ever see a report's exact spot. */}
        <View style={styles.mapWrap}>
          <MapView
            style={styles.map}
            pointerEvents="none"
            initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.24, longitudeDelta: 0.24 }}
          >
            <Circle
              center={{ latitude: center.lat, longitude: center.lng }}
              radius={RADIUS_KM * 1000}
              strokeColor="rgba(28,107,107,0.9)"
              fillColor="rgba(28,107,107,0.12)"
              strokeWidth={2}
            />
          </MapView>
          <View style={styles.mapBadge} pointerEvents="none">
            {/* The count is a claim about the world, so it is only made once a request has
                actually succeeded. "0 nearby" over a failed fetch is the same lie as the
                empty copy below, just in fewer words. */}
            <Text style={styles.mapBadgeText}>
              {state.kind === "ready" || state.kind === "empty"
                ? `${reports?.length ?? 0} nearby · within ${RADIUS_KM} km of ${city}`
                : `Within ${RADIUS_KM} km of ${city}`}
            </Text>
          </View>
        </View>
        <Text style={styles.mapNote}>Shown by city — a report's exact spot goes only to rescuers.</Text>

        <View style={styles.legendRow}>
          <Legend color={colors.amber} label="Needs help" />
          <Legend color={colors.tealFg} label="Being helped" />
          <Legend color={colors.green} label="Safe" />
        </View>

        {state.kind !== "ready" ? (
          <LoadStateView
            state={state}
            emptyTitle={`No strays reported near ${city} right now.`}
            emptyBody="That's good news — check back later."
            onRetry={load}
          />
        ) : (
          <>
          {stale ? <StaleBanner offline={isOffline(res)} /> : null}
          {(reports ?? []).map((r) => {
            const chip = strayChip(r.status);
            const tone = TONE[chip.tone];
            return (
              <TouchableOpacity
                key={r.report_id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("reportDetail", { reportId: r.report_id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{sagipTitle(r.species, r.condition)}</Text>
                  <Text style={styles.cardMeta}>{(r.city ? r.city + " · " : "") + relTime(r.reported_at)}</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.chipText, { color: tone.fg }]}>{chip.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legend}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
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
  mapWrap: { height: 200, borderRadius: 22, overflow: "hidden", backgroundColor: colors.soft },
  map: { ...StyleSheet.absoluteFillObject },
  mapBadge: { position: "absolute", left: 12, bottom: 12, backgroundColor: "rgba(255,255,255,0.94)", paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: "center" },
  mapBadgeText: { color: colors.tealFg, fontSize: 14, fontWeight: "800" },
  mapNote: { marginTop: 10, color: colors.muted, fontSize: 13, lineHeight: 18 },
  legendRow: { flexDirection: "row", gap: 18, marginTop: 16, marginBottom: 18 },
  legend: { flexDirection: "row", alignItems: "center", gap: 7 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 20, marginBottom: 12, ...card },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  cardMeta: { marginTop: 6, color: colors.muted, fontSize: 14 },
  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "800" },
  empty: { marginTop: 30, color: colors.muted, fontSize: 16, textAlign: "center" }
});
