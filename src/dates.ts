// Notifications review step 17 (V6) · "how long ago", in the words the app uses everywhere. It lived in sagip.ts, so the bell imported its
// time from the rescue module; it is a date helper and belongs here. `sagip.ts` re-exports it, so every existing import keeps working.
export function relTime(iso: string, nowMs: number = Date.now()): string {
  const mins = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
