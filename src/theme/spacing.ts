// Spacing scale for padding/margin/gap. Every screen's padding/margin/gap value snaps to
// the nearest step here (see docs/superpowers/plans/2026-08-04-shared-style-system.md
// Migration Protocol) — deliberate consistency over preserving every one-off pixel value
// from the original design export.
export const spacing = {
  s2: 2,
  s4: 4,
  s8: 8,
  s12: 12,
  s16: 16,
  s20: 20,
  s24: 24,
  s28: 28,
  s32: 32,
  s40: 40,
  s48: 48,
  s56: 56,
  s64: 64,
  s80: 80,
  s96: 96
} as const;
