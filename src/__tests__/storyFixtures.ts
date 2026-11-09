// Shared by the story tests: one complete story as the server sends it (backend StorySerializer), and a way to change it.
import type { Story } from "../community";

export function story(id: string, over: Partial<Story> = {}): Story {
  return {
    story_id: id,
    author: { name: "Ana Poster", city: "Marikina" },
    story_type: "general",
    caption: `caption ${id}`,
    status: "published",
    photos: [{ url: `https://bkt/story_photo/a/${id}.jpg`, is_primary: true }],
    primary_photo: `https://bkt/story_photo/a/${id}.jpg`,
    reaction_count: 0,
    my_reaction: false,
    mine: false,
    created_at: "2026-11-09T09:28:25.155497Z",
    link: null,
    ...over,
  };
}
