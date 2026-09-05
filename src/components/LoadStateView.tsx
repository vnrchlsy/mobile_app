// US-O1 · the ONE offline/error/empty state, shared.
//
// §13.3 asks that a screen degrade gracefully rather than fail. `client.ts` has returned a
// `status: 0` network sentinel since Sprint 6, but no screen distinguished it from a 500 —
// so an offline person saw "something went wrong", which is untrue and unactionable.
//
// This is deliberately ONE component rather than a state per screen. The plan's own words:
// "One shared component, not 85 bespoke states." A per-screen version drifts, and the
// screens that get it wrong are always the rarely-seen ones — which is exactly where a
// confusing empty state does the most damage.
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { LoadState, loadStateCopy } from "../net";
import { TAP_SLOP } from "../touch";

const colors = { ink: "#12213A", muted: "#5F5E5A", teal: "#1C6B6B" };

export function LoadStateView({
  state, emptyTitle, emptyBody, onRetry, subject,
}: {
  state: LoadState;
  emptyTitle?: string;
  emptyBody?: string;
  onRetry?: () => void;
  /**
   * US-R2 · what this screen is about — "listing", "report", "story". A DETAIL route passes
   * it so the copy names what failed ("Couldn't load this listing") instead of the generic
   * "Couldn't load that". Bare noun, no article.
   *
   * ⚠️ Detail routes must ALSO pass no `count` to `loadState`, so `empty` can never fire.
   * "No listings yet" on a page about one listing is exactly the nonsense this prop exists
   * alongside — naming the subject without that is only half the fix.
   */
  subject?: string;
}) {
  if (state.kind === "ready") return null;

  if (state.kind === "loading") {
    return (
      <View style={styles.wrap} accessibilityLabel="Loading">
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  const copy = loadStateCopy(state, emptyTitle, emptyBody, subject);
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${copy.title}. ${copy.body}`}>
      <Text style={styles.title}>{copy.title}</Text>
      {copy.body ? <Text style={styles.body}>{copy.body}</Text> : null}
      {copy.retry && onRetry ? (
        <TouchableOpacity hitSlop={TAP_SLOP}
          onPress={onRetry}
          style={styles.retry}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.retryLabel}>Try again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 48, paddingHorizontal: 24, alignItems: "center" },
  title: { fontSize: 17, fontWeight: "800", color: colors.ink, textAlign: "center" },
  body: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 20 },
  retry: { marginTop: 18, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 22, backgroundColor: colors.teal },
  retryLabel: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
