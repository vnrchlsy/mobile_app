// US-N5 · Privacy controls. Wires `GET / PATCH /me/settings` — live since Sprint 1 with no
// caller until now — plus the new `analytics_consent` (D-S7-3).
//
// THE RULE THIS SCREEN IS BUILT AROUND: never render a toggle that does nothing.
// `masked_contact` describes Phase-2 chat and `approximate_location` is enforced server-side
// regardless (§12.5 stores a city, never coordinates), so neither is a control the user
// actually holds. They appear under ALWAYS ON as stated facts. See `privacyRows`.
import { termsDocument } from "../legal/terms";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View,
} from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { privacyPolicyUrl } from "../launchGates";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { privacyRows, Settings } from "../settings";
import { TAP_SLOP } from "../touch";
import { ScreenHeader } from "../components/ui";
import { useLargeText } from "../useLargeText";
import { colors, elevation, maxFontScale, radii, typography } from "../theme";

const card = {
  backgroundColor: colors.white, ...elevation.soft,
};

type Props = NativeStackScreenProps<RootStackParamList, "settingsPrivacy">;

export function SettingsPrivacyScreen({ navigation }: Props) {
  const api = useApi();
  const [settings, setSettings] = useState<Settings | null>(null);
  // `error` is now the SAVE error only. It used to carry the load failure too, which is how
  // this screen ended up distinguishing offline in its save path (below) but not in its load
  // path — the same request failing in two places, described two different ways.
  const [error, setError] = useState<string | undefined>();
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const load = useCallback(() => {
    setRes(null);
    api.get("/me/settings").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setSettings(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(key: keyof Settings, next: boolean) {
    if (!settings) return;
    const previous = settings;
    // Optimistic: a privacy switch that lags feels broken, and the user is watching it.
    setSettings({ ...settings, [key]: next });
    setError(undefined);

    const res = await api.patch("/me/settings", { [key]: next });
    if (res.ok) {
      setSettings(res.data);
    } else {
      // Revert rather than leave the switch showing a state the server never accepted —
      // on THIS screen a lie is a broken privacy promise, not a cosmetic glitch.
      setSettings(previous);
      setError(res.status === 0 ? "You're offline — that didn't save."
                                : "That didn't save. Try again.");
    }
  }

  if (!settings) {
    return (
      <View style={styles.screen}>
        <Header navigation={navigation} />
        <View style={styles.loading}>
          <LoadStateView state={loadState(res)} subject="settings page" onRetry={load} />
        </View>
      </View>
    );
  }

  const rows = privacyRows(settings);
  // By group, not by position: the notification rows are two or three depending on the server.
  const notificationToggles = rows.toggles.filter((t) => t.group === "notifications");
  const analyticsToggles = rows.toggles.filter((t) => t.group === "analytics");

  return (
    <View style={styles.screen} testID="screen.settingsPrivacy">
      <Header navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <Text style={styles.groupTitle}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          {notificationToggles.map((row, i) => (
            <ToggleRow key={row.key} row={row} divided={i < notificationToggles.length - 1} onChange={(v) => toggle(row.key, v)} />
          ))}
        </View>

        <Text style={styles.groupTitle}>ANALYTICS</Text>
        <View style={styles.card}>
          {analyticsToggles.map((row) => (
            <ToggleRow key={row.key} row={row} divided={false} onChange={(v) => toggle(row.key, v)} />
          ))}
        </View>
        {/* The right to WITHDRAW is half of what consent means under RA 10173, and it
            belongs on the screen rather than in a policy nobody opens. */}
        <Text style={styles.footnote}>
          Nothing is collected yet. If that changes, it stays off unless you turn it on — and you
          can switch it off any time.
        </Text>

        {/* M4 gate 4 · a "Read our privacy policy" link renders ONLY when the URL is set
            (via EXPO_PUBLIC_PRIVACY_POLICY_URL). While the policy is unpublished the whole
            section is absent — a broken or placeholder link is worse than no link at all.
            See library/dev/launch-gates.md. */}
        <PrivacyPolicyLink />
        <TermsLink onPress={() => navigation.navigate("terms")} />

        <Text style={styles.groupTitle}>ALWAYS ON</Text>
        <View style={styles.card}>
          {rows.facts.map((fact, i) => (
            <View
              key={fact.label}
              style={[styles.factRow, i < rows.facts.length - 1 && styles.divided]}
              accessible
              accessibilityLabel={`${fact.label}. ${fact.note}`}
            >
              <Text style={styles.factLabel}>{fact.label}</Text>
              <Text style={styles.note}>{fact.note}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  row, divided, onChange,
}: {
  row: { key: string; label: string; note: string; value: boolean };
  divided: boolean;
  onChange: (v: boolean) => void;
}) {
  // At Dynamic Type AX3 and up the label cannot share a line with its Switch (it broke mid-word), so the Switch drops below the text.
  const large = useLargeText();
  return (
    <View style={[styles.toggleRow, large && styles.toggleRowLarge, divided && styles.divided]}>
      <View style={large ? styles.toggleTextLarge : styles.toggleText}>
        <Text style={styles.toggleLabel} maxFontSizeMultiplier={maxFontScale.title}>{row.label}</Text>
        <Text style={styles.note}>{row.note}</Text>
      </View>
      <Switch
        testID={`toggle.privacy.${row.key}`}
        value={row.value}
        onValueChange={onChange}
        trackColor={{ false: "#D8D6CD", true: colors.teal }}
        accessibilityLabel={row.label}
        accessibilityHint={row.note}
      />
    </View>
  );
}

function Header({ navigation }: { navigation: Props["navigation"] }) {
  return (
    <ScreenHeader title="Privacy" onBack={() => navigation.goBack()} align="center" />
  );
}

/** Review step 7a · the community guidelines (and the Terms of Use once counsel has written them), always reachable. */
function TermsLink({ onPress }: { onPress: () => void }) {
  const title = termsDocument().title;
  return (
    <>
      <Text style={styles.groupTitle}>{title.toUpperCase()}</Text>
      <View style={styles.card}>
        <TouchableOpacity testID="link.settingsPrivacy.terms" hitSlop={TAP_SLOP} accessibilityRole="link"
          accessibilityLabel={`Read the ${title.toLowerCase()}`} onPress={onPress} style={styles.policyRow}>
          <Text style={styles.policyLabel}>Read the {title.toLowerCase()}</Text>
          <Text style={styles.policyChev}>›</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function PrivacyPolicyLink() {
  const url = privacyPolicyUrl();
  if (!url) return null;
  return (
    <>
      <Text style={styles.groupTitle}>PRIVACY POLICY</Text>
      <View style={styles.card}>
        <TouchableOpacity
          testID="link.settingsPrivacy.policy"
          hitSlop={TAP_SLOP}
          accessibilityRole="link"
          accessibilityLabel="Read our privacy policy"
          onPress={() => { void Linking.openURL(url); }}
          style={styles.policyRow}
        >
          <Text style={styles.policyLabel}>Read our privacy policy</Text>
          <Text style={styles.policyChev}>›</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { padding: 20, paddingBottom: 48 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  groupTitle: { ...typography.meta, fontWeight: "700", color: colors.muted, letterSpacing: 1.4, marginBottom: 8, marginTop: 22 },
  card: { borderRadius: radii.tile, ...card },
  toggleRow: { paddingHorizontal: 18, paddingVertical: 16, flexDirection: "row", alignItems: "center" },
  toggleText: { flex: 1, paddingRight: 14 },
  // large: stacked. The base `flex: 1` survives in a style array and would collapse the text in a column (`flex: 0` is what works, #189).
  toggleRowLarge: { flexDirection: "column", alignItems: "flex-start", gap: 10 },
  toggleTextLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto", paddingRight: 0 },
  toggleLabel: { ...typography.subtitle, fontWeight: "700", color: colors.ink },
  policyRow: { paddingHorizontal: 18, paddingVertical: 16, minHeight: 44,
               flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  policyLabel: { flexShrink: 1, ...typography.subtitle, fontWeight: "700", color: colors.ink },
  policyChev: { fontSize: 19, fontWeight: "700", color: colors.teal },
  factRow: { paddingHorizontal: 18, paddingVertical: 16 },
  factLabel: { ...typography.strong, fontWeight: "700", color: colors.ink },
  note: { ...typography.meta, color: colors.muted, marginTop: 4, lineHeight: 18 },
  divided: { borderBottomWidth: 1, borderBottomColor: colors.border },
  footnote: { ...typography.meta, color: colors.muted, marginTop: 10, lineHeight: 18 },
  error: { ...typography.body, color: colors.danger },
  errorBanner: { ...typography.meta, color: colors.danger, marginBottom: 12 },
});
