// Border-radius scale. Same snapping rule as spacing, EXCEPT a borderRadius that makes an
// element a circle/pill (~half its width/height) must stay a literal value tied to that
// element's size — never snapped to this scale. See Migration Protocol, step 3.
export const radii = {
  r2: 2,
  r4: 4,
  r8: 8,
  r12: 12,
  r16: 16,
  r20: 20,
  r24: 24,
  r32: 32,
  r48: 48
} as const;
