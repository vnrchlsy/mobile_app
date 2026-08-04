// US-A1 step 1 — reference: screens/user/screen-account-type.png
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { RootStackParamList } from "../navigation/types";
import { AuthHeader } from "./AuthFormKit";
import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

const paw = require("../../assets/paw-white.png") as ImageSourcePropType;

type Props = NativeStackScreenProps<RootStackParamList, "accountType">;

export function AccountTypeScreen({ navigation }: Props) {
  function onPetOwner() {
    navigation.navigate("signup", { accountType: "personal" });
  }

  function onShelter() {
    Alert.alert(
      "Shelter accounts coming soon",
      "Shelter & organization signup isn't open yet — check back soon."
    );
  }

  return (
    <View style={styles.screen}>
      <AuthHeader title="Choose account type" activeStep={0} onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.title}>How will you join?</Text>
        <Text style={styles.caption}>This sets up the right account — you can get verified anytime.</Text>

        <TouchableOpacity activeOpacity={0.85} onPress={onPetOwner} style={styles.card}>
          <View style={styles.iconCircle}>
            <Image source={paw} resizeMode="contain" style={styles.pawIcon} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.cardTitle}>Pet Owner</Text>
            <Text style={styles.cardBody}>Adopt, report strays, and rehome animals you rescue yourself.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={onShelter} style={[styles.card, styles.secondCard]}>
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
    backgroundColor: colors.page
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.s28
  },
  title: {
    color: colors.ink,
    ...typography.heading800_24,
    lineHeight: 30
  },
  caption: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.body14,
    lineHeight: 20
  },
  card: {
    marginTop: spacing.s28,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.r16,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s20,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  secondCard: {
    marginTop: spacing.s16
  },
  iconCircle: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30, // exactly half of width/height (circle) — do not snap to radii scale
    backgroundColor: colors.teal
  },
  pawIcon: {
    width: 30,
    height: 30
  },
  orgIconCircle: {
    backgroundColor: colors.tealTint
  },
  orgGlyph: {
    color: colors.teal,
    ...typography.heading900_28
  },
  copy: {
    flex: 1,
    marginLeft: spacing.s16
  },
  cardTitle: {
    color: colors.ink,
    ...typography.heading800_18
  },
  cardBody: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.body12,
    lineHeight: 17
  },
  chevron: {
    color: colors.muted,
    ...typography.heading700_26,
    marginLeft: spacing.s8
  }
});
