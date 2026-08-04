// Single source of truth for every color used in src/screens and src/components.
// Consolidated from the hex literals that were previously duplicated across ~20 files'
// local `colors`/`authColors` objects, including several near-identical teal/ink variants
// (#1C7876/#1C6B6B/#12524C/#14504F/#126B69/#08716D all collapsed into teal/tealDark).
export const colors = {
  // Text / ink
  ink: "#1F3A5F",
  inkStrong: "#12213A",
  muted: "#5F5E5A",

  // Brand teal
  teal: "#1C6B6B",
  tealDark: "#14504F",
  tealTint: "#E7F0EE",

  // Neutral surfaces
  white: "#FFFFFF",
  page: "#F4F5F2",
  border: "#E3E1D9",
  inactive: "#C9CEC7",
  neutralMuted: "#9A988F",
  neutralTint: "#EDECE7",

  // Status: success
  success: "#2E5B1E",
  successAccent: "#5B8A3A",
  successTint: "#DCEED0",

  // Status: danger
  danger: "#B3261E",
  dangerText: "#8A3A33",
  dangerTint: "#FBE4E1",

  // Status: warning
  warning: "#7A5310",
  warningTint: "#FBE9CF"
} as const;
