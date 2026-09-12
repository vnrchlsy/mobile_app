// The type ramp. Nine steps.
//
// ⚠️ SEVEN OF THE EIGHT lineHeights WERE THIS FILE'S OWN, NOT THE DESIGN'S — and they are gone.
// The approved canvas (design/mobile-v3/Components.dc.html, "Type ramp") labels its steps
// "27 / 800 / -0.6", "25 / 800 / -0.5" and so on: size, weight, letter-spacing. Exactly ONE
// step names a line height — body, "15 / 400 / 21" — and that one stays.
//
// The other seven were invented here. Keeping them would have made "adopt the ramp" mean
// "adopt this file's line spacing", which the design never asked for: 719 of the app's 839
// text styles set no lineHeight at all, so spreading a token would have opened up line
// spacing across every screen on a value nobody designed. The design source wins over the
// token — the same rule colors.ts applied to #E7F0EF when the app outvoted it 37 to 10.
//
// ⚠️ TWO STEPS DECLARE A WEIGHT RANGE, AND THE TOKEN MUST NOT COLLAPSE IT. The panel reads
// "Card title, button, field | 17 / 700-800" and "Meta, helper, chip | 13 / 400-800" — a
// range, not a value, and no tracking on either. This file had pinned 17 to 700 (plus a
// letter-spacing of -0.2 the panel never names) and 13 to 400. Both pinned the weight the app
// uses LEAST: at 13pt the screens run 800x44, 700x39, 400x25, and at 17pt 800x24 against
// 700x6. Spreading those tokens would have de-bolded ~170 sites in the name of conformance.
//
// So `subtitle`, `meta` and `strong` carry size only, and the caller supplies fontWeight:
//     { ...typography.meta, fontWeight: "800" }
// which is the range the canvas declares, expressed honestly. The other six steps name one
// weight because the panel names one.
//
// ⚠️ `strong` IS THE NINTH STEP, AND THE ARTBOARDS ASKED FOR IT BEFORE THE PANEL DID. The
// panel declared one fifteen — body, 400 / 21 — while the artboards on the same canvas drew
// fifteen at 700 or 800 nine times across four of them, and the app built to those artboards
// held 93 such sites: "the bold fifteen" that every conformance track since T2 counted and
// declined to disguise as body. The panel now names it, "Label, small button | 15 / 700-800",
// and this step is the token for it. Body keeps its line height; strong names none, so a
// label stays on RN's default leading exactly as it rendered before it was bound.
//
// ⚠️ THIS IS A DESIGNED RAMP, NOT A MEASURED ONE, and that is the point. `pnpm surface`-style
// counting finds 29 distinct fontSize values in src/**/*.tsx (9 through 54, including 12.5,
// 13.5, 14.5, 15.5 and 16.5). Cataloguing those as tokens would preserve the drift under
// nicer names — which is exactly what the retired shared-style-system branch did, naming one
// style per size/weight combination it happened to find.
//
// So these eight are a target. Screens move onto them in Tracks AU / SG / AD; this file
// converts nothing on its own.
//
// Migration mapping from what is there today:
//   30, 28, 27      -> display (27)
//   26, 25, 24      -> hero (25)
//   23, 22, 21      -> title (21)
//   20, 19, 18      -> section (19)
//   17, 16.5, 16    -> subtitle (17)
//   15.5, 15, 14.5  -> body (15) at 400 with a line height; strong (15) at 700-800 without
//   14, 13.5, 13, 12.5, 12 -> meta (13)
//   11, 10, 9       -> label (11)
import { TextStyle } from "react-native";

type Style = Pick<TextStyle, "fontSize" | "fontWeight" | "letterSpacing" | "lineHeight">;

export const typography = {
  /** Screen titles. */
  display: { fontSize: 27, fontWeight: "800", letterSpacing: -0.6 },
  /** The one prominent line on a hero surface. */
  hero: { fontSize: 25, fontWeight: "800", letterSpacing: -0.5 },
  /** A subject's name — a pet, a shelter, a person. */
  title: { fontSize: 21, fontWeight: "800", letterSpacing: -0.4 },
  /** Section headings within a screen. */
  section: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  /** Card titles, button labels, field values. Weight is the caller's — see the range note. */
  subtitle: { fontSize: 17 },
  /** Body copy. */
  body: { fontSize: 15, fontWeight: "400", lineHeight: 21 },
  /** Labels and small buttons at fifteen. Weight is the caller's, 700 or 800 — see the note. */
  strong: { fontSize: 15 },
  /** Metadata, helper text, chip labels. Weight is the caller's — see the range note. */
  meta: { fontSize: 13 },
  /** Field labels and tab labels. Uppercase where used as a field label. */
  /**
   * Captions, tab labels, badges at eleven. Weight is the caller's, 600–800 — the artboards
   * draw the muted caption at 600 and a badge at 800, and never an eleven at 400. Library #12
   * added the row the artboards were already using; `label` below is the uppercase field
   * label with its tracking, a different element at the same size.
   */
  caption: { fontSize: 11 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }
} as const satisfies Record<string, Style>;

export type TypeToken = keyof typeof typography;
