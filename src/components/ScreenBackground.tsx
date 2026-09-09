import { ReactNode } from "react";
import { Image, ImageBackground, ImageSourcePropType, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

const meshLight = require("../../assets/mesh-light.jpg") as ImageSourcePropType;
const meshDeep = require("../../assets/mesh-deep.jpg") as ImageSourcePropType;

type ScreenBackgroundProps = {
  children: ReactNode;
  /** "light" is the app ground; "deep" is the dark brand field behind hero surfaces. */
  tone?: "light" | "deep";
  style?: StyleProp<ViewStyle>;
};

/**
 * The ambient backdrop behind a screen.
 *
 * It exists because the floating chrome is translucent rather than blurred: a translucent panel
 * over a FLAT page colour just looks like a paler rectangle — it needs structure underneath to
 * read as a surface at all.
 *
 * The asset is deliberately a soft gradient with no fine detail, which is also why the missing
 * blur costs so little: there is nothing in it a blur would smear. Its teal sits below y≈0.90
 * so it lands behind the tab bar and never under body copy — measured against it, the worst
 * text contrast anywhere is 4.6:1 (ink 11.9, muted 4.8, teal 4.6). Regenerate with
 * design/mobile-v3/gen-backdrop.mjs, which is seeded and reproducible.
 */
export function ScreenBackground({ children, tone = "light", style }: ScreenBackgroundProps) {
  return (
    <ImageBackground
      source={tone === "deep" ? meshDeep : meshLight}
      resizeMode="cover"
      // The fill shows for the frame before the asset decodes, and anywhere it declines to
      // draw — never leave the screen transparent behind the image.
      style={[styles.fill, tone === "deep" ? styles.deepFill : styles.lightFill, style]}
    >
      <View style={styles.fill}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // NOT flex: 1 — an Image carries an intrinsic size, so flex leaves it at the asset's own
  // 390 pt width and a bare strip shows down the right edge of any wider device (caught on a
  // 402 pt iPhone 17). Pinning all four edges is what makes resizeMode "cover" actually cover.
  stretch: { width: "100%", height: "100%" },
  lightFill: { backgroundColor: "#F4F5F2" },
  deepFill: { backgroundColor: "#164F4C" }
});

/**
 * The same backdrop as a drop-in LAYER, for a screen that already has its own root View.
 *
 * Preferred over wrapping an existing screen: it is a single added child, so the root element,
 * its `testID` and the whole JSX shape stay exactly as they were — which matters here because
 * e2eSelectors.test.ts asserts on those testIDs. Pair it with `backgroundColor: "transparent"`
 * on the screen's own root style, or the flat page colour paints straight over it.
 */
export function ScreenBackdrop({ tone = "light" }: { tone?: "light" | "deep" }) {
  return (
    // pointerEvents lives on the wrapping View: an absolutely-filled Image would otherwise
    // sit over the whole screen and swallow every touch beneath it.
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={tone === "deep" ? meshDeep : meshLight} resizeMode="cover" style={styles.stretch} />
    </View>
  );
}
