// Volunteer tab placeholder — the Kawang-Gawa volunteer flow is a later sprint. This just gives
// the owner shell a real destination so the tab bar has somewhere to land.
import { StyleSheet, Text, View } from "react-native";

import { OwnerTabs } from "../components/OwnerTabs";

export function VolunteerScreen() {
  return (
    <View style={styles.screen} testID="screen.volunteer">
      <View style={styles.content}>
        <Text style={styles.title}>Volunteer</Text>
        <Text style={styles.body}>Kawang-Gawa volunteer shifts are coming soon.</Text>
      </View>
      <OwnerTabs active="volunteer" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F5F2"
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32
  },
  title: {
    color: "#12213A",
    fontSize: 24,
    fontWeight: "800"
  },
  body: {
    marginTop: 10,
    color: "#5F5E5A",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20
  }
});
