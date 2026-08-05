// Adopt tab placeholder — full listings/browse flow is a later sprint (M8). This just gives the
// owner shell a real destination so the tab bar has somewhere to land.
import { StyleSheet, View } from "react-native";

import { AppText } from "../components/AppText";
import { OwnerTabs } from "../components/OwnerTabs";
import { ScreenContainer } from "../components/ScreenContainer";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export function AdoptScreen() {
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppText variant="heading800_24" color={colors.inkStrong}>
          Adopt
        </AppText>
        <AppText variant="body14" color={colors.muted} textAlign="center" style={styles.body}>
          Browsing and adoption inquiries are coming soon.
        </AppText>
      </View>
      <OwnerTabs active="adopt" />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.s32
  },
  body: {
    marginTop: spacing.s8,
    lineHeight: 20
  }
});
