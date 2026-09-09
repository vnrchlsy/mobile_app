import { initErrorReporting, releaseTag, scrub } from "../observability";

describe("scrub", () => {
  it("keeps a stray report's precise coordinates on the device", () => {
    // §12.5 · the API withholds the exact pin from every other surface. An error tracker
    // captures request bodies by default, so without this it becomes the back door around
    // the one rule the rest of the app spends real effort enforcing.
    const event = { extra: { body: { lat: 14.6349, lng: 121.0509, species: "dog" } } };
    const out: any = scrub(event);

    expect(out.extra.body.lat).toBe("[redacted]");
    expect(out.extra.body.lng).toBe("[redacted]");
    expect(out.extra.body.species).toBe("dog");
  });

  it("redacts credentials wherever they sit", () => {
    const raw = JSON.stringify(scrub({
      a: { password: "hunter2", refresh: "eyJ.tok", headers: { authorization: "Bearer xyz" } },
    }));
    for (const secret of ["hunter2", "eyJ.tok", "Bearer xyz"]) {
      expect(raw).not.toContain(secret);
    }
  });

  it("redacts contact details even inside free text", () => {
    // They arrive in exception messages, not just in tidy fields.
    const out = scrub({ message: "failed for ana@example.ph / +639171234567" }) as any;
    expect(out.message).not.toContain("ana@example.ph");
    expect(out.message).not.toContain("+639171234567");
  });

  it("leaves ordinary diagnostics alone", () => {
    // Over-scrubbing makes the tool useless, and a tool nobody can debug with gets removed.
    const out = scrub({ message: "TypeError in StoriesScreen", extra: { status: 500 } }) as any;
    expect(out.message).toBe("TypeError in StoriesScreen");
    expect(out.extra.status).toBe(500);
  });

  it("never throws on odd input", () => {
    for (const weird of [null, undefined, 42, "s", [], {}]) {
      expect(() => scrub(weird)).not.toThrow();
    }
  });
});

describe("releaseTag", () => {
  it("distinguishes an OTA bundle from the binary it landed on", () => {
    // §16.4 ships JS-only fixes over the air, so one native binary may run several bundles.
    // Without this, a crash from an OTA update looks identical to one in the binary — and
    // the OTA strategy is undebuggable exactly when it is being used to fix something.
    const tag = releaseTag();
    expect(tag).toMatch(/^kupkop-mobile@/);
    expect(tag).toContain("+");
  });
});

describe("initErrorReporting", () => {
  it("is a no-op until a DSN is configured", () => {
    // The FCM/S3 seam posture: real code path, deploy-time credential, silent by default.
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    expect(initErrorReporting()).toBe(false);
  });
});
