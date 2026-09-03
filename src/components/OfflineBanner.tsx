// US-O1 · §13.3's "clear connectivity feedback: offline banner".
//
// Persistent while offline, and deliberately NOT a modal or a toast: the person may still be
// doing something useful (composing a report that the outbox will send later — US-O3), and
// blocking them or flashing a message they can miss both defeat the point.
//
// Design system: WARNBG/WARN2, the amber pair every other "attention, not failure" surface
// uses. It sits ABOVE the floating tab bar and never covers a primary action.
import { StyleSheet, Text, View } from "react-native";

import { useConnectivity } from "../net/ConnectivityProvider";

const colors = { warnBg: "#FAEEDA", warn: "#633806" };

export function OfflineBanner({ bottom = 96 }: { bottom?: number }) {
  const { online } = useConnectivity();
  if (online) return null;

  return (
    <View
      style={[styles.bar, { bottom }]}
      pointerEvents="none"          // never intercept a tap meant for the screen underneath
      accessibilityRole="alert"
      accessibilityLabel="You're offline. Anything you send will be queued."
    >
      <Text style={styles.text}>You're offline — we'll send things when you're back.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute", left: 16, right: 16, borderRadius: 14,
    backgroundColor: colors.warnBg, paddingVertical: 10, paddingHorizontal: 14,
  },
  text: { fontSize: 13, fontWeight: "600", color: colors.warn, textAlign: "center" },
});
