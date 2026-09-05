# E2E smoke on the money paths (US-X2)

Maestro flows over the paths the app exists for. **Pre-release, not per-PR** (§15.4) —
these drive a real simulator against a real backend and take minutes, and a suite that makes
every PR slow is a suite people learn to skip.

## What is actually covered

| Flow | Path | Runs unattended |
|---|---|---|
| `10-report-a-stray.yaml` | file a report → it appears in My Reports | ✅ |
| `20-browse-and-inquire.yaml` | browse adoptable animals → inquire | ✅ |
| `30-volunteer-signup.yaml` | shift → waiver + contact consent → requested | ✅ |
| `15-owner-profile.yaml` | "You" tab → the owner's profile | ✅ |
| `50-shelter-shell.yaml` | shelter sign-in → dashboard ⇄ shelter profile | ✅ |
| `40-signup-needs-a-human.yaml` | signup → email code → home | ❌ — one value is typed by a person |

### Why the last two exist

`ProfileScreen`, `ShelterDashboardScreen` and `ShelterProfileScreen` sit behind a sign-in, so
for three sprints they were "verified by reading the diff" and a person had to be asked to log
in each time it mattered. Asking a human to be the test harness does not scale and does not
repeat. These flows do the same walk from environment variables, the same way, every run —
which is the whole argument for US-X2 in one example.

`50-shelter-shell.yaml` also asserts something no one thought to check by hand: the stack's
`initialRouteName` is always `home`, so a returning shelter account lands on the OWNER home
screen and `HomeScreen` resets it to the shelter shell after reading `/me`. If that redirect
breaks, a shelter admin opens the app into someone else's product.

`00-signin.yaml` is a subroutine the others call, not a path of its own. `50-shelter-shell`
calls it with **different** credentials via `runFlow.env`, which is why its landing assertion
is `screen.home` — the one post-login state an owner and a shelter genuinely share.

## Why signup can't run unattended

It needs the 6-digit code, and there is deliberately no way for a test to read one.
`ConsoleSender` prints it to stdout and keeps it **out of the logging system entirely**,
because §12.6 requires that CloudWatch read access must not double as "sign in as any user".
That is a good rule and this suite is not a reason to weaken it.

So `MAESTRO_OTP` is supplied by whoever runs the flow, read from the dev server's stdout.

**What would make it autonomous** — and what is deliberately *not* in this repo: a dev-only
fixed code for a single throwaway `.invalid` domain, behind three independent guards (`DEBUG`;
both settings explicitly present so no default config enables it; the domain required to end
in `.invalid`, so a typo pointing it at a real domain is refused loudly). The shape matters:
a "give me the code" endpoint whose guard fails in production hands out the live OTP for
**any** address, whereas a fixed code whose guard fails affects only a domain nobody can
register and no mail can reach. That is still an authentication bypass in the backend, it
needs the owner's explicit sign-off, and it was not added unilaterally.

Every other flow sidesteps it entirely: **sign-in needs no code.**

## Setup

Maestro is not currently installed on this machine.

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Then build and install the app on a booted simulator once:

```bash
cd mobile_app && npx expo run:ios
```

## Credentials

**Nothing in this repository should ever contain a real credential.** The flows read them
from the environment, and `e2eSelectors.test.ts` fails the build if a literal address or
password appears in a flow file.

`MAESTRO_EMAIL` / `MAESTRO_PASSWORD` belong to a **throwaway account on a dev or staging
backend** — never a real user's, and never a production account.

```bash
cd mobile_app && \
  MAESTRO_EMAIL=... MAESTRO_PASSWORD=... \
  MAESTRO_SHELTER_EMAIL=... MAESTRO_SHELTER_PASSWORD=... \
  maestro test e2e/
```

⚠️ **Two accounts, not one.** `MAESTRO_SHELTER_*` must be an account whose `account_type` is
`shelter` — the shelter shell is unreachable otherwise, and the owner credentials cannot get
there no matter what they tap.

The signup flow additionally needs a fresh address each run (signup deliberately reports
"this email already has an account" — the one place enumeration is allowed):

```bash
MAESTRO_SIGNUP_EMAIL="smoke+$(date +%s)@e2e.invalid" \
MAESTRO_SIGNUP_PASSWORD=... \
MAESTRO_OTP=123456 \
  maestro test e2e/flows/40-signup-needs-a-human.yaml
```

## Seed requirements

`20-browse-and-inquire` needs at least one listing and `30-volunteer-signup` at least one open
shift. If the seed is empty they fail on a missing `card.adopt.0` / `card.kawanggawa.0` —
**which is the correct outcome.** A flow that skips itself when its fixture is empty is the
same green-but-checked-nothing failure US-G1 was written about.

## Selectors, and why they aren't text

Flows match on `testID`, not on visible copy. Maestro can match text and every tutorial does,
but Track R rewrote user-facing copy across 42 screens in one sprint — a suite pinned to copy
fails on every wording change until someone deletes it. The id is a contract between the app
and the flows; the copy stays free to improve.

Naming: `screen.<route>` (matching the `Stack.Screen` name exactly), `btn.<screen>.<action>`,
`field.<screen>.<name>`, `chk.<screen>.<name>`, `card.<list>.<index>`, `tab.<key>` for the
owner shell and `tab.shelter.<key>` for the shelter one.

## What guards this between releases

`src/__tests__/e2eSelectors.test.ts` runs in the normal unit suite, in milliseconds, with no
simulator. It checks that every selector a flow references exists in the app, that screen
anchors match real routes, and that no credential is committed.

⚠️ **It does not prove the flows pass.** It proves the flows and the app have not drifted
apart — the single most common way a pre-release suite rots into a pile of failures on ship
day. "The selectors are wired" is the claim; "E2E is covered" is not.
