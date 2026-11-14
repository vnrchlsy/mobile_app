import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Image, StyleSheet, View } from "react-native";

import { colors, motion } from "../theme";

// The same image the native launch screen shows (app.config.ts `splash`), so the hand-off from
// the OS splash to this one is invisible: same picture, same place, same white ground.
const LOGO = require("../../assets/splash.png");

const TRACK_WIDTH = 160;
const THUMB_WIDTH = 56;
const SWEEP_MS = 1400;

/**
 * The in-app launch screen. Shown while AuthProvider restores the saved session from
 * SecureStore, which is the only real wait on a cold start.
 *
 * The bar is indeterminate on purpose: the app cannot know how long the restore takes, so it
 * sweeps back and forth rather than claiming a percentage it has not measured. With Reduce
 * Motion on, the thumb sits still in the middle of the track instead of sweeping.
 */
export function BootSplash() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (mounted) setReduceMotion(on);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: SWEEP_MS,
          easing: motion.easing,
          useNativeDriver: true,
        }),
        Animated.timing(sweep, {
          toValue: 0,
          duration: SWEEP_MS,
          easing: motion.easing,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, sweep]);

  const travel = TRACK_WIDTH - THUMB_WIDTH;
  const translateX = reduceMotion
    ? travel / 2
    : sweep.interpolate({ inputRange: [0, 1], outputRange: [0, travel] });

  return (
    <View
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading Kupkop PH"
      accessibilityState={{ busy: true }}
    >
      <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      <View style={styles.track}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    ...StyleSheet.absoluteFillObject,
  },
  track: {
    position: "absolute",
    bottom: "14%",
    width: TRACK_WIDTH,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  thumb: {
    width: THUMB_WIDTH,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal,
  },
});
