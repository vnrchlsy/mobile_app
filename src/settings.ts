// US-N5 · pure helpers for the settings / data-rights surfaces. Kept out of the screens so
// the rules that matter (what counts as a confirmation, how a refusal is worded) are
// testable without rendering anything.
import type { OwnerTab } from "./components/OwnerTabs";
import type { RootStackParamList } from "./navigation/types";

// AS8 (backend#112) · `approximate_location` and `masked_contact` are no longer served: they
// changed nothing. The three switches below are the ones that do something.
export type Settings = {
  marketing_emails: boolean;
  /** NQ4 · "Everything else": updates on your own reports, adoptions, shifts and pledges, and account notices. */
  push_enabled: boolean;
  /** NQ4 · "Urgent rescues nearby". Absent from an older server, which has one push switch: the row is then not offered. */
  push_urgent_enabled?: boolean;
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
    case "hosted_shift":
      return { title: blocker.label, action: "Cancel this activity first — the volunteers will be told." };
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
export type ToggleKey = "push_urgent_enabled" | "push_enabled" | "marketing_emails" | "analytics_consent";
export type ToggleRowData = { key: ToggleKey; group: "notifications" | "analytics"; label: string; note: string; value: boolean };

export function privacyRows(settings: Settings): { toggles: ToggleRowData[]; facts: { label: string; note: string }[] } {
  const toggles: ToggleRowData[] = [];
  // NQ4 · two push switches. Offered only when the server has the second one; against an older server a toggle would do nothing.
  if (typeof settings.push_urgent_enabled === "boolean") {
    toggles.push({
      key: "push_urgent_enabled", group: "notifications",
      label: "Urgent rescues nearby",
      note: "Alerts when a stray near you needs help right away.",
      value: settings.push_urgent_enabled,
    });
  }
  toggles.push(
    {
      key: "push_enabled", group: "notifications",
      // With one switch this was "Push notifications"; with two, saying what is left is clearer than saying what it is not.
      label: typeof settings.push_urgent_enabled === "boolean" ? "Everything else" : "Push notifications",
      note: typeof settings.push_urgent_enabled === "boolean"
        ? "Updates on your reports, adoptions, shifts and pledges, and notices about your account."
        : "Rescue updates, matches, and requests.",
      value: settings.push_enabled,
    },
    {
      key: "marketing_emails", group: "notifications",
      label: "Marketing emails",
      note: "News and campaigns. Off unless you ask.",
      value: settings.marketing_emails,
    },
    {
      key: "analytics_consent", group: "analytics",
      label: "Help improve Kupkop",
      note: "Anonymous usage only — never your pets, reports, or the people you talk to.",
      value: settings.analytics_consent,
    },
  );
  return {
    toggles,
    facts: [
      {
        label: "Your location is city-only",
        note: "We never store your exact address or coordinates — only the city you pick.",
      },
      {
        // X9 · this used to say "shared only with a shelter you sign up to volunteer for", which was
        // untrue: a Sagip report, offer or claim shares contact on consent too.
        label: "Your number stays hidden",
        note: "It's shared only when you choose to — with a shelter you volunteer for, or with a rescuer on a report you share it on.",
      },
    ],
  };
}

/** Filename for the saved export, matching the server's `Content-Disposition`. */
export function exportFilename(now: Date = new Date()): string {
  return `kupkop-export-${now.toISOString().slice(0, 10)}.json`;
}

/** P1 · why the export failed. A timeout (status 0, code "timeout") is the build running long, not
 *  the phone being offline — saying "offline" sent people to check a connection that was fine. */
export function exportErrorMessage(res: { status: number; data?: any }): string {
  if (res.status === 0) {
    return res.data?.error?.code === "timeout"
      ? "Your export is taking longer than expected. Try again in a few minutes."
      : "You're offline — try again when you're connected.";
  }
  if (res.status === 429) return "You've exported a few times today. Try again tomorrow.";
  return "Couldn't build your export. Try again.";
}

/** Human size for the export card. Bytes are meaningless to a person at any real size. */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ------------------------------------------------------------------ the Settings rows (Task 10)

type RouteName = keyof RootStackParamList;
export type RowAction =
  | { type: "navigate"; name: RouteName; params?: object }
  /** Back to a member tab already on the stack, with params (Edit profile). Executed by `popToOwnerTab`. */
  | { type: "popToOwnerTab"; key: OwnerTab; params?: object }
  | { type: "logoutAll" }
  /** Plan Task 14b · a switch, not a destination; the screen hides it on a device without biometrics. */
  | { type: "appLock" }
  | { type: "link"; url: string };
export type SettingsRow = { key: string; label: string; value?: string; danger?: boolean; action: RowAction };
export type SettingsGroup = { title: string; rows: SettingsRow[] };

/**
 * The number on file as the phone screen shows it: masked, or the honest reason there is none.
 * Never the full number — a screen is shoulder-surfed, and the person knows their own number.
 */
export function phoneRowValue(phone: string | null | undefined, verifiedAt: string | null | undefined): string {
  if (!phone) return "Not added";
  if (!verifiedAt) return "Not verified";
  const ph = /^\+63(\d{3})\d{3}(\d{4})$/.exec(phone);
  if (ph) return `+63 ${ph[1]} ••• ${ph[2]}`;
  return `••••${phone.replace(/\D/g, "").slice(-4)}`;
}

/**
 * Every row Settings shows, as data. The screen only maps an action to a handler, so what is on
 * the list — and which account type sees what — is testable without rendering.
 *
 * A SHELTER gets the account-shaped rows only. "Edit profile" and "Phone number" are owner
 * screens, and a shelter's phone is its SMS-verified `official_phone`: changing the ACCOUNT phone
 * from here would desync the two. The organisation profile screen (plan Task 9) owns those.
 */
export function settingsGroups(opts: {
  shelter: boolean;
  privacyUrl: string | null;
}): SettingsGroup[] {
  const account: SettingsRow[] = opts.shelter ? [] : [
    // Back to the EXISTING You tab with its inline editor open. `navigate("profile")` pushes a
    // second copy of the tab in React Navigation 7 — the loop the review found.
    { key: "editProfile", label: "Edit profile",
      action: { type: "popToOwnerTab", key: "profile", params: { editing: true } } },
    // No value on the row: Settings has no load of its own to hang the lookup on (and a failed one
    // must never read as "Not added"). The phone screen shows the number on file and its status.
    { key: "phone", label: "Phone number", action: { type: "navigate", name: "verifyPhone" } },
  ];
  account.push(
    // Task 13 · the sign-in email. Everyone has one, so the shelter sees it too.
    { key: "changeEmail", label: "Change email", action: { type: "navigate", name: "changeEmail" } },
    { key: "changePassword", label: "Change password", action: { type: "navigate", name: "changePassword" } },
    { key: "logoutAll", label: "Sign out of all devices", action: { type: "logoutAll" } },
  );

  const support: SettingsRow[] = [
    { key: "help", label: "Help & contact", action: { type: "navigate", name: "support" } },
  ];
  // Launch gate 4: a "Privacy & terms" row that opens nothing is worse than no row. It exists
  // only once EXPO_PUBLIC_PRIVACY_POLICY_URL does.
  if (opts.privacyUrl) {
    support.push({ key: "privacy", label: "Privacy & terms",
                   action: { type: "link", url: opts.privacyUrl } });
  }

  return [
    { title: "ACCOUNT", rows: account },
    // Plan Task 14 · the one place a person decides how hard their account is to take over or empty out.
    // No value on the rows: Settings has no load. App lock is a switch the screen only shows when the device has
    // biometrics enrolled.
    { title: "SECURITY", rows: [
      { key: "twoStep", label: "Two-step verification", action: { type: "navigate", name: "twoStep" } },
      { key: "appLock", label: "App lock", action: { type: "appLock" } },
    ] },
    { title: "PRIVACY", rows: [
      { key: "privacyControls", label: "Privacy controls", value: privacySummary(),
        action: { type: "navigate", name: "settingsPrivacy" } },
      { key: "notifications", label: "Notifications", action: { type: "navigate", name: "notifications" } },
      // Review step 7d · both stores require a way to block, and a way to undo it.
      { key: "blockedPeople", label: "Blocked people", action: { type: "navigate", name: "blockedPeople" } },
    ] },
    // §12.6 promises these two in-app. Named the way a person would name them.
    { title: "YOUR DATA", rows: [
      { key: "export", label: "Export my data", action: { type: "navigate", name: "exportData" } },
      { key: "delete", label: "Delete account", danger: true, action: { type: "navigate", name: "deleteAccount" } },
    ] },
    { title: "SUPPORT", rows: support },
  ];
}

// ------------------------------------------------------------- the delete screen (AS2, Task 10)

export const DELETE_TITLE = "Delete your account?";
export const DELETE_LEDE =
  "You have 30 days to restore it by signing in. After that, your personal details are erased for good.";

// Exactly what the purge does (backend accounts/data_map.py): a person's own pets and linked
// sign-ins are DELETED; their listings are kept as hidden records, so they are not "removed".
export const DELETE_REMOVED = [
  "Your name and photo", "Phone, email and address", "Your pets", "Saved places",
  "Linked Google or Apple sign-in",
];
export const DELETE_KEPT = [
  "Rescues you resolved", "Adoptions completed", "Shifts you volunteered",
  "Animals you listed (hidden)", "Shown as “Deleted user”",
];
/** What leaving does to other people: the screen must say it, because they are told too. */
export const DELETE_ENDS_NOTE =
  "Pledges you made end, and a shelter's open wishlist closes. The people involved are told.";

/** Where a blocker's owner goes to close it. `null` for a kind this app does not know yet. */
export function blockerRoute(kind: string): { name: RouteName; params?: object } | { ownerTab: OwnerTab; params?: object } | null {
  switch (kind) {
    case "rescue_claim": return { name: "myRescues" };
    case "volunteer_shift": return { ownerTab: "volunteer", params: { tab: "mine" } };
    case "adoption_inquiry": return { name: "myInquiries" };
    case "hosted_shift": return { name: "shelterVolunteer" };
    default: return null;
  }
}
