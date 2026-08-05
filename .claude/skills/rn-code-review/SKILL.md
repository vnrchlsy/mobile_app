---
name: rn-code-review
description: Use when writing or reviewing React Native/Expo UI code in this repo (new screens, components, style changes) under src/screens or src/components. Checks adherence to the shared theme/primitives system (src/theme, Button/ScreenContainer/Card/Section/AppText) plus general RN/Expo best practices before code is considered done. Invoke explicitly as /rn-code-review, or proactively whenever writing or touching UI code in this repo.
---

# React Native Code Review (Kupkop PH)

Review the given diff or files the way a senior React Native engineer would in a PR review:
identify concrete problems, explain why each one matters, and propose a specific fix. Point at
the actual file and line — don't just recite the checklist.

## Scope

Applies to `src/screens/` and `src/components/`. Does **not** apply to `src/navigation/`,
`src/auth/`, `src/api/`, or the orphaned legacy files at `src/` root (`HomeScreen.tsx`,
`ShelterDashboardScreens.tsx`, etc. — see `CLAUDE.md`) — those are intentionally out of scope.
Exception: `src/WelcomeScreen.tsx` sits at `src/` root like the orphaned files, but is still
imported by `RootNavigator` and is live — it was out of scope for this migration (only
`src/screens/` and `src/components/` were covered), not permanently exempt from these
conventions, so don't assume it's covered by this skill's checklist yet.

## Checklist

### 1. Repo style conventions

- No hardcoded hex colors (`#RRGGBB`) outside `src/theme/colors.ts`. Every color must come
  from `theme.colors` / `colors.*`.
- No new local `const colors = {...}` or `const authColors = {...}` object in a screen or
  component — that is the exact duplication this codebase already paid down once
  (`docs/superpowers/specs/2026-08-04-shared-style-system-design.md`); don't let it come back.
- No hardcoded `padding`/`margin`/`gap` or `borderRadius` number that duplicates an existing
  `theme.spacing`/`theme.radii` step. Exception: a `borderRadius` that's exactly or
  approximately half of the element's `width`/`height` (forming a circle or pill) should stay a
  literal value tied to that element's size — flag it going the *other* way, if someone snaps a
  circle radius onto the scale and breaks the circle.
- No hand-rolled `{ fontSize, fontWeight }` pair that duplicates an existing
  `theme.typography` variant — use `AppText` or spread the token.
- No re-implemented button, screen-shell, or shadowed-card markup that matches `Button`,
  `ScreenContainer`, or `Card` — use the shared primitive instead of hand-rolling the same shape
  again. Don't force a primitive onto a layout that only superficially resembles it, though.
- Follows the architectural patterns already documented in `CLAUDE.md`: single-stack
  navigation (no new nested navigators), `useApi()`/`useAuth()` for data/session access (no raw
  `fetch` or direct `expo-secure-store` calls in screen/component code), the `guestIntent`
  module-singleton pattern (not React state) for any new guest-gated action.

### 2. General React Native / Expo best practices

- A `.map()` over an array of ~10+ items rendered as scrollable rows should be a `FlatList`/
  `SectionList` instead — flag it if the list can grow unbounded (e.g. server-paginated data).
- `key` props on list items must be a stable unique id, never the array index, whenever the
  list can reorder, filter, or delete items.
- Watch for inline functions/objects passed as props into a component wrapped in
  `React.memo` — it defeats the memoization. Flag it on a hot render path (e.g. a list row),
  not on a one-off static element.
- Interactive elements (`TouchableOpacity`, custom buttons) should set `accessibilityRole`,
  and `accessibilityLabel` when the visible label isn't itself descriptive text (icon-only
  buttons).
- Screens should respect safe areas (via `SafeAreaProvider`/`useSafeAreaInsets`, or the
  existing `TopStatus` pattern) rather than hardcoding a top/bottom offset that assumes one
  specific device's status bar/home indicator height. Note `ScreenContainer` does *not* handle
  safe areas itself (plain `View` + `flex: 1`) — don't cite it as a fix here.
- Flag `Platform.OS` branches with no comment explaining why the platforms need to diverge.
- `useEffect`/`useFocusEffect` data-fetching should have a stable dependency array — flag an
  effect that will re-fire every render because its deps include a new inline function/object
  literal.

## Output format

Use the ReportFindings tool if it's available in this session to report results (most severe
first, empty list if nothing survived review). Otherwise, for each finding give: file:line,
what's wrong, a concrete failure scenario (not just "best practice says..."), and the fix. If
nothing is wrong, say so plainly — don't invent findings to look thorough.
