// Shared entertainment-sector taxonomy — classifies a market by its TITLE
// text rather than its stored `category` field. Used by the homepage's
// sector dashboard (LandingPage) and Explore's "All Categories" dropdown so
// both present the exact same seven sectors and agree on what belongs where.
export const SECTORS = [
  { id: 'sportsfutures', label: 'Sports Futures',
    re: /championship|undefeated|super bowl|world cup winner|world series|stanley cup|\bfinals\b|national title|march madness|conference title|win the (title|league|division|cup)|\bplayoffs?\b|season win total|\bpennant\b|golden boot|golden ball|golden glove|young player award|top scorer|\bmvp\b|relegat/i },
  { id: 'tech', label: 'Tech & AI',
    re: /\bai\b|\bgpt\b|\bllm\b|openai|anthropic|\bclaude\b|startup|venture capital|\bvc\b|\bipo\b|spacex|nvidia|silicon valley|y combinator|artificial intelligence|kalshi|polymarket|manifold|prediction market|event contract|tesla|waymo|robotaxi|\buber\b|cruise|autonomous|self.?driving/i },
  { id: 'music', label: 'Music',
    re: /kendrick|drake|sza|beyonc|taylor swift|billboard|album|tour(?!nament)|stream(ing)?|spotify|chart|single|mixtape|rapper|grammy nom/i },
  { id: 'trends', label: 'Social Media Trends',
    re: /tiktok|viral|meme|trending on|twitter|\bx\.com\b|instagram|influencer|challenge/i },
  { id: 'movies', label: 'Movies & TV',
    re: /movie|film|box office|netflix|hbo|disney|marvel|oscar|premiere|sequel|\bseries\b|renewal|episode|season \d|trailer|rotten tomatoes/i },
  { id: 'celebrities', label: 'Creators & Streamers',
    re: /mrbeast|kai cenat|ishowspeed|\bxqc\b|subscriber|subathon|youtuber|content creator/i },
  { id: 'festivals', label: 'Festivals',
    re: /coachella|festival|tour dates|stadium|concert|headlin|glastonbury|lollapalooza|rolling loud|bonnaroo/i },
  { id: 'gaming', label: 'Gaming',
    re: /\bgame\b|\bgta\b|esports|twitch|streamer|valorant|fortnite|minecraft|playstation|xbox|nintendo|steam|worlds \d|league of legends|call of duty|overwatch/i },
  { id: 'streaming', label: 'Streaming',
    re: /netflix|hulu|hbo max|disney\+|paramount\+|peacock|apple tv|prime video|renewal|viewership|weekly views/i },
  { id: 'moviecharts', label: 'Movie Charts',
    re: /box office|opening weekend|highest[- ]grossing|domestic gross|worldwide gross|movie chart|#1 film|debut(s|ed)? at no\.? ?1|four[- ]quadrant/i },
  { id: 'awards', label: 'Awards',
    re: /oscar|academy award|grammy|\bemmys?\b|golden globe|\bbafta\b|tony award|brit award|\bvmas?\b|best picture|best actor|best actress|best director|album of the year|record of the year|song of the year|\bnominations?\b|cannes|sundance|palme d'or|golden lion|berlinale|venice film|toronto international/i },
];

// Display order (the SECTORS array) and match order are deliberately separate.
// Tech & AI now leads the nav, but its pattern is broad — "streaming", "ipo"
// and "ai" appear in plenty of music and gaming titles — so matching it first
// would silently reclassify existing markets. Matching keeps the original
// narrow-to-broad precedence with tech last.
const MATCH_ORDER = ['sportsfutures', 'awards', 'moviecharts', 'music', 'movies', 'celebrities', 'festivals', 'gaming', 'streaming', 'trends', 'tech'];

export function classifySector(title) {
  for (const id of MATCH_ORDER) {
    const s = SECTORS.find((x) => x.id === id);
    if (s && s.re.test(title || '')) return s.id;
  }
  return null;
}
