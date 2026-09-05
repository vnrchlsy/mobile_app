/**
 * US-R5 · a form that warns about a failed prefill must also REFUSE TO SUBMIT.
 *
 * WHY THIS IS ITS OWN GUARD. `ListingFormScreen` in edit mode started every field empty and
 * filled them from a GET. When that GET failed, the form still rendered — blanks over a real
 * adoption listing — and `submit()` checked only that the name was non-empty. Open Edit on a
 * bad connection, retype the name, tap Save, and the PATCH wiped the description, cleared the
 * breed and birthdate, moved the animal to the editor's own city, and set the adoption fee to
 * ₱0. Nothing crashed and no error was ever shown.
 *
 * PrefillWarning's rule 3 is the fix — "the banner is information, not enforcement" — and it
 * is the half that is easy to lose. A banner is visible in review; a missing early-return in
 * submit() is not, and deleting it turns the tests green while re-arming the overwrite. So
 * this checks the enforcement, not the notice.
 *
 * ⚠️ Scope is DERIVED (see loadStateScreens.test.ts for why that rule exists): any screen
 * that renders PrefillWarning is enrolled automatically, with no list to keep in step.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const read = (f: string) => readFileSync(join(SCREENS, f), "utf8");

/** Screens that warn about a failed prefill — the ones rule 3 applies to. */
const FORMS = readdirSync(SCREENS)
  .filter((f) => f.endsWith(".tsx") && read(f).includes("<PrefillWarning"));

/** The body of `async function submit()`, brace-matched — regex can't do this. */
function submitBody(src: string): string {
  const start = src.search(/async function submit\s*\(/);
  if (start === -1) return "";
  const open = src.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(open, i + 1);
  }
  return "";
}

describe("the scan has a scope", () => {
  it("found forms that warn about a failed prefill", () => {
    // Without this, deleting every PrefillWarning in the app would make this file pass by
    // checking nothing at all — the failure mode US-G1 was written for.
    expect(FORMS.length).toBeGreaterThan(0);
  });
});

describe.each(FORMS)("%s refuses to submit when its prefill failed", (file) => {
  const src = read(file);

  it("has a submit() this guard can actually see", () => {
    // A renamed or inlined handler would silently empty the assertion below.
    expect(submitBody(src).length).toBeGreaterThan(0);
  });

  it("returns early on the prefill failure, not just on field validation", () => {
    const body = submitBody(src);
    // The flag the banner is rendered from must also appear inside submit(). What this
    // forbids is the shape the bug had: a visible warning and a submit() that ignores it.
    // The two shapes in use: a dedicated `prefillFailed` flag, or a required value that the
    // prefill is what supplies (NeedForm's `myId` — without it the POST goes to
    // /shelters/null/needs). Either is fine; ignoring both is not.
    expect(body).toMatch(/prefillFailed|!myId/);
    expect(body).toMatch(/return;/);
  });
});
