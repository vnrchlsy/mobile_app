// US-S3 entry · report-sent confirmation. Reference: screens/user/screen-report-stray-sent.png.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CheckIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { requestPushPrompt } from "../pushPrompt";
import { queuedReportLine } from "../sagip";
import { TAP_SLOP } from "../touch";
import { colors, elevation, maxFontScale, radii, spacing, squircle, typography } from "../theme";
import { Button } from "../components/ui";


type Props = NativeStackScreenProps<RootStackParamList, "reportSent">;

const NEXT = [
  "Nearby verified rescuers get an alert",
  "Someone claims the case — you'll be told who",
  "You follow every update until it's resolved"
];

export function ReportSentScreen({ navigation, route }: Props) {
  const { reportId, title, city, queued, queuedReason } = route.params;
  // NQ6 · a report is the clearest reason to want a notification: ask (once, with an explanation) now.
  useEffect(() => { requestPushPrompt("report"); }, []);
  return (
    <View style={styles.screen} testID="screen.reportSent">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><CheckIcon color={colors.white} size={30} /></View>
          {/* US-O3 · a queued report has NOT reached anyone yet. Saying "rescuers have been
              alerted" would be the exact false reassurance §13.3's outbox exists to avoid —
              the person would stop worrying about an animal nobody has been told about. */}
          <Text style={styles.heroTitle} maxFontSizeMultiplier={maxFontScale.title}>{queued ? "Saved — we'll send it" : "Report sent"}</Text>
          <Text style={styles.heroBody}>
            {queued
              ? queuedReportLine(queuedReason)   // PR3-F2 · offline, or Kupkop not answering
              : `Rescuers near ${city ?? "you"} have been alerted.`}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{title}</Text>
          {city ? <Text style={styles.cardCity}>{city}</Text> : null}
          <View style={styles.chip}>
            <Text style={styles.chipText}>{queued ? "Waiting to send" : "Reported"}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>What happens next</Text>
        {NEXT.map((line, i) => (
          <View key={i} style={styles.nextRow}>
            <View style={styles.nextDot}><Text style={styles.nextNum} allowFontScaling={false}>{i + 1}</Text></View>
            <Text style={styles.nextText}>{line}</Text>
          </View>
        ))}
        <Text style={styles.fine}>No one yet? It widens automatically — unclaimed reports alert a bigger radius.</Text>

        {reportId ? (
          <Button
            testID="btn.reportSent.track"
            label="Track this report"
            onPress={() => navigation.replace("reportDetail", { reportId })}
            style={styles.primary}
          />
        ) : (
          // No server id yet — My Reports is where the queued item lives and can be
          // retried or discarded.
          <Button
            testID="btn.reportSent.myReports"
            label="See my reports"
            onPress={() => navigation.replace("myReports")}
            style={styles.primary}
          />
        )}
        <TouchableOpacity hitSlop={TAP_SLOP} onPress={() => navigation.popToTop()} activeOpacity={0.7}>
          <Text style={styles.secondary}>Back to home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 90, paddingBottom: 60 },
  hero: { alignItems: "center" },
  heroIcon: { width: 76, height: 76, borderRadius: squircle(76), alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  heroTitle: { marginTop: 18, color: colors.ink, ...typography.hero },
  heroBody: { marginTop: 8, color: colors.muted, ...typography.subtitle, textAlign: "center" },
  card: { marginTop: 28, padding: 20, borderRadius: radii.card, ...card },
  cardTitle: { color: colors.ink, ...typography.section },
  cardCity: { marginTop: 6, color: colors.muted, ...typography.body },
  chip: { marginTop: 12, alignSelf: "flex-start", paddingHorizontal: 14, minHeight: 30, paddingVertical: 4, borderRadius: 15, justifyContent: "center", backgroundColor: colors.warningBg },
  chipText: { color: colors.warningStrong, ...typography.meta, fontWeight: "800" },
  sectionTitle: { marginTop: 28, marginBottom: 14, color: colors.ink, ...typography.section },
  nextRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  nextDot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.soft },
  nextNum: { color: colors.teal, ...typography.strong, fontWeight: "800" },
  nextText: { flex: 1, color: colors.ink, ...typography.subtitle },
  fine: { marginTop: 6, color: colors.muted, ...typography.meta, lineHeight: 20 },
  primary: { marginTop: 28 },
  secondary: { marginTop: 16, color: colors.teal, ...typography.subtitle, fontWeight: "700", textAlign: "center" }
});
