# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Kupkop PH — an Expo React Native (Expo SDK 54) app for a pet adoption / rescue platform, covering
owner, shelter, and volunteer/rescuer flows. TypeScript throughout, strict mode on.

## Commands

```sh
pnpm install          # install deps (pnpm is the lockfile in use; npm/yarn also work per README)
pnpm start            # start Expo dev server
pnpm ios              # start + open iOS Simulator
pnpm android           # start + open Android Emulator
pnpm web               # start + open web
pnpm typecheck         # tsc --noEmit
pnpm test              # jest (jest-expo preset)
npx jest path/to/file.test.ts       # run a single test file
npx jest -t "test name substring"   # run tests matching a name
```

There is no lint script or ESLint config in this repo — don't assume one exists.

Requires an `EXPO_PUBLIC_API_BASE` env var (see `.env.example`) pointing at the backend API; defaults
to `http://localhost:8000/api/v1` if unset. Any screen that calls `useApi()` needs that backend
reachable to do anything meaningful.

## Architecture

### Entry and provider stack

`index.js` → `App.tsx` → `SafeAreaProvider` → `AuthProvider` → `NavigationContainer` (with
`SessionGuard` + `RootNavigator` inside).

### Auth (`src/auth/`)

- `AuthContext.tsx` holds `tokens` (access/refresh) and a cached `city` string in React state,
  persisted to `expo-secure-store`. There is no `GET /me/location` endpoint, so `city` is cached
  client-side after the user picks one rather than re-derived from `/me`.
- Any `tokens → null` transition (not just an explicit `signOut()`) is treated as "session ended"
  and also clears the cached `city` — this matters because the API client itself calls
  `setTokens(null)` directly on an unrecoverable 401, bypassing `signOut()`.
- `SessionGuard.tsx` watches for that same transition and, if the user is stranded on a
  non-auth screen when it happens, resets navigation back to `welcome`. It only fires once on
  mount/token-change, not on every navigation, so screens listed in `AUTH_SCREENS` (guest/auth/
  recovery routes) are excluded to avoid interrupting flows that legitimately run signed-out.

### API client (`src/api/`)

- `client.ts` exports `createApi(getTokens, setTokens)`, a thin `fetch` wrapper with a one-shot
  401 → refresh → retry cycle. On refresh failure it calls `setTokens(null)`, which is what
  triggers the SessionGuard redirect above.
- `useApi()` (`useApi.ts`) is the hook screens actually use — memoized on `tokens` so a token
  refresh produces a client that carries the new access token.
- `types.ts` has the shared response shapes (`Me`, `Listing`, `Capability`, `ApiError`).

### Navigation (`src/navigation/`)

Single `Stack.Navigator` for the entire app (`RootNavigator.tsx`) — not split into separate
"auth stack" / "app stack" navigators. This is deliberate: flows like signup cross what would be
the auth/app boundary mid-navigation (OTP verification calls `setTokens()` partway through, but
still needs to route on to `signupSuccess` before landing on `home`). A token-gated two-stack
navigator would yank the user straight into the app stack the instant tokens are set, stranding
the in-between screens. `initialRouteName` is still gated on `tokens` for a returning,
already-authenticated user. Route params are typed centrally in `types.ts`
(`RootStackParamList`).

### Guest intent (`src/guestIntent.ts`)

A module-level singleton (not React state/context) that remembers what a guest was trying to do
(adopt/report/volunteer/save/account) across the guest → accountType → signup → otp →
signupSuccess → home chain, without threading it through every route's params and without
persisting to SecureStore (a stale intent surviving an app relaunch would be surprising). Read
via `takeIntent()`, which clears on read — resuming an intent is one-shot. `HomeScreen` only
calls it when arriving via `signupSuccess`'s reset with `justSignedUp: true`, not on every arrival
at Home, so an unrelated later sign-in doesn't resurface a stale intent from an abandoned signup.

### Screens (`src/screens/`) — this is the active screen set

All live screens wired into `RootNavigator` live here. `AuthFormKit.tsx` is the shared UI kit
(headers, form fields, buttons, color palette) for the onboarding/auth screens — reuse it rather
than restyling from scratch when touching that flow.

### Components (`src/components/`)

- `OwnerTabs.tsx` — the 4-tab floating bottom bar (Home/Adopt/Volunteer/You) used by owner-shell
  screens. Not a React Navigation tab navigator: this is a single native-stack app, so each screen
  renders this bar itself and tab presses just call `navigate()`.
- `ShelterTabs.tsx` — the shelter-side equivalent (Home/Animals/Donate/Requests/You). Currently
  only referenced by the orphaned mockups below, not by any wired-in screen — relevant if you're
  working on this branch's shelter dashboard.
- `SignupWall.tsx` — the modal signup gate shown when a guest taps a gated action. Copy is keyed
  by `GuestIntentAction`. This is the signup gate only; the separate "Verified Member" gate
  (`MemberUpgradeScreen`) is a different, already-built flow — don't conflate the two.
- `BottomTabs.tsx`, `TopStatus.tsx`, `AppIcons.tsx` — smaller shared UI pieces.

### Orphaned legacy files — do not treat as live code

`src/PetDetailScreen.tsx`, `ProfileScreen.tsx`, `RescuerScreens.tsx`, and `ShelterScreens.tsx`
sit directly under `src/` (as opposed to `src/screens/`). These are static mockups from an early
commit, predating the React Navigation rewrite, and are **not imported by `RootNavigator` or
anything else live** — grep before assuming a change to one of these does anything. The real,
wired-up versions are the same-named files under `src/screens/`. The one exception is
`src/WelcomeScreen.tsx`, which is still imported by `RootNavigator` and is live.

The other six mockups (`HomeScreen`, `MoreScreens`, `OnboardingScreens`, `ShelterDashboardScreens`,
`ShelterListingScreens`, `VolunteerScreens`) were deleted once confirmed unreachable — they were
inflating the US-U1 accessibility count with ~47 unlabelled controls on screens no user can reach.

### User story comments

Comments frequently reference user story IDs (`US-A1`, `US-A1b`, `US-X1`, `US-A4`, etc.) and
screenshot references (`screens/user/screen-home.png`) tying the implementation back to a design
spec — grep commit messages/comments for a `US-*` tag to find all code belonging to one feature.

## Testing

Only `src/api/__tests__/client.test.ts` exists today, covering the refresh-and-retry logic in
`createApi`. It mocks `global.fetch` directly rather than using a network-mocking library — follow
that pattern for new API-client tests.
