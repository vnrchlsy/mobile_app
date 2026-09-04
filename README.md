# Kupkop PH

Kupkop PH is an Expo React Native prototype for a pet care and adoption onboarding flow.

## Icon-cruft hook (opt-in, one line)

Google Drive's Mirror sync periodically re-creates zero-byte macOS Finder `Icon\r` files inside `.git/`, and git then fails `fetch`/`pull` with `bad object refs/Icon?`. The repo carries `.githooks/purge-icon-cruft` and a `pre-commit` that calls it — the `-size 0` guard makes it safe. Enable it in your clone with:

```bash
git config core.hooksPath .githooks
```

Silent on the happy path; one line when it actually purges something.

---

## Requirements

- Node.js 20 or newer
- pnpm, npm, or yarn
- Expo CLI through `npx expo`
- Xcode for the iOS Simulator, or Android Studio for the Android Emulator

## Install

```sh
pnpm install
```

If you prefer npm:

```sh
npm install
```

## Run The App

Start the Expo development server:

```sh
pnpm start
```

Then choose one of the Expo terminal options:

- Press `i` to open the iOS Simulator.
- Press `a` to open the Android Emulator.
- Scan the QR code with Expo Go on a physical device.

You can also launch directly:

```sh
pnpm ios
pnpm android
pnpm web
```

## Typecheck

```sh
pnpm typecheck
```

## Project Structure

```text
App.tsx                  App entry and screen routing
src/WelcomeScreen.tsx    Welcome screen UI
src/screens/            Wired-up screens (React Navigation)
assets/                  Logo and paw image assets
```
