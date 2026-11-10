// Notifications review step 18 (NP22) · the app icon's number is the person's unread count. The server sets it on every push (`badge`);
// this keeps it true when they read things in the app, and clears it when the session ends, so a shared phone never shows the last
// person's count. Best-effort and silent: the number is a convenience, never a reason for anything to fail.
export function badgeFor(unread: unknown): number {
  const n = typeof unread === "number" && Number.isFinite(unread) ? Math.floor(unread) : 0;
  return Math.min(Math.max(n, 0), 99_999);
}

export async function setAppBadge(unread: unknown): Promise<void> {
  try {
    // required lazily: the native module is absent in a test run and in a build that predates it
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require("expo-notifications");
    await Notifications.setBadgeCountAsync(badgeFor(unread));
  } catch {
    /* best-effort */
  }
}

export const clearAppBadge = () => setAppBadge(0);
