import { ReactNode, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors, gradients, motion, radii, typography } from "../../theme";
import { GlassSurface } from "../GlassSurface";
import { PressScale } from "./PressScale";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useReducedMotion } from "../../useReducedMotion";

export type TabBarItem = {
  /** Identity within the bar; compared against `active`. */
  key: string;
  label: string;
  /** ⚠️ The e2e contract. Six of these are asserted by flows in `e2e/flows/` — see tabBar.test.ts. */
  testID: string;
  icon: (color: string, size: number) => ReactNode;
  onPress: () => void;
};

/**
 * The bar's own geometry, exported because two other things depend on it and must not
 * re-guess it: `spacing.tabBarClearance` (how far a ScrollView pads so content is not trapped
 * behind the bar) and `__tests__/tabBar.test.ts` (the 44 pt arithmetic).
 */
export const TAB_BAR = {
  height: 68,
  /** Distance from the bottom of the screen to the bottom of the bar. */
  inset: 16,
  /** Horizontal inset on each side — the bar is detached, not edge-to-edge. */
  gutter: 16,
  radius: 26,
  /** 23, not 24 — every tab icon in Main.dc.html is drawn `<svg width="23" height="23">`. */
  iconSize: 23
} as const;

/**
 * The one bottom tab bar. Owner, shelter and guest shells all render this.
 *
 * ⚠️ THEY USED TO RENDER THREE, each with a private colour table, and that is the whole reason
 * this component exists. The inactive icon was #C9CEC7 — 1.60:1, against WCAG 1.4.11's 3:1 for
 * non-text content that conveys meaning. It was fixed once, in one of the three files, and the
 * other two kept their own pale grey. The colours here come from the theme and nowhere else, so
 * there is no longer a copy to fix separately. See `__tests__/tabBarContrast.test.ts`, which
 * asserts on the TOKENS rather than on any bar's copy of them.
 *
 * ⚠️ Contrast is measured against the GLASS COMPOSITE, not white. The bar is translucent over
 * the mesh backdrop, whose strongest colour was deliberately placed underneath it
 * (gen-backdrop.mjs: "held BELOW y=0.90 so it sits behind the floating tab bar"). Re-derived
 * from that generator's own blob parameters, the darkest point under the bar is #889691; glass
 * at 0.72 over it composites to #DEE1E0, on which `tabInactive` is 4.94:1. That is the number
 * that matters, and it is not the 6.49:1 the icon scores on white.
 */
export function TabBar({ items, active }: { items: TabBarItem[]; active: string }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [barWidth, setBarWidth] = useState(0);
  const index = Math.max(0, items.findIndex((item) => item.key === active));
  const slot = barWidth ? barWidth / items.length : 0;
  const x = useRef(new Animated.Value(index * slot)).current;

  /**
   * ⚠️ ONE PILL THAT TRAVELS, not one pill per tab appearing and disappearing.
   *
   * The canvas's Motion panel names this exactly — "Sliding thumb, tab pill · --dur-slow ·
   * 420ms" — and it is the difference between a bar that feels connected and one that blinks.
   * It also means the pill has to live OUTSIDE the items, because a child cannot travel past
   * its parent's bounds.
   *
   * The slide is skipped until the bar has been measured (`slot` is 0 on the first paint, so
   * there is nothing meaningful to animate to) and whenever Reduce Motion is on, where the
   * pill jumps straight to the selected tab instead.
   */
  useEffect(() => {
    if (!slot) return;
    if (reduced) {
      x.setValue(index * slot);
      return;
    }
    Animated.timing(x, {
      toValue: index * slot,
      duration: motion.durationSlow,
      easing: motion.easing,
      useNativeDriver: true
    }).start();
  }, [index, slot, reduced, x]);

  return (
    /**
     * ⚠️ `insets.bottom`, NOT A FIXED 16 — AND A REAL THUMB IS WHAT SETTLED IT.
     *
     * The bar shipped at a flat `bottom: 16`, which puts its lower third inside the 34 pt
     * home-indicator zone on every notched iPhone. Nothing measured it: it is not a contrast
     * figure, not a touch-target size, and every screenshot looked correct because the
     * indicator is drawn by the OS on top and simply does not appear in a capture. It was
     * flagged as the first thing to judge on the device walk (US-PF3) and came back confirmed
     * — the system's swipe-up was winning taps meant for the tabs.
     *
     * `Math.max` rather than a sum: on a device with no indicator the inset is 0, and the bar
     * should still float clear of the edge by the designed 16.
     */
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, TAB_BAR.inset) }]} pointerEvents="box-none">
      <GlassSurface raise="float" radius={TAB_BAR.radius} style={styles.bar}>
        <View style={StyleSheet.absoluteFill} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)} pointerEvents="none">
          {slot ? (
            <Animated.View style={[styles.pillTrack, { width: slot, transform: [{ translateX: x }] }]}>
              <LinearGradient colors={gradients.activeTab} style={styles.activePill} />
            </Animated.View>
          ) : null}
        </View>
        {items.map((item) => {
          const isActive = item.key === active;
          const color = isActive ? colors.teal : colors.tabInactive;
          return (
            <PressScale
              key={item.key}
              testID={item.testID}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              // A screen-reader user needs to know WHICH tab they are on, not just
              // which ones exist — selected state is half of what a tab bar means.
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                if (isActive) return;
                item.onPress();
              }}
            >
              <View style={styles.iconSlot}>{item.icon(color, TAB_BAR.iconSize)}</View>
              {/* numberOfLines guards the five-tab shelter bar on the narrowest supported
                  screen: 375 - 32 gutters = 343, and 343/5 = 68.6 pt per item. "Requests" fits,
                  but it is the longest label in the app and has the least room. */}
              <Text numberOfLines={1} style={[styles.tabText, isActive && styles.activeTabText]}>
                {item.label}
              </Text>
            </PressScale>
          );
        })}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: TAB_BAR.gutter,
    right: TAB_BAR.gutter
    // `bottom` is set at render time from the safe-area inset — see the note at the call site.
  },
  bar: {
    // 68 rather than 84: the active pill carries the emphasis, so the bar can be shorter and
    // sit closer to the edge. Every item is `height: "100%"` of this, so the 44 pt minimum
    // target is satisfied by the bar's own height and cannot drift item by item.
    height: TAB_BAR.height,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden"
  },
  tabItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  /** The travelling track: one item wide, moved by translateX. */
  pillTrack: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0
  },
  activePill: {
    // Behind the icon AND its label, rather than a chip behind the icon alone — the whole tab
    // reads as one selected control instead of two halves that only half agree.
    //
    // Geometry is the canvas's: `top: 5px; left: 3.5px; height: 56px; border-radius: 20px`
    // on a 68 pt bar, so the bottom inset is 68 − 5 − 56 = 7. It was 6/6, which kept the
    // 56 pt height but sat the pill a point low.
    position: "absolute",
    left: 3.5,
    right: 3.5,
    top: 5,
    bottom: 7,
    borderRadius: radii.field
  },
  iconSlot: {
    alignItems: "center",
    justifyContent: "center"
  },
  tabText: {
    marginTop: 4,
    color: colors.tabInactive,
    // ⚠️ THE CANVAS'S OWN VALUES, AND DELIBERATELY NOT A RAMP STEP. Main.dc.html draws this
    // exact span as `font-size: 11px; letter-spacing: .1px; font-weight: {{tab.weight}}`,
    // and `{{tab.weight}}` resolves to `on ? "800" : "600"` — which is what the pair below
    // already did. T2's size table maps 12 -> meta (13); following it would have moved the
    // label further from the design, so it was held back then and corrected to 11 here.
    //
    // For a while it fit no step: `label` is 11 but uppercase, 800 and +0.8 tracking, while
    // this is sentence case at +0.1 with a weight that changes on selection. Library #12
    // declared the eleven the artboards draw — "Caption, tab label, badge | 11 / 600-800" —
    // and `caption` is its size; the tracking and the switching weight are still the
    // canvas's own values, named here.
    ...typography.caption,
    letterSpacing: 0.1,
    fontWeight: "600"
  },
  activeTabText: {
    color: colors.tealDark,
    fontWeight: "800"
  }
});
