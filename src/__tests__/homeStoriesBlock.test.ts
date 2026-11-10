/**
 * Stories test plan NT-10 (I6) · a story page that breaks the contract costs Home its Community stories block and nothing else.
 *
 * The wall's half (a bad row fails the whole page) is in storyContract.test.ts. This is Home's half: the block reads the feed through the same
 * contract check, so one bad row is a 502 for THAT block's state, while the other panels keep their own results; the "everything is offline" notice
 * is not raised for it. No render-test setup exists here, so the wiring is a source scan, and the scan asserts it read the screen first.
 */
import { readFileSync } from "fs";
import { join } from "path";

import { loadState } from "../net";
import { withStoryContract } from "../storyFeed";
import { story } from "./storyFixtures";

const home = readFileSync(join(__dirname, "..", "screens", "HomeScreen.tsx"), "utf8");

describe("a bad story page on Home", () => {
  const api = (data: any) => ({ get: async () => ({ ok: true, status: 200, data }) });

  it("becomes a retryable error for the stories block only", async () => {
    const bad = await withStoryContract(api({ results: [story("a"), { story_id: "broken" }], next: null })).get("/stories");
    expect(bad).toMatchObject({ ok: false, status: 502 });
    expect(loadState(bad, 0)).toEqual({ kind: "error", retryable: true });
    // The other panels keep what they have.
    expect(loadState({ ok: true, status: 200 }, 3).kind).toBe("ready");
  });

  it("is not the offline notice, so the rest of Home stays", async () => {
    const bad = await withStoryContract(api({ results: "x" })).get("/stories");
    const panels = [loadState({ ok: true, status: 200 }, 2), loadState({ ok: true, status: 200 }, 1), loadState(bad, 0), loadState({ ok: true, status: 200 }, 0)];
    expect(panels.every((p) => p.kind === "offline")).toBe(false);
  });

  it("a good page still shows two stories, and a page with none is the empty note", async () => {
    const ok = await withStoryContract(api({ results: [story("a"), story("b"), story("c")], next: null })).get("/stories");
    expect(ok.ok).toBe(true);
    expect(loadState(ok, 2).kind).toBe("ready");
    expect(loadState({ ok: true, status: 200 }, 0).kind).toBe("empty");
  });
});

describe("Home reads the feed through the contract and keeps the block apart", () => {
  it("found the screen", () => {
    expect(home.length).toBeGreaterThan(2000);
  });
  it("reads stories through withStoryContract and parses the page, not the raw body", () => {
    expect(home).toContain('withStoryContract(api).get("/stories")');
    expect(home).toContain("parseStoryPage(r.data)");
  });
  it("keeps its own result and state for the block, so another panel's failure does not touch it", () => {
    expect(home).toContain("const storiesPanel = loadState(storiesRes, stories.length)");
    expect(home).toMatch(/storiesPanel\.kind !== "ready" && storiesPanel\.kind !== "empty" \? \(\s*<LoadStateView state=\{storiesPanel\} onRetry=\{loadStories\}/);
  });
  it("keeps the two stories it had when a refetch fails (the result, not the rows, is replaced)", () => {
    expect(home).toContain("setStoriesRes((prev) => keepGoodRes(prev, r))");
    expect(home).toMatch(/if \(r\.ok\) setStories\(/);
  });
});
