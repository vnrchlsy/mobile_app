// Stories review step 9 (ST9, ST10) · the react heart, as a small pure state machine so its races run as tests.
//
// Rules: the shown state flips at once; ONE request is in flight at a time; taps during it are remembered as a single wish (the last); the server's answer
// (`reaction_count` AND `my_reaction`) becomes the confirmed state; if the wish differs from it, one more request is sent; and a failure goes back to the LAST CONFIRMED
// state, never to a guess from a render. Before this the app guessed `my_reaction` from what it had just sent, and two quick taps could end on the wrong state.
export type ReactState = { on: boolean; count: number };
export type ReactCtl = {
  /** What the server last said. */
  confirmed: ReactState;
  /** What the heart shows: the finger's state while a request is out. */
  shown: ReactState;
  inflight: boolean;
  /** The state the request in flight asked for (the fallback when an older server does not say `my_reaction`). */
  requested: boolean | null;
  /** The latest tap made while a request was in flight, or null. */
  wanted: boolean | null;
};
type Reply = { ok: boolean; status: number; data?: any };

export function startReact(on: boolean, count: number): ReactCtl {
  const state = { on, count };
  return { confirmed: state, shown: state, inflight: false, requested: null, wanted: null };
}

const flip = (s: ReactState, on: boolean): ReactState => ({ on, count: Math.max(0, s.count + (on ? 1 : -1)) });

/** A tap. `send` is the state to ask the server for now, or null when a request is already out (the tap is remembered). */
export function tapReact(ctl: ReactCtl): { ctl: ReactCtl; send: boolean | null } {
  const desired = !ctl.shown.on;
  const shown = flip(ctl.shown, desired);
  if (ctl.inflight) return { ctl: { ...ctl, shown, wanted: desired }, send: null };
  return { ctl: { ...ctl, shown, inflight: true, requested: desired, wanted: null }, send: desired };
}

/** The state in a good answer, or null when it is not one (a count that is not a whole number is not a state). */
export function reactReply(data: any, fallbackOn: boolean): ReactState | null {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
  const count = data.reaction_count;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 0) return null;
  return { on: typeof data.my_reaction === "boolean" ? data.my_reaction : fallbackOn, count };
}

export function reactFailure(res: Reply): string {
  const code = typeof res.data?.error?.code === "string" ? res.data.error.code : "";
  if (res.status === 404) return "This story is no longer available.";
  if (code === "timeout") return "That took too long. Your reaction wasn't saved.";
  if (res.status === 0 || code === "network_error") return "You're offline. Your reaction wasn't saved.";
  return "Couldn't save your reaction. Try again.";
}

/** An answer arrived. `send` is one more request to make (the wish differed from the answer), `error` a message to show, if it failed. */
export function settleReact(ctl: ReactCtl, res: Reply): { ctl: ReactCtl; send: boolean | null; error: string | null } {
  const confirmed = res.ok ? reactReply(res.data, ctl.requested ?? ctl.shown.on) : null;
  if (!confirmed) {
    // Back to what the server last said, and the wish is dropped: nothing more is sent into a failing server.
    return { ctl: { confirmed: ctl.confirmed, shown: ctl.confirmed, inflight: false, requested: null, wanted: null }, send: null, error: reactFailure(res) };
  }
  if (ctl.wanted !== null && ctl.wanted !== confirmed.on) {
    const wanted = ctl.wanted;
    return { ctl: { confirmed, shown: flip(confirmed, wanted), inflight: true, requested: wanted, wanted: null }, send: wanted, error: null };
  }
  return { ctl: { confirmed, shown: confirmed, inflight: false, requested: null, wanted: null }, send: null, error: null };
}
