import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

const logo = require("../assets/kupkop-logo-trimmed.png") as ImageSourcePropType;
const paw = require("../assets/paw-white.png") as ImageSourcePropType;

const W = 540;
const H = 1170;
/**
 * §13.4 · one 44 pt tap slot, in this canvas's design units.
 *
 * `sy()` maps 1170 design units onto the screen height (874 pt on an iPhone 17 Pro), so
 * 44 pt is 44 / 874 * 1170 ≈ 59 units. The three links below sit in adjacent slots of this
 * size, which is why they moved down from the original 978 / 1014 / 1054.
 *
 * ⚠️ THEY COULD NOT BE FIXED WITH `hitSlop` LIKE EVERY OTHER LINK IN THE APP. They were
 * ~27 pt apart, so 12 pt of slop each way would make neighbouring hit areas OVERLAP, and
 * the topmost sibling silently wins a contested tap — turning "hard to press" into "presses
 * the wrong thing". During the device walk my own stray taps at the guest link landed on
 * Terms. Stacked controls need SPACING; slop only works when there is empty space to claim.
 */
const TAP_SLOT = 59;
const LINK_TOP = 966;                    // clears the Google button (ends at 890 + 68 = 958)

const BENEFIT_ROW_TOP_Y = [552, 608, 664];

type WelcomeCopy = {
  time: string;
  tagline: string;
  subtitle: string;
  benefits: string[];
  getStarted: string;
  continueWithGoogle: string;
  login: string;
  browseGuest: string;
  terms: string;
};

const DEFAULT_COPY: WelcomeCopy = {
  time: "9:41",
  tagline: "Kupkop. Kalinga. Kinabukasan.",
  subtitle: "The app made for Filipino fur parents.",
  benefits: [
    "Spot a stray? Help's a tap away.",
    "Meet your forever furry friend.",
    "Every peso reaches the shelter."
  ],
  getStarted: "Get started",
  continueWithGoogle: "Continue with Google",
  login: "Already have an account? Log in",
  browseGuest: "Browse as a guest",
  terms: "By continuing you agree to our Terms & Privacy."
};

type WelcomeCopyInput = Partial<Omit<WelcomeCopy, "benefits">> & {
  benefits?: string[];
};

const mergeCopy = (copy?: WelcomeCopyInput): WelcomeCopy => ({
  ...DEFAULT_COPY,
  ...copy,
  benefits: copy?.benefits ?? DEFAULT_COPY.benefits
});

const getBenefitRows = (benefits: string[]) =>
  benefits.map((label, index) => ({
    top:
      BENEFIT_ROW_TOP_Y[index] ??
      BENEFIT_ROW_TOP_Y[BENEFIT_ROW_TOP_Y.length - 1] + 56 * (index - BENEFIT_ROW_TOP_Y.length + 1),
    label
  }));

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
  onTerms
}: WelcomeScreenProps) {
  const copy = mergeCopy(copyInput);
  const benefits = getBenefitRows(copy.benefits);
  const [size, setSize] = useState({ width: 0, height: 0 });

  function onLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }

  const ready = size.width > 0 && size.height > 0;
  const sx = (value: number) => (ready ? (value / W) * size.width : value);
  const sy = (value: number) => (ready ? (value / H) * size.height : value);
  const s = (value: number) => (ready ? value * Math.min(size.width / W, size.height / H) : value);

  return (
    <View style={styles.root} onLayout={onLayout}>
      {ready && (
        <>
          <LinearGradient
            colors={["#1C6B6B", "#11241F"]}
            style={[styles.hero, { height: sy(760) }]}
          />

          <Text style={[styles.time, { left: sx(34), top: sy(38), fontSize: s(22), lineHeight: s(26) }]}>
            {copy.time}
          </Text>

          <View
            style={[
              styles.battery,
              { left: sx(470), top: sy(47), width: sx(40), height: sy(18), borderRadius: s(5) }
            ]}
          >
            <View style={[styles.batteryDot, { width: s(10), height: s(10), borderRadius: s(5) }]} />
            <View style={[styles.batteryDot, { width: s(10), height: s(10), borderRadius: s(5) }]} />
          </View>

          <Image
            source={paw}
            resizeMode="contain"
            tintColor="#D9F3EF"
            style={[
              styles.decorPaw,
              { left: sx(16), top: sy(200), width: sx(132), height: sx(132), transform: [{ rotate: "-18deg" }] }
            ]}
          />
          <Image
            source={paw}
            resizeMode="contain"
            tintColor="#D9F3EF"
            style={[
              styles.decorPaw,
              { left: sx(430), top: sy(150), width: sx(96), height: sx(96), transform: [{ rotate: "14deg" }] }
            ]}
          />
          <Image
            source={paw}
            resizeMode="contain"
            tintColor="#D9F3EF"
            style={[
              styles.decorPaw,
              { left: sx(410), top: sy(452), width: sx(120), height: sx(120), transform: [{ rotate: "8deg" }] }
            ]}
          />

          <View
            style={[
              styles.logoCard,
              {
                left: sx(133),
                top: sy(158),
                width: sx(274),
                height: sy(302),
                borderRadius: s(36)
              }
            ]}
          >
            <Image source={logo} resizeMode="contain" style={styles.logoImage} />
          </View>

          <Text
            style={[
              styles.tagline,
              { top: sy(470), width: size.width, fontSize: s(21), lineHeight: s(28) }
            ]}
          >
            {copy.tagline}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { top: sy(500), width: size.width, fontSize: s(19), lineHeight: s(27) }
            ]}
          >
            {copy.subtitle}
          </Text>

          {benefits.map((benefit) => (
            <View
              key={benefit.label}
              style={[
                styles.benefitRow,
                {
                  left: sx(55),
                  top: sy(benefit.top),
                  width: sx(452),
                  height: s(46)
                }
              ]}
            >
              <Image
                source={paw}
                resizeMode="contain"
                style={{ width: sx(38), height: sx(38), transform: [{ translateY: -s(4) }] }}
              />
              <Text
                style={[
                  styles.benefitText,
                  {
                    marginLeft: sx(23),
                    width: sx(390),
                    fontSize: s(21),
                    lineHeight: s(34)
                  }
                ]}
              >
                {benefit.label}
              </Text>
            </View>
          ))}

          <View style={[styles.actions, { top: sy(760), height: size.height - sy(760) }]} />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onGetStarted}
            style={[
              styles.primaryButton,
              {
                left: sx(34),
                top: sy(806),
                width: sx(472),
                height: sy(68),
                borderRadius: s(34)
              }
            ]}
          >
            <Text style={[styles.primaryText, { fontSize: s(24), lineHeight: s(30) }]}>{copy.getStarted}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onContinueWithGoogle}
            style={[
              styles.googleButton,
              {
                left: sx(34),
                top: sy(890),
                width: sx(472),
                height: sy(68),
                borderRadius: s(34)
              }
            ]}
          >
            <Text style={[styles.googleText, { fontSize: s(22), lineHeight: s(28) }]}>
              {copy.continueWithGoogle}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onLogin}
            style={[styles.loginPressable, { top: sy(LINK_TOP + 0 * TAP_SLOT), width: size.width }]}
          >
            <Text style={[styles.loginText, { fontSize: s(20), lineHeight: s(28) }]}>{copy.login}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onBrowseGuest}
            style={[styles.browseGuestPressable, { top: sy(LINK_TOP + 1 * TAP_SLOT), width: size.width }]}
          >
            <Text style={[styles.browseGuestText, { fontSize: s(18), lineHeight: s(24) }]}>{copy.browseGuest}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onTerms}
            style={[styles.termsPressable, { top: sy(LINK_TOP + 2 * TAP_SLOT), width: size.width }]}
          >
            <Text style={[styles.termsText, { fontSize: s(16), lineHeight: s(22) }]}>{copy.terms}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#F5F6F3"
  },
  hero: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0
  },
  time: {
    position: "absolute",
    color: "#FFFFFF",
    fontWeight: "800"
  },
  battery: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 7
  },
  batteryDot: {
    backgroundColor: "#FFFFFF"
  },
  logoCard: {
    position: "absolute",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  logoImage: {
    width: "82%",
    height: "82%"
  },
  tagline: {
    position: "absolute",
    left: 0,
    color: "#CFE6E2",
    textAlign: "center"
  },
  subtitle: {
    position: "absolute",
    left: 0,
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center"
  },
  benefitRow: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center"
  },
  benefitText: {
    color: "#EAF4F2"
  },
  actions: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#F5F6F3"
  },
  primaryButton: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1C7876"
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  googleButton: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E3E1D9",
    backgroundColor: "#FFFFFF"
  },
  googleText: {
    color: "#1F3A5F",
    fontWeight: "800"
  },
  loginPressable: {
    position: "absolute",
    left: 0,
    alignItems: "center",
    // The label alone is ~18 pt tall; the box is what makes it pressable.
    minHeight: 44,
    justifyContent: "center"
  },
  loginText: {
    color: "#5F5E5A",
    textAlign: "center"
  },
  browseGuestPressable: {
    position: "absolute",
    left: 0,
    alignItems: "center",
    // The label alone is ~18 pt tall; the box is what makes it pressable.
    minHeight: 44,
    justifyContent: "center"
  },
  browseGuestText: {
    color: "#1C7876",
    fontWeight: "800",
    textAlign: "center"
  },
  termsPressable: {
    position: "absolute",
    left: 0,
    alignItems: "center",
    // The label alone is ~18 pt tall; the box is what makes it pressable.
    minHeight: 44,
    justifyContent: "center"
  },
  termsText: {
    color: "#9A988F",
    textAlign: "center"
  },
  decorPaw: {
    position: "absolute",
    opacity: 0.1
  }
});
