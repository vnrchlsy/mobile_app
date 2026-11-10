// Notifications review step 9 (NP10, NQ6) · when the app asks for push permission. Pure rules, copy, and a tiny event bus.
//
// iOS gives an app exactly ONE system prompt; a refusal is permanent unless the person finds the setting. The prompt used to fire
// at first sign-in, before the person had any reason to want a notification. Now: sign-in only registers a token if permission is
// already granted; the app asks after the person has DONE something a notification is obviously about (filed a report, sent an
// inquiry, requested a shift, pledged, finished a shelter's verification), and says why on its own screen first. "Not now" costs
// nothing: the system prompt is only spent when they say yes.
export type PushTrigger = "report" | "offer" | "inquiry" | "shift" | "pledge" | "shelter_setup";

export const PROMPT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
export const PROMPT_MAX_SHOWS = 3;

export type PromptRecord = { shown: number; lastShownAt: number | null };
export const EMPTY_RECORD: PromptRecord = { shown: 0, lastShownAt: null };

export type OsPermission = "granted" | "denied" | "undetermined";

/**
 * Should the explainer be shown now? Only while the system prompt is still available (`undetermined`): granted needs no ask, and
 * denied cannot be re-asked (the explainer would promise something the OS will not do). After a "Not now", wait two weeks, and
 * stop after three.
 */
export function shouldExplain(s: { permission: OsPermission; record: PromptRecord; now: number }): boolean {
  if (s.permission !== "undetermined") return false;
  if (s.record.shown >= PROMPT_MAX_SHOWS) return false;
  if (s.record.lastShownAt !== null && s.now - s.record.lastShownAt < PROMPT_COOLDOWN_MS) return false;
  return true;
}

export function recordShown(r: PromptRecord, now: number): PromptRecord {
  return { shown: r.shown + 1, lastShownAt: now };
}

/** Read a stored record, tolerating anything: a missing, malformed or hand-edited value is "never shown". */
export function parseRecord(raw: string | null | undefined): PromptRecord {
  if (!raw) return EMPTY_RECORD;
  try {
    const v = JSON.parse(raw);
    const shown = Number.isInteger(v?.shown) && v.shown >= 0 ? v.shown : 0;
    const last = typeof v?.lastShownAt === "number" && Number.isFinite(v.lastShownAt) ? v.lastShownAt : null;
    return { shown, lastShownAt: last };
  } catch {
    return EMPTY_RECORD;
  }
}

const WHAT: Record<PushTrigger, string> = {
  report: "when a rescuer claims your report and how the rescue goes",
  offer: "when the case you offered to help with moves",
  inquiry: "when the poster answers your inquiry",
  shift: "when the shelter confirms or changes your shift",
  pledge: "when the shelter confirms your pledge",
  shelter_setup: "when your documents are reviewed and when someone asks about an animal",
};

export function promptCopy(t: PushTrigger): { title: string; body: string; confirm: string; cancel: string } {
  return {
    title: "Get a heads-up?",
    body: `Turn on notifications and we'll tell you ${WHAT[t]}. You can change this any time in Settings.`,
    confirm: "Turn on notifications",
    cancel: "Not now",
  };
}

// --- the bus ----------------------------------------------------------------------------------------------------------------
// A screen that has just seen something succeed says so; the host (src/push/PushPromptHost.tsx) decides whether to ask. Screens
// stay ignorant of permission, storage and cooldowns.
type Listener = (t: PushTrigger) => void;
const listeners = new Set<Listener>();

export function requestPushPrompt(trigger: PushTrigger): void {
  for (const l of [...listeners]) {
    try { l(trigger); } catch { /* a host problem must never break the screen that asked */ }
  }
}

export function subscribePushPrompt(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
