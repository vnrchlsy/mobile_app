// US-O1 · confirmation after sending an offer. Reference: screens/user/screen-rescue-offer-sent.png.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { OfferType } from "../api/types";
import { CheckIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { OFFER_TYPE_LABEL } from "../sagip";
import { TAP_SLOP } from "../touch";
import { colors, spacing, squircle, typography } from "../theme";
import { Button } from "../components/ui";


type Props = NativeStackScreenProps<RootStackParamList, "rescueOfferSent">;

export function RescueOfferSentScreen({ navigation, route }: Props) {
  const { reportId, offerType } = route.params;
  const label = OFFER_TYPE_LABEL[offerType as OfferType] ?? offerType;

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.heroIcon}><CheckIcon color={colors.white} size={30} /></View>
        <Text style={styles.heroTitle}>Offer sent</Text>
        <Text style={styles.heroBody}>
          You offered {label.toLowerCase()}. If someone claims this case, they'll get your
          contact — no other action needed from you until then.
        </Text>

        <Button
          label="Back to the report"
          onPress={() => navigation.replace("reportDetail", { reportId })}
          style={styles.primary}
        />
        <TouchableOpacity hitSlop={TAP_SLOP} onPress={() => navigation.navigate("myOffers")} activeOpacity={0.7}>
          <Text style={styles.secondary}>See my offers</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
  heroIcon: { width: 76, height: 76, borderRadius: squircle(76), alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  heroTitle: { marginTop: 18, color: colors.ink, ...typography.hero },
  heroBody: { marginTop: 10, color: colors.muted, ...typography.body, textAlign: "center" },
  primary: { marginTop: 30, width: "100%" },
  secondary: { marginTop: 16, color: colors.teal, ...typography.strong, fontWeight: "700" }
});
