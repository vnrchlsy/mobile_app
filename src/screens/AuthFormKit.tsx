// Shared building blocks for the auth/onboarding flow (account type, signup, OTP).
// Visual language matches screens/user/screen-{account-type,signup,otp}.png: soft page background,
// pill status header with back chevron + step dots, 800-weight ink headings, white rounded fields.
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View
} from "react-native";

import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export const AUTH_STEP_COUNT = 3;

type AuthHeaderProps = {
  title: string;
  activeStep: number; // 0-based index into AUTH_STEP_COUNT
  onBack: () => void;
};

export function AuthHeader({ title, activeStep, onBack }: AuthHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.statusTime}>9:41</Text>
      <View style={styles.statusBattery}>
        <View style={styles.statusBatteryDot} />
        <View style={styles.statusBatteryDot} />
      </View>

      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onBack}
        style={styles.backButton}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      >
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>

      <View style={styles.steps}>
        {Array.from({ length: AUTH_STEP_COUNT }).map((_, step) => (
          <View key={step} style={[styles.stepDot, step <= activeStep && styles.stepActive]} />
        ))}
      </View>
    </View>
  );
}

type SimpleHeaderProps = {
  title?: string;
  onBack?: () => void;
};

// Header variant for screens outside the 3-step onboarding flow (signin, recovery chain):
// same status-bar-and-back-button chrome as AuthHeader, but no step dots — those screens aren't
// part of the account-type/signup/otp sequence. onBack omitted renders no back button (e.g.
// passwordChanged, which is a dead-end success screen).
export function SimpleHeader({ title, onBack }: SimpleHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.statusTime}>9:41</Text>
      <View style={styles.statusBattery}>
        <View style={styles.statusBatteryDot} />
        <View style={styles.statusBatteryDot} />
      </View>

      {!!onBack && (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
      )}
      {!!title && <Text style={styles.headerTitle}>{title}</Text>}
    </View>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  onToggleSecure?: () => void;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  keyboardType?: TextInputProps["keyboardType"];
  autoComplete?: TextInputProps["autoComplete"];
  error?: string;
};

export function FormField({
  label,
  value,
  onChangeText,
  secure,
  onToggleSecure,
  autoCapitalize,
  keyboardType,
  autoComplete,
  error
}: FormFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.input, error && styles.inputError]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          style={[styles.inputText, styles.textInput]}
        />
        {onToggleSecure && (
          <TouchableOpacity activeOpacity={0.7} onPress={onToggleSecure} style={styles.eyeButton}>
            <View style={styles.eyeIcon}>
              <View style={styles.eyePupil} />
            </View>
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 132,
    paddingHorizontal: spacing.s28
  },
  statusTime: {
    position: "absolute",
    left: 30,
    top: 16,
    color: colors.ink,
    ...typography.label800_14
  },
  statusBattery: {
    position: "absolute",
    right: 22,
    top: 17,
    width: 28,
    height: 14,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radii.r4,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.s4
  },
  statusBatteryDot: {
    width: 6,
    height: 6,
    borderRadius: 3, // exactly half of width/height (circle) — do not snap to radii scale
    backgroundColor: colors.ink
  },
  backButton: {
    position: "absolute",
    left: 25,
    top: 52,
    width: 42,
    height: 42,
    zIndex: 10,
    borderRadius: 21, // exactly half of width/height (circle) — do not snap to radii scale
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  backText: {
    color: colors.ink,
    ...typography.heading700_26,
    lineHeight: 28
  },
  headerTitle: {
    marginTop: spacing.s56,
    color: colors.ink,
    ...typography.label800_16,
    textAlign: "center"
  },
  steps: {
    marginTop: spacing.s24,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.s20
  },
  stepDot: {
    width: 9,
    height: 9,
    borderRadius: 5, // ~half of width/height (circle) — do not snap to radii scale
    backgroundColor: colors.border
  },
  stepActive: {
    backgroundColor: colors.teal
  },
  fieldGroup: {
    marginTop: spacing.s16
  },
  label: {
    marginBottom: spacing.s8,
    color: colors.ink,
    ...typography.label800_12
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.r12,
    paddingHorizontal: spacing.s12,
    justifyContent: "center",
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  inputError: {
    borderColor: colors.danger
  },
  inputText: {
    color: colors.ink,
    ...typography.label800_14
  },
  textInput: {
    flex: 1,
    height: "100%",
    padding: 0,
    paddingRight: spacing.s32
  },
  fieldError: {
    marginTop: spacing.s4,
    color: colors.danger,
    ...typography.label700_12
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 0,
    width: 32,
    height: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  eyeIcon: {
    width: 20,
    height: 13,
    borderWidth: 2,
    borderColor: colors.muted,
    borderRadius: 10, // ~half of height, forms the pill/eye shape with scaleY below — do not snap
    alignItems: "center",
    justifyContent: "center",
    transform: [{ scaleY: 0.82 }]
  },
  eyePupil: {
    width: 5,
    height: 5,
    borderRadius: 3, // ~half of width/height (circle) — do not snap to radii scale
    backgroundColor: colors.muted
  }
});
