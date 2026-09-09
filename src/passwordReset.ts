import { ApiResult } from "./api/client";

/**
 * What the reset-code step should do with an API answer.
 *
 * WHY THIS IS A MODULE AND NOT SCREEN CODE. Two screens need the same judgement:
 * `ResetOtpScreen` calls `/auth/password/code/check` so a bad code is caught at the step that
 * collects it, and `ResetPasswordScreen` routes a late failure (the code expiring while the
 * user typed a password) back to that step. If they mapped statuses separately they would
 * eventually disagree about what a 410 means, and the user would get "invalid" on one screen
 * and "expired" on the other for the same code.
 */
export type CodeCheckOutcome =
  | { ok: true }
  | { ok: false; message: string; canRetry: boolean };

export function codeCheckOutcome(res: ApiResult): CodeCheckOutcome {
  if (res.ok) return { ok: true };

  // US-C1 · the client returns status 0 for offline/DNS/timeout rather than rejecting. The
  // code is very likely fine; saying otherwise sends the user to retype correct digits.
  if (res.status === 0) {
    return { ok: false, canRetry: true, message: "Couldn't reach the server. Check your connection and try again." };
  }

  const code = res.data?.error?.code;

  if (res.status === 410 || code === "code_expired") {
    // Distinct from "wrong" on purpose: the remedy is Resend, not retyping.
    return { ok: false, canRetry: true, message: "That code has expired. Tap Resend to get a new one." };
  }

  if (res.status === 423 || code === "code_locked") {
    return { ok: false, canRetry: false, message: "Too many attempts. Request a new code to start again." };
  }

  if (res.status === 400 || code === "code_invalid") {
    const left = res.data?.error?.details?.attempts_left;
    // `attempts_left: 0` means the next attempt is refused — that is a lockout, and printing
    // "0 attempts left" alongside an enabled input reads as a bug rather than a limit.
    if (typeof left === "number" && left > 0) {
      return {
        ok: false,
        canRetry: true,
        message: `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`,
      };
    }
    return { ok: false, canRetry: false, message: "Too many attempts. Request a new code to start again." };
  }

  // Anything else is ours, not theirs. Do not accuse the code of being wrong when we do not
  // know that it is.
  return { ok: false, canRetry: true, message: "Something went wrong. Please try again." };
}
