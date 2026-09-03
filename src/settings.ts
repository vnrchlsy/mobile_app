// US-N5 · pure helpers for the settings / data-rights surfaces. Kept out of the screens so
// the rules that matter (what counts as a confirmation, how a refusal is worded) are
// testable without rendering anything.

export type Settings = {
  marketing_emails: boolean;
  approximate_location: boolean;
  masked_contact: boolean;
  push_enabled: boolean;
  analytics_consent: boolean;
  analytics_consent_at: string | null;
};

// The server's 409 body: every commitment standing between the user and deletion.
export type Blocker = { kind: string; label: string; detail?: string; id: string };

export const CONFIRM_WORD = "DELETE";

/**
 * Does the typed text confirm the deletion?
 *
 * Trimmed and case-insensitive on purpose. The point of a typed confirmation is to prove
 * deliberate intent, not to test typing accuracy — and a mobile keyboard's autocapitalise
 * and trailing space would otherwise reject a person who did exactly what was asked.
 */
export function confirmationMatches(typed: string): boolean {
  return typed.trim().toUpperCase() === CONFIRM_WORD;
}

/**
 * Screen copy for one blocker. The server sends a `kind` and its own label; the client owns
 * the sentence that says WHAT TO DO, because that is navigation advice, not data.
 *
 * An unknown kind still renders — a future commitment type must degrade to the server's own
 * label rather than vanishing, since a blocker the user cannot see is a dead end.
 */
export function blockerCopy(blocker: Blocker): { title: string; action: string } {
  switch (blocker.kind) {
    case "rescue_claim":
      return { title: blocker.label, action: "Resolve or hand over this rescue" };
    case "volunteer_shift":
      return { title: blocker.label, action: "Cancel the shift so the shelter can refill it" };
    case "adoption_inquiry":
      return { title: blocker.label, action: "Finish or decline this inquiry" };
    default:
      return { title: blocker.label || "Open commitment", action: "Close this first" };
  }
}

/**
 * The headline over the blocker list. Counting them out loud is the difference between
 * "something is wrong" and "two things, here they are".
 */
export function blockerHeadline(count: number): string {
  if (count === 1) return "One thing needs closing first";
  return `${count} things need closing first`;
}

/**
 * The value shown beside "Privacy controls" on the settings list. Location is always
 * city-only (§12.5 stores a city, never coordinates), so this states a fact rather than
 * reflecting a toggle — it is the one-word version of the ALWAYS ON card.
 */
export function privacySummary(): string {
  return "City-only";
}

/**
 * Rows for the privacy screen, split into the ones that are real switches and the ones that
 * are facts.
 *
 * D-S7-3 and the design system's rule: never ship a toggle that does nothing.
 * `masked_contact` describes Phase-2 chat and `approximate_location` is enforced
 * server-side regardless, so neither is a control the user actually holds. Rendering them
 * as switches would be theatre, and theatre on the privacy screen is a broken promise.
 */
export function privacyRows(settings: Settings) {
  return {
    toggles: [
      {
        key: "push_enabled" as const,
        label: "Push notifications",
        note: "Rescue updates, matches, and requests.",
        value: settings.push_enabled,
      },
      {
        key: "marketing_emails" as const,
        label: "Marketing emails",
        note: "News and campaigns. Off unless you ask.",
        value: settings.marketing_emails,
      },
      {
        key: "analytics_consent" as const,
        label: "Help improve Kupkop",
        note: "Anonymous usage only — never your pets, reports, or the people you talk to.",
        value: settings.analytics_consent,
      },
    ],
    facts: [
      {
        label: "Your location is city-only",
        note: "We never store your exact address or coordinates — only the city you pick.",
      },
      {
        label: "Your number stays hidden",
        note: "Shared only with a shelter you sign up to volunteer for, and only for that shift.",
      },
    ],
  };
}

/** Filename for the saved export, matching the server's `Content-Disposition`. */
export function exportFilename(now: Date = new Date()): string {
  return `kupkop-export-${now.toISOString().slice(0, 10)}.json`;
}

/** Human size for the export card. Bytes are meaningless to a person at any real size. */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
