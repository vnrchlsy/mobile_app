// US-O3 · the outbox's storage and flush loop.
//
// The rules live in `src/outbox.ts` (pure, tested). This is the part that has to survive an
// app restart — because the scenario the outbox exists for is someone in a dead spot who
// backgrounds the app, and a queue held only in memory would lose exactly the report §13.3
// says must never be lost.
//
// Stored with SecureStore rather than AsyncStorage: a queued report holds the animal's
// precise coordinates, which §12.5 treats as sensitive, and it sits on the device until the
// network returns.
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { useConnectivity } from "../net/ConnectivityProvider";
import { applyResult, dueItems, QueuedReport, queueReport } from "../outbox";

const KEY = "kupkop.outbox.reports";

type Value = {
  queue: QueuedReport[];
  /** Queue a report that could not be sent. Returns its idempotency key. */
  enqueue: (body: Record<string, unknown>, key: string, photoUri?: string) => Promise<void>;
  /** Try everything that is due, now. */
  flush: () => Promise<void>;
  /** Force one item past its backoff (the user tapped "Try again"). */
  retry: (key: string) => Promise<void>;
  /** The user chose to discard it. The ONLY way a report leaves unsent. */
  discard: (key: string) => Promise<void>;
};

const OutboxContext = createContext<Value>({
  queue: [], enqueue: async () => {}, flush: async () => {},
  retry: async () => {}, discard: async () => {},
});

async function load(): Promise<QueuedReport[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as QueuedReport[]) : [];
  } catch {
    // A corrupt queue must not crash the app on launch. Losing it is bad; failing to start
    // is worse, and the person can re-file.
    return [];
  }
}

async function save(queue: QueuedReport[]) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(queue));
  } catch { /* a failed write means one lost retry, not a crash */ }
}

export function OutboxProvider({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const { tokens } = useAuth();
  const { online, onReconnect } = useConnectivity();
  const [queue, setQueue] = useState<QueuedReport[]>([]);
  const flushing = useRef(false);
  const queueRef = useRef<QueuedReport[]>([]);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { void load().then(setQueue); }, []);

  const write = useCallback(async (next: QueuedReport[]) => {
    queueRef.current = next;
    setQueue(next);
    await save(next);
  }, []);

  const flush = useCallback(async () => {
    // One flush at a time. Two concurrent passes would send the same item twice — the server
    // would dedupe it (that is what the idempotency key is for), but the second response
    // would race the first's queue write and could resurrect a sent report.
    if (flushing.current || !tokens) return;
    flushing.current = true;
    try {
      const now = Date.now();
      let current = queueRef.current;
      for (const item of dueItems(current, now)) {
        const res = await api.post("/reports", item.body);
        const next = applyResult(item, { ok: res.ok, status: res.status }, Date.now());
        current = next
          ? current.map((i) => (i.idempotency_key === item.idempotency_key ? next : i))
          : current.filter((i) => i.idempotency_key !== item.idempotency_key);
        await write(current);
      }
    } finally {
      flushing.current = false;
    }
  }, [api, tokens, write]);

  // Flush when the network comes back — the whole point of queueing.
  useEffect(() => onReconnect(() => { void flush(); }), [onReconnect, flush]);
  // ...and once on launch, in case the app was killed while offline and reopened online.
  useEffect(() => { if (online && tokens) void flush(); }, [online, tokens, flush]);

  const enqueue = useCallback(async (body: Record<string, unknown>, key: string, photoUri?: string) => {
    await write([...queueRef.current, queueReport(body, key, Date.now(), photoUri)]);
  }, [write]);

  const retry = useCallback(async (key: string) => {
    await write(queueRef.current.map((i) =>
      i.idempotency_key === key ? { ...i, attempts: 0, nextAttemptAt: 0, lastError: undefined } : i));
    await flush();
  }, [write, flush]);

  const discard = useCallback(async (key: string) => {
    await write(queueRef.current.filter((i) => i.idempotency_key !== key));
  }, [write]);

  return (
    <OutboxContext.Provider value={{ queue, enqueue, flush, retry, discard }}>
      {children}
    </OutboxContext.Provider>
  );
}

export function useOutbox() {
  return useContext(OutboxContext);
}
