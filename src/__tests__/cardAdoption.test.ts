/**
 * Task A0.2 · the card adoption guard.
 *
 * Adopting <Card> retires the raw `...elevation.*` style spread screens use today to fake a
 * card surface by hand — <Card> owns elevation internally. So this guard's polarity is
 * inverted from backdropAdoption.test.ts: the desired end state is the ABSENCE of the match,
 * not its presence. This STARTED with the same shape otherwise (named holdouts in the shape
 * of themeAdoption.test.ts; a conversion story removes exactly its screens).
 *
 * CARD_HOLDOUTS started as the SUBSET of V3_SCOPE that currently spread `...elevation.` (24
 * of the 34) — not all 34. The other 10 in-scope screens (ListingFormScreen, DonationQrScreen,
 * MemberSubmittedScreen, RescueListScreen, RescueListedScreen, RescueOfferSentScreen,
 * RescuePlaceScreen, RescuePlaceConfirmScreen, RescuePlaceSentScreen, PlaceAcceptedScreen)
 * never had a raw elevation spread to retire in the first place, so they already satisfied this
 * guard's end state and were never a real holdout for it — seeding them into CARD_HOLDOUTS
 * would have made the "no longer matches must leave the list" assertion fail on this PR's very
 * first run, for screens this guard had no conversion work to record.
 * Verified against `pnpm surface:v3`'s elevationSpreaders list; re-check if that list moves.
 *
 * Task A1 (shell roots) converts ShelterDashboardScreen and ShelterProfileScreen onto <Card>,
 * so those two leave the list here — 24 -> 22.
 *
 * Task A2 (shelter listings + needs) converts ListingDetailScreen, PlaceRequestScreen and
 * ShelterNeedsScreen onto <Card> — 22 -> 19. ListingFormScreen (the fourth screen in that
 * task) never spread `...elevation.*` in the first place (see the note above) and so was
 * never in this list.
 *
 * Task A3 (shelter donations) converts DonateScreen, DonatePledgeScreen and MyDonationsScreen
 * onto <Card> — 19 -> 16. DonationQrScreen (the fourth screen in that task) never spread
 * `...elevation.*` in the first place (see the note above) and so was never in this list.
 *
 * Task A4 (shelter volunteer) converts all nine ShelterVolunteer* screens onto <Card>,
 * so those nine leave the list here — 16 -> 7.
 *
 * Task A5 (verified member) converts MemberUpgradeScreen and MemberVerifyScreen onto <Card>
 * — those two leave the list here — 7 -> 5. MemberSubmittedScreen (the third screen in this
 * task) never spread `...elevation.*` in the first place (see the note above) and so was never
 * in this list.
 *
 * ZERO, AND IT IS NO LONGER A RATCHET (the `themeAdoption` precedent). Task A6 (Sagip rescuer)
 * converts the remaining five holdouts — MyRescuesScreen, MyOffersScreen, RescueMapScreen,
 * RescueOfferScreen and RescueUpdateScreen — onto <Card>, so those five leave the list here —
 * 5 -> 0. CARD_HOLDOUTS stays `[]` from here: this is now a FLAT RULE, not "how many are
 * left". A screen inside V3_SCOPE that spreads `...elevation.*` directly is a regression, full
 * stop — raising this list is not "recording progress", it is reintroducing the hand-rolled
 * surface <Card> was written to end.
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { V3_SCOPE, V3_EXCLUDED } from "./v3Scope";

const SCREENS = join(__dirname, "..", "screens");
const read = (n: string) => readFileSync(join(SCREENS, `${n}.tsx`), "utf8");
const SPREADS_ELEVATION = /\.\.\.elevation\./;

/** Flat rule at zero — every V3 scope screen must be converted. */
const CARD_HOLDOUTS: string[] = [];

describe("V3 screens adopt Card instead of a raw elevation spread", () => {
  it("found screens to classify", () => {
    expect(readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).length).toBeGreaterThan(80);
    // 37 -> 35: Task 9 (P4) deleted ShelterVolunteerRequestsScreen and
    // ShelterVolunteerAttendanceScreen (folded into ShelterVolunteerActivityScreen's own
    // timeline) — two fewer screen files, not two fewer in-scope features.
    // 35 -> 41: P5 Task 3 (K24/K26) moves the six KawangGawa*/WaiverScreen screens from
    // V3_EXCLUDED into scope, now that they're converted.
    // 41 -> 40: C15 deleted RescueListedScreen (List for adoption now continues into the form).
    // 40 -> 41: ApplicantScreen, the adoption poster loop's (plan 2026-10-06) first screen, born V3.
    // 41 -> 42: PosterListingScreen, the poster's own listing (spec §3), born V3.
    // 42 -> 43: MyListingsScreen, an individual poster's listings (spec §3), born V3.
    // 43 -> 44: PetFormScreen, an owner adding a pet to rehome later (AQ8), born V3.
    // 47 -> 48: WaysToHelpScreen, US-W4 Ways to help (design 2026-10-27), born V3.
    // 48 -> 49: RestoreAccountScreen, AS1 restore a deleted account (backend#108), born V3.
    // 49 -> 50: ChangePasswordScreen, Task 10 change password (backend#112), born V3.
    // 50 -> 51: OrganizationProfileScreen, plan Task 9 shelter profile (backend#113), born V3.
    // 51 -> 52: ChangeEmailScreen, plan Task 13 change email (backend: POST /me/email), born V3.
    // 52 -> 53: TwoStepScreen, plan Task 14 two-step verification (backend: /me/2fa/*), born V3.
    // 53 -> 54: PetDetailScreen, PP12 one pet and its actions (My Pets review 2026-10-28), born V3.
    // 54 -> 55: MyPetsScreen, moved from V3_EXCLUDED when My Pets review step 11 converted it (artboards approved 2026-10-29).
    // 55 -> 57: ImpactScreen and BadgeDetailScreen, moved from V3_EXCLUDED when Impact & badges review step 10 converted them.
    // 57 -> 59: ReportContentScreen and StoryDetailScreen, moved from V3_EXCLUDED when content-moderation review step 25 converted them.
    // 59 -> 60: TermsScreen, content-moderation review step 7a (the community guidelines), born V3.
    // 60 -> 62: StoriesScreen and StoryComposeScreen, Stories review step 12.
    expect(V3_SCOPE.length).toBe(62);
  });

  it("every in-scope screen not in the holdout list no longer spreads ...elevation.*", () => {
    const missing = V3_SCOPE.filter((n) => !CARD_HOLDOUTS.includes(n) && SPREADS_ELEVATION.test(read(n)));
    expect(missing).toEqual([]);
  });

  it("the holdout list only shrinks (a converted screen must leave it)", () => {
    const converted = CARD_HOLDOUTS.filter((n) => !SPREADS_ELEVATION.test(read(n)));
    expect(converted).toEqual([]);
  });

  it("names every excluded screen rather than implying it", () => {
    const all = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, ""));
    expect([...V3_SCOPE, ...V3_EXCLUDED].sort()).toEqual(all.sort());
  });
});
