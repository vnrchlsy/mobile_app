import { StyleProp, ViewStyle } from "react-native";

import { storyTypeChip, StoryType } from "../community";
import { storyChipTone } from "../storyFeed";
import { Chip } from "./ui";

/** Stories review step 13 (ST17, V6) · a story's type (Adoption, Rescue, General) on the shared status tones. One component, so the wall and the story page cannot drift. */
export function StoryTypeChip({ type, style }: { type: StoryType; style?: StyleProp<ViewStyle> }) {
  const chip = storyTypeChip(type);
  return <Chip label={chip.label} tone={storyChipTone(chip.tone)} style={style} />;
}
