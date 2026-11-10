/**
 * Stories review step 9 (ST9, ST10), library docs/superpowers/specs/2026-11-09-stories-review.md · the react heart takes its state from the server.
 *
 * Before: the app flipped the heart and the count at once, and on the answer set `my_reaction` to what it had GUESSED (`!wasOn`); two quick taps sent a DELETE while the
 * POST was still in flight, and the answers could land in either order, so the heart could end on the wrong state. A failure restored the count from the render where the
 * tap happened, not the latest one. Now there is one small state machine (pure, so the races run as tests): the shown state flips at once; one request is in flight at a
 * time; taps during it are remembered as a single wish; the server's answer (`reaction_count` AND `my_reaction`) becomes the confirmed state; and a failure goes back to the
 * LAST CONFIRMED state, never to a guess.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { reactFailure, reactReply, settleReact, startReact, tapReact, ReactCtl } from "../storyReact";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
const ok = (count: number, mine: boolean) => ({ ok: true, status: 200, data: { reaction_count: count, my_reaction: mine } });
const fail = (status: number, code = "error") => ({ ok: false, status, data: { error: { code, message: "" } } });
const off = (count = 0) => startReact(false, count);
const on = (count = 1) => startReact(true, count);

describe("tapReact", () => {
  test("a tap flips the heart and the count at once and asks for the new state", () => {
    const t = tapReact(off(3));
    expect(t.ctl.shown).toEqual({ on: true, count: 4 });
    expect(t.ctl.inflight).toBe(true);
    expect(t.send).toBe(true);
  });
  test("tapping an on heart turns it off and asks for that", () => {
    const t = tapReact(on(3));
    expect(t.ctl.shown).toEqual({ on: false, count: 2 });
    expect(t.send).toBe(false);
  });
  test("the count never goes below zero", () => {
    expect(tapReact(startReact(true, 0)).ctl.shown.count).toBe(0);
  });
  test("a second tap while one is in flight asks for nothing yet: it is remembered", () => {
    const first = tapReact(off(3));
    const second = tapReact(first.ctl);
    expect(second.send).toBeNull();
    expect(second.ctl.shown).toEqual({ on: false, count: 3 });          // the heart follows the finger...
    expect(second.ctl.wanted).toBe(false);                               // ...and the wish is the latest one
  });
  test("many taps in flight are one wish: the last", () => {
    let t = tapReact(off(0));
    for (let i = 0; i < 4; i++) t = tapReact(t.ctl);                    // 5 taps in all
    expect(t.ctl.wanted).toBe(true);
    expect(t.send).toBeNull();
  });
});

describe("settleReact: the server decides", () => {
  test("the answer's state becomes the shown and confirmed state, count included", () => {
    const sent = tapReact(off(3));
    const s = settleReact(sent.ctl, ok(7, true));                        // others reacted meanwhile: the server's count wins
    expect(s.ctl.shown).toEqual({ on: true, count: 7 });
    expect(s.ctl.confirmed).toEqual({ on: true, count: 7 });
    expect(s.ctl.inflight).toBe(false);
    expect(s.send).toBeNull();
    expect(s.error).toBeNull();
  });
  test("the answer's my_reaction wins over what was asked for", () => {
    const sent = tapReact(off(3));
    const s = settleReact(sent.ctl, ok(2, false));                       // asked for on; the server says off
    expect(s.ctl.shown).toEqual({ on: false, count: 2 });
  });
  test("an older server (no my_reaction) is taken at what was asked for", () => {
    const sent = tapReact(off(3));
    const s = settleReact(sent.ctl, { ok: true, status: 200, data: { reaction_count: 4 } });
    expect(s.ctl.shown).toEqual({ on: true, count: 4 });
  });
});

describe("the races", () => {
  test("tap, tap before the first answer: the heart ends where the finger left it, from the server's last answer", () => {
    const first = tapReact(off(3));                                      // wants on, sends POST
    const second = tapReact(first.ctl);                                  // wants off, waits
    const a1 = settleReact(second.ctl, ok(4, true));                    // POST answered
    expect(a1.send).toBe(false);                                         // now the wish is sent
    expect(a1.ctl.shown).toEqual({ on: false, count: 3 });             // the heart shows the wish while it is asked
    expect(a1.ctl.inflight).toBe(true);
    const a2 = settleReact(a1.ctl, ok(3, false));                       // DELETE answered
    expect(a2.ctl.shown).toEqual({ on: false, count: 3 });
    expect(a2.ctl.confirmed).toEqual({ on: false, count: 3 });
    expect(a2.send).toBeNull();
  });
  test("tap, tap, tap: three taps are one request and then one more (on, then off, on = ends on)", () => {
    const t1 = tapReact(off(0)); const t2 = tapReact(t1.ctl); const t3 = tapReact(t2.ctl);
    expect(t3.ctl.wanted).toBe(true);
    const a1 = settleReact(t3.ctl, ok(1, true));                         // the first POST left it on, the wish is on: nothing more to send
    expect(a1.send).toBeNull();
    expect(a1.ctl.shown).toEqual({ on: true, count: 1 });
  });
  test("an even number of taps in flight ends where it started with no second request wasted", () => {
    const t1 = tapReact(off(2)); const t2 = tapReact(t1.ctl);           // on then off
    const a1 = settleReact(t2.ctl, ok(3, true));
    expect(a1.send).toBe(false);                                         // the server is on, the wish is off: one DELETE
  });
});

describe("a failure goes back to the last CONFIRMED state", () => {
  test("a failed first tap restores what the server last said, not a guess from the render", () => {
    const base: ReactCtl = { ...off(5), confirmed: { on: false, count: 5 } };
    const sent = tapReact(base);
    const s = settleReact(sent.ctl, fail(500));
    expect(s.ctl.shown).toEqual({ on: false, count: 5 });
    expect(s.ctl.inflight).toBe(false);
    expect(s.ctl.wanted).toBeNull();
    expect(s.error).toBe("Couldn't save your reaction. Try again.");
  });
  test("a failure after an earlier success returns to THAT success, with its count", () => {
    const sent = tapReact(off(3));
    const good = settleReact(sent.ctl, ok(9, true));                     // confirmed: on, 9
    const again = tapReact(good.ctl);                                    // tap off
    const bad = settleReact(again.ctl, fail(0));
    expect(bad.ctl.shown).toEqual({ on: true, count: 9 });
    expect(bad.error).toMatch(/offline/i);
  });
  test("a queued wish is dropped when the request in flight fails (nothing more is sent into a failing server)", () => {
    const t1 = tapReact(off(3)); const t2 = tapReact(t1.ctl);
    const s = settleReact(t2.ctl, fail(0));
    expect(s.send).toBeNull();
    expect(s.ctl.shown).toEqual({ on: false, count: 3 });
  });
  test("a story that is gone (404) says so, and goes back", () => {
    const s = settleReact(tapReact(off(3)).ctl, fail(404, "not_found"));
    expect(s.error).toBe("This story is no longer available.");
    expect(s.ctl.shown).toEqual({ on: false, count: 3 });
  });
  test.each([
    ["no body", { ok: true, status: 200, data: undefined }],
    ["a body that is not an object", { ok: true, status: 200, data: "x" }],
    ["a count that is not a number", { ok: true, status: 200, data: { reaction_count: "3", my_reaction: true } }],
    ["a negative count", { ok: true, status: 200, data: { reaction_count: -1, my_reaction: true } }],
    ["a fractional count", { ok: true, status: 200, data: { reaction_count: 1.5, my_reaction: true } }],
  ])("a 200 with %s is a failure, not a state", (_n, reply) => {
    const s = settleReact(tapReact(off(3)).ctl, reply as any);
    expect(s.ctl.shown).toEqual({ on: false, count: 3 });
    expect(s.error).not.toBeNull();
  });
});

describe("reactReply / reactFailure", () => {
  test("a good reply, with and without my_reaction", () => {
    expect(reactReply({ reaction_count: 2, my_reaction: false }, true)).toEqual({ on: false, count: 2 });
    expect(reactReply({ reaction_count: 2 }, true)).toEqual({ on: true, count: 2 });
  });
  test("a bad reply is null", () => {
    for (const bad of [null, undefined, {}, { reaction_count: "x" }, { reaction_count: -2 }, []]) expect(reactReply(bad, true)).toBeNull();
  });
  test("the messages", () => {
    expect(reactFailure(fail(404))).toBe("This story is no longer available.");
    expect(reactFailure(fail(0))).toMatch(/offline/i);
    expect(reactFailure({ ok: false, status: 0, data: { error: { code: "timeout" } } })).toMatch(/too long/i);
    expect(reactFailure(fail(500))).toBe("Couldn't save your reaction. Try again.");
    expect(reactFailure({ ok: false, status: 500, data: null } as any)).toBe("Couldn't save your reaction. Try again.");
  });
});

describe("the screen", () => {
  const detail = read("screens", "StoryDetailScreen.tsx");
  test("the heart goes through the machine, from a ref, and sends one request at a time", () => {
    expect(detail).toContain("tapReact(");
    expect(detail).toContain("settleReact(");
    expect(detail).toMatch(/const react = useRef/);
    expect(detail).not.toMatch(/my_reaction: !wasOn/);
  });
  test("it says why a reaction did not save, in place", () => {
    expect(detail).toContain('testID="text.storyDetail.reactError"');
  });
  test("a guest's tap still opens the wall and never sends", () => {
    expect(detail).toMatch(/if \(isGuest\) \{ setWallOpen\(true\); return; \}/);
  });
  test("the confirmed state follows a reload of the story (an edit, a refocus)", () => {
    expect(detail).toContain("startReact(");
  });
});
