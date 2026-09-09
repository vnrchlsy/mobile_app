// US-A1 step 1 — reference: screens/user/screen-account-type.png
// US-A2 variant — reference: screens/user/screen-account-type-google.png. Arriving with a social
// identity adds the provider chip above the cards and changes what "Pet Owner" does: the provider
// already asserted a verified email, so there is no form and no code — the account is created here
// and the user lands straight on signup-success.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { AuthHeader, authColors } from "./AuthFormKit";

const paw = require("../../assets/paw-white.png") as ImageSourcePropType;

type Props = NativeStackScreenProps<RootStackParamList, "accountType">;

export function AccountTypeScreen({ navigation, route }: Props) {
  const api = useApi();
  const { setTokens } = useAuth();
  const social = route.params?.social;
  const [busy, setBusy] = useState(false);

  async function onPetOwner() {
    if (!social) {
      navigation.navigate("signup", { accountType: "personal" });
      return;
    }
    // Social owner: no form, no code (US-A2).
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.post(`/auth/social/${social.provider}`, {
        id_token: social.idToken,
        account_type: "personal"
      });
      if (res.ok) {
        await setTokens({ access: res.data.access, refresh: res.data.refresh });
        navigation.navigate("signupSuccess");
        return;
      }
      Alert.alert("Couldn't finish sign-in", res.data?.error?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function onShelter() {
    // Shelter journey (US-B1): tier is chosen next, then the shared signup shell. A social
    // identity rides along — the account is only created after the tier is known, because
    // tier lands on shelter_profile in the very next step.
    navigation.navigate("shelterTier", social ? { social } : undefined);
  }

  return (
    <View style={styles.screen} testID="screen.accountType">
      <AuthHeader title="Choose account type" activeStep={0} onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.title}>How will you join?</Text>
        <Text style={styles.caption}>This sets up the right account — you can get verified anytime.</Text>

        {!!social && (
          <View style={styles.identityChip}>
            <View style={styles.providerDot}>
              <Text style={styles.providerLetter}>{social.provider === "google" ? "G" : ""}</Text>
            </View>
            <Text style={styles.identityEmail} numberOfLines={1}>{social.email}</Text>
            <Text style={styles.identitySource}>
              from {social.provider === "google" ? "Google" : "Apple"}
            </Text>
          </View>
        )}

        <TouchableOpacity testID="btn.accountType.personal" activeOpacity={0.85} onPress={onPetOwner} disabled={busy} style={styles.card}>
          <View style={styles.iconCircle}>
            <Image source={paw} resizeMode="contain" style={styles.pawIcon} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.cardTitle}>Pet Owner</Text>
            <Text style={styles.cardBody}>Adopt, report strays, and rehome animals you rescue yourself.</Text>
          </View>
          {busy ? <ActivityIndicator color={authColors.teal} /> : <Text style={styles.chevron}>›</Text>}
        </TouchableOpacity>

        <TouchableOpacity testID="btn.accountType.shelter" activeOpacity={0.85} onPress={onShelter} disabled={busy} style={[styles.card, styles.secondCard]}>
          <View style={[styles.iconCircle, styles.orgIconCircle]}>
            <Text style={styles.orgGlyph}>▦</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.cardTitle}>Shelter / Organization</Text>
            <Text style={styles.cardBody}>List animals, receive donations, and host volunteers.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: authColors.page
  },
  content: {
    flex: 1,
    paddingHorizontal: 28
  },
  title: {
    color: authColors.ink,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30
  },
  caption: {
    marginTop: 6,
    color: authColors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  card: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  secondCard: {
    marginTop: 18
  },
  iconCircle: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: authColors.teal
  },
  pawIcon: {
    width: 30,
    height: 30
  },
  orgIconCircle: {
    backgroundColor: authColors.paleTeal
  },
  orgGlyph: {
    color: authColors.teal,
    fontSize: 28,
    fontWeight: "900"
  },
  copy: {
    flex: 1,
    marginLeft: 18
  },
  cardTitle: {
    color: authColors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  cardBody: {
    marginTop: 6,
    color: authColors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  identityChip: {
    marginTop: 22,
    height: 52,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF"
  },
  providerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: authColors.paleTeal
  },
  providerLetter: { color: authColors.teal, fontSize: 15, fontWeight: "700" },
  identityEmail: { flex: 1, marginLeft: 12, color: authColors.ink, fontSize: 14, fontWeight: "600" },
  identitySource: { color: "#B8B6AD", fontSize: 12 },
  chevron: {
    color: authColors.muted,
    fontSize: 26,
    fontWeight: "700",
    marginLeft: 8
  }
});
