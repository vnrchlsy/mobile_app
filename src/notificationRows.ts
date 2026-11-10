// Notifications review step 14 (V1 to V3) · the bell's rows, as drawn on the approved artboard (design/mobile-v3/Notifications.dc.html).
// Pure, so the label a screen reader hears, the grouping and the information-only rule are tested without rendering.
import type { MeNotification } from "./api/types";
import { notificationTarget } from "./notifications";
import { relTime } from "./dates";

/** A part of a spoken sentence, ended with exactly one full stop (or the "!" / "?" it already has). */
function sentence(part: string): string {
  const t = part.trim();
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

/** The row's title, or "Update" when the server sent none or only blanks (the bell never draws an empty headline). */
export function notificationTitle(n: Pick<MeNotification, "title">): string {
  return (n.title ?? "").trim() || "Update";
}

/**
 * What a screen reader says for one row, which is ONE button: what happened, the detail, when, and whether it is new.
 * "A stray nearby needs help. A hurt dog was reported 600 m from you. 2 min ago. Unread."
 * Unread is also a dot, a heavier title and a stronger shadow; the label is what makes it more than a colour.
 */
export function notificationRowLabel(n: Pick<MeNotification, "title" | "body" | "created_at" | "read">, nowMs: number = Date.now()): string {
  const parts = [notificationTitle(n), n.body || "", relTime(n.created_at, nowMs)].filter((p) => p && p.trim() !== "");
  return parts.map(sentence).join(" ") + (n.read ? "" : " Unread.");
}

/**
 * A row with nowhere to go (report_reviewed, account_warned: deliberate no-ops, MQ7 and MO10; or a type whose ids are missing)
 * is drawn without a chevron and is not a press target: a control that does nothing must not look or act like one.
 */
export function isInformationOnly(n: Pick<MeNotification, "type" | "data">): boolean {
  return notificationTarget({ type: n.type, data: n.data }) === null;
}

export type BellItem =
  | { kind: "caughtUp"; key: string }
  | { kind: "header"; key: string; name: "New" | "Earlier" }
  | { kind: "row"; key: string; n: MeNotification };

/**
 * The list the screen draws, flattened for one FlatList: "New" (unread) then "Earlier" (read), grouped by read state, not by date.
 * With nothing unread there is no "New", and a soft "You're all caught up" notice leads. Order within a group is the server's.
 * An empty list is not this function's business (that is the empty state).
 */
export function bellItems(rows: MeNotification[]): BellItem[] {
  const fresh = rows.filter((r) => !r.read);
  const earlier = rows.filter((r) => r.read);
  const out: BellItem[] = [];
  if (rows.length > 0 && fresh.length === 0) out.push({ kind: "caughtUp", key: "caught-up" });
  if (fresh.length > 0) {
    out.push({ kind: "header", key: "h-new", name: "New" });
    fresh.forEach((n) => out.push({ kind: "row", key: n.notification_id, n }));
  }
  if (earlier.length > 0) {
    out.push({ kind: "header", key: "h-earlier", name: "Earlier" });
    earlier.forEach((n) => out.push({ kind: "row", key: n.notification_id, n }));
  }
  return out;
}
