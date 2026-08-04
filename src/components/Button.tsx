import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = "primary", disabled, loading, style }: ButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === "primary") {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        style={[styles.wrap, isDisabled && styles.disabled, style]}
      >
        <LinearGradient colors={[colors.teal, colors.tealDark]} style={styles.fill}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryLabel}>{label}</Text>}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const isDanger = variant === "danger";
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={[
        styles.wrap,
        styles.fill,
        styles.secondary,
        isDanger && styles.dangerBorder,
        isDisabled && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isDanger ? colors.danger : colors.ink} />
      ) : (
        <Text style={[styles.secondaryLabel, isDanger && styles.dangerLabel]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.r24,
    overflow: "hidden"
  },
  fill: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.s16
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border
  },
  dangerBorder: {
    borderColor: colors.danger
  },
  disabled: {
    opacity: 0.6
  },
  primaryLabel: {
    ...typography.label800_16,
    color: colors.white
  },
  secondaryLabel: {
    ...typography.label800_16,
    color: colors.ink
  },
  dangerLabel: {
    color: colors.danger
  }
});
