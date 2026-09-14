// Shared sector taxonomy — classifies a market by its TITLE text rather than
// its stored `category` field. Used by the homepage's sector nav (LandingPage)
// and Explore's "All Categories" dropdown so both present the same sectors and
// agree on what belongs where.
//
// Four sectors, deliberately. Global Attention is handled separately in
// LandingPage because it is a time-based cut (trending / breaking / news)
// rather than a subject one, so it has no regex here.
//
// Culture absorbs what used to be six separate sectors — music, movies & TV,
// creators, festivals, streaming and awards. They are subcategories now, in
// lib/subcategories.js under `culture`.
export const SECTORS = [
  { id: 'sportsfutures', label: 'Sports Futures',
    re: /championship|undefeated|super bowl|world cup winner|world series|stanley cup|\bfinals\b|national title|march madness|conference title|win the (title|league|division|cup)|\bplayoffs?\b|season win total|\bpennant\b|golden boot|golden ball|golden glove|young player award|top scorer|\bmvp\b|relegat/i },
  { id: 'tech', label: 'Tech & AI',
    re: /\bai\b|\bgpt\b|\bllm\b|openai|anthropic|\bclaude\b|startup|venture capital|\bvc\b|\bipo\b|spacex|nvidia|silicon valley|y combinator|artificial intelligence|kalshi|polymarket|manifold|prediction market|event contract|tesla|waymo|robotaxi|\buber\b|cruise|autonomous|self.?driving/i },
  { id: 'culture', label: 'Culture',
    re: /kendrick|drake|\bsza\b|beyonc|taylor swift|billboard|album|tour(?!nament)|spotify|chart|single|mixtape|rapper|movie|film|box office|opening weekend|highest[- ]grossing|netflix|hulu|hbo|disney|paramount\+|peacock|apple tv|prime video|marvel|premiere|sequel|\bseries\b|renewal|episode|season \d|trailer|rotten tomatoes|tomatometer|metacritic|cinemascore|franchise|cinematic universe|\bmcu\b|\bdcu\b|mrbeast|kai cenat|ishowspeed|\bxqc\b|subscriber|subathon|youtuber|content creator|influencer|\btwitch\b|\bkick\b|viewership|weekly views|coachella|glastonbury|lollapalooza|bonnaroo|\bfestival\b|residency|world tour|sold out|oscar|academy award|grammy|\bemmys?\b|golden globe|\bbafta\b|tony award|brit award|\bvmas?\b|best picture|best actor|best actress|best director|album of the year|record of the year|song of the year|\bnominations?\b|cannes|sundance|palme d'or|berlinale|venice film/i },
];

// Display order (the SECTORS array) and match order are deliberately separate.
// Tech's pattern is broad — "ai", "ipo" and "cruise" appear in plenty of
// culture titles — so matching it first would silently reclassify markets.
// Sports futures is narrowest, so it goes first; tech stays last.
const MATCH_ORDER = ['sportsfutures', 'culture', 'tech'];

export function classifySector(title) {
  for (const id of MATCH_ORDER) {
    const s = SECTORS.find((x) => x.id === id);
    if (s && s.re.test(title || '')) return s.id;
  }
  return null;
}
