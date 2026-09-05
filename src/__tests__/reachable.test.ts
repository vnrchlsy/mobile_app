/**
 * Every .tsx under src/ must be reachable from the app's entry point.
 *
 * WHY. Five files — 1,406 lines — were early mockup translations that real screens replaced
 * and nobody deleted: a whole second `ProfileScreen`, a `PetDetailScreen`, the rescuer and
 * shelter onboarding flows, and the `BottomTabs` only the dead profile used. They render
 * hard-coded people ("Ana Reyes", pets "Milo" and "Luna"), and eight of their buttons have
 * no `onPress` at all, which is what a mockup is.
 *
 * Dead code that merely sits there is a small problem. This was not merely sitting there:
 *
 *   1. IT ABSORBED MAINTENANCE. The 2026-09-04 touch-target sweep "fixed" 14 controls
 *      across these files — real work, on screens no one can open.
 *   2. IT INFLATED THE GUARDS. `touchTargets` scans all of src/, so those 14 controls
 *      counted toward the app's apparent coverage. Every number the accessibility and
 *      touch-target guards printed was partly about screens that do not exist.
 *   3. IT WASTED A FIX. The status-bar work added a focus-scoped `setStatusBarStyle` to
 *      `src/ProfileScreen.tsx` — the dead one — because a `grep` for the name matched it.
 *
 * ⚠️ THE BASENAME TRAP, WHICH IS WHY THIS WALKS IMPORTS INSTEAD. Checking "is ProfileScreen
 * referenced in RootNavigator?" says yes: the navigator imports one from
 * `../screens/ProfileScreen`. A different file, same basename. Matching on names rather than
 * resolved paths reported the dead file as live and hid it for two sprints. Reachability is
 * a property of the module GRAPH, so this follows the graph.
 */
import { existsSync, readdirSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";

const APP_ROOT = join(__dirname, "..", "..");
const SRC = resolve(join(__dirname, ".."));

/** Resolve a relative import the way Metro does, trying the extensions this project uses. */
function resolveImport(from: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;          // node_modules — not our concern
  const base = resolve(dirname(from), spec);
  for (const candidate of [`${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Everything reachable from the real entry points, by following relative imports. */
function reachable(): Set<string> {
  const seen = new Set<string>();
  const queue = [join(APP_ROOT, "App.tsx"), join(APP_ROOT, "index.js")].filter(existsSync);
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/(?:from|require\()\s*["']([^"']+)["']/g)) {
      const next = resolveImport(file, m[1]);
      if (next) queue.push(next);
    }
  }
  return seen;
}

/** Every .tsx under src/, excluding tests (which are entry points of their own). */
function allScreens(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : allScreens(p);
    return e.name.endsWith(".tsx") ? [resolve(p)] : [];
  });
}

describe("every .tsx under src/ is reachable from the app", () => {
  const live = reachable();
  const files = allScreens(SRC);

  it("found the module graph", () => {
    // If resolution breaks, `live` collapses and every file below looks dead — a guard that
    // fails loudly for the wrong reason is only marginally better than one that passes for
    // the wrong reason. This says the walk actually walked.
    expect(live.size).toBeGreaterThan(50);
  });

  it("found files to check", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("has no unreachable screens or components", () => {
    const dead = files.filter((f) => !live.has(f)).map((f) => f.slice(SRC.length + 1)).sort();
    expect(dead).toEqual([]);
  });
});

/**
 * A second flavour, which the module walk above CANNOT see.
 *
 * `VolunteerScreen` was a placeholder — "Kawang-Gawa volunteer shifts are coming soon" —
 * registered as a route, so RootNavigator imported it and the graph called it reachable.
 * But nothing navigated to it: the Volunteer tab goes to the real Kawang-Gawa hub instead
 * (see OwnerTabs). Reachable as a module, unreachable as a screen, and superseded by the
 * feature it stood in for. One orphan among 91 routes.
 *
 * ⚠️ This is the check that would have caught the placeholder even if it had been imported
 * "properly" — which it was. Module reachability and NAVIGATION reachability are different
 * questions, and a screen only exists if a person can get to it.
 */
describe("every registered route can be navigated to", () => {
  const NAV = join(SRC, "navigation", "RootNavigator.tsx");
  const nav = readFileSync(NAV, "utf8");
  const registered = [...nav.matchAll(/<Stack\.Screen name="(\w+)"/g)].map((m) => m[1]);

  /** Every route name any screen actually navigates/replaces to, plus the initial routes. */
  function destinations(): Set<string> {
    const all = allScreens(SRC)
      .concat([NAV, join(APP_ROOT, "App.tsx")])
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    const out = new Set<string>();
    for (const re of [/navigate\(\s*["'](\w+)["']/g, /replace\(\s*["'](\w+)["']/g,
                      /name:\s*["'](\w+)["']/g, /initialRouteName=\{?[^}]*?["'](\w+)["']/g]) {
      for (const m of all.matchAll(re)) out.add(m[1]);
    }
    return out;
  }

  it("found routes to check", () => {
    expect(registered.length).toBeGreaterThan(50);
  });

  it("has no orphan routes", () => {
    const reached = destinations();
    expect(registered.filter((r) => !reached.has(r)).sort()).toEqual([]);
  });
});
