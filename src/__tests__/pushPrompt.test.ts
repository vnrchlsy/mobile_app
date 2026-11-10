/**
 * Notifications review step 9 (NP10, NQ6) · the system prompt is spent after a first meaningful action, with an explanation
 * first; sign-in never shows it.
 */
import { readFileSync } from "fs";
import { join } from "path";

import {
  EMPTY_RECORD, parseRecord, promptCopy, PROMPT_COOLDOWN_MS, PROMPT_MAX_SHOWS, PushTrigger, recordShown,
  requestPushPrompt, shouldExplain, subscribePushPrompt
} from "../pushPrompt";

const NOW = 1_800_000_000_000;

describe("shouldExplain", () => {
  it("explains once, while the system prompt is still available", () => {
    expect(shouldExplain({ permission: "undetermined", record: EMPTY_RECORD, now: NOW })).toBe(true);
  });

  it("never when permission is already granted (nothing to ask) or denied (the OS will not ask again)", () => {
    expect(shouldExplain({ permission: "granted", record: EMPTY_RECORD, now: NOW })).toBe(false);
    expect(shouldExplain({ permission: "denied", record: EMPTY_RECORD, now: NOW })).toBe(false);
  });

  it("after a 'Not now', waits two weeks", () => {
    const r = recordShown(EMPTY_RECORD, NOW);
    expect(shouldExplain({ permission: "undetermined", record: r, now: NOW + 1000 })).toBe(false);
    expect(shouldExplain({ permission: "undetermined", record: r, now: NOW + PROMPT_COOLDOWN_MS - 1 })).toBe(false);
    expect(shouldExplain({ permission: "undetermined", record: r, now: NOW + PROMPT_COOLDOWN_MS })).toBe(true);
  });

  it("stops after three explanations, however long ago", () => {
    let r = EMPTY_RECORD;
    for (let i = 0; i < PROMPT_MAX_SHOWS; i++) r = recordShown(r, NOW + i);
    expect(r.shown).toBe(3);
    expect(shouldExplain({ permission: "undetermined", record: r, now: NOW + 10 * PROMPT_COOLDOWN_MS })).toBe(false);
  });
});

describe("parseRecord", () => {
  it("reads what recordShown wrote", () => {
    const r = recordShown(EMPTY_RECORD, NOW);
    expect(parseRecord(JSON.stringify(r))).toEqual(r);
  });

  it("treats anything unreadable as 'never shown'", () => {
    for (const raw of [null, undefined, "", "{", "null", "[]", "42", '{"shown":-1}', '{"shown":"2"}', '{"shown":1.5}']) {
      expect(parseRecord(raw as any)).toEqual(EMPTY_RECORD);
    }
  });

  it("keeps a good count and drops a bad timestamp", () => {
    expect(parseRecord('{"shown":2,"lastShownAt":"yesterday"}')).toEqual({ shown: 2, lastShownAt: null });
    expect(parseRecord('{"shown":2,"lastShownAt":null}')).toEqual({ shown: 2, lastShownAt: null });
  });
});

describe("promptCopy", () => {
  const triggers: PushTrigger[] = ["report", "offer", "inquiry", "shift", "pledge", "shelter_setup"];

  it("says what the person will hear about, for every trigger, and where to change it", () => {
    const bodies = triggers.map((t) => promptCopy(t).body);
    expect(new Set(bodies).size).toBe(triggers.length);               // each one is specific
    for (const b of bodies) expect(b).toMatch(/Settings/);
  });

  it("offers a plain yes and a plain no", () => {
    const c = promptCopy("report");
    expect(c.confirm).toBe("Turn on notifications");
    expect(c.cancel).toBe("Not now");
  });
});

describe("the bus", () => {
  it("delivers a trigger to every subscriber and stops after unsubscribe", () => {
    const a = jest.fn(), b = jest.fn();
    const offA = subscribePushPrompt(a);
    const offB = subscribePushPrompt(b);
    requestPushPrompt("shift");
    offA();
    requestPushPrompt("pledge");
    offB();
    requestPushPrompt("report");
    expect(a.mock.calls).toEqual([["shift"]]);
    expect(b.mock.calls).toEqual([["shift"], ["pledge"]]);
  });

  it("a listener that throws never breaks the screen that asked, nor the next listener", () => {
    const bad = jest.fn(() => { throw new Error("host broke"); });
    const good = jest.fn();
    const o1 = subscribePushPrompt(bad), o2 = subscribePushPrompt(good);
    expect(() => requestPushPrompt("report")).not.toThrow();
    expect(good).toHaveBeenCalledWith("report");
    o1(); o2();
  });

  it("with nobody listening it is a no-op", () => {
    expect(() => requestPushPrompt("inquiry")).not.toThrow();
  });
});

describe("wiring (source scan)", () => {
  const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf8");

  it("sign-in registers silently: it may never show the system prompt", () => {
    const src = read("push", "PushBridge.tsx");
    expect(src).toMatch(/registerAndStore\(api, false\)/);
    expect(src).not.toMatch(/registerAndStore\(api, true\)/);
    expect(src).not.toMatch(/requestPermissionsAsync/);
  });

  it("only a yes at the explainer spends the system prompt", () => {
    const host = read("push", "PushPromptHost.tsx");
    expect(host).toMatch(/registerAndStore\(apiRef\.current, true\)/);
    const closeAt = host.indexOf("function close()");
    const confirmAt = host.indexOf("async function turnOn()");
    expect(closeAt).toBeGreaterThan(-1);
    expect(confirmAt).toBeGreaterThan(closeAt);
    expect(host).toMatch(/onCancel=\{close\}/);                     // 'Not now' just closes
    expect(host).toMatch(/if \(!signedIn\.current\) return/);       // a guest is never asked
  });

  it("the host is mounted by the bridge", () => {
    expect(read("push", "PushBridge.tsx")).toMatch(/<PushPromptHost \/>/);
  });

  it.each([
    ["screens/ReportSentScreen.tsx", "report"],
    ["screens/RescueOfferSentScreen.tsx", "offer"],
    ["screens/KawangGawaRequestedScreen.tsx", "shift"],
    ["screens/DonatePledgeScreen.tsx", "pledge"],
    ["screens/ListingDetailScreen.tsx", "inquiry"],
    ["screens/ShelterVerifyScreen.tsx", "shelter_setup"],
    ["screens/ShelterVerifyNgoScreen.tsx", "shelter_setup"],
  ])("%s asks after the action succeeds (%s)", (file, trigger) => {
    expect(read(...file.split("/"))).toContain(`requestPushPrompt("${trigger}")`);
  });

  it("the inquiry prompt waits for the confirmation alert to be dismissed (an alert and a modal cannot be up together)", () => {
    const src = read("screens", "ListingDetailScreen.tsx");
    expect(src).toMatch(/const ask = \(go\?: \(\) => void\) => \(\) => \{ go\?\.\(\); requestPushPrompt\("inquiry"\)/);
    expect(src).not.toMatch(/Alert\.alert\(copy\.title[^;]*\);\s*requestPushPrompt/);
  });

  it("a shelter that only deferred verification is not asked", () => {
    const src = read("screens", "ShelterVerifyScreen.tsx");
    const deferAt = src.indexOf("function onDefer()");
    expect(src.indexOf('requestPushPrompt("shelter_setup")')).toBeLessThan(deferAt);
  });
});
