/**
 * The reset flow is email → code → new password, but the code was only ever validated by
 * POST /auth/password/reset, which needs the new password too. So a mistyped or expired code
 * was reported only AFTER the user had chosen and typed a new password — and reported under
 * the password field, which is not the thing that was wrong.
 *
 * `codeCheckOutcome` is the shared decision: the code step calls the new
 * /auth/password/code/check endpoint through it, and the password step routes the same
 * failures back to the code step through it, so the two screens cannot disagree about what a
 * 410 means.
 */
import { codeCheckOutcome } from "../passwordReset";

// Mirrors the real client: `ok` is a 2xx/3xx check, so status 0 (US-C1's offline/DNS/timeout
// sentinel) is a FAILURE, not a success. Deriving `ok` from `status < 400` would make status 0
// look like a 200 and quietly skip the network branch entirely.
const res = (status: number, data: any = {}) => ({
  ok: status >= 200 && status < 400,
  status,
  data,
});
const otpError = (code: string, extra: any = {}) => ({ error: { code, ...extra } });

describe("codeCheckOutcome", () => {
  it("lets a good code through", () => {
    expect(codeCheckOutcome(res(200))).toEqual({ ok: true });
  });

  it("tells an expired code apart from a wrong one, because the remedy differs", () => {
    // Wrong → retype. Expired → press Resend. Saying "invalid" to an expired code sends the
    // user to retype digits they already typed correctly.
    const expired = codeCheckOutcome(res(410, otpError("code_expired")));
    const wrong = codeCheckOutcome(res(400, otpError("code_invalid", { details: { attempts_left: 4 } })));
    expect(expired).not.toEqual(wrong);
    if (expired.ok || wrong.ok) throw new Error("both should be failures");
    expect(expired.message).toMatch(/resend|new code/i);
    expect(wrong.message).not.toMatch(/resend|new code/i);
  });

  it("says how many attempts are left while any remain", () => {
    const out = codeCheckOutcome(res(400, otpError("code_invalid", { details: { attempts_left: 3 } })));
    if (out.ok) throw new Error("expected failure");
    expect(out.message).toContain("3");
  });

  it("does not say '0 attempts left' — that is a lockout, and reads as a bug", () => {
    const out = codeCheckOutcome(res(400, otpError("code_invalid", { details: { attempts_left: 0 } })));
    if (out.ok) throw new Error("expected failure");
    expect(out.message).not.toContain("0 attempts");
  });

  it("handles a locked code without inviting another try", () => {
    const out = codeCheckOutcome(res(423, otpError("code_locked")));
    if (out.ok) throw new Error("expected failure");
    expect(out.canRetry).toBe(false);
    expect(out.message).toMatch(/too many|start again|request a new/i);
  });

  it("blames the connection, not the code, when the request never lands", () => {
    // US-C1 · the api client returns status 0 rather than rejecting.
    const out = codeCheckOutcome(res(0, otpError("network_error")));
    if (out.ok) throw new Error("expected failure");
    expect(out.message).toMatch(/connection|reach/i);
    expect(out.message).not.toMatch(/code is (wrong|invalid)/i);
    expect(out.canRetry).toBe(true);
  });

  it("treats an unrecognised failure as retryable rather than accusing the code", () => {
    const out = codeCheckOutcome(res(500, {}));
    if (out.ok) throw new Error("expected failure");
    expect(out.canRetry).toBe(true);
    expect(out.message).not.toMatch(/code is (wrong|invalid)/i);
  });
});
