/**
 * Stories review step 8 (ST8, SQ4), library docs/superpowers/specs/2026-11-09-stories-review.md · a story has bounds the app respects: a caption of at most 2,000
 * characters (SQ4), 1 to 6 photos, one of them the cover (the first), and a detail that can show them all. Before, compose took one photo and an unlimited caption, and
 * the server accepted 200 photos all marked primary; the server now refuses what the app never sends.
 *
 * The photo-list rules are pure so they run as tests (this repo has no render setup); the screen wiring is a source scan and the simulator walk is the proof.
 */
import { readFileSync } from "fs";
import { join } from "path";

import {
  MAX_CAPTION, MAX_PHOTOS, canAddPhoto, captionCount, photosBody, withCover, withPhoto, withoutPhoto,
} from "../storyCompose";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf-8");
const u = (n: number) => `https://bkt/story_photo/a/${n}.jpg`;

describe("the limits", () => {
  test("the server's numbers, in one place", () => {
    expect(MAX_PHOTOS).toBe(6);
    expect(MAX_CAPTION).toBe(2000);
  });
});

describe("withPhoto / canAddPhoto", () => {
  test("a photo is added at the end, and the first one is the cover", () => {
    expect(withPhoto([], u(1))).toEqual([u(1)]);
    expect(withPhoto([u(1)], u(2))).toEqual([u(1), u(2)]);
  });
  test("the same photo twice is one photo (the server refuses a duplicate)", () => {
    expect(withPhoto([u(1)], u(1))).toEqual([u(1)]);
  });
  test("a seventh photo is not added", () => {
    const six = [1, 2, 3, 4, 5, 6].map(u);
    expect(canAddPhoto(six)).toBe(false);
    expect(withPhoto(six, u(7))).toEqual(six);
  });
  test("room is left until six", () => {
    expect(canAddPhoto([])).toBe(true);
    expect(canAddPhoto([1, 2, 3, 4, 5].map(u))).toBe(true);
  });
});

describe("withoutPhoto", () => {
  test("removes one, keeps the order, and the next becomes the cover when the cover goes", () => {
    expect(withoutPhoto([u(1), u(2), u(3)], 1)).toEqual([u(1), u(3)]);
    expect(withoutPhoto([u(1), u(2), u(3)], 0)).toEqual([u(2), u(3)]);
  });
  test("an index that is not there changes nothing", () => {
    expect(withoutPhoto([u(1)], 5)).toEqual([u(1)]);
    expect(withoutPhoto([u(1)], -1)).toEqual([u(1)]);
  });
  test("removing the only photo leaves none (and the story cannot be posted)", () => {
    expect(withoutPhoto([u(1)], 0)).toEqual([]);
  });
});

describe("withCover", () => {
  test("moves the chosen photo to the front and keeps the rest in order", () => {
    expect(withCover([u(1), u(2), u(3)], 2)).toEqual([u(3), u(1), u(2)]);
  });
  test("the cover itself, or an index that is not there, changes nothing", () => {
    expect(withCover([u(1), u(2)], 0)).toEqual([u(1), u(2)]);
    expect(withCover([u(1), u(2)], 9)).toEqual([u(1), u(2)]);
  });
});

describe("photosBody", () => {
  test("every photo in order, exactly the first marked primary", () => {
    expect(photosBody([u(1), u(2), u(3)])).toEqual([
      { file_url: u(1), is_primary: true }, { file_url: u(2), is_primary: false }, { file_url: u(3), is_primary: false },
    ]);
  });
  test("none is none", () => expect(photosBody([])).toEqual([]));
});

describe("captionCount", () => {
  test("says nothing while there is plenty of room", () => {
    expect(captionCount("")).toBeNull();
    expect(captionCount("a".repeat(1700))).toBeNull();
  });
  test("counts once it is within 300 of the limit", () => {
    expect(captionCount("a".repeat(1701))).toBe("1,701 / 2,000");
    expect(captionCount("a".repeat(2000))).toBe("2,000 / 2,000");
  });
  test("counts characters, as the server does: an emoji is one", () => {
    expect(captionCount("🐶".repeat(1800))).toBe("1,800 / 2,000");
  });
});

describe("the screens", () => {
  const compose = read("screens", "StoryComposeScreen.tsx");
  const detail = read("screens", "StoryDetailScreen.tsx");
  const feed = read("screens", "StoriesScreen.tsx");

  test("compose keeps a list of photos and posts them all, the first as the cover", () => {
    expect(compose).toContain("useState<string[]>(");
    expect(compose).toContain("photosBody(photoUrls)");
    expect(compose).not.toMatch(/photos: \[\{ file_url: photoUrl \}\]/);
  });

  test("compose adds through the rules (not past six, not twice), and can remove a photo or choose the cover", () => {
    expect(compose).toContain("withPhoto(");
    expect(compose).toContain("withoutPhoto(");
    expect(compose).toContain("withCover(");
    expect(compose).toContain("canAddPhoto(");
    expect(compose).toContain('testID="btn.storyCompose.addPhoto"');
    expect(compose).toMatch(/testID=\{`btn\.storyCompose\.removePhoto\.\$\{i\}`\}/);
  });

  test("the caption is capped at the limit as it is typed, and counts near the end", () => {
    expect(compose).toMatch(/maxLength=\{MAX_CAPTION\}/);
    expect(compose).toContain("captionCount(");
  });

  test("a story with no photos cannot be posted, and says so", () => {
    expect(compose).toMatch(/photoUrls\.length === 0/);
  });

  test("the wall shows each story's primary photo", () => {
    expect(feed).toMatch(/s\.primary_photo/);
    expect(feed).not.toMatch(/s\.photos\[0\]/);
  });

  test("the detail shows every photo, one after another, and which one it is", () => {
    expect(detail).toContain('testID="gallery.storyDetail"');
    expect(detail).toMatch(/pagingEnabled/);
    expect(detail).toMatch(/Photo \$\{i \+ 1\} of \$\{story\.photos\.length\}/);
  });
});
