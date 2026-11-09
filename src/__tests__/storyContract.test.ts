/**
 * Stories review step 5 (ST6, ST16), library docs/superpowers/specs/2026-11-09-stories-review.md · a story has one declared shape.
 *
 * The app kept three hand-copied types of a story (`StoryCard`, `Story`, `StoryRowData`) and read every answer as `any`; the server built the
 * answer by hand. Now backend `StorySerializer` says what a story is, `Story` / `StoryPage` here are held to it (backend's test_stories_contract.py
 * compares their keys), and `parseStory` / `parseStoryPage` check an answer at the one boundary (the rule `parseImpact` applies).
 *
 *  - Identity is never guessed: a story that cannot say which it is, who wrote it, its photos, or its count makes the whole page invalid, which
 *    shows an error with a retry, never a shorter wall.
 *  - Decoration degrades: a missing date, link or `mine` (an older server) costs the line, not the wall.
 *  - The date is the posting date; the link opens the adoption or rescue the story is about, through the screens that already gate them (D-S6-4).
 */
import { readFileSync } from "fs";
import { join } from "path";

import {
  parseStory, parseStoryPage, storyDate, storyLinkAction,
} from "../community";
import { withStoryContract } from "../storyFeed";
import { story } from "./storyFixtures";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");

describe("parseStory", () => {
  test("a complete story passes, unchanged", () => {
    const s = story("a", { reaction_count: 3, my_reaction: true, mine: true, link: { type: "adoption", id: "L1" } });
    expect(parseStory(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  test("fields the app does not know are ignored and not copied (the server may add to the shape)", () => {
    expect(parseStory({ ...story("a"), future_field: 1 })).toEqual(story("a"));
  });

  test.each([
    ["no story_id", { story_id: undefined }],
    ["an empty story_id", { story_id: "" }],
    ["a numeric story_id", { story_id: 5 }],
    ["no author", { author: undefined }],
    ["an author with no name", { author: { city: "x" } }],
    ["photos not an array", { photos: "x" }],
    ["a photo with no url", { photos: [{ is_primary: true }] }],
    ["a negative count", { reaction_count: -1 }],
    ["a fractional count", { reaction_count: 1.5 }],
    ["a count that is a string", { reaction_count: "3" }],
    ["my_reaction not a boolean", { my_reaction: "yes" }],
  ])("%s makes the story invalid (identity is never guessed)", (_n, over) => {
    expect(parseStory({ ...story("a"), ...over })).toBeNull();
  });

  test.each([null, undefined, 5, "x", [], true])("%p is not a story", (v) => {
    expect(parseStory(v)).toBeNull();
  });

  test("an older server (no created_at, link, mine or primary_photo) still reads, with the extras empty", () => {
    const old: any = story("a");
    delete old.created_at; delete old.link; delete old.mine; delete old.primary_photo;
    expect(parseStory(old)).toMatchObject({ created_at: null, link: null, mine: false, primary_photo: old.photos[0].url });
  });

  test("a story with no photos has no primary photo", () => {
    expect(parseStory({ ...story("a"), photos: [], primary_photo: undefined })).toMatchObject({ photos: [], primary_photo: null });
  });

  test("an unknown type reads as general, a missing status as published, a missing city as empty", () => {
    const s = parseStory({ ...story("a"), story_type: "wishlist", status: undefined, author: { name: "Ana" } });
    expect(s).toMatchObject({ story_type: "general", status: "published", author: { name: "Ana", city: "" } });
  });

  test.each([
    ["an unknown link type", { type: "wishlist", id: "x" }],
    ["a link with no id", { type: "adoption" }],
    ["a link that is not an object", "L1"],
  ])("%s is dropped, not fatal", (_n, link) => {
    expect(parseStory({ ...story("a"), link })?.link).toBeNull();
  });

  test("an unparseable date is dropped, not fatal", () => {
    expect(parseStory({ ...story("a"), created_at: "garbage" })?.created_at).toBeNull();
  });
});

describe("parseStoryPage", () => {
  test("a page and its cursor", () => {
    expect(parseStoryPage({ results: [story("a"), story("b")], next: "c1" })).toEqual({ results: [story("a"), story("b")], next: "c1" });
  });
  test("an empty page, and a page with no cursor (an older server), end the list", () => {
    expect(parseStoryPage({ results: [], next: null })).toEqual({ results: [], next: null });
    expect(parseStoryPage({ results: [story("a")] })).toEqual({ results: [story("a")], next: null });
  });
  test("ONE bad story makes the whole page invalid, never a shorter wall", () => {
    expect(parseStoryPage({ results: [story("a"), { story_id: "b" }], next: null })).toBeNull();
  });
  test("the same story twice in one page is invalid (it would draw one card twice)", () => {
    expect(parseStoryPage({ results: [story("a"), story("a")], next: null })).toBeNull();
  });
  test.each([null, undefined, {}, { results: "x" }, { next: "c" }, []])("%p is not a page", (v) => {
    expect(parseStoryPage(v)).toBeNull();
  });
});

describe("withStoryContract", () => {
  const api = (r: { ok: boolean; status: number; data: any }) => ({ get: async () => r });
  test("a good page passes through untouched", async () => {
    const r = { ok: true, status: 200, data: { results: [story("a")], next: null } };
    expect(await withStoryContract(api(r)).get("/stories")).toBe(r);
  });
  test("a 200 that breaks the contract is a server fault (502), not a success and not an empty wall", async () => {
    const out = await withStoryContract(api({ ok: true, status: 200, data: { results: [{ story_id: "x" }], next: null } })).get("/stories");
    expect(out).toMatchObject({ ok: false, status: 502 });
  });
  test("a failure passes through as it was (offline stays offline)", async () => {
    const r = { ok: false, status: 0, data: null };
    expect(await withStoryContract(api(r)).get("/stories")).toBe(r);
  });
});

describe("storyDate", () => {
  test("a date, in words", () => {
    expect(storyDate("2026-11-09T09:28:25.155497Z")).toMatch(/2026/);
  });
  test.each([null, undefined, "", "garbage"])("%p is no date", (v) => {
    expect(storyDate(v as any)).toBeNull();
  });
});

describe("storyLinkAction", () => {
  test("an adoption opens its listing, a rescue its report", () => {
    expect(storyLinkAction({ type: "adoption", id: "L1" })).toEqual({ label: "See the adoption listing", route: "listingDetail", params: { listingId: "L1" } });
    expect(storyLinkAction({ type: "rescue", id: "R1" })).toEqual({ label: "See the rescue", route: "reportDetail", params: { reportId: "R1" } });
  });
  test("no link, no action", () => {
    expect(storyLinkAction(null)).toBeNull();
  });
});

describe("the screens use the one type", () => {
  const feed = read("screens", "StoriesScreen.tsx");
  const detail = read("screens", "StoryDetailScreen.tsx");

  test("neither screen declares a story shape of its own", () => {
    expect(feed).not.toMatch(/export type StoryCard\b|type StoryCard =/);
    expect(detail).not.toMatch(/type Story = \{/);
    expect(feed).toMatch(/from "\.\.\/community"/);
    expect(detail).toMatch(/from "\.\.\/community"/);
  });

  test("the feed's answers go through the contract check, first page and later pages", () => {
    expect(feed).toContain("withStoryContract(");
  });

  test("the detail checks its answer, and a bad one is an error with a retry, not a blank story", () => {
    expect(detail).toContain("parseStory(");
    expect(detail).toMatch(/502/);
  });

  test("both screens say when the story was posted", () => {
    expect(feed).toContain("storyDate(");
    expect(detail).toContain("storyDate(");
  });

  test("the detail offers the link to the adoption or rescue, through the gated screens", () => {
    expect(detail).toContain("storyLinkAction(");
    expect(detail).toContain('testID="btn.storyDetail.link"');
    expect(detail).toMatch(/navigation\.navigate\("listingDetail", link\.params\)/);
    expect(detail).toMatch(/navigation\.navigate\("reportDetail", link\.params\)/);
  });
});
