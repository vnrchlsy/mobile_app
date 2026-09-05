import { LinearGradient } from "expo-linear-gradient";
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAP_SLOP } from "./touch";

/**
 * The landing screen — rebuilt 2026-09-05 to be lighter and to lay itself out.
 *
 * ⚠️ WHAT CHANGED STRUCTURALLY, AND WHY IT MATTERS MORE THAN THE LOOK.
 *
 * Every element used to be absolutely positioned on a 540×1170 canvas, scaled with sx()/sy()
 * so the build matched `screens/user/gen-screens.js` pixel for pixel. That is a faithful way
 * to ship a mockup and a poor way to ship an app:
 *
 *   - Text could not reflow. Copy was pinned at a y-coordinate, so a longer line, a
 *     translation, or the largest dynamic-type setting overlapped the row beneath it rather
 *     than pushing it down. **US-W1's "largest dynamic type clips nothing" was unachievable
 *     on this screen by construction**, which is worth more than the visual refresh.
 *   - Spacing was arithmetic. The comment block that used to live here derived GUEST_TOP 888
 *     from "806 + 68 = 874", and every copy change re-opened that sum. Flex `gap` states the
 *     same intent in a way that cannot drift.
 *
 * The 44 pt lesson that produced those constants is NOT discarded — it is the reason the
 * action stack below uses a real `gap` and explicit `minHeight`s. Stacked controls need
 * SPACING; `hitSlop` only works when there is empty space to claim, and at ~27 pt apart the
 * old links' slop would have overlapped, letting the topmost sibling silently win a
 * contested tap. See `touch.ts`.
 *
 * ⚠️ The fake status bar (a hard-coded "9:41" and a drawn battery) is gone. It existed
 * because App.tsx sets `<StatusBar hidden />` and the mockup drew one. Shipping a fake clock
 * to real users is a mockup artefact, not a feature; the real inset does the job.
 *
 * ⚠️ "Browse as a guest" is now a prominent TEXT button rather than a third white box, and
 * that touches a recorded decision, so: the note in gen-screens.js says it must be
 * "prominent, not buried — the friend-shared-a-stray-link visitor should see this
 * immediately", and it was made a box because it had shipped as an 18 pt line of text that
 * was almost unpressable. Both concerns are still met — it is teal, weight 700, directly
 * under the primary actions, and carries an explicit 48 pt target. What it no longer does is
 * make three stacked boxes compete for the same glance.
 */
const logo = require("../assets/kupkop-logo-trimmed.png") as ImageSourcePropType;
const paw = require("../assets/paw-white.png") as ImageSourcePropType;

/** V2 palette (design system). No eyeballed hexes. */
const c = {
  bg: "#F4F5F2",
  ink: "#12213A",
  teal: "#1C6B6B",
  tealDk: "#14504F",
  forest: "#11241F",
  muted: "#5F5E5A",
  line: "#E3E1D9",
  white: "#FFFFFF",
  onHero: "#EAF4F2",
  onHeroSoft: "#BBD9D4",
  fine: "#9A988F",
};

type WelcomeCopy = {
  tagline: string;
  subtitle: string;
  pillars: string[];
  getStarted: string;
  continueWithGoogle: string;
  login: string;
  browseGuest: string;
  terms: string;
};

const DEFAULT_COPY: WelcomeCopy = {
  tagline: "Kupkop. Kalinga. Kinabukasan.",
  subtitle: "The app made for Filipino fur parents.",
  /**
   * ⚠️ THIS IS THE CROWDING FIX, AND IT IS A REAL COPY DECISION — not a style tweak.
   *
   * These were three full sentences, each on its own row beside a 38 pt paw:
   *   "Spot a stray? Help's a tap away." · "Meet your forever furry friend."
   *   "Every peso reaches the shelter."
   *
   * Good lines, and they are the house voice — but stacked under a tagline AND a subtitle
   * they made five blocks of prose the eye has to work through before it reaches a button.
   * They are now three words in a single row: what the app is for, at a glance.
   *
   * The warmth did not go in the bin. It moved to the subtitle, which is the one full
   * sentence on the screen, and those three sentences are exactly the right copy for the
   * onboarding cards that follow — where there is room to read.
   */
  pillars: ["Rescue", "Adopt", "Donate"],
  getStarted: "Get started",
  continueWithGoogle: "Continue with Google",
  login: "Already have an account? Log in",
  browseGuest: "Browse as a guest",
  terms: "By continuing you agree to our Terms & Privacy.",
};

type WelcomeCopyInput = Partial<Omit<WelcomeCopy, "pillars">> & { pillars?: string[] };

const mergeCopy = (copy?: WelcomeCopyInput): WelcomeCopy => ({
  ...DEFAULT_COPY,
  ...copy,
  pillars: copy?.pillars ?? DEFAULT_COPY.pillars,
});

type WelcomeScreenProps = {
  copy?: WelcomeCopyInput;
  onGetStarted?: () => void;
  onContinueWithGoogle?: () => void;
  onLogin?: () => void;
  onBrowseGuest?: () => void;
  onTerms?: () => void;
};

export function WelcomeScreen({
  copy: copyInput,
  onGetStarted,
  onContinueWithGoogle,
  onLogin,
  onBrowseGuest,
  onTerms,
}: WelcomeScreenProps) {
  const copy = mergeCopy(copyInput);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root} testID="screen.welcome">
      <LinearGradient colors={[c.teal, c.forest]} style={styles.hero}>
        {/* Decoration only — hidden from screen readers, which would otherwise announce
            three unnamed images before the person reaches anything they can act on. */}
        <Image
          source={paw}
          resizeMode="contain"
          tintColor={c.white}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[styles.decorPaw, styles.decorPawA]}
        />
        <Image
          source={paw}
          resizeMode="contain"
          tintColor={c.white}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[styles.decorPaw, styles.decorPawB]}
        />

        <View style={[styles.heroInner, { paddingTop: insets.top + 28 }]}>
          <View style={styles.logoCard}>
            <Image source={logo} resizeMode="contain" style={styles.logoImage} />
          </View>

          {/* accessibilityRole="header" gives a screen reader a landmark to jump to — US-W1
              is about navigability, and a hero with no header is a wall of flat text. */}
          <Text style={styles.tagline} accessibilityRole="header">
            {copy.tagline}
          </Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>

          <View style={styles.pillarRow}>
            {copy.pillars.map((label, i) => (
              <View key={label} style={styles.pillarItem}>
                {i > 0 ? <View style={styles.pillarDot} /> : null}
                <Text style={styles.pillarText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      {/* The action sheet. `gap` is what keeps the controls apart — see the header on why
          spacing, not hitSlop, is what makes a stack of controls pressable. */}
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <TouchableOpacity
          testID="btn.welcome.getStarted"
          activeOpacity={0.85}
          onPress={onGetStarted}
          accessibilityRole="button"
          accessibilityLabel={copy.getStarted}
          style={styles.primaryWrap}
        >
          <LinearGradient colors={["#238383", c.tealDk]} style={styles.primary}>
            <Text style={styles.primaryText}>{copy.getStarted}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* White fill + soft shadow, deliberately NO border: in V2 the shadow is what says
            "raised and tappable", and a stroke here reads as the old V1 language. */}
        <TouchableOpacity
          testID="btn.welcome.google"
          activeOpacity={0.85}
          onPress={onContinueWithGoogle}
          accessibilityRole="button"
          accessibilityLabel={copy.continueWithGoogle}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>{copy.continueWithGoogle}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="btn.welcome.guest"
          activeOpacity={0.75}
          onPress={onBrowseGuest}
          hitSlop={TAP_SLOP}
          accessibilityRole="button"
          accessibilityLabel={copy.browseGuest}
          style={styles.guest}
        >
          <Text style={styles.guestText}>{copy.browseGuest}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="btn.welcome.login"
          activeOpacity={0.75}
          onPress={onLogin}
          hitSlop={TAP_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Already have an account? Log in"
          style={styles.link}
        >
          <Text style={styles.linkText}>{copy.login}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="btn.welcome.terms"
          activeOpacity={0.75}
          onPress={onTerms}
          hitSlop={TAP_SLOP}
          accessibilityRole="link"
          accessibilityLabel="Read our Terms and Privacy Policy"
          style={styles.termsPressable}
        >
          <Text style={styles.termsText}>{copy.terms}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  // ── hero ──────────────────────────────────────────────────────────────────────────
  // `flex: 1` rather than a fixed 760/1170 slice: the sheet below sizes itself from its
  // content, and the hero takes what is left. On a small phone the hero gives way; on a
  // tall one it grows. Neither case needs a new constant.
  hero: { flex: 1, overflow: "hidden" },
  heroInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
    paddingBottom: 36,
    gap: 14,
  },
  decorPaw: { position: "absolute", opacity: 0.07 },
  decorPawA: { left: -18, top: "18%", width: 150, height: 150, transform: [{ rotate: "-18deg" }] },
  decorPawB: { right: -26, top: "52%", width: 128, height: 128, transform: [{ rotate: "14deg" }] },

  logoCard: {
    // ⚠️ `flexShrink` + `aspectRatio`, not a fixed 168 square. The action sheet below sizes
    // itself from its content (~356 pt), so on a short device — an SE, or any phone once
    // dynamic type grows the labels — a rigid logo pushes the hero past its bounds and the
    // tagline is what gets clipped. Shrinking the decoration is always the right trade
    // against clipping the words. This is the same claim the header makes about the old
    // absolute layout, so it had better be true of the new one.
    height: 168,
    aspectRatio: 1,
    flexShrink: 1,
    borderRadius: 42,          // squircle, per the V2 language — not a circle
    backgroundColor: c.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#0B1F2A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  logoImage: { width: "78%", height: "78%" },

  // 30/800 with tight tracking is the V2 screen-title scale. The tagline is the headline
  // here, so it carries the weight and the subtitle stays quiet underneath it.
  tagline: {
    color: c.white,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    color: c.onHeroSoft,
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 320,
  },

  pillarRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  pillarItem: { flexDirection: "row", alignItems: "center" },
  pillarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.onHeroSoft,
    opacity: 0.7,
    marginHorizontal: 14,
  },
  pillarText: {
    color: c.onHero,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── action sheet ──────────────────────────────────────────────────────────────────
  sheet: {
    backgroundColor: c.bg,
    paddingHorizontal: 30,
    paddingTop: 26,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,            // laps over the gradient, so the sheet reads as lifted
    gap: 12,
  },

  primaryWrap: {
    borderRadius: 30,
    shadowColor: "#12213A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
    elevation: 3,
  },
  primary: {
    height: 60,
    borderRadius: 30,          // rx = half the height: a true pill
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: c.white, fontSize: 20, lineHeight: 26, fontWeight: "700" },

  secondary: {
    height: 58,
    borderRadius: 29,
    backgroundColor: c.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#12213A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2,
  },
  secondaryText: { color: c.ink, fontSize: 17, lineHeight: 22, fontWeight: "700" },

  // Prominent by colour and weight rather than by a third box — and with an explicit
  // 48 pt target, which is the part the old 18 pt text link never had.
  guest: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  guestText: { color: c.tealDk, fontSize: 17, lineHeight: 22, fontWeight: "700" },

  link: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  linkText: { color: c.muted, fontSize: 15, lineHeight: 20, textAlign: "center" },

  termsPressable: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  termsText: { color: c.fine, fontSize: 13, lineHeight: 18, textAlign: "center" },
});
