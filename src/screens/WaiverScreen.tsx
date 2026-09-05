// US-V8 · D-S5-1 — the volunteer waiver placeholder. Linked from the waiver checkbox on
// KawangGawaDetailScreen. There is no finalised waiver text yet; this screen says so plainly
// rather than inventing legal language. The volunteer still sends `waiver_accepted: true` when
// they check the box on the detail screen — the backend stamps the consent version server-side.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { RootStackParamList } from "../navigation/types";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF"
};

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

type Props = NativeStackScreenProps<RootStackParamList, "waiver">;

export function WaiverScreen({ navigation }: Props) {
  return (
    <View style={styles.screen} testID="screen.waiver">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Liability waiver & guidelines</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.noticeCard}>
          {/* TODO(D-S5-1): replace this placeholder with legal's finalised waiver text before M3 beta. */}
          <Text style={styles.body}>
            The full liability waiver and volunteer guidelines are still being finalised.
          </Text>
          <Text style={styles.body}>
            They'll be available here before you need to start volunteering, and you'll get a
            chance to review them then.
          </Text>
          <Text style={styles.body}>
            This page is not the waiver itself — no binding agreement exists yet.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { flex: 1, color: colors.ink, fontSize: 20, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 60 },
  noticeCard: { borderRadius: 18, padding: 20, gap: 14, ...card },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 }
});
