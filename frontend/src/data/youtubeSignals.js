// ── YouTube terminal signal bank ───────────────────────────────────────────
// Demo content. Dobium has no YouTube ingestion, so these are the values from
// Neel's mocks, extended across all four channels for consistency.
// `art` drives a generated gradient tile — this environment has no image
// generation and the repo ships no channel/video artwork.

export const CHANNELS = [
  {
    slug: 'mrbeast',
    name: 'MrBeast',
    display: 'MRBEAST',
    handle: '@mrbeast',
    kicker: 'TOP TIER ENTITY',
    growth: 420,
    views: '58M',
    trending: 3,
    sentiment: '94.2%',
    art: ['#3B2A1E', '#8A5A2B'],
    cid: '2984-XQ-YT',
    subs: '254,193,057',
    velocity: '284K',
    posIndex: 82,
    alpha: 'DOMINANT',
    impact: 'CRITICAL',
    videos: [
      {
        id: 'v1', title: 'Last To Leave Wins $1,000,000', ago: '3H AGO', badge: 'TRENDING', tone: 'red',
        reach: '12.8M', vel: '18,400', likes: '1.2M', comm: '142K', retention: '94%', ctr: '12.4%',
        art: ['#5A2530', '#C4574B'],
      },
      {
        id: 'v2', title: 'I Bought an Island', ago: '48H AGO', badge: 'ACTIVE', tone: 'gold',
        reach: '8.3M', vel: '12,100', likes: '840K', comm: '91K', retention: '88%', ctr: '9.1%',
        art: ['#123A3A', '#2E8B7A'],
      },
      {
        id: 'v3', title: '100 Days In A Sealed Vault', ago: '6D AGO', badge: 'ARCHIVED', tone: 'plain',
        reach: '21.4M', vel: '4,600', likes: '1.9M', comm: '210K', retention: '81%', ctr: '7.8%',
        art: ['#1E2438', '#4A5680'],
      },
    ],
    hyp: [
      { id: 'H01', label: 'RETENTION CORRELATION', body: 'Current velocity suggests 50M views within 24 hours. Prediction confidence: 94.2%.', kv: 'RISK FACTOR', v: 'LOW', tone: 'green' },
      { id: 'H02', label: 'SEMANTIC SENTIMENT', body: '"Challenge" keywords driving positive bias across all regions. Neutrality fading.', kv: 'ANOMALY DETECTED', v: 'NONE', tone: 'plain' },
    ],
    stream: [
      { at: '14:22:01', tag: 'SIGNAL_BURST', val: 'IN_RETENTION_PEAK', geo: 'JP/KR' },
      { at: '14:21:44', tag: 'MARKET_DRAFT', val: 'AD_REVENUE_SPIKE', geo: 'NA/EU' },
      { at: '14:20:12', tag: 'ALPHA_CORE', val: 'VIRAL_EXPONENT_1.4X', geo: 'GLB' },
    ],
    curve: 12.4,
    bars: [38, 46, 54, 50, 64, 72, 86, 100, 78, 62],
  },
  {
    slug: 'openai',
    name: 'OpenAI',
    display: 'OPENAI',
    handle: '@openai',
    kicker: 'TECH / INTELLIGENCE',
    growth: 315,
    views: '12M',
    trending: 2,
    sentiment: '88.5%',
    art: ['#12262E', '#2E6C77'],
    cid: '1180-AI-YT',
    subs: '6,412,880',
    velocity: '96K',
    posIndex: 74,
    alpha: 'ASCENDING',
    impact: 'HIGH',
    videos: [
      {
        id: 'v1', title: 'GPT-6 Reasoning Kernel: Technical Walkthrough', ago: '5H AGO', badge: 'TRENDING', tone: 'red',
        reach: '4.1M', vel: '9,800', likes: '312K', comm: '48K', retention: '91%', ctr: '11.2%',
        art: ['#1B2E3A', '#3C7C8C'],
      },
      {
        id: 'v2', title: 'Live: Developer Day Keynote Replay', ago: '32H AGO', badge: 'ACTIVE', tone: 'gold',
        reach: '2.7M', vel: '6,400', likes: '188K', comm: '29K', retention: '84%', ctr: '8.6%',
        art: ['#241E3A', '#5B4C8C'],
      },
    ],
    hyp: [
      { id: 'H01', label: 'BENCHMARK DIFFUSION', body: 'Visual fidelity benchmarks driving 300% more searches for RTX-capable hardware across tech-tube demographics.', kv: 'RISK FACTOR', v: 'MED', tone: 'gold' },
      { id: 'H02', label: 'LEAK CORRELATION', body: 'Walkthrough timing tracks the r/OpenAI leak thread within a 90-minute window. Coordination unconfirmed.', kv: 'ANOMALY DETECTED', v: 'MINOR', tone: 'plain' },
    ],
    stream: [
      { at: '14:19:52', tag: 'SIGNAL_BURST', val: 'DEV_SEGMENT_PEAK', geo: 'NA/EU' },
      { at: '14:18:10', tag: 'MARKET_DRAFT', val: 'GPU_DEMAND_ECHO', geo: 'GLB' },
      { at: '14:16:33', tag: 'ALPHA_CORE', val: 'VIRAL_EXPONENT_1.1X', geo: 'NA' },
    ],
    curve: 8.1,
    bars: [30, 34, 44, 52, 48, 66, 74, 88, 70, 58],
  },
  {
    slug: 'ign',
    name: 'IGN',
    display: 'IGN',
    handle: '@ign',
    kicker: 'MEDIA / ENTERTAINMENT',
    growth: 188,
    views: '28M',
    trending: 6,
    sentiment: '76.1%',
    art: ['#3A1620', '#8C2F3E'],
    cid: '4402-MD-YT',
    subs: '18,904,221',
    velocity: '141K',
    posIndex: 61,
    alpha: 'STEADY',
    impact: 'MODERATE',
    videos: [
      {
        id: 'v1', title: 'Project Red Showcase: Everything Revealed', ago: '2H AGO', badge: 'TRENDING', tone: 'red',
        reach: '6.9M', vel: '15,200', likes: '410K', comm: '77K', retention: '79%', ctr: '10.8%',
        art: ['#3A1A18', '#8C4A2F'],
      },
      {
        id: 'v2', title: 'Review Roundup: The Quarter in Ratings', ago: '26H AGO', badge: 'ACTIVE', tone: 'gold',
        reach: '3.2M', vel: '7,300', likes: '164K', comm: '38K', retention: '72%', ctr: '7.4%',
        art: ['#1E2A38', '#46688C'],
      },
    ],
    hyp: [
      { id: 'H01', label: 'SHOWCASE ECHO', body: 'Coverage velocity implies a hardware segment inside the broadcast. Component suppliers likely bid ahead of confirmation.', kv: 'RISK FACTOR', v: 'MED', tone: 'gold' },
      { id: 'H02', label: 'REVIEW DRIFT', body: 'Aggregate scoring trending below prior-year baseline. Sentiment neutral to soft across the catalogue.', kv: 'ANOMALY DETECTED', v: 'NONE', tone: 'plain' },
    ],
    stream: [
      { at: '14:21:06', tag: 'SIGNAL_BURST', val: 'SHOWCASE_CLIP_PEAK', geo: 'GLB' },
      { at: '14:20:41', tag: 'MARKET_DRAFT', val: 'PUBLISHER_ROTATION', geo: 'NA' },
      { at: '14:17:55', tag: 'ALPHA_CORE', val: 'VIRAL_EXPONENT_0.9X', geo: 'EU' },
    ],
    curve: 5.6,
    bars: [42, 50, 46, 58, 62, 70, 64, 82, 76, 54],
  },
  {
    slug: 'nintendo',
    name: 'Nintendo',
    display: 'NINTENDO',
    handle: '@nintendo',
    kicker: 'BRAND / PLATFORM',
    growth: 250,
    views: '19M',
    trending: 4,
    sentiment: '91.8%',
    art: ['#3A1414', '#A83A32'],
    cid: '7761-BP-YT',
    subs: '9,338,540',
    velocity: '118K',
    posIndex: 88,
    alpha: 'DOMINANT',
    impact: 'HIGH',
    videos: [
      {
        id: 'v1', title: 'Nintendo Direct: Full Presentation', ago: '4H AGO', badge: 'TRENDING', tone: 'red',
        reach: '9.4M', vel: '16,700', likes: '720K', comm: '134K', retention: '93%', ctr: '13.1%',
        art: ['#3A1414', '#B2453B'],
      },
      {
        id: 'v2', title: 'First-Party Lineup Recap', ago: '30H AGO', badge: 'ACTIVE', tone: 'gold',
        reach: '4.6M', vel: '8,900', likes: '298K', comm: '52K', retention: '86%', ctr: '9.7%',
        art: ['#16302A', '#358263'],
      },
    ],
    hyp: [
      { id: 'H01', label: 'REVEAL CORRELATION', body: 'Runtime and retention profile match prior hardware-reveal broadcasts. Confidence in a hardware segment: 71%.', kv: 'RISK FACTOR', v: 'LOW', tone: 'green' },
      { id: 'H02', label: 'SENTIMENT CEILING', body: 'Positive bias near catalogue maximum; limited upside remaining before mean reversion.', kv: 'ANOMALY DETECTED', v: 'NONE', tone: 'plain' },
    ],
    stream: [
      { at: '14:22:18', tag: 'SIGNAL_BURST', val: 'DIRECT_SEGMENT_PEAK', geo: 'JP/NA' },
      { at: '14:21:02', tag: 'MARKET_DRAFT', val: 'SUPPLIER_ROTATION', geo: 'JP' },
      { at: '14:19:27', tag: 'ALPHA_CORE', val: 'VIRAL_EXPONENT_1.3X', geo: 'GLB' },
    ],
    curve: 10.9,
    bars: [34, 44, 52, 60, 58, 74, 82, 96, 84, 66],
  },
];

export const YT_QUOTES = [
  { sym: 'GOOGL', label: '(Alphabet)', px: '182.44', chg: 1.2 },
  { sym: 'META', label: '', px: '504.31', chg: 0.8 },
  { sym: 'NFLX', label: '', px: '621.10', chg: -0.4 },
];

export const YT_HYPOTHESES = [
  { id: '04-A', body: "Elevated engagement in MrBeast's 'Response' meta indicates a shift in viewer appetite towards high-stakes accountability content for Q4.", conf: 88, bias: 'BULLISH' },
  { id: '04-B', body: "OpenAI's visual fidelity benchmarks are driving 300% more searches for RTX-capable hardware across tech-tube demographics.", conf: 62, bias: 'NEUTRAL' },
];

export const YT_LOG = ['YT_API_FETCH_SUCCESS', 'CHANNEL_SCRAPE_COMPLETE', 'DATA_SYNCHRONIZED_T+44MS'];

export function findChannel(slug) {
  return CHANNELS.find((c) => c.slug === slug) || null;
}
