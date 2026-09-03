# Kupkop PH

Kupkop PH is an Expo React Native prototype for a pet care and adoption onboarding flow.

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
