/**
 * Review step 7a (MQ10) · the Terms of Use MECHANISM on the app side: the guidelines are real and cover the categories a moderator removes
 * things for, the document says honestly whether it holds legal terms yet, a refused post sends the person to accept, and the one place a
 * person can reach all this was a dead control until now (Welcome's "Terms & Privacy" had no handler).
 *
 * ⚠️ The project's rule for a source scan: assert it READ something before it asserts anything was or was not there.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { createApi } from "../api/client";
import { TERMS_VERSION } from "../consent";
import { COMMUNITY_GUIDELINES, TERMS_OF_USE, termsDocument } from "../legal/terms";
import { announceTermsRefusal, isTermsRefusal, setTermsListener } from "../termsGate";

const SRC = join(__dirname, "..");
const read = (rel: string, from = SRC) => {
  const text = readFileSync(join(from, rel), "utf8");
  expect(text.length).toBeGreaterThan(200);
  return text;
};

describe("the guidelines define what may not be posted", () => {
  const all = COMMUNITY_GUIDELINES.flatMap((s) => [s.title, ...s.body]).join("\n").toLowerCase();
  it("covers every category a moderator removes things for", () => {
    for (const word of ["harassment", "scam", "cruelty", "misleading", "spam"]) expect(all).toContain(word);
  });
  it("says what happens, how to report and block, and how to ask for a second look", () => {
    for (const word of ["remove", "suspend", "report", "block", "help & contact", "word"]) expect(all).toContain(word);
  });
  it("has no empty section", () => {
    expect(COMMUNITY_GUIDELINES.length).toBeGreaterThanOrEqual(5);
    for (const s of COMMUNITY_GUIDELINES) expect(s.title.trim() && s.body.every((b) => b.trim())).toBeTruthy();
  });
});

describe("the document is honest about what it holds", () => {
  it("is called the community guidelines until counsel has written the legal terms", () => {
    expect(TERMS_OF_USE).toBeNull();                                     // when counsel's text lands, this test is the reminder to rename
    expect(termsDocument()).toMatchObject({ title: "Community guidelines", hasLegalTerms: false });
  });
  it("puts the legal terms first and renames itself once they exist", () => {
    const legal = [{ title: "Liability", body: ["..."] }];
    const doc = termsDocument(legal);
    expect(doc.title).toBe("Terms & community guidelines");
    expect(doc.hasLegalTerms).toBe(true);
    expect(doc.sections[0]!.title).toBe("Liability");
    expect(doc.sections).toHaveLength(1 + COMMUNITY_GUIDELINES.length);
  });
});

describe("the terms version matches the server's", () => {
  const backend = [process.env.BACKEND_PATH, join(__dirname, "../../../backend"), join(__dirname, "../../backend")]
    .filter((p): p is string => !!p).find((p) => existsSync(join(p, "config/settings.py")));
  (backend ? it : it.skip)("is the same string as backend TERMS_VERSION", () => {
    const m = /^TERMS_VERSION = "([^"]+)"/m.exec(read("config/settings.py", backend as string));
    expect(m).not.toBeNull();
    expect(TERMS_VERSION).toBe((m as RegExpExecArray)[1]);
  });
});

describe("the guidelines point at a way in that exists", () => {
  it("names a Settings row that is really there and opens the support screen", () => {
    const { settingsGroups } = require("../settings");
    const rows = settingsGroups({ shelter: false, privacyUrl: null }).flatMap((g: { rows: unknown[] }) => g.rows) as
      Array<{ label: string; action: { type: string; name?: string } }>;
    expect(rows.length).toBeGreaterThan(5);                                       // it read the real list
    const help = rows.find((r) => r.label === "Help & contact");
    expect(help?.action).toEqual({ type: "navigate", name: "support" });
    expect(COMMUNITY_GUIDELINES.flatMap((x) => x.body).join(" ")).toContain("Settings, then Help & contact");
  });
});

describe("a refused post sends the person to accept", () => {
  afterEach(() => setTermsListener(null));
  it("recognises only the terms refusal, not any other 403", () => {
    expect(isTermsRefusal({ status: 403, data: { error: { code: "terms_not_accepted" } } })).toBe(true);
    expect(isTermsRefusal({ status: 403, data: { error: { code: "verification_required" } } })).toBe(false);
    expect(isTermsRefusal({ status: 401, data: { error: { code: "terms_not_accepted" } } })).toBe(false);
    expect(isTermsRefusal({ status: 403 })).toBe(false);
  });
  it("tells the listener once, and a listener that throws does not break the request", () => {
    const seen = jest.fn();
    setTermsListener(seen);
    announceTermsRefusal();
    expect(seen).toHaveBeenCalledTimes(1);
    setTermsListener(() => { throw new Error("navigation not ready"); });
    expect(() => announceTermsRefusal()).not.toThrow();
  });
  it("is announced by the api client on that answer, and on no other", async () => {
    const seen = jest.fn();
    setTermsListener(seen);
    const answer = (status: number, code: string) => {
      global.fetch = jest.fn(async () => ({ status, ok: status < 400, json: async () => ({ error: { code } }) }) as unknown as Response);
    };
    const api = createApi(() => ({ access: "a", refresh: "r" }), async () => {});
    answer(403, "terms_not_accepted");
    const res = await api.post("/stories", {});
    expect(res.status).toBe(403);                                        // the caller still gets its answer to show
    expect(seen).toHaveBeenCalledTimes(1);
    answer(403, "verification_required");
    await api.post("/stories", {});
    answer(200, "");
    await api.post("/stories", {});
    expect(seen).toHaveBeenCalledTimes(1);
  });
});

describe("the screens and links", () => {
  it("wires Welcome's Terms link, which had no handler", () => {
    expect(read("navigation/RootNavigator.tsx")).toContain('onTerms={() => navigation.navigate("terms")}');
  });
  it("registers the screen and mounts the listener once, beside the session guard", () => {
    expect(read("navigation/RootNavigator.tsx")).toContain('name="terms" component={TermsScreen}');
    const app = readFileSync(join(SRC, "..", "App.tsx"), "utf8");
    expect(app.length).toBeGreaterThan(200);
    expect(app.split("<TermsGate navRef={navRef} />").length - 1).toBe(1);
  });
  it("links from sign-up and from Settings", () => {
    expect(read("screens/SignupScreen.tsx")).toContain('testID="btn.signup.terms"');
    const settings = read("screens/SettingsPrivacyScreen.tsx");
    expect(settings).toContain('testID="link.settingsPrivacy.terms"');
    expect(settings).toContain('<TermsLink onPress={() => navigation.navigate("terms")} />');       // and the screen actually renders it
  });
  it("accepts the CURRENT version and says so honestly when the document moved", () => {
    const screen = read("screens/TermsScreen.tsx");
    expect(screen).toContain('api.post("/me/terms", { version: TERMS_VERSION })');
    expect(screen).toContain("res.status === 409");
    expect(screen).toContain('testID="btn.terms.agree"');
    expect(screen).toContain("accept ? (");                                // the button exists only in accept mode
  });
  it("opens the terms in accept mode from the gate, and not when they are already open", () => {
    const gate = read("auth/TermsGate.tsx");
    expect(gate).toContain('navRef.navigate("terms", { accept: true })');
    expect(gate).toContain('getCurrentRoute()?.name === "terms"');
  });
});
