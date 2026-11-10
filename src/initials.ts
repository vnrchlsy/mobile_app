/** Stories review step 13 (ST17) · the one place a name becomes avatar initials: the first letter of the first two words, upper-case, and "?" for nothing. */
export function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}
