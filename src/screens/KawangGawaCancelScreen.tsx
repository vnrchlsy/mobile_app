// US-V8 · cancel a shift. Reference: screens/user/screen-kawanggawa-cancel(-late).png.
// `was_late` is decided server-side by POST /signups/{id}/cancel — never a device clock — so the
// pattern here is: show a neutral ConfirmModal first ("Cancel this shift?"), and only after the
// server responds do we know whether it was a free or a late (recorded) cancellation. The result
// phase renders lateCancelCopy(was_late) straight from that response.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { AlertIcon, CheckIcon } from "../components/AppIcons";
import { ConfirmModal } from "../components/ConfirmModal";
import { RootStackParamList } from "../navigation/types";
import { lateCancelCopy } from "../volunteer";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  greenBg: "#EAF3DE", green: "#27500A", amberBg: "#FAEEDA", amber: "#633806",
  pinkBg: "#FBECEC", pink: "#B23B3B"
};

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

type Phase = "confirm" | "submitting" | "result";

type Props = NativeStackScreenProps<RootStackParamList, "kawanggawaCancel">;

export function KawangGawaCancelScreen({ navigation, route }: Props) {
  const api = useApi();
  const { signupId } = route.params;

  const [phase, setPhase] = useState<Phase>("confirm");
  const [wasLate, setWasLate] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  async function onConfirm() {
    setPhase("submitting");
    setErrorMessage(undefined);
    const res = await api.post(`/signups/${signupId}/cancel`);
    if (!res.ok) {
      const code = res.data?.error?.code;
      if (res.status === 409 && code === "not_cancellable") {
        setErrorMessage("This shift can no longer be cancelled.");
      } else {
        setErrorMessage(res.data?.error?.message ?? "Couldn't cancel this shift. Try again.");
      }
      setPhase("confirm");
      return;
    }
    setWasLate(!!res.data.was_late);
    setPhase("result");
  }

  const resultTone = wasLate
    ? { bg: colors.amberBg, fg: colors.amber }
    : { bg: colors.greenBg, fg: colors.green };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Cancel shift</Text>
      </View>

      {phase === "submitting" && (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.teal} />
        </View>
      )}

      {phase === "result" && (
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: resultTone.bg }]}>
            {wasLate
              ? <AlertIcon color={resultTone.fg} size={40} />
              : <CheckIcon color={resultTone.fg} size={32} />}
          </View>

          <Text style={styles.heading}>Shift cancelled</Text>
          <Text style={styles.subheading}>{lateCancelCopy(!!wasLate)}</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryButton}
            onPress={() => navigation.navigate("kawanggawaSchedule")}
          >
            <Text style={styles.primaryText}>Back to schedule</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === "confirm" && !!errorMessage && (
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.pinkBg }]}>
            <AlertIcon color={colors.pink} size={40} />
          </View>
          <Text style={styles.heading}>Couldn't cancel</Text>
          <Text style={styles.subheading}>{errorMessage}</Text>

          <TouchableOpacity activeOpacity={0.85} style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryText}>Back to schedule</Text>
          </TouchableOpacity>
        </View>
      )}

      <ConfirmModal
        visible={phase === "confirm" && !errorMessage}
        title="Cancel this shift?"
        body="Cancelling more than 12 hours before your shift is free. Cancelling closer to the start time will be recorded on your account."
        confirmLabel="Cancel shift"
        tone="neutral"
        onConfirm={onConfirm}
        onCancel={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 60, alignItems: "center" },
  iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  heading: { marginTop: 22, color: colors.ink, fontSize: 24, fontWeight: "800" },
  subheading: { marginTop: 10, color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 21 },
  primaryButton: {
    width: "100%", height: 56, marginTop: 32, borderRadius: 28, alignItems: "center",
    justifyContent: "center", backgroundColor: colors.teal
  },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: "800" }
});
