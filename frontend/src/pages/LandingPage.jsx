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

const MOVIES_PLATFORMS = ['Netflix', 'HBO/Max', 'Disney+', 'Prime Video', 'Apple TV+', 'Hulu', 'Box Office Hits', 'Awards', 'Franchises'];

// Same caveat as the Music genre filters below: title/keyword heuristics,
// not real per-market platform metadata.
const PLATFORM_RE = {
  'Netflix': /netflix/i,
  'HBO/Max': /\bhbo\b|hbo max/i,
  'Disney+': /disney\+|disney plus/i,
  'Prime Video': /prime video|amazon prime/i,
  'Apple TV+': /apple tv/i,
  'Hulu': /\bhulu\b/i,
  'Box Office Hits': /box office/i,
  'Awards': /oscar|academy award|golden globe|\bemmy\b|\baward\b/i,
  'Franchises': /marvel|\bmcu\b|star wars|\bdc\b|sequel|part \d|chapter \d|franchise/i,
};
const PLATFORM_DEMO = {
  'Netflix': {
    featured: { title: 'Will "Stranger Things" Season 5 break Netflix viewership records?', desc: 'Final-season hype has been building fast since the teaser trailer dropped.', yes: 74, no: 26 },
    side: [
      { title: "Netflix Series: 'Beef' Season 2 Renewal?", vol: '$180K', yes: 92, no: 8, tag: 'NETFLIX' },
      { title: 'Will "Wednesday" Season 2 premiere before Q3?', vol: '$310K', yes: 66, no: 34, tag: 'NETFLIX' },
    ],
  },
  'HBO/Max': {
    featured: { title: 'Will "House of the Dragon" Season 3 premiere before 2026?', desc: 'Production wrapped early, fueling speculation about an accelerated release window.', yes: 58, no: 42 },
    side: [
      { title: '"The Last of Us" Season 3 renewal confirmed?', vol: '$260K', yes: 81, no: 19, tag: 'HBO MAX' },
      { title: '"Euphoria" Season 3 premiere date announced?', vol: '$340K', yes: 47, no: 53, tag: 'HBO MAX' },
    ],
  },
  'Disney+': {
    featured: { title: 'Will a new "Star Wars" series be announced at D23?', desc: 'Rumors point to a Mandalorian spinoff following recent casting leaks.', yes: 63, no: 37 },
    side: [
      { title: '"Daredevil: Born Again" Season 2 confirmed?', vol: '$290K', yes: 70, no: 30, tag: 'DISNEY+' },
      { title: 'Disney+ password-sharing crackdown expands in 2025?', vol: '$150K', yes: 55, no: 45, tag: 'DISNEY+' },
    ],
  },
  'Prime Video': {
    featured: { title: 'Will "The Boys" Season 5 be its final season?', desc: 'Showrunner comments have fueled speculation the flagship series is wrapping up.', yes: 52, no: 48 },
    side: [
      { title: '"Fallout" Season 2 premiere date set for 2025?', vol: '$220K', yes: 68, no: 32, tag: 'PRIME VIDEO' },
      { title: 'Amazon to greenlight a new "Lord of the Rings" film?', vol: '$310K', yes: 34, no: 66, tag: 'PRIME VIDEO' },
    ],
  },
  'Apple TV+': {
    featured: { title: 'Will "Severance" Season 3 be renewed before the S2 finale?', desc: 'Critical acclaim and social buzz have made an early renewal increasingly likely.', yes: 77, no: 23 },
    side: [
      { title: '"Ted Lasso" Season 4 officially confirmed?', vol: '$260K', yes: 41, no: 59, tag: 'APPLE TV+' },
      { title: 'Apple TV+ to raise subscription prices in 2025?', vol: '$95K', yes: 48, no: 52, tag: 'APPLE TV+' },
    ],
  },
  'Hulu': {
    featured: { title: 'Will "The Bear" Season 4 premiere before summer 2025?', desc: 'FX production schedule leaks suggest a faster turnaround than Season 3 had.', yes: 56, no: 44 },
    side: [
      { title: 'Hulu and Disney+ bundle merges into one app in 2025?', vol: '$180K', yes: 61, no: 39, tag: 'HULU' },
      { title: '"Only Murders in the Building" Season 5 renewal confirmed?', vol: '$140K', yes: 83, no: 17, tag: 'HULU' },
    ],
  },
  'Box Office Hits': {
    featured: MOVIES_DEMO_FEATURED,
    side: [
      { title: '"Gladiator II" to cross $500M worldwide?', vol: '$412K', yes: 64, no: 36, tag: 'ROTTEN TOMATOES' },
      { title: 'Will a 2025 release cross $1B worldwide?', vol: '$680K', yes: 37, no: 63, tag: 'BOX OFFICE' },
    ],
  },
  'Awards': {
    featured: { title: 'Will "Oppenheimer" sweep Best Picture at the 2025 Oscars?', desc: 'Awards-season momentum has made it the frontrunner across major guild ceremonies.', yes: 69, no: 31 },
    side: [
      { title: 'Will "Stranger Things" win Outstanding Drama Series at the 2026 Emmys?', vol: '$0', yes: 50, no: 50, tag: 'ROTTEN TOMATOES' },
      { title: 'A streaming-only film wins Best Picture before 2027?', vol: '$220K', yes: 44, no: 56, tag: 'AWARDS' },
    ],
  },
  'Franchises': {
    featured: { title: 'Will Marvel announce Avengers: Secret Wars casting before 2026?', desc: 'Studio insiders suggest a major casting reveal is being planned for a fan event.', yes: 59, no: 41 },
    side: [
      { title: 'A new "Star Wars" trilogy greenlit before 2026?', vol: '$310K', yes: 33, no: 67, tag: 'FRANCHISES' },
      { title: 'DC to reboot Batman again before 2027?', vol: '$260K', yes: 28, no: 72, tag: 'FRANCHISES' },
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
const GAMING_PROB_DEMO = { title: 'GTA VI to be delayed to 2026?', desc: 'Institutional prediction pool based on Rockstar developer sentiment analysis.', prob: 24 };
const STREAMING_DEMO = [
  { title: "Netflix Series: 'Beef' Season 2 Renewal?", vol: '$180K', yes: 92, no: 8, tag: 'NETFLIX' },
  { title: 'The Bear Season 4 release date set for 2024?', vol: '$288K', yes: 12, no: 88, tag: 'HULU / FX' },
];
const TRENDS_DEMO = [
  { title: 'Will #KendrickChallenge trend #1 on TikTok this week?', vol: '$96K', yes: 58, no: 42, tag: 'TIKTOK' },
  { title: 'A Grammys moment goes viral before the broadcast ends?', vol: '$140K', yes: 67, no: 33, tag: 'X / TWITTER' },
];

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
  const isPlatform = !!platform;
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

function ProbabilityCard({ m, onOpen }) {
  const barColor = m.prob >= 50 ? GREEN : SALMON;
  return (
    <div onClick={() => m.id && onOpen(m.id)}
      style={{ background: CARD_BG, border: `1px solid ${CARD_LINE}`, borderRadius: 8, padding: '16px 18px', cursor: m.id ? 'pointer' : 'default', minWidth: 0 }}>
      <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 14.5 }}>{m.title}</div>
      <p style={{ color: '#8E9AB0', fontSize: 11.5, lineHeight: 1.6, margin: '7px 0 0' }}>{m.desc}</p>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ ...mono({ fontSize: 8.5, color: WARM }) }}>PROBABILITY</span>
          <span style={{ color: barColor, fontWeight: 800, fontSize: 13 }}>{m.prob}%</span>
        </div>
        <div style={{ height: 4, background: '#0C2745', borderRadius: 2, marginTop: 7 }}>
          <div style={{ width: `${m.prob}%`, height: '100%', background: barColor, borderRadius: 2 }} />
        </div>
      </div>
      <button style={{ width: '100%', marginTop: 16, background: '#182A45', border: `1px solid ${CARD_LINE}`, borderRadius: 4, padding: '10px 0', cursor: 'pointer', color: '#D5E3FF', fontWeight: 700, fontSize: 12 }}>
        Trade Pool
      </button>
    </div>
  );
}

function GamingSection({ markets, onOpen, onViewAll, forwardRef }) {
  const gm = sectorMarkets(markets, 'gaming')[0];
  const gaming = gm ? { id: gm.id, title: gm.title, desc: gm.description || GAMING_PROB_DEMO.desc, prob: Math.round((leaderOf(gm)?.probability) || GAMING_PROB_DEMO.prob) } : GAMING_PROB_DEMO;
  return (
    <div ref={forwardRef} style={{ marginBottom: 34, scrollMarginTop: 90 }}>
      <SectionHeader icon="gamepad" label="Gaming Sector" onViewAll={onViewAll} />
      <div style={{ maxWidth: 480 }}>
        <ProbabilityCard m={gaming} onOpen={onOpen} />
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
  const [moviesPlatform, setMoviesPlatform] = useState(null);
  const [celebsOpen, setCelebsOpen] = useState(false);
  const [celebSub, setCelebSub] = useState('All Celebrities');
  const [festivalsOpen, setFestivalsOpen] = useState(false);
  const [festivalSub, setFestivalSub] = useState('All Festivals');

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
    }
    refs.festivals?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectFestivalSub = (v) => {
    setFestivalSub(v);
    setActiveSector('festivals');
    setFestivalsOpen(true);
    refs.festivals?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
              const hasDropdown = isMusic || isMovies || isCelebs || isFestivals;
              const expanded = isActive && ((isMusic && musicOpen) || (isMovies && moviesOpen) || (isCelebs && celebsOpen) || (isFestivals && festivalsOpen));
              const onClickHeader = isMusic ? toggleMusic : isMovies ? toggleMovies : isCelebs ? toggleCelebs : isFestivals ? toggleFestivals : () => goTo(s.id);
              const subItems = isMusic ? MUSIC_GENRES : isMovies ? MOVIES_PLATFORMS : isCelebs ? CELEB_SUBS : isFestivals ? FESTIVAL_SUBS : null;
              const subActive = isMusic ? musicGenre : isMovies ? moviesPlatform : isCelebs ? celebSub : isFestivals ? festivalSub : null;
              const onSelectSub = isMusic ? selectGenre : isMovies ? selectPlatform : isCelebs ? selectCelebSub : isFestivals ? selectFestivalSub : null;
              const iconSubs = isCelebs ? CELEB_SUB_ICONS : isFestivals ? FESTIVAL_SUB_ICONS : null;
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
          <GamingSection markets={markets} onOpen={(id) => navigate(`/markets/${id}`)} onViewAll={() => navigate('/explore')} forwardRef={refs.gaming} />
          <TwoCardSection sector={SECTORS.find((s) => s.id === 'streaming')} demo={STREAMING_DEMO} markets={markets} onOpen={(id) => navigate(`/markets/${id}`)} onViewAll={() => navigate('/explore')} forwardRef={refs.streaming} />
          <TwoCardSection sector={SECTORS.find((s) => s.id === 'trends')} demo={TRENDS_DEMO} markets={markets} onOpen={(id) => navigate(`/markets/${id}`)} onViewAll={() => navigate('/explore')} forwardRef={refs.trends} />
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
