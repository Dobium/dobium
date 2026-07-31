// ── Reddit terminal signal bank ────────────────────────────────────────────
// Demo content. Dobium has no Reddit ingestion, so these are the values from
// Neel's mocks, extended across all four subreddits for consistency.

export const SUBREDDITS = [
  {
    slug: 'openai',
    name: 'r/OpenAI',
    velocity: 428,
    posts: 14,
    upvotes: '182K',
    comments: '32K',
    strength: 'HIGH',
    fill: 88,
    nodes: '4.2K',
    feed: [
      {
        id: 'p1', badge: 'CRITICAL LEAK', author: 'u/SamaSecretAlt', ago: '2h ago', vel: '18.4K',
        head: 'GPT-6 Leak: Internal architecture documentation surfacing on clandestine forums.',
        body: 'Reports suggest a massive repository of weight-standardization protocols and MoE configuration files for the upcoming GPT-6…',
        comments: '4,218', flag: 'High Volatility', flagTone: 'green',
      },
      {
        id: 'p2', badge: 'API ECONOMICS', author: 'u/DevRelOptimist', ago: '5h ago', vel: '11.2K',
        head: 'GPT-6 API Pricing leaked: 1.5M tokens/$1.00 base rate for Tier 5 accounts.',
        body: 'Economic analysis of the newly discovered pricing tiers indicates a 40% reduction in inference costs compared to GPT-5 benchmarks…',
        comments: '2,841', flag: 'Market Signal', flagTone: 'gold',
      },
      {
        id: 'p3', badge: 'M&A ACTIVITY', author: 'u/ReutersBot', ago: '8h ago', vel: '8.9K',
        head: "OpenAI acquires stealth-mode startup 'Cognitive Foundry' for $1.2B.",
        body: 'Cognitive Foundry specializes in low-latency neuro-symbolic inference layers, with a research team drawn largely from academic robotics labs…',
        comments: '1,905', flag: 'Market Signal', flagTone: 'gold',
      },
    ],
    stream: [
      { tag: 'GPT-6 LAUNCH DATE', chg: 4.2, title: 'Binary: Q4 2025 Release', fill: 68, l: 'PROBABILITY: 68%', r: 'VOL: $16.2M' },
      { tag: 'API PRICE WARS', chg: -1.5, title: 'Anthropic Response Index', fill: 44, l: 'SENSITIVITY: HIGH', r: 'VOL: $8.4M' },
    ],
    hyp: [
      { id: 'H-102', conf: 88, body: 'Leak H-102 suggests GPT-6 utilizes a physical-modeling layer for world coherence. Market implication: High confidence in manufacturing robotics sector surge.' },
      { id: 'H-105', conf: 63, body: "Pricing leak H-105 indicates transition to a 'Compute-as-Utility' model. Predicted impact: SaaS margin compression across Tier 2 providers." },
    ],
    sentiment: 'BULLISH', noise: '0.024 RMS',
  },
  {
    slug: 'games',
    name: 'r/Games',
    velocity: 285,
    posts: 26,
    upvotes: '391K',
    comments: '58K',
    strength: 'MED',
    fill: 62,
    nodes: '6.8K',
    feed: [
      {
        id: 'p1', badge: 'RELEASE WINDOW', author: 'u/PatchNoteWatch', ago: '1h ago', vel: '14.7K',
        head: "Project Red showcase runtime listed at 68 minutes, longest since the 2023 reveal.",
        body: 'Scheduling metadata pulled from three regional storefronts shows a consistent runtime, which historically correlates with a hardware or first-party reveal…',
        comments: '5,102', flag: 'High Volatility', flagTone: 'green',
      },
      {
        id: 'p2', badge: 'BOT ACTIVITY', author: 'u/ModToolsAlt', ago: '4h ago', vel: '9.3K',
        head: 'Coordinated posting patterns detected across Project Red discussion threads.',
        body: 'Account-age distribution in the last 6 hours is heavily skewed toward sub-30-day accounts, with near-identical phrasing across top-level comments…',
        comments: '3,340', flag: 'Signal Noise', flagTone: 'red',
      },
      {
        id: 'p3', badge: 'SECTOR FATIGUE', author: 'u/QuarterlyGamer', ago: '9h ago', vel: '6.1K',
        head: 'Discussion: are we past peak live-service? Three cancellations this month alone.',
        body: 'Community sentiment on recurring-revenue titles has trended negative for six consecutive weeks, with engagement shifting toward single-player releases…',
        comments: '2,214', flag: 'Market Signal', flagTone: 'gold',
      },
    ],
    stream: [
      { tag: 'PROJECT RED REVEAL', chg: 2.8, title: 'Binary: Hardware Shown', fill: 57, l: 'PROBABILITY: 57%', r: 'VOL: $9.1M' },
      { tag: 'LIVE-SERVICE INDEX', chg: -2.2, title: 'Consumer Gaming Basket', fill: 38, l: 'SENSITIVITY: MED', r: 'VOL: $4.7M' },
    ],
    hyp: [
      { id: 'H-088', conf: 71, body: 'Showcase runtime implies a hardware segment. Market implication: component suppliers bid ahead of the broadcast window.' },
      { id: 'H-091', conf: 55, body: 'Live-service fatigue sustains through Q3 guidance. Predicted impact: multiple compression across recurring-revenue publishers.' },
    ],
    sentiment: 'NEUTRAL', noise: '0.061 RMS',
  },
  {
    slug: 'technology',
    name: 'r/technology',
    velocity: 197,
    posts: 18,
    upvotes: '244K',
    comments: '27K',
    strength: 'LOW',
    fill: 41,
    nodes: '3.1K',
    feed: [
      {
        id: 'p1', badge: 'SEMICONDUCTOR', author: 'u/FabWatcher', ago: '3h ago', vel: '12.6K',
        head: '$NVDA mentions cluster around a 402-account node in under 40 minutes.',
        body: 'Cluster analysis shows an unusually tight posting window across otherwise unconnected accounts, concentrated on supply-chain commentary…',
        comments: '3,776', flag: 'High Volatility', flagTone: 'green',
      },
      {
        id: 'p2', badge: 'REGULATORY', author: 'u/PolicyDigest', ago: '6h ago', vel: '7.8K',
        head: 'Draft export-control language circulating ahead of the committee markup.',
        body: 'Two independent summaries describe tighter thresholds on advanced accelerator shipments, though neither cites the underlying document directly…',
        comments: '2,090', flag: 'Market Signal', flagTone: 'gold',
      },
      {
        id: 'p3', badge: 'INFRASTRUCTURE', author: 'u/DatacenterDaily', ago: '11h ago', vel: '5.2K',
        head: 'Regional grid operator flags three new datacenter interconnect requests.',
        body: 'Filings indicate combined load requests exceeding prior-year totals for the region, with commissioning targets inside eighteen months…',
        comments: '1,412', flag: 'Market Signal', flagTone: 'gold',
      },
    ],
    stream: [
      { tag: 'SEMI ETF DRIFT', chg: 4.2, title: 'Semiconductor Basket', fill: 74, l: 'PROBABILITY: 74%', r: 'VOL: $22.6M' },
      { tag: 'EXPORT CONTROLS', chg: -0.9, title: 'Policy Response Index', fill: 33, l: 'SENSITIVITY: HIGH', r: 'VOL: $6.3M' },
    ],
    hyp: [
      { id: 'H-076', conf: 74, body: 'Reddit-driven momentum precedes a measurable move in semiconductor ETFs inside 48 hours.' },
      { id: 'H-079', conf: 48, body: 'Export-control language lands narrower than the drafts imply. Predicted impact: relief rally in accelerator names.' },
    ],
    sentiment: 'BULLISH', noise: '0.038 RMS',
  },
  {
    slug: 'machinelearning',
    name: 'r/MachineLearning',
    velocity: 164,
    posts: 9,
    upvotes: '81K',
    comments: '12K',
    strength: 'TRACE',
    fill: 23,
    nodes: '1.9K',
    feed: [
      {
        id: 'p1', badge: 'MODEL RUMOR', author: 'u/AblationStudy', ago: '2h ago', vel: '9.1K',
        head: 'Llama 4 evaluation numbers circulating do not match any published harness.',
        body: 'Several reproduction attempts land materially below the circulating figures, suggesting either a non-standard harness or fabricated results…',
        comments: '2,644', flag: 'Signal Noise', flagTone: 'red',
      },
      {
        id: 'p2', badge: 'ARCHITECTURE', author: 'u/SparseRouting', ago: '7h ago', vel: '6.4K',
        head: 'Discussion: modular MoE routing and what it implies for inference middleware.',
        body: 'Thread consolidates several months of routing-efficiency results and argues the middleware layer is where margin accrues rather than the model itself…',
        comments: '1,830', flag: 'Market Signal', flagTone: 'gold',
      },
      {
        id: 'p3', badge: 'OPEN WEIGHTS', author: 'u/CheckpointHoarder', ago: '13h ago', vel: '4.3K',
        head: 'Weekly thread: which open checkpoints are actually production-viable?',
        body: 'Community benchmarking continues to favour a small number of checkpoints for latency-sensitive deployments, with licensing the recurring blocker…',
        comments: '980', flag: 'Market Signal', flagTone: 'gold',
      },
    ],
    stream: [
      { tag: 'LLAMA 4 RUMORS', chg: -1.8, title: 'Binary: Q3 Weights Release', fill: 41, l: 'PROBABILITY: 41%', r: 'VOL: $5.2M' },
      { tag: 'MOE MIDDLEWARE', chg: 1.4, title: 'Inference Tooling Index', fill: 52, l: 'SENSITIVITY: MED', r: 'VOL: $3.8M' },
    ],
    hyp: [
      { id: 'H-064', conf: 59, body: 'Circulating evaluation figures fail reproduction. Predicted impact: sentiment reversal within 24h of an official harness release.' },
      { id: 'H-068', conf: 44, body: 'Modular MoE adoption concentrates value in middleware. Market implication: sustained bid in inference-tooling names.' },
    ],
    sentiment: 'NEUTRAL', noise: '0.092 RMS',
  },
];

export const REDDIT_EVENTS = [
  { at: '09:42:12', tag: 'HYPE DETECTED', body: 'Significant mention of $NVDA in r/technology. Cluster size: 402.' },
  { at: '09:43:55', tag: 'DATA INGESTED', body: 'r/OpenAI API leak thread reached 2k upvotes in 12 minutes.' },
  { at: '09:41:30', tag: 'ANOMALY DETECTED', body: "Bot activity spike in r/Games thread regarding 'Project Red'." },
  { at: '09:40:02', tag: 'ANALYSIS COMPLETE', body: 'Sentiment pivot in r/MachineLearning regarding Llama 4 rumors.' },
];

export const REDDIT_HYPOTHESES = [
  { id: 'ALPHA', prob: 74, tone: 'green', body: 'Reddit-driven momentum suggests a 4.2% price movement in Semiconductor ETFs within the next 48 hours based on r/technology sentiment clusters.' },
  { id: 'BETA', prob: 61, tone: 'plain', body: 'Consumer gaming sector showing fatigue; expected stagnation in Q3 forward-looking statements as discussed in r/Games sentiment.' },
];

export function findSub(slug) {
  return SUBREDDITS.find((s) => s.slug === slug) || null;
}
