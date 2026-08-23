// US-O1 · confirmation after sending an offer. Reference: screens/user/screen-rescue-offer-sent.png.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { OfferType } from "../api/types";
import { CheckIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { OFFER_TYPE_LABEL } from "../sagip";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF"
};

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

        <TouchableOpacity
          style={styles.primary}
          activeOpacity={0.9}
          onPress={() => navigation.replace("reportDetail", { reportId })}
        >
          <Text style={styles.primaryText}>Back to the report</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("myOffers")} activeOpacity={0.7}>
          <Text style={styles.secondary}>See my offers</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  heroIcon: { width: 76, height: 76, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  heroTitle: { marginTop: 18, color: colors.ink, fontSize: 28, fontWeight: "800" },
  heroBody: { marginTop: 10, color: colors.muted, fontSize: 16, textAlign: "center", lineHeight: 22 },
  primary: { marginTop: 30, height: 58, width: "100%", borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  primaryText: { color: colors.white, fontSize: 18, fontWeight: "700" },
  secondary: { marginTop: 16, color: colors.teal, fontSize: 15, fontWeight: "700" }
});
