import {
  applyResult, backoffMs, dueItems, isDue, isStuck, MAX_ATTEMPTS, pendingLabel, queueReport,
} from "../outbox";

const NOW = 1_000_000;
const item = (over: Partial<ReturnType<typeof queueReport>> = {}) => ({
  ...queueReport({ species: "dog" }, "key-1", NOW),
  ...over,
});

describe("queueReport", () => {
  it("carries the idempotency key into the body", () => {
    // Compose-time key: every retry of this queued report sends the same value, which is
    // the entire basis of the server's exactly-once behaviour.
    const q = queueReport({ species: "dog", condition: "injured" }, "abc", NOW);
    expect(q.body.idempotency_key).toBe("abc");
    expect(q.idempotency_key).toBe("abc");
  });

  it("is due immediately — the network may already be back", () => {
    expect(isDue(queueReport({}, "k", NOW), NOW)).toBe(true);
  });
});

describe("backoffMs", () => {
  it("grows so a dead radio is not hammered", () => {
    // The person is still standing in the street; flattening their battery helps nobody.
    expect(backoffMs(1)).toBeLessThan(backoffMs(2));
    expect(backoffMs(2)).toBeLessThan(backoffMs(3));
  });

  it("is capped so a report queued overnight sends soon after the network returns", () => {
    expect(backoffMs(50)).toBeLessThanOrEqual(30 * 60_000);
  });
});

describe("applyResult", () => {
  it("removes the item once the server has it", () => {
    expect(applyResult(item(), { ok: true, status: 201 }, NOW)).toBeNull();
  });

  it("retries a network failure with a later attempt time", () => {
    const next = applyResult(item(), { ok: false, status: 0 }, NOW)!;
    expect(next.attempts).toBe(1);
    expect(next.nextAttemptAt).toBeGreaterThan(NOW);
    expect(next.lastError).toBe("offline");
  });

  it("retries a server error — that is transient", () => {
    const next = applyResult(item(), { ok: false, status: 503 }, NOW)!;
    expect(next.attempts).toBe(1);
    expect(isStuck(next)).toBe(false);
  });

  it("stops retrying something the server will refuse forever", () => {
    // A 422 means the server has judged this report and will judge it identically every
    // time. Retrying for days would keep a doomed item cycling and hide it behind "Retrying…".
    const next = applyResult(item(), { ok: false, status: 422 }, NOW)!;
    expect(isStuck(next)).toBe(true);
    expect(next.lastError).toBe("rejected_422");
  });

  it("treats 429 as transient, not as a refusal", () => {
    // Being throttled is the server saying "later", not "no".
    const next = applyResult(item(), { ok: false, status: 429 }, NOW)!;
    expect(isStuck(next)).toBe(false);
  });

  it("never discards a report, even after giving up", () => {
    // THE RULE: §13.3 forbids silently losing a report. Giving up on automatic retry is not
    // permission to delete someone's report — it stays visible with a manual retry.
    let current = item();
    for (let i = 0; i < MAX_ATTEMPTS + 3; i++) {
      const next = applyResult(current, { ok: false, status: 0 }, NOW);
      expect(next).not.toBeNull();
      current = next!;
    }
    expect(isStuck(current)).toBe(true);
  });
});

describe("isDue", () => {
  it("waits out the backoff", () => {
    expect(isDue(item({ attempts: 1, nextAttemptAt: NOW + 5000 }), NOW)).toBe(false);
    expect(isDue(item({ attempts: 1, nextAttemptAt: NOW + 5000 }), NOW + 5000)).toBe(true);
  });

  it("stops attempting a stuck item automatically", () => {
    expect(isDue(item({ attempts: MAX_ATTEMPTS, nextAttemptAt: 0 }), NOW)).toBe(false);
  });
});

describe("dueItems", () => {
  it("sends the oldest first", () => {
    const queue = [
      item({ idempotency_key: "new", createdAt: NOW + 500 }),
      item({ idempotency_key: "old", createdAt: NOW - 500 }),
    ];
    expect(dueItems(queue, NOW).map((i) => i.idempotency_key)).toEqual(["old", "new"]);
  });

  it("skips what is not due", () => {
    const queue = [item({ attempts: 2, nextAttemptAt: NOW + 60_000 })];
    expect(dueItems(queue, NOW)).toEqual([]);
  });
});

describe("pendingLabel", () => {
  it("tells the person what is happening to their report", () => {
    expect(pendingLabel(item())).toMatch(/waiting/i);
    expect(pendingLabel(item({ attempts: 2 }))).toMatch(/retry/i);
    expect(pendingLabel(item({ attempts: MAX_ATTEMPTS }))).toMatch(/not sent/i);
  });
});
