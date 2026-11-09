// Review step 7a (MQ10) · the community guidelines and, once counsel has written it, the Terms of Use.
//
// ⚠️ TWO DIFFERENT THINGS LIVE HERE, and only one is written.
//
//  · COMMUNITY_GUIDELINES is product policy, in plain words: what may not be posted, what happens if it is, how to report and block.
//    Google Play's UGC policy asks for terms that "define objectionable content"; Apple 1.2 expects the developer's own rules to say
//    the same. This is the part engineering can write, and it is real: a moderator's takedown reasons (moderation/notices.py) are these
//    same categories.
//
//  · TERMS_OF_USE is the LEGAL document (liability, governing law, the licence over what people post, the waiver). That is the owner's
//    and Philippine counsel's (launch gate 6). It is `null` until they hand it over, and the screen then says "Community guidelines",
//    not "Terms", rather than present guidelines as a legal agreement nobody has reviewed. When it is written: paste it here as
//    sections, bump TERMS_VERSION (here in consent.ts and backend config/settings.py), and set TERMS_ENFORCED=1.
export type TermsSection = { title: string; body: string[] };

export const COMMUNITY_GUIDELINES: readonly TermsSection[] = [
  {
    title: "What Kupkop is for",
    body: [
      "Kupkop helps people rescue strays, find homes for animals, volunteer at shelters and donate to them. Everything here is about animals and the people who look after them.",
    ],
  },
  {
    title: "What you may not post",
    body: [
      "Harassment or abuse: threats, insults, hate, or contacting someone who has asked you to stop.",
      "Scams and fraud: asking for money or a deposit outside the app, fake listings, fake donation details, or pretending to be a shelter, a rescuer or Kupkop.",
      "Cruelty or neglect: anything that harms an animal, shows an animal being harmed for entertainment, or sells animals in a way that puts them at risk.",
      "Misleading or fake content: a listing, story or report that is not what it says it is.",
      "Spam: the same post again and again, adverts, or links that have nothing to do with animals.",
      "Sexual content, graphic violence, or anything illegal in the Philippines.",
      "Other people's private details, such as a phone number or address, without their agreement.",
    ],
  },
  {
    title: "What happens if a rule is broken",
    body: [
      "We review what is reported. If something breaks these rules we may remove it, send you a reminder, or limit or suspend your account. We tell you which rule and how to ask us to look again. We do not remove an adoption or rescue that is already under way just because of a block or a report.",
      "Posts are also checked against a list of words that are not allowed. A post that contains one is not sent, and you can change it and try again.",
    ],
  },
  {
    title: "Reporting and blocking",
    body: [
      "Every listing, story, message and person has a Report link. You can also block someone: you will not see each other's posts or be able to contact each other through Kupkop, and they are not told.",
      "If an animal is in danger right now, report it as a rescue. That is never held up by a block or by these rules.",
    ],
  },
  {
    title: "Questions, and asking us to look again",
    body: ["Write to us from Settings, then Help & contact. A person reads it."],
  },
];

/** The legal Terms of Use, written by counsel. `null` until then (see the header). */
export const TERMS_OF_USE: readonly TermsSection[] | null = null;

/** What the screen is called, and what it holds: the whole document, or the guidelines alone until counsel has written the rest. */
export function termsDocument(legal: readonly TermsSection[] | null = TERMS_OF_USE): { title: string; sections: readonly TermsSection[]; hasLegalTerms: boolean } {
  return legal
    ? { title: "Terms & community guidelines", sections: [...legal, ...COMMUNITY_GUIDELINES], hasLegalTerms: true }
    : { title: "Community guidelines", sections: COMMUNITY_GUIDELINES, hasLegalTerms: false };
}
