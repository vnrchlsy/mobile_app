// Step 9 · where the "have we explained push to this person" record lives. Best-effort and never throws.
import * as SecureStore from "expo-secure-store";

import { EMPTY_RECORD, parseRecord, PromptRecord } from "../pushPrompt";

const KEY = "kupkop.push.prompt";

export async function loadPromptRecord(): Promise<PromptRecord> {
  try { return parseRecord(await SecureStore.getItemAsync(KEY)); } catch { return EMPTY_RECORD; }
}

export async function savePromptRecord(r: PromptRecord): Promise<void> {
  try { await SecureStore.setItemAsync(KEY, JSON.stringify(r)); } catch { /* best-effort */ }
}
