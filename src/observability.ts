// US-E2 · the mobile error-reporting seam (§16.5).
//
// Deliberately a SEAM, matching the backend's posture and the FCM/S3 pattern this codebase
// already uses twice: the code path is real and reviewable, the credential is a deploy-time
// task, and an unset DSN is a normal state rather than an error on every launch.
//
// ⚠️ RELEASE TAGGING IS THE POINT, not an extra. §16.4 ships JS-only fixes over the air to a
// runtime version, so at any moment a given native binary may be running one of several JS
// bundles. Without a release tag, a crash from an OTA update is indistinguishable from one in
// the binary underneath it — and the whole OTA strategy becomes undebuggable exactly when it
// is being used to fix something urgent.
//
// ⚠️ AND THE SCRUBBING. An error tracker captures request bodies by default. A stray report's
// body contains the animal's PRECISE COORDINATES, which §12.5 withholds from every other
// surface. Sending them to a third-party dashboard would be a back door around the rule the
// rest of the app enforces, so events are scrubbed before they leave the device.
import Constants from "expo-constants";

const REDACTED = "[redacted]";

/** Keys whose value never leaves the device. Mirrors the backend's list, same reasoning. */
const SENSITIVE = [
  "password", "token", "secret", "authorization", "refresh", "access",
  "lat", "lng", "latitude", "longitude", "geom",
  "email", "phone", "display_name", "idempotency_key",
];

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const PHONE = /\+?63\d{9,10}|\b09\d{9}\b/g;

/** Recursively redact. Never throws — a scrubber that fails must not lose the report. */
export function scrub(value: unknown, depth = 0): unknown {
  try {
    if (depth > 10) return value;
    if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = SENSITIVE.some((s) => k.toLowerCase().includes(s))
          ? REDACTED
          : scrub(v, depth + 1);
      }
      return out;
    }
    if (typeof value === "string") return value.replace(EMAIL, REDACTED).replace(PHONE, REDACTED);
    return value;
  } catch {
    return REDACTED;
  }
}

/**
 * The release identifier a crash is tagged with.
 *
 * `version@runtimeVersion+profile` — enough to tell an OTA bundle from the binary it landed
 * on, which is the one distinction §16.4 makes it possible to need.
 */
export function releaseTag(): string {
  const cfg = Constants.expoConfig;
  const version = cfg?.version ?? "0.0.0";
  const runtime = typeof cfg?.runtimeVersion === "string" ? cfg.runtimeVersion : "appVersion";
  const profile = (cfg?.extra?.profile as string) ?? "development";
  return `kupkop-mobile@${version}+${runtime}.${profile}`;
}

/**
 * Start error reporting if a DSN is configured. Returns whether it started.
 *
 * `require`d lazily so the app does not carry the SDK's startup cost — or fail to build —
 * before anyone has decided to enable it.
 */
export function initErrorReporting(): boolean {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require("@sentry/react-native");
    Sentry.init({
      dsn,
      release: releaseTag(),
      environment: (Constants.expoConfig?.extra?.profile as string) ?? "development",
      sendDefaultPii: false,
      beforeSend: (event: unknown) => scrub(event),
    });
    return true;
  } catch {
    // Not installed yet. The seam stays honest about that rather than crashing the app.
    return false;
  }
}
