// V3 visual language — the depth, gradient and glass tokens the app did not have.
//
// SCOPE, deliberately narrow: this does NOT consolidate the palette. Every screen keeps its
// own local `colors` const and its existing hexes; a separate in-flight refactor
// (refactor/shared-style-system) owns that consolidation, and duplicating it here would
// guarantee a conflict. What lives here is only what V3 ADDS — the values no screen had.
//
// Every colour below is already in the design source (screens/user/gen-screens.js); nothing
// new is invented.
import { ViewStyle } from "react-native";

/** The shadow navy the whole app casts depth in — matches OwnerTabs' existing shadowColor. */
const CAST = "#1F3A5F";

export const v3Colors = {
  /** Deepest brand tone — far end of the hero gradient. */
  forest: "#11241F",
  /** Hero gradient mid-stop. Without it the fade is visibly linear and reads as an overlay. */
  tealMid: "#164F4C",
  /** Light end of the button gradient. */
  tealBright: "#238383",

  // Translucent chrome. React Native has no backdrop-filter, and expo-blur is not a dependency
  // here, so floating chrome is a translucent panel over the mesh backdrop rather than a true
  // frosted blur. The backdrop is a soft gradient with no fine detail, so the two read almost
  // alike — and the scroll-fade already keeps sharp card text from reaching the bar.
  glass: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.85)",
  glassOnDark: "rgba(255,255,255,0.16)",
  glassOnDarkBorder: "rgba(255,255,255,0.28)"
} as const;

type Elevation = Pick<
  ViewStyle,
  "shadowColor" | "shadowOffset" | "shadowOpacity" | "shadowRadius" | "elevation"
>;

/**
 * Three depth steps.
 *
 * The design canvas layers TWO shadows per surface — a 1px contact shadow under a wide ambient
 * one — which is what stops a card reading as a flat rectangle. React Native gives a View one
 * shadow on iOS and a single `elevation` on Android, so the pair cannot be reproduced without
 * wrapping every card in a second View. Not worth that: the ambient layer carries nearly all of
 * the effect, so each step here is the ambient half and the contact half is dropped, not faked.
 */
export const elevation = {
  /** Inputs, chips, pills, small raised controls. */
  soft: {
    shadowColor: CAST,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  /** Content cards. */
  card: {
    shadowColor: CAST,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6
  },
  /** Floating chrome — the tab bar, sheets, anything content scrolls under. */
  float: {
    shadowColor: CAST,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 10
  }
} as const satisfies Record<string, Elevation>;

/** Gradient stops, ready for expo-linear-gradient's `colors` prop. */
export const gradients = {
  /** Primary buttons, vertical. */
  button: ["#238383", "#14504F"] as const,
  /** Hero surfaces, diagonal. Three stops — see tealMid above. */
  hero: ["#1C6B6B", v3Colors.tealMid, v3Colors.forest] as const,
  /** Destructive buttons. */
  danger: ["#C94A44", "#9E322D"] as const,
  /** Tinted pill behind an active tab. */
  activeTab: ["#EAF3F2", "#DCEAE8"] as const
} as const;

/** Diagonal start/end for `hero`, approximating the canvas's 146deg. */
export const heroDirection = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } as const;
