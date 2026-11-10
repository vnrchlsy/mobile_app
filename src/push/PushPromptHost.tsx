// Notifications review step 9 (NP10, NQ6) · the "get a heads-up?" explainer, shown after a first meaningful action.
//
// Mounted once inside PushBridge. A screen that has just seen something succeed calls `requestPushPrompt(trigger)`
// (src/pushPrompt.ts); this decides whether to ask (permission still open, not asked recently, not asked three times already),
// says why on a screen of its own, and spends the one-shot system prompt only on a yes. "Not now" costs nothing.
import { useEffect, useRef, useState } from "react";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  promptCopy, PushTrigger, recordShown, shouldExplain, subscribePushPrompt
} from "../pushPrompt";
import { loadPromptRecord, savePromptRecord } from "./promptStore";
import { currentPermission, registerAndStore } from "./registerDevice";

/** Let the screen that asked settle first: the success screen should be seen before anything is laid over it. */
const SETTLE_MS = 700;

export function PushPromptHost() {
  const api = useApi();
  const { tokens } = useAuth();
  const [trigger, setTrigger] = useState<PushTrigger | null>(null);
  const busy = useRef(false);
  const signedIn = useRef(false);
  signedIn.current = !!tokens;
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    const off = subscribePushPrompt((t) => {
      if (busy.current) return;                           // one explainer at a time
      busy.current = true;
      setTimeout(async () => {
        try {
          if (!signedIn.current) return;                  // a guest has no device to register
          const [permission, record] = await Promise.all([currentPermission(), loadPromptRecord()]);
          const now = Date.now();
          if (!shouldExplain({ permission, record, now })) return;
          await savePromptRecord(recordShown(record, now));
          setTrigger(t);
          return;                                         // `busy` stays true until the person answers
        } catch {
          /* never let the ask break anything */
        }
        busy.current = false;
      }, SETTLE_MS);
    });
    return off;
  }, []);

  function close() {
    setTrigger(null);
    busy.current = false;
  }

  async function turnOn() {
    close();
    try { await registerAndStore(apiRef.current, true); } catch { /* best-effort */ }
  }

  const copy = trigger ? promptCopy(trigger) : null;
  return (
    <ConfirmModal
      visible={!!trigger}
      title={copy?.title ?? ""}
      body={copy?.body ?? ""}
      confirmLabel={copy?.confirm ?? ""}
      cancelLabel={copy?.cancel ?? "Not now"}
      onConfirm={turnOn}
      onCancel={close}
    />
  );
}
