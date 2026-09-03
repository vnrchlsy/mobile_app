// US-O3 · the report outbox (§13.3).
//
// §13.3's rule is absolute and it is about one thing: **never silently lose a user's report.**
// The person this protects is standing over an injured animal, on one bar of signal, and the
// app's answer must not be "couldn't send, try again" — that report is the whole product.
//
// SCOPE IS DELIBERATELY REPORTS ONLY. Not offers, not inquiries, not stories. The outbox is
// for the welfare-critical write, and every additional queued type multiplies the
// reconciliation surface — what happens when a queued inquiry lands on a listing that was
// withdrawn while you were offline, and who explains that to the user. Reports have no such
// problem: a report is a fact about an animal at a moment, and it stays true.
//
// EXACTLY-ONCE IS THE HARD PART, and it is not negotiable. A retry the server cannot
// recognise creates a second report, and two reports of one animal means two rescuers
// dispatched, or a claim placed on the copy that isn't the one on the map. The key is
// generated at COMPOSE time (not at send time) so every retry of the same queued report
// carries the same value, and the server returns the existing row for a repeat.

export type QueuedReport = {
  /** Generated at compose time. The whole exactly-once guarantee rests on this. */
  idempotency_key: string;
  /** The request body, ready to POST. */
  body: Record<string, unknown>;
  /** A local file uri for a photo that has not been uploaded yet, if any. */
  pendingPhotoUri?: string;
  createdAt: number;
  attempts: number;
  /** Epoch ms before which we should not retry. */
  nextAttemptAt: number;
  lastError?: string;
};

export const MAX_ATTEMPTS = 8;
const BASE_DELAY_MS = 5_000;
const MAX_DELAY_MS = 30 * 60_000;   // 30 minutes

/**
 * Backoff for attempt `n` (1-based).
 *
 * Bounded on both ends. Without a ceiling, a report queued overnight would wait hours after
 * the network returned; without growth, a device with no signal would hammer the radio and
 * flatten the battery of the person still standing in the street.
 */
export function backoffMs(attempts: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1), MAX_DELAY_MS);
}

/** Is this queued report due for another attempt? */
export function isDue(item: QueuedReport, now: number): boolean {
  return item.attempts < MAX_ATTEMPTS && now >= item.nextAttemptAt;
}

/**
 * Has this report given up?
 *
 * Giving up does NOT mean discarding. The item stays in the queue and stays visible, with a
 * manual retry — silently dropping someone's report after eight tries is exactly the failure
 * §13.3 forbids, just slower.
 */
export function isStuck(item: QueuedReport): boolean {
  return item.attempts >= MAX_ATTEMPTS;
}

/** What My Reports shows for a queued item. */
export function pendingLabel(item: QueuedReport): string {
  if (isStuck(item)) return "Not sent";
  return item.attempts === 0 ? "Waiting to send" : "Retrying…";
}

export type SendResult = { ok: boolean; status: number; data?: any };

/**
 * Apply one send attempt's outcome to a queued item.
 *
 * Returns the item to keep, or null when it is done and should leave the queue.
 *
 * ⚠️ THE IMPORTANT DISTINCTION: a 4xx (other than 429) means the server has *judged* this
 * report and will judge it identically forever — retrying is pointless and would keep a
 * doomed item in the queue for days. A network failure or a 5xx is transient and must be
 * retried. Getting that backwards either loses reports or spams the server.
 */
export function applyResult(
  item: QueuedReport, result: SendResult, now: number,
): QueuedReport | null {
  if (result.ok) return null;                       // sent — the server has it

  const attempts = item.attempts + 1;
  const permanent = result.status >= 400 && result.status < 500 && result.status !== 429;
  if (permanent) {
    // Keep it, visibly failed, so the person can see and fix or discard it. Never silently
    // drop it: the report is theirs, not ours.
    return { ...item, attempts: MAX_ATTEMPTS, lastError: `rejected_${result.status}` };
  }
  return {
    ...item,
    attempts,
    nextAttemptAt: now + backoffMs(attempts),
    lastError: result.status === 0 ? "offline" : `server_${result.status}`,
  };
}

/** A fresh queue entry. */
export function queueReport(
  body: Record<string, unknown>, idempotencyKey: string, now: number,
  pendingPhotoUri?: string,
): QueuedReport {
  return {
    idempotency_key: idempotencyKey,
    body: { ...body, idempotency_key: idempotencyKey },
    pendingPhotoUri,
    createdAt: now,
    attempts: 0,
    nextAttemptAt: now,        // try immediately; the network may already be back
  };
}

/** Which queued reports should be attempted now, oldest first (fairness). */
export function dueItems(queue: QueuedReport[], now: number): QueuedReport[] {
  return queue.filter((i) => isDue(i, now)).sort((a, b) => a.createdAt - b.createdAt);
}
