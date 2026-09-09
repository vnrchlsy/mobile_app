import {
  blockerCopy, blockerHeadline, confirmationMatches, exportFilename, humanSize, privacyRows,
} from "../settings";

const settings = {
  marketing_emails: false, approximate_location: true, masked_contact: true,
  push_enabled: true, analytics_consent: false, analytics_consent_at: null,
};

describe("confirmationMatches", () => {
  it("accepts the word as asked", () => {
    expect(confirmationMatches("DELETE")).toBe(true);
  });

  it("forgives a mobile keyboard's trailing space and casing", () => {
    // The confirmation proves deliberate intent; it is not a typing test. Rejecting
    // "Delete " from someone who did exactly what was asked is hostile, not safe.
    expect(confirmationMatches("delete")).toBe(true);
    expect(confirmationMatches("  Delete  ")).toBe(true);
  });

  it("rejects anything else, including near misses and empty input", () => {
    expect(confirmationMatches("")).toBe(false);
    expect(confirmationMatches("DELET")).toBe(false);
    expect(confirmationMatches("DELETE ME")).toBe(false);
    expect(confirmationMatches("remove")).toBe(false);
  });
});

describe("blockerCopy", () => {
  it("tells the user what to DO, not just what is wrong", () => {
    expect(blockerCopy({ kind: "rescue_claim", label: "Open rescue claim", id: "1" }).action)
      .toMatch(/resolve|hand over/i);
    expect(blockerCopy({ kind: "volunteer_shift", label: "Kawang-Gawa shift", id: "2" }).action)
      .toMatch(/cancel/i);
    expect(blockerCopy({ kind: "adoption_inquiry", label: "Adoption inquiry", id: "3" }).action)
      .toMatch(/finish|decline/i);
  });

  it("still renders a kind it has never seen", () => {
    // A blocker the user cannot see is a dead end — an unknown future kind must degrade to
    // the server's own label rather than disappearing from the list.
    const row = blockerCopy({ kind: "some_future_thing", label: "Pending payout", id: "4" });
    expect(row.title).toBe("Pending payout");
    expect(row.action).toBeTruthy();
  });

  it("falls back to a title when the server sends none", () => {
    expect(blockerCopy({ kind: "x", label: "", id: "5" }).title).toBe("Open commitment");
  });
});

describe("blockerHeadline", () => {
  it("counts them out loud", () => {
    expect(blockerHeadline(1)).toBe("One thing needs closing first");
    expect(blockerHeadline(2)).toBe("2 things need closing first");
  });
});

describe("privacyRows", () => {
  it("offers exactly the three switches that do something", () => {
    const keys = privacyRows(settings).toggles.map((t) => t.key);
    expect(keys).toEqual(["push_enabled", "marketing_emails", "analytics_consent"]);
  });

  it("never renders masked contact or approximate location as toggles", () => {
    // D-S7-3 + the design system: masked_contact describes Phase-2 chat and
    // approximate_location is enforced server-side either way. A switch the user does not
    // actually hold is theatre, and on the privacy screen it is a broken promise.
    const keys = privacyRows(settings).toggles.map((t) => String(t.key));
    expect(keys).not.toContain("masked_contact");
    expect(keys).not.toContain("approximate_location");
  });

  it("states them as facts instead", () => {
    const facts = privacyRows(settings).facts;
    expect(facts).toHaveLength(2);
    expect(facts.map((f) => f.label).join(" ")).toMatch(/city-only/i);
    expect(facts.map((f) => f.label).join(" ")).toMatch(/hidden/i);
  });

  it("reflects the stored values", () => {
    const rows = privacyRows({ ...settings, analytics_consent: true, push_enabled: false });
    expect(rows.toggles.find((t) => t.key === "analytics_consent")!.value).toBe(true);
    expect(rows.toggles.find((t) => t.key === "push_enabled")!.value).toBe(false);
  });

  it("says what analytics does NOT collect", () => {
    // "Help us improve" without that sentence is not informed consent.
    const note = privacyRows(settings).toggles.find((t) => t.key === "analytics_consent")!.note;
    expect(note).toMatch(/never/i);
  });
});

describe("exportFilename", () => {
  it("matches the server's Content-Disposition shape", () => {
    expect(exportFilename(new Date("2026-09-04T10:00:00Z"))).toBe("kupkop-export-2026-09-04.json");
  });
});

describe("humanSize", () => {
  it("never shows a person a raw byte count they cannot picture", () => {
    expect(humanSize(512)).toBe("512 B");
    expect(humanSize(151552)).toBe("148 KB");
    expect(humanSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
