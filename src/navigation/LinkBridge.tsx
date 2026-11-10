// Stories review step 11 (SQ5) · routes a `kupkop://stories/{id}` link (a shared story) to the story. The app had the scheme registered and no routing, so a shared link
// opened the app on whatever screen it was on. Mounted inside NavigationContainer like PushBridge. A story is public, so it opens for a guest too (StoryDetail is a guest
// screen, SessionGuard.tsx); it is pushed on top of whatever the app opened on, so Back works. Anything that is not a story link is ignored.
import { NavigationContainerRefWithCurrent } from "@react-navigation/native";
import { useEffect } from "react";
import { Linking } from "react-native";

import { storyIdFromUrl } from "../storyShare";
import type { RootStackParamList } from "./types";

type Props = { navRef: NavigationContainerRefWithCurrent<RootStackParamList> };

export function LinkBridge({ navRef }: Props) {
  useEffect(() => {
    let cancelled = false;
    // The navigator may not be ready on a cold start: wait for it, then go once.
    function open(url: string | null) {
      const storyId = storyIdFromUrl(url);
      if (!storyId) return;
      const go = () => navRef.navigate("storyDetail", { storyId });
      if (navRef.isReady()) go();
      else {
        const off = navRef.addListener("state", () => { off(); if (!cancelled) go(); });
      }
    }
    Linking.getInitialURL().then(open).catch(() => undefined);
    const sub = Linking.addEventListener("url", (e) => open(e.url));
    return () => { cancelled = true; sub.remove(); };
  }, [navRef]);
  return null;
}
