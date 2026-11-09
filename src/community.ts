// US-W2/W3 · pure helpers for the Abot-tulong wishlist UI. Kept out of the screens so the
// status/progress logic is unit-testable (the app's jest tests cover modules, not RN renders).

import type { ResState } from "./refreshState";

export type PledgeStatus = "pledged" | "delivered" | "cancelled";
export type NeedStatus = "open" | "fulfilled" | "closed";

// Status chips follow the shared mapping (ui-ux-pro-max): green = delivered/done,
// amber = pledged (still needs action), grey = cancelled/closed. D5 (owner, 2026-10-27): an
// open need is teal, so on the wishlist amber means "act on this" (Pledged, the shelter's
// "N to confirm") rather than every open need. Wishlist only — elsewhere Open stays amber.
export type ChipTone = "ok" | "warn" | "muted" | "teal";

/** The shared `Chip` tone each wishlist tone draws with. One map, not a copy per screen. */
export const CHIP_UI_TONE: Record<ChipTone, "success" | "warning" | "neutral" | "info"> = {
  ok: "success",
  warn: "warning",
  muted: "neutral",
  teal: "info"
};

export type CancelReason = "donor" | "need_closed";

/** Mirrors the backend bound on a need's quantity, a pledge's quantity and a received count. */
export const MAX_QTY = 100_000;

// `cancelReason` is only read on a cancelled pledge: a cancel the shelter's closing caused
// reads "Need closed" so the donor can tell it from one they made themselves.
export function pledgeStatusChip(
  status: PledgeStatus,
  cancelReason?: CancelReason | null
): { label: string; tone: ChipTone } {
  switch (status) {
    case "delivered":
      return { label: "Delivered", tone: "ok" };
    case "cancelled":
      return cancelReason === "need_closed"
        ? { label: "Need closed", tone: "muted" }
        : { label: "Cancelled", tone: "muted" };
    case "pledged":
    default:
      return { label: "Pledged", tone: "warn" };
  }
}

export function needStatusChip(status: NeedStatus): { label: string; tone: ChipTone } {
  switch (status) {
    case "fulfilled":
      return { label: "Fulfilled", tone: "ok" };
    case "closed":
      return { label: "Closed", tone: "muted" };
    case "open":
    default:
      return { label: "Open", tone: "teal" };
  }
}

/** D1 · the "What happens next" strip on Pledge recorded (`screen-donate-pledged`), naming the shelter. */
export function pledgeNextSteps(shelterName: string): string[] {
  return [
    "Deliver or drop it off at the shelter",
    `${shelterName} marks it received`,
    "It counts toward the need, and you get a notification"
  ];
}

/** D2 · on a still-pledged card in My donations: why it still says Pledged after a drop-off. */
export const PLEDGE_DELIVERY_HINT = "Deliver, then the shelter confirms";

/**
 * D3 · the body of the Cancel pledge modal — the wireframe's, kept true to the app: cancelling notifies the
 * shelter (`pledge_cancelled`) and does not reopen anything (the need was open all along).
 */
export function cancelPledgeBody(shelterName: string, quantity: string, needTitle: string): string {
  return `${shelterName} is expecting ${quantity} for “${needTitle}”. Cancelling tells them not to expect it. ` +
    "No penalty — just pledge what you can deliver.";
}

// A cancel is honest and always allowed while pledged (D-S6-7); a delivered pledge is a
// recorded fact and shows no action.
export function pledgeIsCancellable(status: PledgeStatus): boolean {
  return status === "pledged";
}

/** A need's category as the API sends it is lower-case ("food"); only its first letter is capitalised. */
export function needCategoryLabel(category: string): string {
  return category ? category.charAt(0).toUpperCase() + category.slice(1) : category;
}

/** "10 kg", or just "3" when the need has no unit. */
export function quantityLabel(n: number, unit?: string): string {
  return unit ? `${n} ${unit}` : `${n}`;
}

/** "8 of 20 kg received · 5 pledged" — the pledged clause is omitted at 0. */
export function needProgressLabel(received: number, needed: number, unit?: string, pledged?: number): string {
  const base = `${received} of ${quantityLabel(needed, unit)} received`;
  return pledged && pledged > 0 ? `${base} · ${pledged} pledged` : base;
}

/** What is still unspoken for: needed less what has arrived and what is already promised. Never negative. */
export function remainingAfter(needed: number, received: number, pledged: number): number {
  return Math.max(0, needed - received - pledged);
}

/**
 * A nudge, not a block: pledging more than the remainder is allowed. When pledges already cover everything
 * that is left (`remaining` is 0) it says so — that is the case where a donor most needs the hint (B2).
 */
export function overPledgeWarning(qty: number, remaining: number): string | null {
  if (qty <= 0) return null;
  if (remaining <= 0) return "Pledges already cover everything they still need — more is welcome, but it may not be needed.";
  return qty > remaining
    ? `They still need ${remaining} — anything extra is welcome, but ${remaining} covers it.`
    : null;
}

/**
 * What to tell a donor whose cancel found the pledge already settled by the shelter (409) or gone (404). The
 * list is refreshed either way; this says why the card changed under them (B4). Null for every other failure.
 */
export function cancelRefusedCopy(status: number): string | null {
  if (status === 409) return "That pledge was already settled — refreshing your list.";
  if (status === 404) return "That pledge is no longer there — refreshing your list.";
  return null;
}

/** The shelter's received-confirm preview: "8 → 14 of 20 kg received". */
export function receivedPreview(received: number, needed: number, add: number, unit?: string): string {
  return `${received} → ${received + add} of ${quantityLabel(needed, unit)} received`;
}

/**
 * The words for a failed pledge call. `reload` means the screen's data is stale and should be
 * re-fetched; `wall` means the caller is signed out (show the sign-in wall, not a message).
 * Anything outside the table gets a generic line rather than a misleading connection error.
 */
export function pledgeErrorCopy(status: number, code?: string): { message: string; reload: boolean; wall: boolean } {
  const row = (message: string, reload = false, wall = false) => ({ message, reload, wall });
  if (status === 401) return row("Sign in to pledge.", false, true);
  if (status === 403 && code === "own_need") return row("You can't pledge to your own wishlist.");
  if (status === 404) return row("This shelter's wishlist isn't available right now.", true);
  if (status === 409 && code === "need_not_open") return row("This need is no longer open for pledges.", true);
  if (status === 409 && code === "pledge_decided") return row("This pledge was already settled — refreshing.", true);
  if (status === 429) return row("You've made a lot of pledges today. Try again tomorrow.");
  if (status === 0 || status >= 500) return row("Couldn't reach Kupkop. Check your connection and try again.");
  return row("Couldn't save that. Please try again.");
}

/**
 * "Oct 5" (or "Oct 5, 2025" in another year) — the app's usual short date. "" for a missing or
 * unreadable date, so a caller can leave it out rather than print "Invalid Date".
 */
export function pledgeWhen(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

/** My donations' second line: "{shelter} · {date}", the date being when the pledge was settled (else made). */
export function pledgeSubtitle(
  shelterName: string, decidedAt: string | null | undefined, createdAt: string | null | undefined, now: Date = new Date()
): string {
  const when = pledgeWhen(decidedAt || createdAt, now);
  return when ? `${shelterName} · ${when}` : shelterName;
}

/**
 * What a shelter may do to a need in each state. `fulfilled` keeps `receive` because an
 * over-pledge can still be delivered after the target flips; `closed` is final. `waiting` is how many
 * pledges are still `pledged`: on a fulfilled need Mark complete settles them (backend#103), so it is
 * offered only while there are some — with none it would do nothing.
 */
export function needActions(status: NeedStatus, waiting = 0): { edit: boolean; complete: boolean; receive: boolean } {
  switch (status) {
    case "open":
      return { edit: true, complete: true, receive: true };
    case "fulfilled":
      return { edit: false, complete: waiting > 0, receive: true };
    case "closed":
    default:
      return { edit: false, complete: false, receive: false };
  }
}

/** "1 pledge" / "3 pledges". */
export function pledgeCountLabel(n: number): string {
  return `${n} ${n === 1 ? "pledge" : "pledges"}`;
}

/** The amber tag on a wishlist row: "3 to confirm". Nothing when there is nothing to confirm (or an older server sent no count). */
export function awaitingConfirmTag(n: number | null | undefined): string | null {
  return n && n > 0 ? `${n} to confirm` : null;
}

/**
 * Mark complete's dialog body. The cancel line appears only when open pledges will really be cancelled. On a fulfilled
 * need it is already off the wishlist and stays fulfilled; only the pledges still waiting go.
 */
export function completeNeedBody(pledgeCount: number | null | undefined, status: NeedStatus = "open"): string {
  const n = pledgeCount ?? 0;
  if (status === "fulfilled") {
    const done = "It already has everything it asked for, and stays marked fulfilled.";
    if (n <= 0) return done;
    return n === 1
      ? `${done} 1 pledge still waiting will be cancelled and the donor told.`
      : `${done} ${n} pledges still waiting will be cancelled and the donors told.`;
  }
  const base = "It comes off your wishlist — donors can no longer pledge to it.";
  if (n <= 0) return base;
  return n === 1
    ? `${base} 1 open pledge will be cancelled and the donor told.`
    : `${base} ${n} open pledges will be cancelled and the donors told.`;
}

/** Client-side limits on a need's title, details and unit. (The backend has no max_length on the description, so NEED_DETAILS_MAX is ours alone.) */
export const NEED_TITLE_MAX = 120;
export const NEED_DETAILS_MAX = 1000;
export const NEED_UNIT_MAX = 16;
/** Mirrors the backend bound on `PATCH /shelter/profile {donation_instructions}`. */
export const INSTRUCTIONS_MAX = 500;

export type NeedFormErrors = { title?: string; description?: string; quantity?: string };

/** `errors` without `key`; the same object when `key` had no message, so a keystroke does not re-render for nothing (B6). */
export function withoutError(errors: NeedFormErrors, key: keyof NeedFormErrors): NeedFormErrors {
  if (errors[key] === undefined) return errors;
  const { [key]: _dropped, ...rest } = errors;
  return rest;
}

/** Client-side bounds for the need form, each message keyed to the field it belongs under (AW20). */
export function needFormErrors(f: { title: string; description: string; qty: number }): NeedFormErrors {
  const errors: NeedFormErrors = {};
  const title = f.title.trim();
  if (!title) errors.title = "Give the need a short title.";
  else if (title.length > NEED_TITLE_MAX) errors.title = `Keep the title to ${NEED_TITLE_MAX} characters or fewer.`;
  if (f.description.trim().length > NEED_DETAILS_MAX) errors.description = `Keep the details to ${NEED_DETAILS_MAX} characters or fewer.`;
  if (!Number.isInteger(f.qty) || f.qty < 1 || f.qty > MAX_QTY) errors.quantity = `Enter a number from 1 to ${MAX_QTY}.`;
  return errors;
}

/**
 * The words for a failed shelter-side write on a need (confirm received, mark complete). `reload` means what
 * the screen showed is stale and should be re-fetched — a 409/404 is the server saying the state moved, which
 * is not "couldn't confirm, try again".
 */
export function needActionErrorCopy(status: number, code?: string): { message: string; reload: boolean } {
  if (status === 409 && code === "pledge_decided") return { message: "That pledge was already settled — refreshing.", reload: true };
  if (status === 409 || status === 404) return { message: "This need changed while you were looking — refreshing.", reload: true };
  if (status === 422 && code === "total_overflow") {
    return { message: "That would push the received total over the limit. Check the number and try again.", reload: false };
  }
  if (status === 0 || status >= 500) return { message: "Couldn't reach Kupkop. Check your connection and try again.", reload: false };
  return { message: "Couldn't save that. Please try again.", reload: false };
}

/** The words for a failed need save, and which field they belong under (`form` = above the button). */
export function needSaveError(
  status: number, code?: string, details?: { quantity_received?: number } | null
): { field: "quantity" | "form"; message: string } {
  if (status === 422 && code === "below_received") {
    return { field: "quantity", message: `${details?.quantity_received ?? 0} already received — the target can't go lower.` };
  }
  if (status === 409 && code === "need_not_open") {
    return { field: "form", message: "This need is no longer open, so it can't be changed." };
  }
  if (status === 400 && code === "bad_category") {
    return { field: "form", message: "That category isn't available for the wishlist. Pick another." };
  }
  if (status === 0 || status >= 500) {
    return { field: "form", message: "Couldn't reach Kupkop. Check your connection and try again." };
  }
  return { field: "form", message: "Couldn't save. Please try again." };
}

/**
 * `needActions`, but only for a need that has been freshly read from the server. `kind` is `loadState(...).kind` of the
 * `GET /needs/{id}` request: anything but "ready" (still loading, offline, failed, gone) grants nothing, so a placeholder
 * passed in from the list, or a copy from before a failed refresh, can never drive Edit / Mark complete / Mark received.
 */
export function liveNeedActions(kind: string, status: NeedStatus, waiting = 0): { edit: boolean; complete: boolean; receive: boolean } {
  return kind === "ready" ? needActions(status, waiting) : { edit: false, complete: false, receive: false };
}

// Clamped 0..1 for a progress bar; a zero/negative target never divides-by-zero.
export function needProgressFraction(received: number, needed: number): number {
  if (needed <= 0) return 0;
  return Math.max(0, Math.min(1, received / needed));
}

/**
 * D4 · the percentage beside a need's progress bar. Rounded like the artboard (5 of 8 → 63), but honest at the
 * ends: 100 only once the target is met (199 of 200 reads 99) and 0 only when nothing has arrived (1 of 1000 reads 1).
 */
export function needPercent(received: number, needed: number): number {
  if (needed <= 0 || received <= 0) return 0;
  if (received >= needed) return 100;
  return Math.min(99, Math.max(1, Math.round((received / needed) * 100)));
}

// DW-N4 · the donor wishlist's Load more. Pages are newest first, so a need posted between two fetches pushes a row
// already on screen onto the next page; keep the first copy rather than render it twice (and with a duplicate key).
export function appendNeedsPage<T extends { need_id: string }>(prev: T[] | null, more: T[]): T[] {
  const shown = new Set((prev ?? []).map((n) => n.need_id));
  return [...(prev ?? []), ...more.filter((n) => !shown.has(n.need_id))];
}

// US-B2 · the four impact aggregates as labelled stat tiles, in a stable display order.
export type Impact = {
  shifts_completed: number; rescues_helped: number; pets_rehomed: number;
  pledges_delivered: number;
};

// IB26 · GET /me/impact, as the server promises it (backend MeImpactSerializer; backend's test_impact_contract.py compares
// these four types' keys with it). `parseImpact` checks an answer against them, so the screens never read `any`.
// V7 · `progress` is how far along a badge is, or null for one with no rule. `current` is honest, so it can pass `target`:
// a badge held after its stat fell reads below it.
export type BadgeProgress = { current: number; target: number };
export type BadgeShape = {
  badge_code: string; name: string; description: string; icon: string; criteria: string;
  earned: boolean; earned_at: string | null; progress: BadgeProgress | null;
};
export type ImpactResponse = { impact: Impact; badges: BadgeShape[] };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
const text = (v: unknown): string => (typeof v === "string" ? v : "");

function parseProgress(v: unknown): BadgeProgress | null {
  // Decoration: a malformed one costs the bar, not the badge.
  return isObject(v) && isCount(v.current) && isCount(v.target) ? { current: v.current, target: v.target } : null;
}

function parseBadge(v: unknown): BadgeShape | null {
  if (!isObject(v)) return null;
  // Identity, and whether it is held, are never guessed: a badge that cannot say which it is, or whether it is earned,
  // makes the whole answer unusable (see below).
  if (typeof v.badge_code !== "string" || !v.badge_code || typeof v.name !== "string" || !v.name) return null;
  if (typeof v.earned !== "boolean") return null;
  return {
    badge_code: v.badge_code, name: v.name, description: text(v.description), icon: text(v.icon),
    criteria: text(v.criteria), earned: v.earned, earned_at: typeof v.earned_at === "string" ? v.earned_at : null,
    progress: parseProgress(v.progress)
  };
}

/**
 * The answer from GET /me/impact, checked against the contract, or null when it is not that.
 *
 * ⚠️ ONE BAD BADGE MAKES THE WHOLE ANSWER NULL, ON PURPOSE. Dropping it quietly would draw a grid that looks complete and
 * is not, which is the failure this exists to stop; null shows an error with a retry. Unknown fields are ignored and not
 * copied, so the server can add to the shape without breaking the app.
 */
export function parseImpact(data: unknown): ImpactResponse | null {
  if (!isObject(data) || !isObject(data.impact) || !Array.isArray(data.badges)) return null;
  const c = data.impact;
  if (!isCount(c.shifts_completed) || !isCount(c.rescues_helped) || !isCount(c.pets_rehomed) || !isCount(c.pledges_delivered)) return null;
  const badges: BadgeShape[] = [];
  const seen = new Set<string>();
  for (const raw of data.badges) {
    const b = parseBadge(raw);
    if (!b || seen.has(b.badge_code)) return null;     // a duplicate would draw one tile twice
    seen.add(b.badge_code);
    badges.push(b);
  }
  return {
    impact: { shifts_completed: c.shifts_completed, rescues_helped: c.rescues_helped, pets_rehomed: c.pets_rehomed, pledges_delivered: c.pledges_delivered },
    badges
  };
}

// IB6 · what My impact shows, and what looking at it again does to that. The screen holds the last GOOD answer and the
// result of the latest request; those two are the whole state, and these functions are the only things that change it.
export type ImpactView = { data: ImpactResponse | null; res: ResState };

/**
 * Starting a load. A screen that holds data keeps it, and keeps whatever it was saying: a refocus must not swap a grid for a
 * spinner (it did, on every return from a badge's detail). A screen with nothing goes back to "loading", which is what a
 * retry from the full-screen error needs.
 */
export function beginImpactLoad(view: ImpactView): ImpactView {
  return view.data ? view : { data: null, res: null };
}

/**
 * Folding an answer in. Only an answer that passes `parseImpact` replaces the data. A failure keeps the last good data and
 * records that it failed, so the screen can say "showing what we saved earlier" instead of showing old tiles beside an
 * unexplained error. A 200 that breaks the contract is a server fault (502), not a success and not an empty grid.
 */
export function applyImpactReply(view: ImpactView, reply: { ok: boolean; status: number; data: unknown }): ImpactView {
  const answer = reply.ok ? parseImpact(reply.data) : null;
  if (answer) return { data: answer, res: { ok: true, status: reply.status } };
  return { data: view.data, res: { ok: false, status: reply.ok ? 502 : reply.status } };
}

/** Data is on screen AND the latest refresh failed: the stale banner shows. With nothing held, the full-screen error does. */
export function impactIsStale(view: ImpactView): boolean {
  return !!view.data && !!view.res && !view.res.ok;
}

// V7 / IB15 · the impact screen's three groups. The server sends the whole catalog in catalog order with `earned` and
// `progress`; what is drawn as the near-win, the trophies and the rest to go for is decided here, as pure functions.

// ⚠️ The line for "Almost there". Without one the closest unearned badge is always called that, and 1 of 50 is not almost
// anything. Half way is where "just N more" stops being a stretch.
export const ALMOST_THERE_AT = 0.5;

/** 0..1 for the bar: never past 1 (a held badge whose stat has since fallen, or a stat past its target) and never NaN. */
export function progressFraction(p: BadgeProgress | null | undefined): number {
  if (!p || !(p.target > 0) || !(p.current > 0)) return 0;
  return Math.min(1, p.current / p.target);
}

/** "8 of 10", and with `cheer` "8 of 10 — just 2 more to go!" (the mockup's words). Cheer only when close: no "just 49 more". */
export function progressLabel(p: BadgeProgress | null | undefined, cheer: boolean): string {
  if (!p || !(p.target > 0)) return "";
  const current = Math.max(0, Math.min(p.current, p.target));
  const base = `${current} of ${p.target}`;
  const left = p.target - current;
  return cheer && left > 0 ? `${base} — just ${left} more to go!` : base;
}

/** The unearned badge furthest along, once it is past the line, else null. A tie keeps catalog order. */
export function almostThere(badges: BadgeShape[]): BadgeShape | null {
  let best: BadgeShape | null = null;
  let bestFraction = 0;
  for (const b of badges) {
    const p = b.progress;
    if (b.earned || !p || !(p.current > 0) || p.current >= p.target) continue;
    const fraction = progressFraction(p);
    if (fraction >= ALMOST_THERE_AT && fraction > bestFraction) { best = b; bestFraction = fraction; }
  }
  return best;
}

export type BadgeSections = { almostThere: BadgeShape | null; earned: BadgeShape[]; keepGoing: BadgeShape[] };

/** Every badge exactly once: the near-win, the held ones, and the rest. Catalog order inside each. */
export function badgeSections(badges: BadgeShape[]): BadgeSections {
  const near = almostThere(badges);
  return {
    almostThere: near,
    earned: badges.filter((b) => b.earned),
    keepGoing: badges.filter((b) => !b.earned && b !== near)
  };
}

/** "5 November 2026", or null. `new Date("garbage")` does not throw, it is Invalid Date, so the check is on the value (IB7). */
export function earnedDate(iso: string | null): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/** What a screen reader says for a badge: whether it is held, and how to get it if not (V8: earned was colour alone). */
export function badgeA11yLabel(b: BadgeShape): string {
  if (b.earned) {
    const when = earnedDate(b.earned_at);
    return when ? `${b.name}, earned ${when}` : `${b.name}, earned`;
  }
  const how = b.criteria ? ` ${b.criteria}.` : "";
  const far = progressLabel(b.progress, false);
  return `${b.name}, not earned yet.${how}${far ? ` ${far}.` : ""}`;
}

export function impactTiles(i: Impact): { label: string; value: number }[] {
  return [
    { label: "Shifts", value: i.shifts_completed },
    { label: "Rescues", value: i.rescues_helped },
    { label: "Rehomed", value: i.pets_rehomed },
    { label: "Pledges", value: i.pledges_delivered }
  ];
}

// US-T2 · a story-type chip. Colours: adoption=green (a completed rehoming), rescue=teal
// (brand action), general=grey. Type auto-derives from the linked object on compose.
export type StoryType = "adoption" | "rescue" | "general";
export type StoryTone = "ok" | "teal" | "muted";

export function storyTypeChip(type: StoryType): { label: string; tone: StoryTone } {
  switch (type) {
    case "adoption":
      return { label: "Adoption", tone: "ok" };
    case "rescue":
      return { label: "Rescue", tone: "teal" };
    case "general":
    default:
      return { label: "General", tone: "muted" };
  }
}

// Stories review step 5 (ST6, ST16) · a story, as the server promises it (backend StorySerializer; backend's test_stories_contract.py compares
// these five types' keys with it). One type for the wall, the detail and Home, and `parseStory` / `parseStoryPage` check an answer against it, so
// the screens never read `any`. `created_at`, `link` and `mine` are what an older server did not send: `parseStory` fills them in (null, null, false).
export type StoryAuthor = { name: string; city: string };
export type StoryPhoto = { url: string; is_primary: boolean };
/** The adoption or rescue a story is about, offered only when the viewer may open it. `id` is what its screen opens: a listing's id, or a REPORT's. */
export type StoryLink = { type: "adoption" | "rescue"; id: string };
export type Story = {
  story_id: string; author: StoryAuthor; story_type: StoryType; caption: string; status: string;
  photos: StoryPhoto[]; primary_photo: string | null; reaction_count: number; my_reaction: boolean; mine: boolean;
  created_at: string | null; link: StoryLink | null;
};
export type StoryPage = { results: Story[]; next: string | null };

const STORY_TYPES: readonly string[] = ["adoption", "rescue", "general"];

function parseStoryPhoto(v: unknown): StoryPhoto | null {
  if (!isObject(v) || typeof v.url !== "string" || !v.url) return null;
  return { url: v.url, is_primary: v.is_primary === true };
}

function parseStoryLink(v: unknown): StoryLink | null {
  // Decoration: a link the app cannot read costs the button, not the story.
  if (!isObject(v) || (v.type !== "adoption" && v.type !== "rescue") || typeof v.id !== "string" || !v.id) return null;
  return { type: v.type, id: v.id };
}

/**
 * One story, checked against the contract, or null when it is not one.
 *
 * ⚠️ Identity is never guessed: a story that cannot say which it is, who wrote it, what its photos are or how many people reacted is null. What
 * is only decoration (the type chip, the date, the link, `mine`) falls back quietly, so a mixed deploy or a new field costs a line, not the wall.
 * Unknown fields are ignored and not copied.
 */
export function parseStory(v: unknown): Story | null {
  if (!isObject(v)) return null;
  if (typeof v.story_id !== "string" || !v.story_id) return null;
  if (!isObject(v.author) || typeof v.author.name !== "string") return null;
  if (!Array.isArray(v.photos) || !isCount(v.reaction_count) || typeof v.my_reaction !== "boolean") return null;
  const photos: StoryPhoto[] = [];
  for (const raw of v.photos) {
    const p = parseStoryPhoto(raw);
    if (!p) return null;
    photos.push(p);
  }
  const date = typeof v.created_at === "string" && !Number.isNaN(new Date(v.created_at).getTime()) ? v.created_at : null;
  return {
    story_id: v.story_id,
    author: { name: v.author.name, city: text(v.author.city) },
    story_type: STORY_TYPES.includes(v.story_type as string) ? (v.story_type as StoryType) : "general",
    caption: text(v.caption),
    status: typeof v.status === "string" && v.status ? v.status : "published",
    photos,
    primary_photo: typeof v.primary_photo === "string" ? v.primary_photo : (photos[0]?.url ?? null),
    reaction_count: v.reaction_count,
    my_reaction: v.my_reaction,
    mine: v.mine === true,
    created_at: date,
    link: parseStoryLink(v.link),
  };
}

/**
 * A page of the wall, or null when it is not one. ⚠️ ONE BAD STORY MAKES THE WHOLE PAGE NULL, ON PURPOSE (as `parseImpact` does): dropping it would
 * draw a wall that looks complete and is not; null shows an error with a retry. A story twice in one page would draw one card twice, so that is null too.
 */
export function parseStoryPage(v: unknown): StoryPage | null {
  if (!isObject(v) || !Array.isArray(v.results)) return null;
  const results: Story[] = [];
  const seen = new Set<string>();
  for (const raw of v.results) {
    const s = parseStory(raw);
    if (!s || seen.has(s.story_id)) return null;
    seen.add(s.story_id);
    results.push(s);
  }
  return { results, next: typeof v.next === "string" && v.next.length > 0 ? v.next : null };
}

/** The date a story was posted, in words, or null (an older server sends none, and `new Date("garbage")` is Invalid Date, not an error). */
export function storyDate(iso: string | null | undefined): string | null {
  return earnedDate(iso ?? null);
}

/** What the "see what it is about" button does: where it goes through the screens that already gate the adoption or the rescue (D-S6-4). */
export function storyLinkAction(link: StoryLink | null):
  | { label: string; route: "listingDetail"; params: { listingId: string } }
  | { label: string; route: "reportDetail"; params: { reportId: string } }
  | null {
  if (!link) return null;
  return link.type === "adoption"
    ? { label: "See the adoption listing", route: "listingDetail", params: { listingId: link.id } }
    : { label: "See the rescue", route: "reportDetail", params: { reportId: link.id } };
}

// US-L3 · turn the §11 per-signal sub-scores (each 0..1) into human reasons — the UI shows WHY
// two reports matched, never a raw percentage (that was the whole point of transparent scoring).
export type MatchSignals = { geo: number; time: number; breed: number; color: number; size_sex: number };

export function matchReasons(sig: MatchSignals): string[] {
  const r: string[] = [];
  if (sig.geo >= 0.85) r.push("Very close by");
  else if (sig.geo >= 0.5) r.push("Nearby");
  if (sig.time >= 0.85) r.push("around the same time");
  else if (sig.time >= 0.4) r.push("similar dates");
  if (sig.breed >= 0.3 || sig.color >= 0.3) r.push("description matches");
  if (sig.size_sex >= 0.5) r.push("same size & sex");
  return r.length ? r : ["a possible match"];
}

// A qualitative strength label from the overall [0,1] score — softer than a number, and never
// overclaims a certainty the heuristic doesn't have.
export function matchStrength(score: number): { label: string; tone: "ok" | "warn" } {
  return score >= 0.8 ? { label: "Very likely", tone: "ok" } : { label: "Possible", tone: "warn" };
}
