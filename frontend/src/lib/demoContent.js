// ── Demo-parity content ──────────────────────────────────────────────────
// The homepage renders EXACTLY the content shown in the approved reference
// screenshots. While DEMO_PARITY is true, the landing page displays this
// dataset instead of live markets, so the deployed page is pixel-for-pixel
// and word-for-word the mock. Explore, market detail, portfolio, and every
// other page stay fully live. Flip to false to hand the homepage back to
// real data (same layout, live content).
export const DEMO_PARITY = true;

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();

// Mock chart shape: green YES line climbing a staircase from ~28% to ~84%
// with pullbacks; the dotted salmon NO line mirrors it automatically.
const HERO_POINTS = [28, 33, 25, 37, 45, 41, 53, 49, 63, 59, 76, 71, 88, 82, 85];

export const DEMO_HERO = {
  id: 'demo-hero',
  demo: true,
  status: 'active',
  category: 'music',
  title: 'Will Kendrick Lamar drop a surprise album before the weekend ends?',
  close_date: '2024-08-25T12:00:00Z', // renders "CLOSES AUGUST 25, 2024"
  total_volume: 1245600, // renders "$1,245,600"
  outcomes: [
    { id: 'yes', title: 'Yes', probability: 64 },
    { id: 'no', title: 'No', probability: 36 },
  ],
  demo_delta: -4, // renders "64% (-4%)"
  demo_payouts: { yes: '1.56', no: '2.75' },
  demo_news: {
    title: 'TDE affiliate whispers about "the boogeyman" returning... Market volatility up 40%.',
    link: '#',
  },
  price_history: HERO_POINTS.map((v, i) => ({
    timestamp: hoursAgo((HERO_POINTS.length - i) * 10),
    prices: { yes: v, no: 100 - v },
  })),
};

export const DEMO_FEED = [
  {
    id: 'demo-coachella',
    demo: true,
    status: 'active',
    category: 'festivals', // green chip: FESTIVALS
    title: 'Will Coachella 2025 sell out in under 3 hours?',
    total_volume: 840000, // VOL: $840K
    created_at: hoursAgo(6),
    outcomes: [
      { id: 'yes', title: 'Yes', probability: 22 },
      { id: 'no', title: 'No', probability: 78 },
    ],
  },
  {
    id: 'demo-aoty',
    demo: true,
    status: 'active',
    category: 'awards', // gold chip: AWARDS
    title: 'AOTY 2025: Will a Female Artist win Album of the Year?',
    total_volume: 2100000, // VOL: $2.1M
    created_at: hoursAgo(12),
    outcomes: [
      { id: 'yes', title: 'Yes', probability: 88 },
      { id: 'no', title: 'No', probability: 12 },
    ],
  },
];

export const DEMO_TICKER = [
  { id: 't1', label: 'DRAKE "THE EMBASSY" VOL:', value: '$1.8M', delta: -2.1 },
  { id: 't2', label: 'COACHELLA 2025 PREDICTION:', value: '$840K', delta: 4.8 },
  { id: 't3', label: 'AOTY ODDS SHIFTS:', value: '$2.1M', delta: 1.5 },
  { id: 't4', label: 'KENDRICK LAMAR VOL:', value: '$4.2M', delta: 12.4 },
];

export const DEMO_ARTISTS = [
  { name: 'Kendrick Lamar', count: 24, momentum: 1 },
  { name: 'Chappell Roan', count: 12, momentum: 1 },
  { name: 'Ice Spice', count: 8, momentum: -1 },
];

export const DEMO_ANALYTICS = {
  globalVol: '$12.8M',
  traders: '45,102',
  shift: { name: 'Kanye Vultures 3', delta: 62 },
};

export const DEMO_LIVE_FEED = {
  handle: 'traderX',
  stake: 5000, // renders "$5k"
  side: 'YES',
  market: 'Kendrick Album drop.',
};
