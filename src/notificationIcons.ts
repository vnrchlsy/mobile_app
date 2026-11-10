// Notifications review step 14 (V5) · which icon and tone each notification type wears in the bell, from the approved artboard
// (design/mobile-v3/Notifications.dc.html, `data-fact="family-*"`). One shared map beside the registry mirror (src/notifications.ts)
// replaces the screen's own five-entry VOLUNTEER_ICON. Every type in the backend registry (notifications/types.py) is in exactly one
// family; a type with no entry falls back to the neutral bell, so a new type is never invisible, and notificationIcons.test.ts reads the
// registry and fails until the new type is placed.
import type { ImageSourcePropType } from "react-native";

import { colors } from "./theme";

export type NotificationGlyph =
  | "alert" | "paw" | "heart" | "clock" | "check" | "x" | "user" | "gift" | "shield" | "flag" | "star" | "bell";

/** The shared status mapping: amber = needs attention or changed on you, teal = a heads-up, green = good news, red = did not go
 *  through, navy = your account, neutral = anything else. Nothing here is new to the design system. */
export type NotificationTone = "amber" | "teal" | "green" | "red" | "navy" | "neutral";

export type NotificationFamily =
  | "urgent" | "rescue" | "adoption" | "shift" | "donation" | "account" | "moderation" | "badge" | "other";

type Look = { glyph: NotificationGlyph; tone: NotificationTone };

const FAMILY_LOOK: Record<Exclude<NotificationFamily, "shift" | "other">, Look> = {
  urgent: { glyph: "alert", tone: "amber" },
  rescue: { glyph: "paw", tone: "teal" },
  adoption: { glyph: "heart", tone: "green" },
  donation: { glyph: "gift", tone: "green" },
  account: { glyph: "shield", tone: "navy" },
  moderation: { glyph: "flag", tone: "amber" },
  badge: { glyph: "star", tone: "amber" },
};

/** The type keys of each family, as drawn on the artboard. Shifts keep their per-type icons (below). */
export const FAMILY_TYPES: Record<Exclude<NotificationFamily, "other">, readonly string[]> = {
  urgent: ["report_nearby", "report_escalated"],
  rescue: ["report_claimed", "offer_matched", "offer_received", "case_progress", "case_reopened", "claim_due", "claim_lapsed",
    "report_removed", "placement_decided", "match_suggested"],
  adoption: ["inquiry_received", "inquiry_accepted", "inquiry_rejected", "inquiry_withdrawn", "inquiry_waiting", "stage_advanced",
    "adoption_badge_needed", "adoption_reserved", "reservation_released", "adoption_completed", "placement_offered",
    "placement_withdrawn", "listing_withdrawn"],
  shift: ["signup_requested", "shift_confirmed", "signup_declined", "shift_cancelled_by_shelter", "shift_reminder",
    "signup_cancelled_by_volunteer", "signup_cancelled_by_shelter", "attendance_due"],
  donation: ["pledge_received", "pledge_confirmed", "pledge_cancelled", "need_closed", "donation_qr_decided"],
  account: ["verification_approved", "verification_rejected", "verification_needs_info"],
  moderation: ["story_removed", "story_restored", "listing_removed", "account_warned", "report_reviewed"],
  badge: ["badge_earned"],
};

/** The shift family's own icons: the five that already existed (confirmed, declined, reminder, cancelled by the shelter, requested),
 *  plus attendance due and the two cancellations. */
const SHIFT_LOOK: Record<string, Look> = {
  signup_requested: { glyph: "user", tone: "teal" },
  shift_confirmed: { glyph: "check", tone: "green" },
  signup_declined: { glyph: "x", tone: "red" },
  shift_cancelled_by_shelter: { glyph: "alert", tone: "amber" },
  shift_reminder: { glyph: "clock", tone: "teal" },
  signup_cancelled_by_volunteer: { glyph: "alert", tone: "amber" },
  signup_cancelled_by_shelter: { glyph: "alert", tone: "amber" },
  attendance_due: { glyph: "clock", tone: "teal" },
};

const OTHER: Look = { glyph: "bell", tone: "neutral" };

const BY_TYPE: Record<string, { family: NotificationFamily } & Look> = (() => {
  const out: Record<string, { family: NotificationFamily } & Look> = {};
  for (const [family, types] of Object.entries(FAMILY_TYPES)) {
    for (const t of types) {
      const look = family === "shift" ? SHIFT_LOOK[t] : FAMILY_LOOK[family as keyof typeof FAMILY_LOOK];
      out[t] = { family: family as NotificationFamily, ...look };
    }
  }
  return out;
})();

export function notificationLook(type: string): { family: NotificationFamily } & Look {
  return Object.prototype.hasOwnProperty.call(BY_TYPE, type) ? BY_TYPE[type] : { family: "other", ...OTHER };
}

/** Tile background and glyph colour per tone: the artboard's own pairs, from the theme tokens. */
export const TONE_COLORS: Record<NotificationTone, { bg: string; fg: string }> = {
  amber: { bg: colors.warningBg, fg: colors.warning },
  teal: { bg: colors.infoBg, fg: colors.tealDark },
  green: { bg: colors.successBg, fg: colors.success },
  red: { bg: colors.dangerBg, fg: colors.danger },
  navy: { bg: "#E4E8EF", fg: colors.ink },
  neutral: { bg: colors.greyPill, fg: colors.muted },
};

/* eslint-disable @typescript-eslint/no-var-requires */
export const GLYPH_SOURCE: Record<NotificationGlyph, ImageSourcePropType> = {
  alert: require("../assets/notif/alert.png"),
  paw: require("../assets/notif/paw.png"),
  heart: require("../assets/notif/heart.png"),
  clock: require("../assets/notif/clock.png"),
  check: require("../assets/notif/check.png"),
  x: require("../assets/notif/x.png"),
  user: require("../assets/notif/user.png"),
  gift: require("../assets/notif/gift.png"),
  shield: require("../assets/notif/shield.png"),
  flag: require("../assets/notif/flag.png"),
  star: require("../assets/notif/star.png"),
  bell: require("../assets/notif/bell.png"),
};
