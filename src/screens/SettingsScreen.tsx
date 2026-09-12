// US-N5 · Settings. Four grouped cards: ACCOUNT · PRIVACY · YOUR DATA · SUPPORT.
//
// This screen did not exist before Sprint 7 despite being designed since Sprint 1, which is
// how `GET/PATCH /me/settings` shipped with zero callers and how §12.6's in-app data rights
// had no surface at all. YOUR DATA is the pair of RA 10173 rights (§12.7): export and delete.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenHeader } from "../components/ui";

import { useAuth } from "../auth/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { privacySummary } from "../settings";
import { colors, elevation, radii, typography } from "../theme";

const card = {
  backgroundColor: colors.white, ...elevation.soft,
};

type Props = NativeStackScreenProps<RootStackParamList, "settings">;
type Row = { label: string; value?: string; danger?: boolean; onPress?: () => void };

export function SettingsScreen({ navigation }: Props) {
  const { signOut } = useAuth();

  function handleLogout() {
    Alert.alert("Log out?", "You can sign back in any time.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => { void signOut(); } },
    ]);
  }

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: "ACCOUNT",
      rows: [
        { label: "Edit profile", onPress: () => navigation.navigate("profile") },
        { label: "Phone number", onPress: () => navigation.navigate("verifyPhone") },
      ],
    },
    {
      title: "PRIVACY",
      rows: [
        {
          label: "Privacy controls",
          value: privacySummary(),
          onPress: () => navigation.navigate("settingsPrivacy"),
        },
        { label: "Notifications", onPress: () => navigation.navigate("notifications") },
      ],
    },
    {
      // §12.6 promises these two in-app. Named the way a person would name them, not
      // "portability" and "erasure" — those are the regulation's words, not theirs.
      title: "YOUR DATA",
      rows: [
        { label: "Export my data", onPress: () => navigation.navigate("exportData") },
        { label: "Delete account", danger: true, onPress: () => navigation.navigate("deleteAccount") },
      ],
    },
  ];

  return (
    <View style={styles.screen} testID="screen.settings">
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} align="center" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {groups.map((group) => (
          <View key={group.title}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.card}>
              {group.rows.map((row, i) => (
                <TouchableOpacity
                  // Slugged from the label so a flow can reach a row without depending on
                  // its position in a list that grows — `row.settings.delete-account`.
                  testID={`row.settings.${row.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  key={row.label}
                  activeOpacity={0.75}
                  onPress={row.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={row.value ? `${row.label}, ${row.value}` : row.label}
                  style={[styles.row, i < group.rows.length - 1 && styles.rowDivided]}
                >
                  <Text style={[styles.rowLabel, row.danger && styles.rowLabelDanger]}>
                    {row.label}
                  </Text>
                  <View style={styles.rowRight}>
                    {row.value ? <Text style={styles.rowValue}>{row.value}</Text> : null}
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity
          activeOpacity={0.75}
          style={[styles.card, styles.logoutCard]}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Text style={styles.logoutLabel}>Log out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Kupkop PH · v1.0.0 (MVP)</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { padding: 20, paddingBottom: 48 },
  groupTitle: { ...typography.meta, fontWeight: "700", color: colors.muted, letterSpacing: 1.4, marginBottom: 8, marginTop: 20 },
  card: { borderRadius: radii.tile, ...card },
  row: { minHeight: 56, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowDivided: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.subtitle, fontWeight: "600", color: colors.ink },
  rowLabelDanger: { color: colors.danger },
  rowRight: { flexDirection: "row", alignItems: "center" },
  rowValue: { ...typography.meta, color: colors.muted, marginRight: 8 },
  chevron: { fontSize: 19, fontWeight: "700", color: colors.muted },
  logoutCard: { marginTop: 28, minHeight: 56, alignItems: "center", justifyContent: "center" },
  logoutLabel: { ...typography.subtitle, fontWeight: "700", color: colors.danger },
  version: { textAlign: "center", ...typography.meta, color: colors.muted, marginTop: 24 },
});
