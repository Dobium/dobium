// Shared entertainment-sector taxonomy — classifies a market by its TITLE
// text rather than its stored `category` field. Used by the homepage's
// sector dashboard (LandingPage) and Explore's "All Categories" dropdown so
// both present the exact same seven sectors and agree on what belongs where.
export const SECTORS = [
  { id: 'music', label: 'Music',
    re: /kendrick|drake|sza|beyonc|taylor swift|billboard|album|tour(?!nament)|stream(ing)?|spotify|chart|single|mixtape|rapper|grammy nom/i },
  { id: 'movies', label: 'Movies & TV',
    re: /movie|film|box office|netflix|hbo|disney|marvel|oscar|premiere|sequel|\bseries\b|renewal|episode|season \d|trailer|rotten tomatoes/i },
  { id: 'celebrities', label: 'Celebrities',
    re: /breakup|engaged|married|dating|divorce|pregnan|scandal|lawsuit|arrest|feud/i },
  { id: 'festivals', label: 'Festivals',
    re: /coachella|festival|tour dates|stadium|concert|headlin|glastonbury|lollapalooza|rolling loud|bonnaroo/i },
  { id: 'gaming', label: 'Gaming',
    re: /\bgame\b|\bgta\b|esports|twitch|streamer|valorant|fortnite|minecraft|playstation|xbox|nintendo|steam|worlds \d|league of legends|call of duty|overwatch/i },
  { id: 'streaming', label: 'Streaming',
    re: /netflix|hulu|hbo max|disney\+|paramount\+|peacock|apple tv|prime video|renewal|viewership|weekly views/i },
  { id: 'trends', label: 'Internet Trends',
    re: /tiktok|viral|meme|trending on|twitter|\bx\.com\b|instagram|influencer|challenge/i },
];

export function classifySector(title) {
  for (const s of SECTORS) if (s.re.test(title || '')) return s.id;
  return null;
}
