// Named text styles, one per fontSize/fontWeight combination actually found in
// src/screens and src/components — not an invented scale. Naming: heading (size >= 18,
// weight >= 700), label (size < 18, weight >= 600), body (weight 400), micro (size <= 10).
export const typography = {
  heading900_28: { fontSize: 28, fontWeight: "900" },
  heading800_28: { fontSize: 28, fontWeight: "800" },
  heading800_26: { fontSize: 26, fontWeight: "800" },
  heading700_26: { fontSize: 26, fontWeight: "700" },
  heading800_24: { fontSize: 24, fontWeight: "800" },
  heading900_23: { fontSize: 23, fontWeight: "900" },
  heading800_23: { fontSize: 23, fontWeight: "800" },
  heading800_22: { fontSize: 22, fontWeight: "800" },
  heading800_20: { fontSize: 20, fontWeight: "800" },
  heading800_19: { fontSize: 19, fontWeight: "800" },
  heading800_18: { fontSize: 18, fontWeight: "800" },
  heading800_17: { fontSize: 17, fontWeight: "800" },
  heading700_17: { fontSize: 17, fontWeight: "700" },

  label800_16: { fontSize: 16, fontWeight: "800" },
  label800_15: { fontSize: 15, fontWeight: "800" },
  label700_15: { fontSize: 15, fontWeight: "700" },
  label800_14: { fontSize: 14, fontWeight: "800" },
  label600_14: { fontSize: 14, fontWeight: "600" },
  label800_13: { fontSize: 13, fontWeight: "800" },
  label700_13: { fontSize: 13, fontWeight: "700" },
  label800_12: { fontSize: 12, fontWeight: "800" },
  label700_12: { fontSize: 12, fontWeight: "700" },
  label600_12: { fontSize: 12, fontWeight: "600" },

  body14: { fontSize: 14, fontWeight: "400" },
  body13: { fontSize: 13, fontWeight: "400" },
  body12: { fontSize: 12, fontWeight: "400" },
  body11: { fontSize: 11, fontWeight: "400" },
  body10: { fontSize: 10, fontWeight: "400" },

  micro900_9: { fontSize: 9, fontWeight: "900" }
} as const;
