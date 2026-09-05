// US-X1 · shown ABOVE cached rows when the refresh behind them failed.
//
// The counterpart to LoadStateView, and the reason its offline copy could stop lying. A
// cache-first screen has two states a full-screen view cannot express:
//
//   nothing cached, request failed  -> LoadStateView: "You're offline. We couldn't reach
//                                      the server." Nothing is shown, and nothing is claimed.
//   cached rows, refresh failed     -> the rows, with THIS above them. Something IS shown,
//                                      so the honest thing is to say how old it is.
//
// ⚠️ It is not optional dressing. Rows with no marker read as current — which on this app
// means a rescuer looking at a stray report that may already have been claimed, or a list of
// volunteer shifts that may already be full. The whole value of a cache is that stale data
// beats no data; the whole risk is that stale data looks like fresh data.
import { StyleSheet, Text } from "react-native";

const colors = { warn: "#8a5a12", warnBg: "#FAEEDA", warnLine: "#E7D3AE" };

export function StaleBanner({ offline }: { offline: boolean }) {
  return (
    <Text style={styles.banner} accessibilityRole="alert">
      {offline
        ? "You're offline — showing what we saved earlier."
        : "Couldn't refresh — showing what we saved earlier."}
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warnBg,
    borderColor: colors.warnLine,
    borderWidth: 1,
    borderRadius: 14,
    color: colors.warn,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
