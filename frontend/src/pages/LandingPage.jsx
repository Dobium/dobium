import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { api } from '../api/client';
import { SECTORS as SHARED_SECTORS, classifySector } from '../lib/sectors';

// ── Homepage rebuilt as a sector-based market dashboard, matched to Neel's
// reference mocks (palette sampled from the screenshots): #00132D page,
// #081C36 sidebar, #001F43 / #182A45 cards, warm #CFC5B5 mono labels,
// #4BE176 green, #FFB4AB salmon, #FFDF9B gold.

const PAGE_BG = '#00132D';
const SIDEBAR_BG = '#081C36';
const CARD_BG = '#001F43';
const CARD_LINE = '#22314A';
const WARM = '#CFC5B5';
const GREEN = '#4BE176';
const SALMON = '#FFB4AB';
const GOLD = '#FFDF9B';
const GOLD_DIM = '#E1C382';

const mono = (extra = {}) => ({ fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.1em', ...extra });

function leaderOf(m) {
  return [...(m.outcomes || [])].sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];
}
function yesOf(m) {
  return (m.outcomes || []).find((o) => (o.title || '').toLowerCase().startsWith('yes'));
}
function deltaFor(m, outcome) {
  const h = m?.price_history || [];
  if (h.length >= 2 && outcome) {
    const last = h[h.length - 1]?.prices?.[outcome.id];
    const prev = h[h.length - 2]?.prices?.[outcome.id];
    if (typeof last === 'number' && typeof prev === 'number') return Math.round(last - prev);
  }
  return 0;
}
function shortTitle(t) {
  return (t || '').replace(/^will\s+/i, '').replace(/\?+\s*$/, '');
}
function compactVol(v) {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return `$${Math.round(v || 0)}`;
}

// ── Sector classification ────────────────────────────────────────────────
const SECTOR_ICONS = { music: 'note', movies: 'film', celebrities: 'star', festivals: 'stage', gaming: 'gamepad', streaming: 'play', trends: 'trend' };
const SECTORS = SHARED_SECTORS.map((s) => ({ ...s, icon: SECTOR_ICONS[s.id] }));

function classify(title) {
  return classifySector(title);
}

function sectorMarkets(markets, id) {
  return [...(markets || [])]
    .filter((m) => m.status === 'active' && classify(m.title) === id)
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}

// Demo banks matched to the reference mock's exact card content — used to
// fill out a sector when there aren't enough live markets classified into it.
const MUSIC_DEMO = [
  { title: 'Kendrick Lamar to drop "Surprise Project" before Dec 31?', vol: '$4.2M', yes: 88, no: 12, tag: 'SPOTIFY 50' },
  { title: 'Taylor Swift "The Tortured Poets" returns to #1 this week?', vol: '$1.8M', yes: 31, no: 69, tag: 'BILLBOARD' },
  { title: 'SZA "SOS" to win Album of the Year (AOTY)?', vol: '$920K', yes: 45, no: 55, tag: 'GRAMMYS' },
  { title: 'Drake "It\'s All A Blur" to gross over $300M total?', vol: '$2.4M', yes: 91, no: 9, tag: 'TOUR DATA' },
];
const MOVIES_DEMO_FEATURED = {
  title: 'Dune: Part 3 to officially greenlit by WB before March 2025?',
  desc: 'Recent box office projections for Part 2 exceeding $700M globally has triggered massive volume on a Part 3 confirmation.',
  yes: 82, no: 18, image: null,
};
const MOVIES_DEMO_SIDE = [
  { title: '"Gladiator II" Critics Score above 85%?', vol: '$412K', yes: 64, no: 36, tag: 'ROTTEN TOMATOES' },
  { title: '"The Bear" Season 4 release date set for 2024?', vol: '$288K', yes: 12, no: 88, tag: 'STREAMING WARS' },
];

const MOVIES_PLATFORMS = ['All Movies & TV', 'Box Office Hits', 'New Releases', 'Franchises', 'Awards', 'TV Shows', 'Industry Deals'];

// Same caveat as the Music genre filters below: title/keyword heuristics,
// not real per-market category metadata.
const PLATFORM_RE = {
  'Box Office Hits': /box office/i,
  'New Releases': /premiere|release date|debut|drops? (this|next)|opens? in theaters|streaming (debut|premiere)/i,
  'Franchises': /marvel|\bmcu\b|star wars|\bdc\b|sequel|part \d|chapter \d|franchise/i,
  'Awards': /oscar|academy award|golden globe|\bemmy\b|\baward\b/i,
  'TV Shows': /\bseries\b|season \d|renewal|episode|finale|\bshow\b/i,
  'Industry Deals': /acquir|merger|acquisition|buyout|stake in|studio deal|deal with/i,
};
const PLATFORM_DEMO = {
  'Box Office Hits': {
    featured: MOVIES_DEMO_FEATURED,
    side: [
      { title: '"Gladiator II" to cross $500M worldwide?', vol: '$412K', yes: 64, no: 36, tag: 'ROTTEN TOMATOES' },
      { title: 'Will a 2025 release cross $1B worldwide?', vol: '$680K', yes: 37, no: 63, tag: 'BOX OFFICE' },
    ],
  },
  'New Releases': {
    featured: { title: 'Wicked: Part Two to open above $150M opening weekend?', desc: 'Pre-release tracking has surged sharply following the latest trailer drop.', yes: 58, no: 42 },
    side: [
      { title: "A24's \"Death of a Unicorn\" wide release confirmed for 2025?", vol: '$210K', yes: 71, no: 29, tag: 'NEW RELEASES' },
      { title: 'Mission: Impossible 8 to open before July 4th weekend?', vol: '$480K', yes: 83, no: 17, tag: 'NEW RELEASES' },
    ],
  },
  'Franchises': {
    featured: { title: 'Will Marvel announce Avengers: Secret Wars casting before 2026?', desc: 'Studio insiders suggest a major casting reveal is being planned for a fan event.', yes: 59, no: 41 },
    side: [
      { title: 'A new "Star Wars" trilogy greenlit before 2026?', vol: '$310K', yes: 33, no: 67, tag: 'FRANCHISES' },
      { title: 'DC to reboot Batman again before 2027?', vol: '$260K', yes: 28, no: 72, tag: 'FRANCHISES' },
    ],
  },
  'Awards': {
    featured: { title: 'Will "Oppenheimer" sweep Best Picture at the 2025 Oscars?', desc: 'Awards-season momentum has made it the frontrunner across major guild ceremonies.', yes: 69, no: 31 },
    side: [
      { title: 'Will "Stranger Things" win Outstanding Drama Series at the 2026 Emmys?', vol: '$0', yes: 50, no: 50, tag: 'ROTTEN TOMATOES' },
      { title: 'A streaming-only film wins Best Picture before 2027?', vol: '$220K', yes: 44, no: 56, tag: 'AWARDS' },
    ],
  },
  'TV Shows': {
    featured: { title: 'Will "Severance" Season 3 premiere before the end of 2025?', desc: 'Production wrapped ahead of schedule, fueling speculation about an early release.', yes: 66, no: 34 },
    side: [
      { title: '"The Last of Us" Season 3 renewal confirmed?', vol: '$260K', yes: 81, no: 19, tag: 'TV SHOWS' },
      { title: '"Stranger Things" final season to premiere before Q4 2025?', vol: '$620K', yes: 47, no: 53, tag: 'TV SHOWS' },
    ],
  },
  'Industry Deals': {
    featured: { title: 'Will Netflix acquire A24 before end of year?', desc: 'Deal talk has intensified after A24\'s recent string of box office hits.', yes: 38, no: 62 },
    side: [
      { title: 'Warner Bros. Discovery to spin off its streaming division in 2025?', vol: '$390K', yes: 29, no: 71, tag: 'INDUSTRY DEALS' },
      { title: 'A major studio merger announced before Q4 2025?', vol: '$310K', yes: 22, no: 78, tag: 'INDUSTRY DEALS' },
    ],
  },
};

function platformMarkets(markets, platform) {
  const re = PLATFORM_RE[platform];
  if (!re) return [];
  return [...(markets || [])]
    .filter((m) => m.status === 'active' && re.test(m.title || ''))
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}

const CELEBRITIES_DEMO = [
  { title: "Will Taylor Swift announce a new album at her next Eras Tour stop?", vol: '$12.5M', yes: 45, no: 55, tag: 'MUSIC INDUSTRY' },
  { title: 'MrBeast to hit 350M subscribers before Q4?', vol: '$2.1M', yes: 78, no: 22, tag: 'SOCIAL MEDIA' },
  { title: 'Kylie Jenner to announce a new brand partnership this month?', vol: '$1.2M', yes: 15, no: 85, tag: 'ENDORSEMENTS' },
];
const CELEBRITIES_TRENDS_DEMO = [
  { title: 'Will Kim Kardashian launch a new fragrance line by Q4?', vol: '$640K', yes: 61, no: 39, tag: 'TRENDING NOW' },
  { title: 'A celebrity breakup dominates social media this week?', vol: '$380K', yes: 72, no: 28, tag: 'VIRAL MOMENT' },
  { title: 'Zendaya to be named a Time 100 honoree this year?', vol: '$290K', yes: 55, no: 45, tag: 'AWARDS BUZZ' },
];

// "Celebrities Trends" is a genuinely different slice from "All Celebrities":
// sorted by how much a market's price has actually moved recently (biggest
// swing first), not by volume — so it surfaces what's suddenly heating up
// rather than just what's biggest overall.
function celebTrendingMarkets(markets) {
  return [...(markets || [])]
    .filter((m) => m.status === 'active' && classifySector(m.title) === 'celebrities')
    .map((m) => ({ m, delta: Math.abs(deltaFor(m, yesOf(m) || leaderOf(m))) }))
    .filter((x) => x.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .map((x) => x.m);
}
const GAMING_SUBS = ['All Gaming', 'Console', 'Esports Odds', 'Studio Deals', 'Gaming Hardware'];
const GAMING_SUB_ICONS = {
  'All Gaming': 'gamepad', 'Console': 'console', 'Esports Odds': 'trophy',
  'Studio Deals': 'briefcase', 'Gaming Hardware': 'hardware',
};
const GAMING_MARKETS_DEMO = [
  { title: 'GTA VI to be delayed to 2026?', vol: '$2.1M', yes: 24, no: 76, tag: 'ROCKSTAR GAMES' },
  { title: 'Nintendo Switch 2 Official Announcement before March 2025?', vol: '$1.5M', yes: 88, no: 12, tag: 'NINTENDO' },
  { title: 'T1 to win League of Legends Worlds 2024?', vol: '$940K', yes: 65, no: 35, tag: 'ESPORTS' },
  { title: 'Sony to announce acquisition of FromSoftware by EOY?', vol: '$3.2M', yes: 15, no: 85, tag: 'M&A RUMORS' },
];
const GAMING_SUB_DEMO = {
  'Console': [
    { title: 'PlayStation 6 to be announced before 2026?', vol: '$1.1M', yes: 38, no: 62, tag: 'PLAYSTATION' },
    { title: 'Xbox to discontinue console hardware by 2027?', vol: '$620K', yes: 22, no: 78, tag: 'XBOX' },
  ],
  'Esports Odds': [
    { title: 'T1 to win League of Legends Worlds 2024?', vol: '$940K', yes: 65, no: 35, tag: 'ESPORTS' },
    { title: 'FaZe Clan to make Valorant Champions playoffs in 2025?', vol: '$410K', yes: 44, no: 56, tag: 'ESPORTS' },
  ],
  'Studio Deals': [
    { title: 'Sony to announce acquisition of FromSoftware by EOY?', vol: '$3.2M', yes: 15, no: 85, tag: 'M&A RUMORS' },
    { title: 'Microsoft to acquire another major studio in 2025?', vol: '$780K', yes: 33, no: 67, tag: 'M&A RUMORS' },
  ],
  'Gaming Hardware': [
    { title: 'Nvidia to release a new GPU generation before Q4?', vol: '$560K', yes: 71, no: 29, tag: 'HARDWARE' },
    { title: 'Valve to release a new Steam Deck model in 2025?', vol: '$340K', yes: 52, no: 48, tag: 'HARDWARE' },
  ],
};
// Same title-heuristic caveat as the other sub-filters — no real per-market
// category tagging exists yet.
const GAMING_SUB_RE = {
  'Console': /playstation|\bps5\b|\bxbox\b|nintendo switch|\bconsole\b/i,
  'Esports Odds': /esports|e-sports|worlds \d|league of legends|valorant|call of duty league|overwatch league|\bfaze\b|cloud9|\bt1\b/i,
  'Studio Deals': /acquir|merger|acquisition|buyout|stake in|studio deal/i,
  'Gaming Hardware': /\bgpu\b|nvidia|graphics card|steam deck|hardware|processor/i,
};
function gamingSubMarkets(markets, sub) {
  const re = GAMING_SUB_RE[sub];
  if (!re) return [];
  return [...(markets || [])]
    .filter((m) => m.status === 'active' && re.test(m.title || ''))
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
const STREAMING_SUBS = ['All Streaming', 'Netflix', 'Disney+', 'HBO/Max Releases', 'Prime Video', 'Apple TV', 'Hulu', 'Streaming Charts'];
const STREAMING_SUB_ICONS = {
  'All Streaming': 'film', 'Netflix': 'playcircle', 'Disney+': 'castle', 'HBO/Max Releases': 'console',
  'Prime Video': 'play', 'Apple TV': 'console', 'Hulu': 'playcircle', 'Streaming Charts': 'bars',
};
const STREAMING_DEMO = [
  { title: 'Stranger Things Season 5 to drop before Q3 2025?', vol: '$8.4M', yes: 42, no: 58, tag: 'NETFLIX' },
  { title: 'Netflix to acquire A24 by end of year?', vol: '$12.1M', yes: 12, no: 88, tag: 'M&A RUMORS' },
  { title: 'White Lotus S3 viewership to exceed 20M in first 48 hours?', vol: '$4.2M', yes: 65, no: 35, tag: 'HBO / MAX' },
  { title: 'MrBeast to hit 500M subscribers before 2026?', vol: '$15.7M', yes: 78, no: 22, tag: 'YOUTUBE' },
];
const STREAMING_SUB_DEMO = {
  'Netflix': [
    { title: 'Stranger Things Season 5 to drop before Q3 2025?', vol: '$8.4M', yes: 42, no: 58, tag: 'NETFLIX' },
    { title: 'Netflix to raise subscription prices again in 2025?', vol: '$2.9M', yes: 61, no: 39, tag: 'NETFLIX' },
  ],
  'Disney+': [
    { title: 'Disney+ to merge fully with the Hulu app in 2025?', vol: '$1.6M', yes: 57, no: 43, tag: 'DISNEY+' },
    { title: 'A new Marvel series premieres on Disney+ before Q4?', vol: '$980K', yes: 69, no: 31, tag: 'DISNEY+' },
  ],
  'HBO/Max Releases': [
    { title: 'White Lotus S3 viewership to exceed 20M in first 48 hours?', vol: '$4.2M', yes: 65, no: 35, tag: 'HBO / MAX' },
    { title: 'House of the Dragon Season 3 premieres before 2026?', vol: '$1.3M', yes: 58, no: 42, tag: 'HBO / MAX' },
  ],
  'Prime Video': [
    { title: 'Fallout Season 2 to premiere before Q3 2025?', vol: '$1.1M', yes: 71, no: 29, tag: 'PRIME VIDEO' },
    { title: 'Amazon to greenlight a new Jack Ryan season in 2025?', vol: '$620K', yes: 48, no: 52, tag: 'PRIME VIDEO' },
  ],
  'Apple TV': [
    { title: 'Severance Season 3 renewal confirmed before the finale?', vol: '$890K', yes: 77, no: 23, tag: 'APPLE TV' },
    { title: 'Apple TV+ to raise subscription prices in 2025?', vol: '$340K', yes: 44, no: 56, tag: 'APPLE TV' },
  ],
  'Hulu': [
    { title: 'Hulu to fully merge into the Disney+ app in 2025?', vol: '$710K', yes: 53, no: 47, tag: 'HULU' },
    { title: '"Only Murders in the Building" Season 5 renewal confirmed?', vol: '$260K', yes: 82, no: 18, tag: 'HULU' },
  ],
  'Streaming Charts': [
    { title: 'A Netflix original tops the global Top 10 for 3+ weeks?', vol: '$540K', yes: 66, no: 34, tag: 'STREAMING CHARTS' },
    { title: 'A non-English series breaks into the weekly global Top 5?', vol: '$310K', yes: 39, no: 61, tag: 'STREAMING CHARTS' },
  ],
};
// Same title-heuristic caveat as the other four sub-filters — no real
// per-market platform tagging exists yet.
const STREAMING_SUB_RE = {
  'Netflix': /netflix/i,
  'Disney+': /disney\+|disney plus/i,
  'HBO/Max Releases': /\bhbo\b|hbo max/i,
  'Prime Video': /prime video|amazon prime/i,
  'Apple TV': /apple tv/i,
  'Hulu': /\bhulu\b/i,
  'Streaming Charts': /top 10|top ten|\bchart(s)?\b|weekly views|viewership/i,
};
function streamingSubMarkets(markets, sub) {
  const re = STREAMING_SUB_RE[sub];
  if (!re) return [];
  return [...(markets || [])]
    .filter((m) => m.status === 'active' && re.test(m.title || ''))
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
const INTERNET_TRENDS_SUBS = ['Google Trends', 'Reddit', 'X/Twitter', 'Tiktok', 'YouTube', 'Twitch', 'Kick'];
const TRENDS_SUB_ICONS = {
  'Google Trends': 'trend', 'Reddit': 'bars', 'X/Twitter': 'pin', 'Tiktok': 'tiktok',
  'YouTube': 'play', 'Twitch': 'gamepad', 'Kick': 'bolt',
};
// Default ("Google Trends") view shows two themed groups rather than one
// flat grid, matching the mock. Everything else here has the same
// title-heuristic caveat as the other five dropdowns.
const VIRAL_CHALLENGES_DEMO = [
  { title: "Next 'Dance Challenge' to reach 1B views by June?", vol: '$4.2M', yes: 42, no: 58, tag: 'TIKTOK' },
  { title: 'MrBeast to surpass 400M subscribers in 2024?', vol: '$8.1M', yes: 72, no: 28, tag: 'YOUTUBE' },
];
const CREATOR_MILESTONES_DEMO = [
  { title: 'Kai Cenat to break concurrent viewership record this month?', vol: '$2.5M', yes: 35, no: 65, tag: 'TWITCH' },
  { title: 'Elon Musk to step down as CEO of X by Q4?', vol: '$12.4M', yes: 18, no: 82, tag: 'X / TWITTER' },
];
const VIRAL_RE = /challenge|viral|trend(ing)?|\bmeme\b/i;
const MILESTONE_RE = /subscriber|concurrent viewership|record|milestone|follower/i;
function viralChallengeMarkets(markets) {
  return [...(markets || [])]
    .filter((m) => m.status === 'active' && classifySector(m.title) === 'trends' && VIRAL_RE.test(m.title || ''))
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
function creatorMilestoneMarkets(markets) {
  return [...(markets || [])]
    .filter((m) => m.status === 'active' && classifySector(m.title) === 'trends' && MILESTONE_RE.test(m.title || ''))
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}

const TRENDS_PLATFORM_DEMO = {
  'Reddit': [
    { title: 'A subreddit hits 50M members before 2026?', vol: '$180K', yes: 44, no: 56, tag: 'REDDIT' },
    { title: 'r/wallstreetbets sparks another meme-stock rally in 2025?', vol: '$620K', yes: 29, no: 71, tag: 'REDDIT' },
  ],
  'X/Twitter': [
    { title: 'Elon Musk to step down as CEO of X by Q4?', vol: '$12.4M', yes: 18, no: 82, tag: 'X / TWITTER' },
    { title: 'X to relaunch a Vine-style short video feature before 2026?', vol: '$410K', yes: 33, no: 67, tag: 'X / TWITTER' },
  ],
  'Tiktok': [
    { title: "Next 'Dance Challenge' to reach 1B views by June?", vol: '$4.2M', yes: 42, no: 58, tag: 'TIKTOK' },
    { title: 'TikTok to be banned in the US before 2026?', vol: '$3.8M', yes: 24, no: 76, tag: 'TIKTOK' },
  ],
  'YouTube': [
    { title: 'MrBeast to surpass 400M subscribers in 2024?', vol: '$8.1M', yes: 72, no: 28, tag: 'YOUTUBE' },
    { title: 'YouTube to launch a dedicated Shorts monetization tier in 2025?', vol: '$290K', yes: 61, no: 39, tag: 'YOUTUBE' },
  ],
  'Twitch': [
    { title: 'Kai Cenat to break concurrent viewership record this month?', vol: '$2.5M', yes: 35, no: 65, tag: 'TWITCH' },
    { title: 'A new streamer surpasses 100K subs on Twitch this year?', vol: '$310K', yes: 54, no: 46, tag: 'TWITCH' },
  ],
  'Kick': [
    { title: 'Kick to sign another major streamer exclusive in 2025?', vol: '$220K', yes: 41, no: 59, tag: 'KICK' },
    { title: 'Kick to surpass Twitch in peak concurrent viewers this year?', vol: '$390K', yes: 19, no: 81, tag: 'KICK' },
  ],
};
const TRENDS_PLATFORM_RE = {
  'Reddit': /reddit/i,
  'X/Twitter': /twitter|\bx\/twitter\b|elon musk/i,
  'Tiktok': /tiktok/i,
  'YouTube': /youtube|mrbeast/i,
  'Twitch': /twitch|kai cenat|streamer/i,
  'Kick': /\bkick\b/i,
};
function trendsPlatformMarkets(markets, sub) {
  const re = TRENDS_PLATFORM_RE[sub];
  if (!re) return [];
  return [...(markets || [])]
    .filter((m) => m.status === 'active' && re.test(m.title || ''))
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}

const MUSIC_GENRES = ['All Music', 'R&B', 'Hip Hop', 'Rap', 'Pop', 'Electronic', 'Latin', 'Country', 'Rock', 'K-Pop'];

// Genre-level classification is a best-effort keyword/artist heuristic on the
// market title — there's no genre metadata stored per market yet, so this is
// a text-pattern match, not authoritative tagging.
const GENRE_RE = {
  'R&B': /r&b|rnb|sza|usher|the weeknd|summer walker|chris brown|alicia keys|ne-?yo|jazmine sullivan/i,
  'Hip Hop': /hip.?hop|kendrick|drake|j\.? ?cole|travis scott|kanye|\bye\b|21 savage|\bfuture\b|metro boomin|lil (uzi|baby|wayne)|gunna|yeat|young thug|a\$?ap|tyler,? the creator/i,
  'Rap': /\brap\b|rapper|cardi b|nicki minaj|megan thee stallion|ice spice|playboi carti|central cee|glorilla|latto/i,
  'Pop': /\bpop\b|taylor swift|ariana grande|dua lipa|olivia rodrigo|billie eilish|katy perry|justin bieber|selena gomez|sabrina carpenter|chappell roan/i,
  'Electronic': /electronic|\bedm\b|house music|techno|dubstep|calvin harris|skrillex|david guetta|marshmello|deadmau5/i,
  'Latin': /latin|reggaeton|bad bunny|karol g|shakira|j balvin|peso pluma|feid|rauw alejandro/i,
  'Country': /country music|\bcountry\b|morgan wallen|luke combs|zach bryan|kacey musgraves|chris stapleton|carrie underwood/i,
  'Rock': /\brock\b|metallica|foo fighters|arctic monkeys|red hot chili peppers|coldplay|imagine dragons|greta van fleet/i,
  'K-Pop': /k-?pop|\bbts\b|blackpink|newjeans|stray kids|\btwice\b|seventeen|aespa|txt\b/i,
};
const GENRE_DEMO = {
  'R&B': [
    { title: 'Will SZA drop a deluxe "SOS" edition before 2025?', vol: '$680K', yes: 59, no: 41, tag: 'R&B CHARTS' },
    { title: 'The Weeknd to headline a stadium tour in 2025?', vol: '$1.1M', yes: 74, no: 26, tag: 'TOUR DATA' },
  ],
  'Hip Hop': [
    { title: 'Kendrick Lamar to headline the Super Bowl Halftime Show 2026?', vol: '$2.9M', yes: 38, no: 62, tag: 'HALFTIME' },
    { title: 'Travis Scott to release "Utopia 2" before 2026?', vol: '$1.4M', yes: 29, no: 71, tag: 'RELEASE DATE' },
  ],
  'Rap': [
    { title: "Cardi B to release her second studio album in 2025?", vol: '$920K', yes: 44, no: 56, tag: 'ALBUM WATCH' },
    { title: 'Ice Spice to headline a major festival in 2025?', vol: '$410K', yes: 63, no: 37, tag: 'FESTIVALS' },
  ],
  'Pop': [
    { title: 'Will Chappell Roan win Best New Artist at the Grammys?', vol: '$780K', yes: 52, no: 48, tag: 'GRAMMYS' },
    { title: 'Dua Lipa to announce a new album before Q3?', vol: '$530K', yes: 41, no: 59, tag: 'ALBUM WATCH' },
  ],
  'Electronic': [
    { title: 'Calvin Harris to headline a major EDM festival in 2025?', vol: '$390K', yes: 68, no: 32, tag: 'FESTIVALS' },
    { title: 'Marshmello to release a collab album before 2026?', vol: '$210K', yes: 35, no: 65, tag: 'RELEASE DATE' },
  ],
  'Latin': [
    { title: 'Bad Bunny to headline Coachella 2025?', vol: '$1.6M', yes: 71, no: 29, tag: 'COACHELLA' },
    { title: 'Karol G to win Best Latin Album at the Grammys?', vol: '$460K', yes: 55, no: 45, tag: 'GRAMMYS' },
  ],
  'Country': [
    { title: 'Morgan Wallen to have the #1 country album of 2025?', vol: '$640K', yes: 66, no: 34, tag: 'BILLBOARD' },
    { title: 'Zach Bryan to announce a stadium tour in 2025?', vol: '$380K', yes: 58, no: 42, tag: 'TOUR DATA' },
  ],
  'Rock': [
    { title: 'A rock act to headline a major festival in 2025?', vol: '$290K', yes: 47, no: 53, tag: 'FESTIVALS' },
    { title: 'Foo Fighters to release a new album before 2026?', vol: '$220K', yes: 39, no: 61, tag: 'RELEASE DATE' },
  ],
  'K-Pop': [
    { title: 'BTS to reunite for a full group comeback in 2025?', vol: '$3.1M', yes: 61, no: 39, tag: 'COMEBACK WATCH' },
    { title: 'BLACKPINK to headline a US stadium tour in 2025?', vol: '$1.9M', yes: 57, no: 43, tag: 'TOUR DATA' },
  ],
};

function genreMarkets(markets, genre) {
  const re = GENRE_RE[genre];
  if (!re) return [];
  return [...(markets || [])]
    .filter((m) => m.status === 'active' && re.test(m.title || ''))
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}

const CELEB_SUBS = ['All Celebrities', 'Celebrities Trends'];
const CELEB_SUB_ICONS = { 'All Celebrities': 'star', 'Celebrities Trends': 'trend' };

const FESTIVAL_SUBS = ['All Festivals', 'Performances & Lineups', 'Headliner', 'Ticket Volatility', 'Festival M&A'];
const FESTIVAL_SUB_ICONS = {
  'All Festivals': 'stage', 'Performances & Lineups': 'calendar', 'Headliner': 'note',
  'Ticket Volatility': 'ticket', 'Festival M&A': 'briefcase',
};
const FESTIVALS_DEMO = [
  { title: 'Coachella 2025: Rihanna to headline?', vol: '$4.8M', yes: 32, no: 68, tag: 'GOLDENVOICE' },
  { title: 'Tomorrowland 2025 early bird to sell out in < 5 mins?', vol: '$2.1M', yes: 85, no: 15, tag: 'ID&T' },
  { title: 'Glastonbury to announce expansion into Asia by EOY?', vol: '$1.2M', yes: 12, no: 88, tag: 'LIVE NATION' },
  { title: 'Burning Man 2024 total attendance to exceed 80k?', vol: '$3.5M', yes: 55, no: 45, tag: 'BLACK ROCK CITY' },
];
const FESTIVAL_SUB_DEMO = {
  'Performances & Lineups': [
    { title: 'Full Coachella 2025 lineup announced before February?', vol: '$680K', yes: 74, no: 26, tag: 'LINEUP WATCH' },
    { title: 'A surprise guest joins a Coachella headliner set?', vol: '$310K', yes: 61, no: 39, tag: 'PERFORMANCES' },
  ],
  'Headliner': [
    { title: 'Beyoncé confirmed as a 2025 festival headliner?', vol: '$1.4M', yes: 48, no: 52, tag: 'HEADLINER WATCH' },
    { title: 'A K-pop act headlines a major US festival in 2025?', vol: '$390K', yes: 29, no: 71, tag: 'HEADLINER WATCH' },
  ],
  'Ticket Volatility': [
    { title: 'Coachella 2025 resale prices exceed 3x face value?', vol: '$520K', yes: 66, no: 34, tag: 'TICKET VOLATILITY' },
    { title: 'A major festival sells out in under 10 minutes in 2025?', vol: '$440K', yes: 58, no: 42, tag: 'TICKET VOLATILITY' },
  ],
  'Festival M&A': [
    { title: 'Live Nation to acquire another major festival brand in 2025?', vol: '$610K', yes: 41, no: 59, tag: 'FESTIVAL M&A' },
    { title: 'A private equity firm buys a stake in a top festival in 2025?', vol: '$280K', yes: 35, no: 65, tag: 'FESTIVAL M&A' },
  ],
};
// Same title-heuristic caveat as the Music/Movies sub-filters — no real
// per-market category tagging exists yet.
const FESTIVAL_SUB_RE = {
  'Performances & Lineups': /lineup|line-up|perform(ance)?|set time|schedule announc/i,
  'Headliner': /headlin/i,
  'Ticket Volatility': /ticket|sell.?out|early bird|resale/i,
  'Festival M&A': /acquir|merger|acquisition|buyout|stake in/i,
};
function festivalSubMarkets(markets, sub) {
  const re = FESTIVAL_SUB_RE[sub];
  if (!re) return [];
  return [...(markets || [])]
    .filter((m) => m.status === 'active' && re.test(m.title || ''))
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}

function SectorIcon({ kind, color, size = 15 }) {
  const c = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', style: { flexShrink: 0 } };
  switch (kind) {
    case 'note': return <svg {...c}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
    case 'film': return <svg {...c}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" /></svg>;
    case 'star': return <svg {...c}><path d="M12 2l3 7 7 .6-5.5 4.6 1.8 7-6.3-4-6.3 4 1.8-7L2 9.6 9 9z" /></svg>;
    case 'stage': return <svg {...c}><path d="M3 21h18M4 18h16M6 18v-7M10 18v-7M14 18v-7M18 18v-7M3 9l9-6 9 6z" /></svg>;
    case 'gamepad': return <svg {...c}><rect x="2" y="8" width="20" height="9" rx="4" /><path d="M7 11v3M5.5 12.5h3M15.5 12.5h.01M18.5 11h.01" /></svg>;
    case 'play': return <svg {...c}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 9l5 3-5 3z" fill={color} stroke="none" /></svg>;
    case 'bolt': return <svg {...c}><path d="M13 2L3 14h9l-1 8 10-12h-9z" /></svg>;
    case 'life': return <svg {...c}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="M5.5 5.5l3.2 3.2M18.5 5.5l-3.2 3.2M5.5 18.5l3.2-3.2M18.5 18.5l-3.2-3.2" /></svg>;
    case 'api': return <svg {...c}><path d="M4 4l16 16M20 4L4 20" /></svg>;
    case 'bars': return <svg {...c} strokeWidth="2.4"><path d="M5 20V12M12 20V6M19 20v-9" /></svg>;
    case 'trend': return <svg {...c}><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>;
    case 'calendar': return <svg {...c}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>;
    case 'ticket': return <svg {...c}><path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4z" /><path d="M9 6v12" strokeDasharray="2 2" /></svg>;
    case 'briefcase': return <svg {...c}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18" /></svg>;
    case 'console': return <svg {...c}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>;
    case 'trophy': return <svg {...c}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM7 6H4a2 2 0 002 4h1M17 6h3a2 2 0 01-2 4h-1" /></svg>;
    case 'hardware': return <svg {...c}><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></svg>;
    case 'playcircle': return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="M10 9l5 3-5 3z" fill={color} stroke="none" /></svg>;
    case 'castle': return <svg {...c}><path d="M4 21V9l3-2v2h2V7l3-2 3 2v2h2V7l3 2v12z" /><path d="M4 21h16M9 21v-5h6v5" /></svg>;
    case 'pin': return <svg {...c}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" fill={color} stroke="none" /></svg>;
    case 'tiktok': return <svg {...c}><path d="M14 4v10.5a3.5 3.5 0 11-3-3.46M14 4a4.5 4.5 0 004.5 4.5" /></svg>;
    default: return null;
  }
}

function MiniSpark({ up, seed = 0 }) {
  const shapes = [
    '0,20 8,18 16,19 24,12 32,14 40,7 48,4',
    '0,20 8,15 16,17 24,10 32,12 40,6 48,3',
    '0,4 8,9 16,7 24,13 32,12 40,17 48,20',
    '0,6 8,10 16,8 24,14 32,11 40,16 48,20',
  ];
  const pts = shapes[seed % shapes.length];
  const color = up ? GREEN : SALMON;
  return (
    <svg viewBox="0 0 48 24" style={{ width: '100%', height: 34, display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MusicCard({ m, onOpen }) {
  return (
    <div onClick={() => m.id && onOpen(m.id)}
      style={{ background: CARD_BG, border: `1px solid ${CARD_LINE}`, borderRadius: 8, padding: '13px 14px 14px', cursor: m.id ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', transition: 'border-color .15s ease' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = CARD_LINE)}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ ...mono({ fontSize: 8.5, color: WARM, background: '#0C2745', border: `1px solid ${CARD_LINE}`, borderRadius: 2, padding: '3px 7px' }) }}>{m.tag}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...mono({ fontSize: 9, color: WARM }) }}>
          <SectorIcon kind="bars" color={WARM} size={11} />{m.vol} Vol
        </span>
      </div>
      <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13, lineHeight: 1.4, margin: '11px 0 10px', minHeight: 54 }}>{m.title}</div>
      <MiniSpark up={m.yes >= 50} seed={m._seed || 0} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <div style={{ flex: 1, textAlign: 'center', background: '#0C2745', borderRadius: 4, padding: '9px 4px' }}>
          <div style={{ ...mono({ fontSize: 8.5, color: GREEN }) }}>YES</div>
          <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13, marginTop: 3 }}>{m.yes}¢</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', background: '#0C2745', borderRadius: 4, padding: '9px 4px' }}>
          <div style={{ ...mono({ fontSize: 8.5, color: SALMON }) }}>NO</div>
          <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13, marginTop: 3 }}>{m.no}¢</div>
        </div>
      </div>
    </div>
  );
}

function DuneArt() {
  return (
    <svg viewBox="0 0 600 320" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="dune-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060D16" />
          <stop offset="45%" stopColor="#0F2435" />
          <stop offset="72%" stopColor="#274456" />
          <stop offset="100%" stopColor="#3C5B67" />
        </linearGradient>
        <radialGradient id="dune-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F8D098" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#C8A47E" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#8A6B54" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dune-ridge-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5C4A3C" />
          <stop offset="100%" stopColor="#2E241D" />
        </linearGradient>
        <linearGradient id="dune-ridge-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1D1712" />
          <stop offset="100%" stopColor="#07090C" />
        </linearGradient>
        <linearGradient id="dune-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3E2A1C" stopOpacity="0" />
          <stop offset="50%" stopColor="#8A5A32" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#3E2A1C" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="600" height="320" fill="url(#dune-sky)" />
      <circle cx="360" cy="100" r="130" fill="url(#dune-halo)" />
      <circle cx="360" cy="100" r="30" fill="#FBE3B8" />
      <circle cx="360" cy="100" r="30" fill="#F8D098" opacity="0.6" />
      <path d="M0,175 Q140,140 280,168 Q420,196 600,150 V320 H0 Z" fill="url(#dune-ridge-far)" />
      <path d="M0,178 Q140,146 280,172 Q420,198 600,155 V182 Q420,214 280,190 Q140,164 0,196 Z" fill="url(#dune-rim)" opacity="0.55" />
      <path d="M0,225 Q160,195 300,222 Q440,248 600,205 V320 H0 Z" fill="url(#dune-ridge-near)" />
      <path d="M270,320 Q290,250 300,222 Q312,250 332,320 Z" fill="#050708" opacity="0.9" />
      <path d="M282,320 Q294,268 300,240 Q307,268 320,320 Z" fill="#0B0E12" opacity="0.7" />
    </svg>
  );
}

function toCardShape(m, tag, seed) {
  const yes = yesOf(m);
  const lead = yes || leaderOf(m);
  const yesP = yes ? Math.round(yes.probability || 0) : Math.round(lead?.probability || 50);
  return { id: m.id, title: m.title, vol: compactVol(m.total_volume || 0), yes: yesP, no: 100 - yesP, tag, _seed: seed };
}

function SectionHeader({ icon, label, onViewAll }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
        <SectorIcon kind={icon} color={GOLD_DIM} size={17} />
        <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 19 }}>{label}</span>
      </span>
      <button onClick={onViewAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, color: WARM, fontSize: 12.5, fontWeight: 600 }}>
        View All <span style={{ fontSize: 14 }}>→</span>
      </button>
    </div>
  );
}

function MusicSection({ markets, genre, onOpen, onViewAll, forwardRef }) {
  const isGenre = genre && genre !== 'All Music';
  const real = isGenre
    ? genreMarkets(markets, genre).slice(0, 4).map((m, i) => toCardShape(m, (GENRE_DEMO[genre]?.[i]?.tag) || genre.toUpperCase(), i))
    : sectorMarkets(markets, 'music').slice(0, 4).map((m, i) => toCardShape(m, MUSIC_DEMO[i]?.tag || 'MUSIC', i));
  const demoBank = isGenre ? (GENRE_DEMO[genre] || []) : MUSIC_DEMO;
  const rows = real.length >= Math.min(2, demoBank.length) ? real : demoBank.map((d, i) => ({ ...d, id: null, _seed: i }));
  return (
    <div ref={forwardRef} style={{ marginBottom: 34, scrollMarginTop: 90 }}>
      <SectionHeader icon="note" label={isGenre ? `Music · ${genre}` : 'Music'} onViewAll={onViewAll} />
      <div className="dbm-home-music-grid">
        {rows.map((m, i) => <MusicCard key={m.id || `music-${i}`} m={m} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

function MoviesSection({ markets, platform, onOpen, onViewAll, forwardRef }) {
  const isPlatform = !!platform && platform !== 'All Movies & TV';
  const real = isPlatform ? platformMarkets(markets, platform) : sectorMarkets(markets, 'movies');
  const featuredM = real[0];
  const sideMs = real.slice(1, 3);
  const demoSet = isPlatform ? (PLATFORM_DEMO[platform] || { featured: MOVIES_DEMO_FEATURED, side: MOVIES_DEMO_SIDE }) : { featured: MOVIES_DEMO_FEATURED, side: MOVIES_DEMO_SIDE };

  const featured = featuredM
    ? { id: featuredM.id, title: featuredM.title, desc: featuredM.description || demoSet.featured.desc, ...(() => { const y = yesOf(featuredM) || leaderOf(featuredM); const yp = Math.round((yesOf(featuredM) ? y.probability : y?.probability) || 50); return { yes: yp, no: 100 - yp }; })(), image: featuredM.image || featuredM.event_image }
    : demoSet.featured;

  const side = sideMs.length > 0
    ? sideMs.map((m, i) => toCardShape(m, demoSet.side[i]?.tag || (isPlatform ? platform.toUpperCase() : (i === 0 ? 'ROTTEN TOMATOES' : 'STREAMING WARS')), i))
    : demoSet.side.map((d, i) => ({ ...d, id: null, _seed: i }));

  return (
    <div ref={forwardRef} style={{ marginBottom: 34, scrollMarginTop: 90 }}>
      <SectionHeader icon="film" label={isPlatform ? `Movies & TV · ${platform}` : 'Movies & TV'} onViewAll={onViewAll} />
      <div className="dbm-home-movies-grid">
        <div
          onClick={() => featured.id && onOpen(featured.id)}
          style={{ position: 'relative', minHeight: 260, borderRadius: 8, overflow: 'hidden', cursor: featured.id ? 'pointer' : 'default', border: `1px solid ${CARD_LINE}`, background: featured.image && /^https?:/.test(featured.image) ? `center/cover no-repeat url(${featured.image})` : '#0A1730', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 20 }}
        >
          {!(featured.image && /^https?:/.test(featured.image)) && <DuneArt />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,10,26,.05) 0%, rgba(0,10,26,.85) 78%)' }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ ...mono({ fontSize: 8.5, color: WARM, background: 'rgba(0,19,45,.85)', border: `1px solid ${CARD_LINE}`, borderRadius: 2, padding: '4px 9px' }) }}>{isPlatform ? `FEATURED · ${platform.toUpperCase()}` : 'FEATURED BOX OFFICE'}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...mono({ fontSize: 8.5, color: GREEN }) }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: GREEN }} />LIVE MARKET
            </span>
          </div>
          <div style={{ position: 'relative', marginTop: 'auto' }}>
            <h3 style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 'clamp(17px,1.9vw,21px)', lineHeight: 1.3, margin: '14px 0 0' }}>{featured.title}</h3>
            <p style={{ color: '#B9C7DC', fontSize: 11.5, lineHeight: 1.6, margin: '9px 0 0', maxWidth: 460 }}>{featured.desc}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <span style={{ flex: 1, maxWidth: 150, textAlign: 'center', background: 'rgba(0,19,45,.75)', border: `1px solid ${CARD_LINE}`, borderRadius: 4, padding: '9px 4px' }}>
                <div style={{ ...mono({ fontSize: 8, color: WARM }) }}>TRADE YES</div>
                <div style={{ color: GREEN, fontWeight: 800, fontSize: 14, marginTop: 3 }}>{featured.yes}¢</div>
              </span>
              <span style={{ flex: 1, maxWidth: 150, textAlign: 'center', background: 'rgba(0,19,45,.75)', border: `1px solid ${CARD_LINE}`, borderRadius: 4, padding: '9px 4px' }}>
                <div style={{ ...mono({ fontSize: 8, color: WARM }) }}>TRADE NO</div>
                <div style={{ color: SALMON, fontWeight: 800, fontSize: 14, marginTop: 3 }}>{featured.no}¢</div>
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {side.map((m, i) => <SectorGridCard key={m.id || `side-${i}`} m={m} onOpen={onOpen} />)}
        </div>
      </div>
    </div>
  );
}

function SectorGridCard({ m, onOpen }) {
  return (
    <div key={m.id || m.title} onClick={() => m.id && onOpen(m.id)}
      style={{ background: CARD_BG, border: `1px solid ${CARD_LINE}`, borderRadius: 8, padding: '14px 15px', cursor: m.id ? 'pointer' : 'default', transition: 'border-color .15s ease' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = CARD_LINE)}
    >
      <span style={{ ...mono({ fontSize: 8, color: WARM }) }}>{m.tag}</span>
      <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 15, lineHeight: 1.4, margin: '9px 0 12px' }}>{m.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...mono({ fontSize: 10, color: WARM }) }}>Vol: {m.vol}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          <span style={{ background: '#0C2745', border: '1px solid rgba(75,225,118,.4)', color: GREEN, ...mono({ fontSize: 10, letterSpacing: '0.02em' }), borderRadius: 3, padding: '5px 9px' }}>{m.yes}¢</span>
          <span style={{ background: '#0C2745', border: '1px solid rgba(255,180,171,.35)', color: SALMON, ...mono({ fontSize: 10, letterSpacing: '0.02em' }), borderRadius: 3, padding: '5px 9px' }}>{m.no}¢</span>
        </span>
      </div>
    </div>
  );
}

function TwoCardSection({ sector, markets, demo, max = 2, title, pickReal, onOpen, onViewAll, forwardRef }) {
  const pool = pickReal ? pickReal(markets) : sectorMarkets(markets, sector.id);
  const real = pool.slice(0, max).map((m, i) => toCardShape(m, demo[i]?.tag || sector.label.toUpperCase(), i));
  const rows = real.length >= Math.min(2, demo.length) ? real : demo.map((d, i) => ({ ...d, id: null, _seed: i }));
  return (
    <div ref={forwardRef} style={{ marginBottom: 34, scrollMarginTop: 90 }}>
      <SectionHeader icon={sector.icon} label={title || sector.label} onViewAll={onViewAll} />
      <div className="dbm-home-two-grid">
        {rows.map((m, i) => <SectorGridCard key={m.id || `${sector.id}-${i}`} m={m} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

function HomeTape({ markets }) {
  const real = [...markets]
    .filter((m) => m.status === 'active')
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 6)
    .map((m) => {
      const yes = yesOf(m) || leaderOf(m);
      const p = Math.round(yes?.probability || 50);
      return { label: shortTitle(m.title).slice(0, 20).toUpperCase(), price: p, delta: deltaFor(m, yes) };
    });
  const demo = [
    { label: 'DUNE 3 ANNOUNCE', price: 76, delta: 12 },
    { label: 'NETFLIX CHURN', price: 44, delta: -3 },
    { label: 'GRAMMYS AOTY', price: 62, delta: 1 },
    { label: 'K. LAMAR ALBUM', price: 88, delta: 4 },
    { label: "SZA TOUR '25", price: 91, delta: 2 },
  ];
  const items = real.length >= 4 ? real : demo;
  const loop = [...items, ...items, ...items];
  return (
    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
      <div className="dbm-home-tape" style={{ display: 'inline-flex', alignItems: 'center' }}>
        {loop.map((it, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, marginRight: 34, ...mono({ fontSize: 10.5, letterSpacing: '0.04em' }) }}>
            <span style={{ color: WARM }}>{it.label}:</span>
            <span style={{ color: '#DCE6F5' }}>{it.price}¢</span>
            <span style={{ color: it.delta >= 0 ? GREEN : SALMON }}>{it.delta >= 0 ? '▲' : '▼'} {Math.abs(it.delta)}%</span>
          </span>
        ))}
      </div>
      <style>{`
        .dbm-home-tape { animation: dbm-home-tape 42s linear infinite; }
        .dbm-home-tape:hover { animation-play-state: paused; }
        @keyframes dbm-home-tape { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        @media (prefers-reduced-motion: reduce) { .dbm-home-tape { animation: none; } }
      `}</style>
    </div>
  );
}

export default function LandingPage() {
  const { markets } = useMarkets();
  const navigate = useNavigate();
  const [pulse, setPulse] = useState(null);
  const [activeSector, setActiveSector] = useState('music');
  const [musicOpen, setMusicOpen] = useState(true);
  const [musicGenre, setMusicGenre] = useState('All Music');
  const [moviesOpen, setMoviesOpen] = useState(false);
  const [moviesPlatform, setMoviesPlatform] = useState('All Movies & TV');
  const [celebsOpen, setCelebsOpen] = useState(false);
  const [celebSub, setCelebSub] = useState('All Celebrities');
  const [festivalsOpen, setFestivalsOpen] = useState(false);
  const [festivalSub, setFestivalSub] = useState('All Festivals');
  const [gamingOpen, setGamingOpen] = useState(false);
  const [gamingSub, setGamingSub] = useState('All Gaming');
  const [streamingOpen, setStreamingOpen] = useState(false);
  const [streamingSub, setStreamingSub] = useState('All Streaming');
  const [trendsOpen, setTrendsOpen] = useState(false);
  const [trendsSub, setTrendsSub] = useState('Google Trends');

  const fetchPulse = useCallback(() => { api.getPulse().then((r) => setPulse(r)).catch(() => {}); }, []);
  useEffect(() => { fetchPulse(); const t = setInterval(fetchPulse, 20000); return () => clearInterval(t); }, [fetchPulse]);

  const refs = {
    music: useRef(null), movies: useRef(null), celebrities: useRef(null),
    festivals: useRef(null), gaming: useRef(null), streaming: useRef(null),
    trends: useRef(null),
  };

  const goTo = (id) => {
    setActiveSector(id);
    if (id !== 'music') setMusicOpen(false);
    if (id !== 'movies') setMoviesOpen(false);
    if (id !== 'celebrities') setCelebsOpen(false);
    if (id !== 'festivals') setFestivalsOpen(false);
    if (id !== 'gaming') setGamingOpen(false);
    if (id !== 'streaming') setStreamingOpen(false);
    if (id !== 'trends') setTrendsOpen(false);
    refs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleMusic = () => {
    if (activeSector === 'music') {
      setMusicOpen((v) => !v);
    } else {
      setActiveSector('music');
      setMusicOpen(true);
      setMoviesOpen(false);
      setCelebsOpen(false);
      setFestivalsOpen(false);
      setGamingOpen(false);
      setStreamingOpen(false);
      setTrendsOpen(false);
    }
    refs.music?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectGenre = (g) => {
    setMusicGenre(g);
    setActiveSector('music');
    setMusicOpen(true);
    refs.music?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleMovies = () => {
    if (activeSector === 'movies') {
      setMoviesOpen((v) => !v);
    } else {
      setActiveSector('movies');
      setMoviesOpen(true);
      setMusicOpen(false);
      setCelebsOpen(false);
      setFestivalsOpen(false);
      setGamingOpen(false);
      setStreamingOpen(false);
      setTrendsOpen(false);
    }
    refs.movies?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectPlatform = (p) => {
    setMoviesPlatform(p);
    setActiveSector('movies');
    setMoviesOpen(true);
    refs.movies?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleCelebs = () => {
    if (activeSector === 'celebrities') {
      setCelebsOpen((v) => !v);
    } else {
      setActiveSector('celebrities');
      setCelebsOpen(true);
      setMusicOpen(false);
      setMoviesOpen(false);
      setFestivalsOpen(false);
      setGamingOpen(false);
      setStreamingOpen(false);
      setTrendsOpen(false);
    }
    refs.celebrities?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectCelebSub = (v) => {
    setCelebSub(v);
    setActiveSector('celebrities');
    setCelebsOpen(true);
    refs.celebrities?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleFestivals = () => {
    if (activeSector === 'festivals') {
      setFestivalsOpen((v) => !v);
    } else {
      setActiveSector('festivals');
      setFestivalsOpen(true);
      setMusicOpen(false);
      setMoviesOpen(false);
      setCelebsOpen(false);
      setGamingOpen(false);
      setStreamingOpen(false);
      setTrendsOpen(false);
    }
    refs.festivals?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectFestivalSub = (v) => {
    setFestivalSub(v);
    setActiveSector('festivals');
    setFestivalsOpen(true);
    refs.festivals?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleGaming = () => {
    if (activeSector === 'gaming') {
      setGamingOpen((v) => !v);
    } else {
      setActiveSector('gaming');
      setGamingOpen(true);
      setMusicOpen(false);
      setMoviesOpen(false);
      setCelebsOpen(false);
      setFestivalsOpen(false);
      setStreamingOpen(false);
      setTrendsOpen(false);
    }
    refs.gaming?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectGamingSub = (v) => {
    setGamingSub(v);
    setActiveSector('gaming');
    setGamingOpen(true);
    refs.gaming?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleStreaming = () => {
    if (activeSector === 'streaming') {
      setStreamingOpen((v) => !v);
    } else {
      setActiveSector('streaming');
      setStreamingOpen(true);
      setMusicOpen(false);
      setMoviesOpen(false);
      setCelebsOpen(false);
      setFestivalsOpen(false);
      setGamingOpen(false);
      setTrendsOpen(false);
    }
    refs.streaming?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectStreamingSub = (v) => {
    setStreamingSub(v);
    setActiveSector('streaming');
    setStreamingOpen(true);
    refs.streaming?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleTrends = () => {
    if (activeSector === 'trends') {
      setTrendsOpen((v) => !v);
    } else {
      setActiveSector('trends');
      setTrendsOpen(true);
      setMusicOpen(false);
      setMoviesOpen(false);
      setCelebsOpen(false);
      setFestivalsOpen(false);
      setGamingOpen(false);
      setStreamingOpen(false);
    }
    refs.trends?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectTrendsSub = (v) => {
    setTrendsSub(v);
    setActiveSector('trends');
    setTrendsOpen(true);
    refs.trends?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const active = markets.filter((m) => m.status === 'active');
  const globalVol = pulse ? pulse.paper_volume_traded : active.reduce((s, m) => s + (m.total_volume || 0), 0);
  const activeTraders = pulse?.users != null ? pulse.users.toLocaleString('en-US') : '12,492';

  return (
    <div style={{ background: PAGE_BG, minHeight: '100%' }}>
      <div className="dbm-home-shell-wrap">
      <div className="dbm-home-shell">
        <aside style={{ background: SIDEBAR_BG, flexShrink: 0, padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN }} />
            <span style={{ ...mono({ fontSize: 9, letterSpacing: '0.16em', color: WARM }) }}>LIVE FEED</span>
          </div>
          <div style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 15, letterSpacing: '0.02em', marginTop: 8, marginBottom: 20 }}>MARKETS</div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTORS.map((s) => {
              const isActive = activeSector === s.id;
              const isMusic = s.id === 'music';
              const isMovies = s.id === 'movies';
              const isCelebs = s.id === 'celebrities';
              const isFestivals = s.id === 'festivals';
              const isGaming = s.id === 'gaming';
              const isStreaming = s.id === 'streaming';
              const isTrends = s.id === 'trends';
              const hasDropdown = isMusic || isMovies || isCelebs || isFestivals || isGaming || isStreaming || isTrends;
              const expanded = isActive && ((isMusic && musicOpen) || (isMovies && moviesOpen) || (isCelebs && celebsOpen) || (isFestivals && festivalsOpen) || (isGaming && gamingOpen) || (isStreaming && streamingOpen) || (isTrends && trendsOpen));
              const onClickHeader = isMusic ? toggleMusic : isMovies ? toggleMovies : isCelebs ? toggleCelebs : isFestivals ? toggleFestivals : isGaming ? toggleGaming : isStreaming ? toggleStreaming : isTrends ? toggleTrends : () => goTo(s.id);
              const subItems = isMusic ? MUSIC_GENRES : isMovies ? MOVIES_PLATFORMS : isCelebs ? CELEB_SUBS : isFestivals ? FESTIVAL_SUBS : isGaming ? GAMING_SUBS : isStreaming ? STREAMING_SUBS : isTrends ? INTERNET_TRENDS_SUBS : null;
              const subActive = isMusic ? musicGenre : isMovies ? moviesPlatform : isCelebs ? celebSub : isFestivals ? festivalSub : isGaming ? gamingSub : isStreaming ? streamingSub : isTrends ? trendsSub : null;
              const onSelectSub = isMusic ? selectGenre : isMovies ? selectPlatform : isCelebs ? selectCelebSub : isFestivals ? selectFestivalSub : isGaming ? selectGamingSub : isStreaming ? selectStreamingSub : isTrends ? selectTrendsSub : null;
              const iconSubs = isCelebs ? CELEB_SUB_ICONS : isFestivals ? FESTIVAL_SUB_ICONS : isGaming ? GAMING_SUB_ICONS : isStreaming ? STREAMING_SUB_ICONS : isTrends ? TRENDS_SUB_ICONS : null;
              return (
                <div key={s.id}>
                  <button onClick={onClickHeader}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: isActive ? '#394666' : 'transparent',
                      border: 'none', borderRadius: 6, padding: '10px 11px', cursor: 'pointer', textAlign: 'left',
                      color: isActive ? '#DCE6F5' : WARM, fontSize: 13, fontWeight: isActive ? 700 : 500,
                    }}>
                    <SectorIcon kind={s.icon} color={isActive ? '#DCE6F5' : WARM} />
                    <span style={{ flex: 1 }}>{s.label}</span>
                    {hasDropdown && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isActive ? '#DCE6F5' : WARM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease', flexShrink: 0 }}>
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    )}
                  </button>
                  {expanded && iconSubs && (
                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2 }}>
                      {subItems.map((g) => {
                        const genreActive = subActive === g;
                        return (
                          <button key={g} onClick={() => onSelectSub(g)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 9,
                              background: genreActive ? 'rgba(255,223,155,.08)' : 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
                              padding: '9px 11px', margin: '0 6px', borderRadius: 5, fontSize: 13,
                              color: genreActive ? GOLD_DIM : WARM, fontWeight: genreActive ? 700 : 500,
                            }}>
                            <SectorIcon kind={iconSubs[g]} color={genreActive ? GOLD_DIM : WARM} size={13} />
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {expanded && !iconSubs && (
                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2 }}>
                      {subItems.map((g) => {
                        const genreActive = subActive === g;
                        return (
                          <button key={g} onClick={() => onSelectSub(g)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
                              padding: '7px 11px 7px 38px', fontSize: 12.5,
                              color: genreActive ? GOLD_DIM : WARM, fontWeight: genreActive ? 700 : 500,
                            }}>
                            <span style={{ width: 5, height: 5, borderRadius: 999, background: genreActive ? GOLD_DIM : 'transparent', flexShrink: 0 }} />
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <button onClick={() => navigate('/explore')}
            style={{ marginTop: 24, background: GOLD, color: '#00132D', border: 'none', borderRadius: 6, padding: '11px 0', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>
            Trade Now
          </button>

          <div style={{ marginTop: 'auto', paddingTop: 30, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', color: '#5C7391', fontSize: 12 }}>
              <SectorIcon kind="life" color="#5C7391" size={13} /> Support
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', color: '#5C7391', fontSize: 12 }}>
              <SectorIcon kind="api" color="#5C7391" size={13} /> API
            </span>
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0, padding: '16px 22px 60px' }}>
          <div className="dbm-home-statrow" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
            <HomeTape markets={markets} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: CARD_BG, border: `1px solid ${CARD_LINE}`, borderRadius: 4, padding: '7px 12px', flexShrink: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN }} />
              <span style={{ ...mono({ fontSize: 9, letterSpacing: '0.08em', color: GREEN }) }}>RADAR NODE: ALL SYSTEMS GO</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap', marginBottom: 28, paddingBottom: 16, borderBottom: `1px solid ${CARD_LINE}` }}>
            <div>
              <div style={{ ...mono({ fontSize: 9, letterSpacing: '0.1em', color: WARM }) }}>GLOBAL VOLUME</div>
              <div style={{ ...mono({ fontSize: 19, color: '#FFFFFF', letterSpacing: '0.01em' }), marginTop: 6 }}>
                ${globalVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div style={{ ...mono({ fontSize: 9, letterSpacing: '0.1em', color: WARM }) }}>ACTIVE TRADERS</div>
              <div style={{ ...mono({ fontSize: 19, color: GREEN, letterSpacing: '0.01em' }), marginTop: 6 }}>{activeTraders}</div>
            </div>
          </div>

          <MusicSection markets={markets} genre={musicGenre} onOpen={(id) => navigate(`/markets/${id}`)} onViewAll={() => navigate('/explore')} forwardRef={refs.music} />
          <MoviesSection markets={markets} platform={moviesPlatform} onOpen={(id) => navigate(`/markets/${id}`)} onViewAll={() => navigate('/explore')} forwardRef={refs.movies} />

          <TwoCardSection
            sector={SECTORS.find((s) => s.id === 'celebrities')}
            demo={celebSub === 'Celebrities Trends' ? CELEBRITIES_TRENDS_DEMO : CELEBRITIES_DEMO}
            max={3}
            title={celebSub === 'Celebrities Trends' ? 'Celebrity Markets · Trending' : 'Celebrity Markets'}
            pickReal={celebSub === 'Celebrities Trends' ? celebTrendingMarkets : undefined}
            markets={markets}
            onOpen={(id) => navigate(`/markets/${id}`)}
            onViewAll={() => navigate('/explore')}
            forwardRef={refs.celebrities}
          />
          <TwoCardSection
            sector={SECTORS.find((s) => s.id === 'festivals')}
            demo={festivalSub === 'All Festivals' ? FESTIVALS_DEMO : (FESTIVAL_SUB_DEMO[festivalSub] || FESTIVALS_DEMO)}
            max={4}
            title={festivalSub === 'All Festivals' ? 'Festival Markets' : `Festival Markets · ${festivalSub}`}
            pickReal={festivalSub === 'All Festivals' ? undefined : (m) => festivalSubMarkets(m, festivalSub)}
            markets={markets}
            onOpen={(id) => navigate(`/markets/${id}`)}
            onViewAll={() => navigate('/explore')}
            forwardRef={refs.festivals}
          />
          <TwoCardSection
            sector={SECTORS.find((s) => s.id === 'gaming')}
            demo={gamingSub === 'All Gaming' ? GAMING_MARKETS_DEMO : (GAMING_SUB_DEMO[gamingSub] || GAMING_MARKETS_DEMO)}
            max={4}
            title={gamingSub === 'All Gaming' ? 'Gaming Markets' : `Gaming Markets · ${gamingSub}`}
            pickReal={gamingSub === 'All Gaming' ? undefined : (m) => gamingSubMarkets(m, gamingSub)}
            markets={markets}
            onOpen={(id) => navigate(`/markets/${id}`)}
            onViewAll={() => navigate('/explore')}
            forwardRef={refs.gaming}
          />
          <TwoCardSection
            sector={SECTORS.find((s) => s.id === 'streaming')}
            demo={streamingSub === 'All Streaming' ? STREAMING_DEMO : (STREAMING_SUB_DEMO[streamingSub] || STREAMING_DEMO)}
            max={4}
            title={streamingSub === 'All Streaming' ? 'Streaming Markets' : `Streaming Markets · ${streamingSub}`}
            pickReal={streamingSub === 'All Streaming' ? undefined : (m) => streamingSubMarkets(m, streamingSub)}
            markets={markets}
            onOpen={(id) => navigate(`/markets/${id}`)}
            onViewAll={() => navigate('/explore')}
            forwardRef={refs.streaming}
          />
          <div ref={refs.trends} style={{ scrollMarginTop: 90 }}>
            {trendsSub === 'Google Trends' ? (
              <>
                <TwoCardSection
                  sector={{ id: 'trends', icon: 'trend', label: 'Viral Challenges' }}
                  demo={VIRAL_CHALLENGES_DEMO}
                  max={2}
                  pickReal={viralChallengeMarkets}
                  markets={markets}
                  onOpen={(id) => navigate(`/markets/${id}`)}
                  onViewAll={() => navigate('/explore')}
                />
                <TwoCardSection
                  sector={{ id: 'trends', icon: 'bars', label: 'Creator Milestones' }}
                  demo={CREATOR_MILESTONES_DEMO}
                  max={2}
                  pickReal={creatorMilestoneMarkets}
                  markets={markets}
                  onOpen={(id) => navigate(`/markets/${id}`)}
                  onViewAll={() => navigate('/explore')}
                />
              </>
            ) : (
              <TwoCardSection
                sector={SECTORS.find((s) => s.id === 'trends')}
                demo={TRENDS_PLATFORM_DEMO[trendsSub] || VIRAL_CHALLENGES_DEMO}
                max={4}
                title={`Internet Trends · ${trendsSub}`}
                pickReal={(m) => trendsPlatformMarkets(m, trendsSub)}
                markets={markets}
                onOpen={(id) => navigate(`/markets/${id}`)}
                onViewAll={() => navigate('/explore')}
              />
            )}
          </div>
        </main>
      </div>
      </div>

      <button onClick={() => navigate('/explore')}
        style={{
          position: 'fixed', right: 26, bottom: 26, width: 52, height: 52, borderRadius: 999,
          background: GOLD, border: 'none', cursor: 'pointer', zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 26px rgba(0,5,15,.5)',
        }}
        title="Quick trade"
      >
        <SectorIcon kind="bolt" color="#00132D" size={20} />
      </button>

      <style>{`
        .dbm-home-shell-wrap { max-width: 1400px; margin: 0 auto; }
        .dbm-home-shell { display: flex; align-items: flex-start; min-height: 100%; }
        .dbm-home-music-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .dbm-home-movies-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .dbm-home-two-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 640px) { .dbm-home-music-grid { grid-template-columns: repeat(3, 1fr); } .dbm-home-two-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) {
          .dbm-home-music-grid { grid-template-columns: repeat(4, 1fr); }
          .dbm-home-movies-grid { grid-template-columns: 1.6fr 1fr; }
        }
        @media (min-width: 768px) { .dbm-home-shell > aside { width: 220px; } }
        @media (max-width: 767px) {
          .dbm-home-shell { flex-direction: column; }
          .dbm-home-shell > aside { width: 100% !important; flex-direction: row !important; flex-wrap: wrap; align-items: center; }
          .dbm-home-shell > aside nav { flex-direction: row !important; flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}
