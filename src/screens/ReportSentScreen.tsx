// US-S3 entry · report-sent confirmation. Reference: screens/user/screen-report-stray-sent.png.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CheckIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  warnBg: "#FAEEDA", warn2: "#633806", soft: "#E7F0EE"
};

type Props = NativeStackScreenProps<RootStackParamList, "reportSent">;

const NEXT = [
  "Nearby verified rescuers get an alert",
  "Someone claims the case — you'll be told who",
  "You follow every update until it's resolved"
];

export function ReportSentScreen({ navigation, route }: Props) {
  const { reportId, title, city, queued } = route.params;
  return (
    <View style={styles.screen} testID="screen.reportSent">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><CheckIcon color={colors.white} size={30} /></View>
          {/* US-O3 · a queued report has NOT reached anyone yet. Saying "rescuers have been
              alerted" would be the exact false reassurance §13.3's outbox exists to avoid —
              the person would stop worrying about an animal nobody has been told about. */}
          <Text style={styles.heroTitle}>{queued ? "Saved — we'll send it" : "Report sent"}</Text>
          <Text style={styles.heroBody}>
            {queued
              ? "You're offline. This sends by itself the moment you're back."
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
            <View style={styles.nextDot}><Text style={styles.nextNum}>{i + 1}</Text></View>
            <Text style={styles.nextText}>{line}</Text>
          </View>
        ))}
        <Text style={styles.fine}>No one yet? It widens automatically — unclaimed reports alert a bigger radius.</Text>

        {reportId ? (
          <TouchableOpacity
            testID="btn.reportSent.track"
            style={styles.primary}
            activeOpacity={0.9}
            onPress={() => navigation.replace("reportDetail", { reportId })}
          >
            <Text style={styles.primaryText}>Track this report</Text>
          </TouchableOpacity>
        ) : (
          // No server id yet — My Reports is where the queued item lives and can be
          // retried or discarded.
          <TouchableOpacity
            testID="btn.reportSent.myReports"
            style={styles.primary}
            activeOpacity={0.9}
            onPress={() => navigation.replace("myReports")}
          >
            <Text style={styles.primaryText}>See my reports</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity hitSlop={TAP_SLOP} onPress={() => navigation.popToTop()} activeOpacity={0.7}>
          <Text style={styles.secondary}>Back to home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: 26, paddingTop: 90, paddingBottom: 60 },
  hero: { alignItems: "center" },
  heroIcon: { width: 76, height: 76, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  heroTitle: { marginTop: 18, color: colors.ink, fontSize: 30, fontWeight: "800" },
  heroBody: { marginTop: 8, color: colors.muted, fontSize: 17, textAlign: "center" },
  card: { marginTop: 28, padding: 20, borderRadius: 22, ...card },
  cardTitle: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  cardCity: { marginTop: 6, color: colors.muted, fontSize: 15 },
  chip: { marginTop: 12, alignSelf: "flex-start", paddingHorizontal: 14, height: 30, borderRadius: 15, justifyContent: "center", backgroundColor: colors.warnBg },
  chipText: { color: colors.warn2, fontSize: 13, fontWeight: "800" },
  sectionTitle: { marginTop: 28, marginBottom: 14, color: colors.ink, fontSize: 20, fontWeight: "800" },
  nextRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  nextDot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.soft },
  nextNum: { color: colors.teal, fontSize: 15, fontWeight: "800" },
  nextText: { flex: 1, color: colors.ink, fontSize: 16 },
  fine: { marginTop: 6, color: "#9a988f", fontSize: 14, lineHeight: 20 },
  primary: { marginTop: 28, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  primaryText: { color: colors.white, fontSize: 22, fontWeight: "700" },
  secondary: { marginTop: 16, color: colors.teal, fontSize: 16, fontWeight: "700", textAlign: "center" }
});
