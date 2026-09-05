// US-N5 · Export my data. GET /me/export.
//
// The server returns the document synchronously (D-S7-2), so this is a handoff screen and
// not a "we'll email you" screen: fetch, write to the cache directory, hand to the OS share
// sheet. The contents are listed because "your data" is not a thing anyone can picture, and
// the one honest limit — it is YOUR data, not the people you dealt with — is stated on the
// screen rather than discovered.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";

import { useApi } from "../api/useApi";
import { RootStackParamList } from "../navigation/types";
import { exportFilename, humanSize } from "../settings";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  danger: "#B23B3B",
};
const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2,
};

const CONTENTS = [
  "Your profile, settings and saved city",
  "Your pets and adoption listings",
  "Reports you filed and rescues you joined",
  "Volunteer shifts, pledges and badges",
  "Your stories and notifications",
];

type Props = NativeStackScreenProps<RootStackParamList, "exportData">;
type Ready = { name: string; size: number; uri: string };

export function ExportDataScreen({ navigation }: Props) {
  const api = useApi();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<Ready | null>(null);
  const [error, setError] = useState<string | undefined>();

  /**
   * ⚠️ US-R4 · DELIBERATELY NOT CONVERTED TO LoadStateView, and this note exists so nobody
   * "finishes the job" later.
   * @loadStateExempt this GET is a button action, not a screen load — nothing is
   * claimed on first paint, and it already tells offline from the 3/day throttle.
   *
   * The `api.get` below is not a screen load — it is what the button does. There is no
   * first-paint state to get wrong here: nothing is claimed about the person's data until
   * they ask, and the failure is already told apart three ways (offline, the deliberate
   * 3/day throttle, everything else). LoadStateView cannot say "you've exported a few times
   * today", so routing this through it would lose the one message that tells someone their
   * export will work tomorrow.
   *
   * The source scan matches this file on `api.get(`. That is the scan being conservative,
   * not a screen that still needs converting.
   */
  async function prepare() {
    if (busy) return;
    setBusy(true);
    setError(undefined);

    const res = await api.get("/me/export");
    if (!res.ok) {
      setBusy(false);
      // 429 is a real outcome here, not an edge case — the endpoint is deliberately
      // throttled to 3/day, and "try again" without saying why would just be repeated.
      setError(
        res.status === 0 ? "You're offline — try again when you're connected."
        : res.status === 429 ? "You've exported a few times today. Try again tomorrow."
        : "Couldn't build your export. Try again."
      );
      return;
    }

    try {
      // Statically imported rather than require()d so TypeScript actually checks this API.
      // A file/share call that only fails at runtime is exactly the kind of break no test
      // here would catch.
      const name = exportFilename();
      const json = JSON.stringify(res.data, null, 2);
      const file = new File(Paths.cache, name);
      file.create({ overwrite: true });
      file.write(json);
      setReady({ name, size: file.size ?? json.length, uri: file.uri });
    } catch {
      setError("Couldn't save the file to this device.");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!ready) return;
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setError("Sharing isn't available on this device.");
        return;
      }
      await Sharing.shareAsync(ready.uri, {
        mimeType: "application/json",
        dialogTitle: "Your Kupkop data",
        UTI: "public.json",
      });
    } catch {
      setError("Couldn't open the share sheet.");
    }
  }

  return (
    <View style={styles.screen} testID="screen.exportData">
      <View style={styles.header}>
        <Text testID="btn.back" style={styles.back} onPress={() => navigation.goBack()}
              accessibilityRole="button" accessibilityLabel="Go back">‹</Text>
        <Text style={styles.title} accessibilityRole="header">Export my data</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1} accessibilityRole="header">
          {ready ? "Your data is ready" : "Take your data with you"}
        </Text>
        <Text style={styles.lede}>
          {ready ? "A single file you can open anywhere."
                 : "We'll build one file with everything that's yours."}
        </Text>

        {ready ? (
          <View style={styles.fileCard} accessible
                accessibilityLabel={`${ready.name}, ${humanSize(ready.size)}`}>
            <Text style={styles.fileName}>{ready.name}</Text>
            <Text style={styles.fileMeta}>{humanSize(ready.size)} · JSON</Text>
          </View>
        ) : null}

        <Text style={styles.groupTitle}>WHAT'S INSIDE</Text>
        <View style={styles.card}>
          {CONTENTS.map((line) => (
            <View key={line} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{line}</Text>
            </View>
          ))}
        </View>

        {/* The honest limit, stated rather than discovered. */}
        <Text style={styles.footnote}>
          Other people's details aren't included, even in inquiries and shifts you shared
          with them.
        </Text>

        {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={ready ? share : prepare}
          style={styles.primaryBtn}
          accessibilityRole="button"
          accessibilityLabel={ready ? "Share file" : "Build my export"}
        >
          {busy ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.primaryBtnLabel}>{ready ? "Share file" : "Build my export"}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  back: { width: 44, height: 44, borderRadius: 22, textAlign: "center", lineHeight: 42, fontSize: 26, fontWeight: "700", color: colors.ink, ...card },
  title: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "800", color: colors.ink, marginRight: 44 },
  content: { padding: 20, paddingBottom: 48 },
  h1: { fontSize: 26, fontWeight: "800", color: colors.ink, letterSpacing: -0.4, marginTop: 8 },
  lede: { fontSize: 15, color: colors.muted, marginTop: 8, lineHeight: 21 },
  fileCard: { borderRadius: 18, padding: 16, marginTop: 20, ...card },
  fileName: { fontSize: 15, fontWeight: "700", color: colors.ink },
  fileMeta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  groupTitle: { fontSize: 12, fontWeight: "700", color: colors.muted, letterSpacing: 1.4, marginTop: 26, marginBottom: 8 },
  card: { borderRadius: 18, paddingVertical: 8, ...card },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 18, paddingVertical: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.teal, marginTop: 7, marginRight: 10 },
  bulletText: { flex: 1, fontSize: 14, color: colors.ink, lineHeight: 19 },
  footnote: { fontSize: 13, color: colors.muted, marginTop: 16, lineHeight: 19 },
  error: { fontSize: 13, color: colors.danger, marginTop: 12 },
  primaryBtn: { marginTop: 22, height: 56, borderRadius: 28, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  primaryBtnLabel: { fontSize: 17, fontWeight: "700", color: colors.white },
});
