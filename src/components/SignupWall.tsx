// US-A1b — the signup gate. Reference: screens/user/screen-signup-wall.png. A bottom-sheet-style
// modal built on React Native's own <Modal> (no bottom-sheet dependency, per the task brief) — a
// transparent, slide-up Modal with a rounded card pinned to the bottom and a dimmed backdrop that
// dismisses on tap, same as a real bottom sheet without the extra package.
// This is the SIGNUP gate only — it must never fold in "get verified" copy. Adopting still hits
// the separate Verified Member gate (MemberUpgradeScreen) once the account exists; that gate is
// unrelated and already built (M7).
import { ReactNode } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";

import { GuestIntentAction } from "../guestIntent";
import { CheckIcon, ProfileIcon, VolunteerIcon } from "./AppIcons";
import { PrimaryButton, authColors } from "../screens/AuthFormKit";
import { TAP_SLOP } from "../touch";

export type SignupWallAction = GuestIntentAction;

type SignupWallProps = {
  visible: boolean;
  action: SignupWallAction;
  // Optional subject for the copy, e.g. a pet's name ("Adopt Milo"). Falls back to generic
  // copy when the gated tap isn't about one specific pet (e.g. the Report/Volunteer/You tabs).
  subject?: string;
  onCreateAccount: () => void;
  onLogin: () => void;
  onDismiss: () => void;
};

type WallCopy = { icon: ReactNode; title: string; body: string; note: string };

function getCopy(action: SignupWallAction, subject?: string): WallCopy {
  switch (action) {
    case "adopt":
      return {
        icon: <HouseHeartIcon />,
        title: subject ? `Adopt ${subject}` : "Adopt a pet",
        body: "Create a free account to send your adoption inquiry.",
        note: subject
          ? `Takes a minute — we'll bring you right back to ${subject}.`
          : "Takes a minute — we'll bring you right back."
      };
    case "save":
      return {
        icon: <HouseHeartIcon />,
        title: subject ? `Save ${subject}` : "Save this pet",
        body: "Create a free account to save pets you love and get updates.",
        note: "Takes a minute — we'll bring you right back."
      };
    case "report":
      return {
        icon: <PinIcon />,
        title: "Report a stray",
        body: "Create a free account to report strays and connect with nearby rescuers.",
        note: "Takes a minute — we'll bring you right back."
      };
    case "volunteer":
      return {
        icon: <VolunteerIcon color={authColors.teal} size={30} />,
        title: "Volunteer with shelters",
        body: "Create a free account to sign up for Kawang-Gawa volunteer shifts.",
        note: "Takes a minute — we'll bring you right back."
      };
    case "account":
    default:
      return {
        icon: <ProfileIcon color={authColors.teal} size={30} />,
        title: "Create your account",
        body: "Sign up to manage your profile, adoptions, and more.",
        note: "Takes a minute — we'll bring you right back."
      };
  }
}

export function SignupWall({ visible, action, subject, onCreateAccount, onLogin, onDismiss }: SignupWallProps) {
  const copy = getCopy(action, subject);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.iconCircle}>{copy.icon}</View>

          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>

          <View style={styles.noteBar}>
            <View style={styles.noteCheck}>
              <CheckIcon color="#FFFFFF" size={12} />
            </View>
            <Text style={styles.noteText}>{copy.note}</Text>
          </View>

          <PrimaryButton label="Create free account" onPress={onCreateAccount} style={styles.createButton} />

          <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={onLogin}>
            <Text style={styles.loginLink}>Already have one? Log in</Text>
          </TouchableOpacity>

          <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={onDismiss} style={styles.laterPressable}>
            <Text style={styles.laterLink}>Keep browsing</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Simple "house with a heart" glyph built from primitives, matching the reference PNG's icon and
// the app's existing icon language (AppIcons.tsx composes shapes rather than using an icon font).
function HouseHeartIcon() {
  return (
    <View style={styles.houseIconBox}>
      <View style={styles.houseRoof} />
      <View style={styles.houseBody}>
        <View style={styles.heartLeft} />
        <View style={styles.heartRight} />
      </View>
    </View>
  );
}

function PinIcon() {
  return (
    <View style={styles.pinIconBox}>
      <View style={styles.pinCircle} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(18, 33, 58, 0.45)"
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 34,
    alignItems: "center",
    backgroundColor: "#FFFFFF"
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 22,
    backgroundColor: authColors.border
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: authColors.paleTeal
  },
  title: {
    marginTop: 18,
    color: authColors.ink,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center"
  },
  body: {
    marginTop: 8,
    color: authColors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  noteBar: {
    width: "100%",
    marginTop: 20,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: authColors.paleTeal
  },
  noteCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: authColors.teal
  },
  noteText: {
    flex: 1,
    marginLeft: 12,
    color: authColors.tealDark,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  createButton: {
    width: "100%",
    marginTop: 24
  },
  loginLink: {
    marginTop: 18,
    color: authColors.teal,
    fontSize: 14,
    fontWeight: "800"
  },
  laterPressable: {
    marginTop: 14,
    paddingVertical: 4
  },
  laterLink: {
    color: "#AAA69D",
    fontSize: 13,
    fontWeight: "700"
  },
  houseIconBox: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  houseRoof: {
    position: "absolute",
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 13,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: authColors.teal
  },
  houseBody: {
    position: "absolute",
    top: 12,
    width: 26,
    height: 18,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: authColors.teal,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row"
  },
  heartLeft: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    transform: [{ translateX: 2 }, { translateY: -1 }, { rotate: "-45deg" }]
  },
  heartRight: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    transform: [{ translateX: -2 }, { translateY: -1 }, { rotate: "45deg" }]
  },
  pinIconBox: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  pinCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: authColors.teal
  }
});
