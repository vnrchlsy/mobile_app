// US-R2 · the decision for FORM screens whose prefill failed.
//
// A form is the one place a full-screen error state is wrong. `LoadStateView` replaces the
// screen; on a form that discards whatever the person has already typed, which turns a
// failed background request into lost work. So forms warn INLINE and refuse to submit.
//
// The rule, written down once so US-R5's five conversions don't each re-argue it:
//
//   1. Warn ABOVE the fields, on load — not on submit. Someone who learns the form cannot
//      save only after filling it in has still lost their time, which is most of the harm.
//   2. Keep the fields editable. A disabled form looks broken; an editable one with an
//      honest banner looks like what it is — temporarily unable to save.
//   3. Guard submit() separately. The banner is information, not enforcement, and a person
//      can and will tap the button anyway.
//   4. NEVER let a failed prefill render as empty defaults over real data. That is how an
//      edit form silently overwrites a shelter's description with "".
//
// Why this is a component and not a comment: it carries the design-system styling and the
// `accessibilityRole="alert"` that US-U1 established for errors, so five screens get both
// for free instead of five near-misses.
import { StyleSheet, Text } from "react-native";

/** Errors live with what they affect, never pooled at the top (design-system rule). */
const colors = { danger: "#B23B3B", dangerBg: "#FBEEEC", dangerLine: "#E7C7C2" };

export function PrefillWarning({ message }: { message: string }) {
  return (
    <Text style={styles.warning} accessibilityRole="alert">
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  warning: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerLine,
    borderWidth: 1,
    borderRadius: 14,
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
