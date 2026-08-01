// ── Google Trends terminal signal bank ─────────────────────────────────────
// Demo content. Dobium has no Google Trends ingestion, so these are the
// values from Neel's mocks, extended across all entries for consistency.

export const TREND_SIGNALS = [
  {
    rank: '01',
    slug: 'gpt-6',
    title: 'GPT-6',
    badge: 'BREAKOUT',
    tone: 'gold',
    region: 'United States',
    growth: 848,
    interest: 100,
    detailGrowth: 840,
    detailInterest: '100/100',
    category: 'TECH & AI',
  },
  {
    rank: '02',
    slug: 'tesla-robotaxi',
    title: 'Tesla Robotaxi',
    badge: 'CRITICAL',
    tone: 'red',
    region: 'Global',
    growth: 520,
    interest: 94,
    detailGrowth: 520,
    detailInterest: '94/100',
    category: 'TECH & AI',
  },
  {
    rank: '03',
    slug: 'nintendo-direct',
    title: 'Nintendo Direct',
    badge: 'CYCLICAL',
    tone: 'plain',
    region: 'Japan',
    growth: 385,
    interest: 89,
    detailGrowth: 385,
    detailInterest: '72/100',
    category: 'GAMING',
  },
  {
    rank: '04',
    slug: 'mrbeast',
    title: 'MrBeast',
    badge: 'CULTURAL',
    tone: 'plain',
    region: 'Global',
    growth: 316,
    interest: 81,
    detailGrowth: 316,
    detailInterest: '81/100',
    category: 'CREATORS',
  },
  {
    rank: '05',
    slug: 'openai',
    title: 'OpenAI',
    badge: 'SUSTAINED',
    tone: 'plain',
    region: 'Global',
    growth: 240,
    interest: 76,
    detailGrowth: 240,
    detailInterest: '91/100',
    category: 'TECH & AI',
  },
  {
    rank: '06',
    slug: 'apple-ai',
    title: 'Apple AI',
    badge: 'EMERGING',
    tone: 'plain',
    region: 'United States',
    growth: 183,
    interest: 68,
    detailGrowth: 183,
    detailInterest: '64/100',
    category: 'TECH & AI',
  },
];

export const TREND_EVENTS = [
  { at: '14:02:11', tag: 'SIGNAL_DETECTION', body: 'NVDA price correlation with "GPT-6" search volume hit 0.89 coefficient.', spark: true },
  { at: '13:58:44', tag: 'VOLUME_ALERT', body: 'Sudden spike in "Robotaxi Regulatory Approval" queries in California area.' },
  { at: '13:45:02', tag: 'CROSS_PLATFORM', body: 'Nintendo Direct rumors bridging from X (Twitter) to mainstream search indices.' },
];

export const TREND_HYPOTHESES = [
  { id: 'ALPHA', conf: 92, body: 'Search acceleration for GPT-6 precedes imminent OpenAI developer day announcement. Market positioning: Long AI infrastructure, Short legacy SaaS.' },
  { id: 'BETA', conf: 78, body: 'Robotaxi sentiment divergence: Retail interest climbing (+400%) while institutional search volume remains flat. Potential retail-driven volatility event.' },
];

export const GEO_ROWS = [
  { label: 'North America', pct: 42 },
  { label: 'Europe', pct: 28 },
  { label: 'Asia Pacific', pct: 21 },
];

export const VOLUME_BARS = [34, 44, 40, 58, 52, 70, 64, 82, 96, 88, 74, 62];

export const DRAFT_QUEUE = [
  { title: 'AI Chip Shortage Trends', status: 'PENDING' },
  { title: 'SEC Crypto Regulation', status: 'COMPLETE' },
];

export const CATEGORIES = ['ALL', 'TECH & AI', 'GAMING', 'CREATORS'];

export function findTrend(slug) {
  return TREND_SIGNALS.find((t) => t.slug === slug) || null;
}
