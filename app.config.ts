// US-E1 · the Expo build configuration (§16.4).
//
// Replaces the static app.json. The static file could not express the two things §16.4
// actually requires: per-profile environment (so a store build never ships pointing at
// localhost) and a runtimeVersion policy (so an over-the-air update can never land on an
// incompatible native binary).
//
// ⚠️ THE FAILURE THIS FILE EXISTS TO PREVENT: `src/api/client.ts` falls back to
// `http://localhost:8000/api/v1`. A production build carrying that string is an app that
// silently cannot reach anything, discovered by users rather than by us. `apiBase()` below
// refuses to produce it outside development.
import { ConfigContext, ExpoConfig } from "expo/config";

const TEAL = "#1C6B6B";

/** Which EAS profile is building. `development` locally, set by eas.json otherwise. */
const profile = process.env.EAS_BUILD_PROFILE ?? "development";
const isDev = profile === "development";

function apiBase(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE;
  if (base) return base;
  if (isDev) return "http://localhost:8000/api/v1";
  // Fail the BUILD, not the app. A store binary pointing at a developer's laptop is worse
  // than no binary, and this is the last moment anyone is watching.
  throw new Error(
    `EXPO_PUBLIC_API_BASE must be set for the "${profile}" profile. ` +
    "Set it as an EAS secret (eas secret:create) or in eas.json's env block.");
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Kupkop PH",
  slug: "kupkop-ph",
  // Store-facing version. Build numbers are handled by EAS (`autoIncrement` in eas.json),
  // so this only changes for a real release.
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  scheme: "kupkop",          // the deep-link scheme notifications route through (US-P3)
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: TEAL,
  },
  assetBundlePatterns: ["**/*"],

  // §16.4 · "runtimeVersion policy ties OTA bundles to compatible native binaries so an OTA
  // never lands on an incompatible build." `appVersion` means an OTA only reaches binaries
  // built from the same `version` above — so adding a native module (as Sprint 7 did, twice)
  // forces a new build rather than shipping JS that calls into code the binary lacks.
  runtimeVersion: { policy: "appVersion" },
  updates: {
    // Set once the EAS project exists; until then OTA is inert rather than misconfigured.
    url: process.env.EXPO_PUBLIC_UPDATES_URL || undefined,
    fallbackToCacheTimeout: 0,
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: "ph.kupkop.app",
    // Apple requires a purpose string for every permission the binary can request, and
    // rejects builds whose strings are generic. Each of these says what we do AND what we
    // do not do, matching the privacy screen's promises (US-N4).
    infoPlist: {
      NSCameraUsageDescription:
        "Kupkop uses your camera to photograph an animal you're reporting or listing. " +
        "Photos are stripped of location data before anyone else can see them.",
      NSPhotoLibraryUsageDescription:
        "Kupkop needs your photo library to attach pictures to a report, listing or story. " +
        "Only the photos you pick are uploaded.",
    },
  },

  android: {
    package: "ph.kupkop.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: TEAL,
    },
    permissions: ["CAMERA", "READ_MEDIA_IMAGES", "POST_NOTIFICATIONS"],
  },

  web: { favicon: "./assets/favicon.png" },

  plugins: [
    "expo-asset",
    "expo-secure-store",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Kupkop uses your location only to place a stray report so a rescuer can find the " +
          "animal. Your profile still shows just your city.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Kupkop needs your photo library to attach pictures to a report, listing or story. " +
          "Only the photos you pick are uploaded.",
        cameraPermission:
          "Kupkop uses your camera to photograph an animal you're reporting or listing.",
      },
    ],
    [
      "expo-notifications",
      {
        // White-on-transparent, per Android's status-bar icon rules — a coloured icon is
        // rendered as a white square.
        icon: "./assets/notification-icon.png",
        color: TEAL,
      },
    ],
  ],

  extra: {
    ...config.extra,
    apiBase: apiBase(),
    profile,
    eas: { projectId: process.env.EAS_PROJECT_ID || undefined },
  },
});
