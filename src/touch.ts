// §13.4 / the design system's own non-negotiable list · 44 pt minimum touch targets.
//
// A bare <Text> inside a TouchableOpacity is exactly as tall as its line — 17 to 21 pt for
// the sizes this app uses. The 2026-09-04 device walk found that out the direct way: "Browse
// as a guest" took four attempts, and Home's "See nearby strays" registered at y=344 and
// missed at y=349. Nothing looked wrong; the control simply was not there to press.
//
// `hitSlop` is the right instrument for an isolated link: it grows the touch area WITHOUT
// moving anything, so a designed layout keeps its spacing.
//
// ⚠️ IT IS THE WRONG INSTRUMENT FOR A TIGHT STACK. Slop is invisible and does not push
// neighbours apart, so two links 27 pt apart with 12 pt of slop each end up with OVERLAPPING
// hit areas — and the topmost sibling silently wins every contested tap. That turns "hard to
// press" into "presses the wrong thing", which is worse. Where controls are stacked closer
// than 44 pt, fix the SPACING (see WelcomeScreen), not the slop.
export const TAP_SLOP = { top: 12, bottom: 12, left: 8, right: 8 } as const;
