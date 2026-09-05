// Shared building blocks for the auth/onboarding flow (account type, signup, OTP).
// Visual language matches screens/user/screen-{account-type,signup,otp}.png: soft page background,
// pill status header with back chevron + step dots, 800-weight ink headings, white rounded fields.
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle
} from "react-native";

export const authColors = {
  ink: "#1F3A5F",
  teal: "#1C7876",
  tealDark: "#12524C",
  page: "#F7F7F4",
  border: "#E3E1D9",
  muted: "#62615C",
  danger: "#B3261E",
  paleTeal: "#E7F2F1"
};

export const AUTH_STEP_COUNT = 3;
// Shelters carry a 4-dot stepper on every onboarding step (rule 4 / US-B1) — the
// owner journey is 3 stops, the shelter journey is 4. `stepCount` lets the shared
// header render the right dot count without a shelter-specific header component.
export const SHELTER_STEP_COUNT = 4;

type AuthHeaderProps = {
  title: string;
  activeStep: number; // 0-based index into stepCount
  onBack: () => void;
  stepCount?: number;
};

export function AuthHeader({ title, activeStep, onBack, stepCount = AUTH_STEP_COUNT }: AuthHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        testID="btn.back"
        activeOpacity={0.75}
        onPress={onBack}
        style={styles.backButton}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle} accessibilityRole="header">{title}</Text>

      <View style={styles.steps}>
        {Array.from({ length: stepCount }).map((_, step) => (
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
      {!!onBack && (
        <TouchableOpacity
          testID="btn.back"
          activeOpacity={0.75}
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
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
  /**
   * Submit-on-return. A person who has just typed their password expects the return key to
   * log them in rather than hunting for a button — it is the standard behaviour of every
   * login form, and its absence here is a small papercut on the most-used screen in the app.
   */
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
  /**
   * US-X2 · a stable selector for the E2E suite. React Native maps `testID` to the platform
   * accessibility identifier, which is what Maestro's `id:` matches on.
   *
   * ⚠️ It is deliberately NOT the visible label. Maestro can match on text, and every Maestro
   * tutorial does — but Track R just rewrote user-facing copy across 42 screens, and a suite
   * pinned to copy fails on every wording change until someone deletes it. The id is a
   * contract between the app and the flows; the copy stays free to improve.
   */
  testID?: string;
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
  error,
  testID,
  returnKeyType,
  onSubmitEditing
}: FormFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.input, error && styles.inputError]}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          style={[styles.inputText, styles.textInput]}
        />
        {onToggleSecure && (
          <TouchableOpacity
          activeOpacity={0.7}
          onPress={onToggleSecure}
          style={styles.eyeButton}
          accessibilityRole="button"
          // The label has to track the state: announcing "show password" while the
          // password is already visible tells a blind user the opposite of the truth.
          accessibilityLabel={secure ? "Show password" : "Hide password"}
        >
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

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * US-X2 · a stable selector for the E2E suite. React Native maps `testID` to the platform
   * accessibility identifier, which is what Maestro's `id:` matches on.
   *
   * ⚠️ It is deliberately NOT the visible label. Maestro can match on text, and every Maestro
   * tutorial does — but Track R just rewrote user-facing copy across 42 screens, and a suite
   * pinned to copy fails on every wording change until someone deletes it. The id is a
   * contract between the app and the flows; the copy stays free to improve.
   */
  testID?: string;
};

export function PrimaryButton({ label, onPress, disabled, loading, style, testID }: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.primaryButtonWrap, isDisabled && styles.primaryButtonDisabled, style]}
    >
      <LinearGradient colors={["#1C7876", "#12524C"]} style={styles.primaryButton}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{label}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    // Unchanged at 132. This height always reserved a strip for the status bar; it used to
    // be filled with a drawn one, and is now simply left for the real one to draw into. That
    // is why removing the fake bar shifts nothing on the 15 screens using these headers.
    height: 132,
    paddingHorizontal: 28
  },
  backButton: {
    position: "absolute",
    left: 25,
    top: 52,
    width: 42,
    height: 42,
    zIndex: 10,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  backText: {
    color: authColors.ink,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 28
  },
  headerTitle: {
    marginTop: 58,
    color: authColors.ink,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center"
  },
  steps: {
    marginTop: 26,
    flexDirection: "row",
    justifyContent: "center",
    gap: 22
  },
  stepDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#D5DDDA"
  },
  stepActive: {
    backgroundColor: authColors.teal
  },
  fieldGroup: {
    marginTop: 17,
    // Fill the parent's width. Without this, a screen whose form column centers its children
    // (SigninScreen's `content` has alignItems:"center") collapses the field to its intrinsic
    // width — a tiny ~150px box that's hard to tap and stacks the email/password targets close
    // enough that taps land on the wrong one. A form field should always be full-width.
    alignSelf: "stretch"
  },
  label: {
    marginBottom: 8,
    color: authColors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  inputError: {
    borderColor: authColors.danger
  },
  inputText: {
    color: authColors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  textInput: {
    flex: 1,
    height: "100%",
    padding: 0,
    paddingRight: 34
  },
  fieldError: {
    marginTop: 6,
    color: authColors.danger,
    fontSize: 12,
    fontWeight: "700"
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
    borderColor: "#77756F",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ scaleY: 0.82 }]
  },
  eyePupil: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#77756F"
  },
  primaryButtonWrap: {
    borderRadius: 24,
    overflow: "hidden"
  },
  primaryButtonDisabled: {
    opacity: 0.6
  },
  primaryButton: {
    height: 50,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  }
});
