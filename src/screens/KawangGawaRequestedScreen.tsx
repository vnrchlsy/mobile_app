// US-V8 · terminal confirmation after a volunteer requests a shift.
// Reference: screens/user/screen-kawanggawa-requested.png. No route params (kawanggawaRequested:
// undefined) — KawangGawaDetailScreen navigates here right after POST /shifts/{id}/signups
// succeeds, so this screen doesn't know which shift it was; it just points onward to the hub's
// My shifts tab (where the new "requested" row shows up) or back to Browse for more.
//
// Task 5 (K19, K30) · ScreenHeader replaces the bare content-only layout, and its back arrow —
// same as the hardware/gesture back, per the `beforeRemove` listener below — goes to the hub
// on My shifts rather than back to the shift detail: landing back on the screen that just
// asked "Request this shift?" after already requesting it is not a back step, it's a chance to
// double-submit.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ClockIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { TAP_SLOP } from "../touch";
import { colors, maxFontScale, spacing, typography } from "../theme";
import { Button, ScreenHeader } from "../components/ui";
import { openOwnerTab } from "../appTabs";
import { requestPushPrompt } from "../pushPrompt";

type Props = NativeStackScreenProps<RootStackParamList, "kawanggawaRequested">;

export function KawangGawaRequestedScreen({ navigation }: Props) {
  useEffect(() => { requestPushPrompt("shift"); }, []);   // NQ6
  useEffect(() => navigation.addListener("beforeRemove", (e) => {
    if (e.data.action.type === "GO_BACK") {
      e.preventDefault();
      openOwnerTab(navigation, "volunteer", { tab: "mine" });
    }
  }), [navigation]);

  return (
    <View style={styles.screen} testID="screen.kawanggawaRequested">
      <ScreenBackdrop />
      <ScreenHeader title="Request sent" onBack={() => openOwnerTab(navigation, "volunteer", { tab: "browse" })} />

      {/* At AX5 the outcome outgrows the screen (the buttons were unreachable); a short one still sits where it did. */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <ClockIcon color={colors.teal} size={44} />
        </View>

        <Text style={styles.heading} maxFontSizeMultiplier={maxFontScale.title}>Request sent!</Text>
        <Text style={styles.subheading}>
          The shelter will review your request and confirm the shift shortly.
        </Text>

        <Text style={styles.hint}>
          Once confirmed, it moves from "Awaiting approval" to your upcoming shifts.
        </Text>

        <Button
          label="View my shifts"
          onPress={() => openOwnerTab(navigation, "volunteer", { tab: "mine" })}
          style={styles.primaryButton}
        />

        <TouchableOpacity hitSlop={TAP_SLOP}
          activeOpacity={0.7}
          style={styles.secondaryButton}
          onPress={() => openOwnerTab(navigation, "volunteer", { tab: "browse" })}
        >
          <Text style={styles.secondaryText}>Browse more opportunities</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: 100, paddingBottom: 60, alignItems: "center" },
  iconCircle: {
    width: 108, height: 108, borderRadius: 54, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.soft
  },
  heading: { marginTop: 24, color: colors.ink, ...typography.hero },
  subheading: { marginTop: 10, color: colors.muted, ...typography.body, textAlign: "center" },
  hint: { marginTop: 26, color: colors.muted, ...typography.meta, textAlign: "center", lineHeight: 19 },
  primaryButton: { width: "100%", marginTop: 34 },
  secondaryButton: { marginTop: 18, paddingVertical: 10 },
  secondaryText: { color: colors.teal, ...typography.strong, fontWeight: "700" }
});
