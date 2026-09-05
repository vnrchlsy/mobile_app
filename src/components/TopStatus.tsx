import { StyleSheet, View } from "react-native";

/**
 * The strip the status bar occupies.
 *
 * It used to DRAW a status bar: a hard-coded "9:41" and a hand-drawn battery, copied from the
 * mockup. Real users have a real clock and a real battery and would rather see those, so the
 * app now shows the system status bar (App.tsx) and this reserves the room for it.
 *
 * Kept as a component rather than deleted so the five screens using it keep their spacing
 * with no layout change — the height is the same 52 it always was, it is simply empty now.
 * A screen whose top strip is DARK must also set `<StatusBar style="light" />` locally, or
 * the system draws dark glyphs on a dark ground.
 */
export function TopStatus() {
  return <View style={styles.statusBar} />;
}

const styles = StyleSheet.create({
  statusBar: {
    height: 52,
  },
});
