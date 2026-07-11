// ============================================================================
// MARKET SCOUT — finds trending, market-worthy topics 24/7 for admin review
// ============================================================================
// Pulls Reddit hot posts + entertainment/sports news RSS, keeps only headlines
// that describe an actual verifiable future-ish event (not memes/discussion),
// categorizes them, applies a harm filter, dedupes, and stores suggestions.

const { MarketSuggestion, Market } = require('../lib/database/models');

const UA = 'DobiumMarketScout/1.0 (entertainment prediction markets; contact: team@dobium.com)';

const REDDIT_SOURCES = [
  { sub: 'movies', category: 'entertainment' },
  { sub: 'boxoffice', category: 'entertainment' },
  { sub: 'television', category: 'entertainment' },
  { sub: 'popheads', category: 'music' },
  { sub: 'hiphopheads', category: 'music' },
  { sub: 'Music', category: 'music' },
  { sub: 'Games', category: 'entertainment' },
  { sub: 'entertainment', category: 'entertainment' },
  { sub: 'nba', category: 'sports' },
  { sub: 'nfl', category: 'sports' },
  { sub: 'soccer', category: 'sports' },
];

// Every keyless feed worth scanning. Any single feed failing is non-fatal.
const RSS_SOURCES = [
  { name: 'Variety', url: 'https://variety.com/feed/', category: 'entertainment' },
  { name: 'Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/', category: 'entertainment' },
  { name: 'Deadline', url: 'https://deadline.com/feed/', category: 'entertainment' },
  { name: 'TheWrap', url: 'https://www.thewrap.com/feed/', category: 'entertainment' },
  { name: 'EW', url: 'https://ew.com/feed/', category: 'entertainment' },
  { name: 'Billboard', url: 'https://www.billboard.com/feed/', category: 'music' },
  { name: 'Rolling Stone', url: 'https://www.rollingstone.com/music/feed/', category: 'music' },
  { name: 'Pitchfork', url: 'https://pitchfork.com/feed/feed-news/rss', category: 'music' },
  { name: 'Stereogum', url: 'https://www.stereogum.com/feed/', category: 'music' },
  { name: 'NME', url: 'https://www.nme.com/feed', category: 'music' },
  { name: 'IGN', url: 'https://feeds.ign.com/ign/all', category: 'entertainment' },
  { name: 'GameSpot', url: 'https://www.gamespot.com/feeds/news/', category: 'entertainment' },
  { name: 'Polygon', url: 'https://www.polygon.com/rss/index.xml', category: 'entertainment' },
  { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news', category: 'sports' },
  // Fights: UFC/boxing — the most talk-of-the-town sports content there is
  { name: 'ESPN MMA', url: 'https://www.espn.com/espn/rss/mma/news', category: 'sports' },
  { name: 'MMA Fighting', url: 'https://www.mmafighting.com/rss/current', category: 'sports' },
  { name: 'Google News', url: 'https://news.google.com/rss/search?q=(UFC%20OR%20boxing)%20(fight%20OR%20title%20OR%20headline)&hl=en-US&gl=US&ceid=US:en', category: 'sports' },
  // Trending news: tech, business, big culture (Elon, OpenAI, IPOs, launches)
  { name: 'Google Trends', url: 'https://trends.google.com/trending/rss?geo=US', category: 'trending' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'trending' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'trending' },
  { name: 'Google News Tech', url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en', category: 'trending' },
  { name: 'Google News Business', url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en', category: 'trending' },
  { name: 'Google News', url: 'https://news.google.com/rss/search?q=(SpaceX%20OR%20Tesla%20OR%20OpenAI%20OR%20Apple)%20(launch%20OR%20IPO%20OR%20announces%20OR%20unveils)&hl=en-US&gl=US&ceid=US:en', category: 'trending' },
  // Google News topic + targeted searches — high-signal, keyless
  { name: 'Google News Entertainment', url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en', category: 'entertainment' },
  { name: 'Google News', url: 'https://news.google.com/rss/search?q=%22new%20album%22%20announces&hl=en-US&gl=US&ceid=US:en', category: 'music' },
  { name: 'Google News', url: 'https://news.google.com/rss/search?q=%22opening%20weekend%22%20box%20office&hl=en-US&gl=US&ceid=US:en', category: 'entertainment' },
  { name: 'Google News', url: 'https://news.google.com/rss/search?q=%22release%20date%22%20(delayed%20OR%20announced%20OR%20confirmed)&hl=en-US&gl=US&ceid=US:en', category: 'entertainment' },
  { name: 'Google News', url: 'https://news.google.com/rss/search?q=(tour%20OR%20residency)%20announces%20(singer%20OR%20rapper%20OR%20band)&hl=en-US&gl=US&ceid=US:en', category: 'music' },
];

// Apple Music most-played albums — structured JSON, keyless. Hot albums become
// clean chart-position questions with zero fuzzy parsing.
const APPLE_MUSIC_FEED = 'https://rss.applemarketingtools.com/api/v2/us/music/most-played/25/albums.json';

// Anything touching a real person's private life, health, legal trouble, or safety is dropped.
const HARM_BLOCKLIST = [
  'dies', 'dead', 'death', 'killed', 'passes away', 'arrest', 'jail', 'prison',
  'lawsuit', 'sues', 'sued', 'divorce', 'cheat', 'affair', 'assault', 'abuse',
  'allegation', 'accused', 'drugs', 'overdose', 'rehab', 'scandal', 'leak',
  'nude', 'racist', 'slur', 'hospitalized', 'hospital', 'cancer', 'suicide',
  'shooting', 'custody', 'restraining order', 'dui', 'pregnan', 'dating',
  'breakup', 'break up', 'split from', 'feud', 'stalker', 'harass'
];

const AWARDS_KEYWORDS = ['oscar', 'academy award', 'grammy', 'emmy', 'golden globe', 'vma', 'tony award', 'billboard music award', 'amas', 'sag award'];

// A headline only qualifies as market-worthy if it's actually about a
// measurable, resolvable outcome — not a meme, opinion, or discussion thread.
const RELEVANCE_KEYWORDS = {
  entertainment: [
    'box office', 'opens', 'opening weekend', 'premiere', 'premieres', 'release date',
    'releases', 'released', 'trailer', 'sequel', 'season', 'renewed', 'cancelled',
    'canceled', 'rotten tomatoes', 'rating', 'debuts', 'debut', 'streaming', 'no. 1',
    'number one', '#1', 'top 10', 'nominat',
  ],
  music: [
    'album', 'single', 'drops', 'drop date', 'release', 'releases', 'released',
    'chart', 'billboard', 'no. 1', 'number one', '#1', 'hot 100', 'tour', 'concert',
    'grammy', 'streams', 'spotify', 'certified', 'platinum', 'gold record', 'debuts', 'debut',
  ],
  sports: [
    'wins', 'win', 'beats', 'defeats', 'signs', 'trade', 'traded', 'playoff', 'playoffs',
    'finals', 'championship', 'final score', 'vs', 'game', 'season', 'draft', 'injury',
    'injured', 'return', 'suspension', 'suspended', 'record', 'mvp',
  ],
  trending: [
    'ipo', 'launch', 'launches', 'launching', 'unveils', 'announces', 'release date',
    'acquisition', 'acquires', 'valuation', 'robotaxi', 'starship', 'rocket', 'iphone',
    'ai model', 'gpt', 'billion', 'ships', 'rollout', 'debut', 'delayed', 'pushed back',
  ],
  awards: AWARDS_KEYWORDS,
};

function isHarmful(text) {
  const t = (text || '').toLowerCase();
  return HARM_BLOCKLIST.some(term => t.includes(term));
}

function isMarketWorthy(text, category) {
  const t = (text || '').toLowerCase();
  const keywords = RELEVANCE_KEYWORDS[category] || RELEVANCE_KEYWORDS.entertainment;
  return keywords.some(k => t.includes(k));
}

function detectCategory(text, fallback) {
  const t = (text || '').toLowerCase();
  if (AWARDS_KEYWORDS.some(k => t.includes(k))) return 'awards';
  return fallback;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// Decode named + numeric HTML entities (&#8216; &#x2019; &amp; etc.) so
// Billboard/Variety headlines don't show up as jargon in the review queue.
function decodeEntities(str) {
  if (!str) return str;
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201C', rdquo: '\u201D',
    ndash: '\u2013', mdash: '\u2014', hellip: '\u2026',
  };
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => named[name] ?? m)
    .trim();
}

function stripCdata(raw) {
  if (!raw) return null;
  const m = raw.trim().match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return (m ? m[1] : raw).trim();
}

function parseRssTitles(xml) {
  const items = [];
  const itemBlocks = xml.split(/<item[\s>]/).slice(1);
  for (const block of itemBlocks.slice(0, 20)) {
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
    if (titleMatch) {
      const cleanTitle = decodeEntities(stripCdata(titleMatch[1]));
      const cleanLink = linkMatch ? stripCdata(linkMatch[1]) : null;
      items.push({ title: cleanTitle, link: cleanLink && /^https?:\/\//.test(cleanLink) ? cleanLink : null });
    }
  }
  return items;
}

// Turn a raw headline into a proper prediction-market question when we can do it
// safely — the style of "Will Playboi Carti release another album before August?"
// or "Will 'Sinners' gross over $40M opening weekend?". [DATE]/[AMOUNT] are
// placeholders the admin fills in before publishing. Returns null when unsure
// (the raw headline stays and the admin edits it manually).
// Title-Case headlines capitalize verbs, so "Ringo Starr Announces Fall Tour"
// must not yield the entity "Ringo Starr Announces Fall". Cut the captured
// name at the first verb/noise word.
const LEAD_STOPWORDS = new Set(['Announces', 'Announce', 'Reveals', 'Teases',
  'Confirms', 'Drops', 'Releases', 'Shares', 'Sets', 'Unveils', 'Debuts',
  'Extends', 'Adds', 'Plots', 'Kicks', 'Launches', 'Says', 'Talks', 'Opens',
  'Returns', 'Brings', 'Celebrates', 'Performs', 'Cancels', 'Postpones',
  'Reportedly', 'Preparing', 'Prepares', 'Plans', 'Planning', 'Eyes', 'Nears',
  'Files', 'Delays', 'Delayed', 'Pushes', 'Launching', 'Introduces', 'Expands',
  'Considers', 'Weighs', 'Seeks', 'Begins', 'Starts', 'Tests', 'Testing',
  'Rolls', 'Rolling', 'Is', 'To', 'Will', 'Could', 'May', 'Might', 'Set',
  'This', 'That', 'Holiday', 'Next', 'Coming', 'Later',
  'Forget', 'Meet', 'Why', 'How', 'What', 'Inside', 'Here', 'Move', 'Vs',
  'Vs.', 'Versus', 'Watch', 'Breaking', 'Exclusive', 'Report', 'Opinion',
  'Analysis', 'Update', 'If', 'When', 'Where', 'Who', 'Should', 'Can',
  'Does', 'Do', 'Just', 'Even', 'Now', 'Yes', 'No', 'Live',
  'In', 'On', 'At', 'Of', 'For', 'And', 'With', 'From', 'Over', 'After',
  'Before', 'Amid', 'As', 'Talks', 'Deal', 'Bid', 'Sale', 'News', 'Sources',
  'Biopic', 'Documentary', 'Docuseries', 'Movie', 'Film', 'Series', 'Album',
  'Rumor', 'Rumors', 'Insider', 'Insiders', 'Leak', 'Leaks',
  'Fall', 'Spring', 'Summer', 'Winter', 'North', 'East', 'West', 'South',
  'New', 'World', 'The', 'His', 'Her', 'Their', 'First', 'Massive', 'Huge']);

function extractLead(h) {
  // Strip wire-service prefixes ("ANALYSIS:", "EXCLUSIVE —") before extracting
  h = h.replace(/^(ANALYSIS|EXCLUSIVE|REPORT|OPINION|WATCH|BREAKING|UPDATE|LIVE|INTERVIEW|Q&A|REVIEW|EXPLAINER|NEWS|VIDEO|PHOTOS|FIRST LOOK|TRAILER)\s*[:\-\u2013\u2014|]\s*/i, '');
  const m = h.match(/^([A-Z][A-Za-z.$'-]+(?:\s+[A-Z&][A-Za-z.$'-]*){0,4})/);
  if (!m) return null;
  const words = m[1].split(/\s+/);
  const SKIPPABLE_LEADING = new Set(['New', 'The', 'A', 'An', 'His', 'Her', 'Their']);
  const kept = [];
  for (const w of words) {
    if (kept.length === 0 && SKIPPABLE_LEADING.has(w)) continue; // skip leading articles
    if (LEAD_STOPWORDS.has(w)) break;
    kept.push(w);
  }
  if (kept.length === 0) return null;
  const lead = kept.join(' ');
  // A one-word "name" that's a common word is noise, not an artist
  if (kept.length === 1 && lead.length < 4) return null;
  // ALL-CAPS single tokens are wire-service labels (ANALYSIS, EXCLUSIVE), not names
  if (kept.length === 1 && lead.length >= 4 && lead === lead.toUpperCase()) return null;
  return lead;
}

const CEREMONY_NAMES = [
  ['academy award', 'the Oscars'], ['oscar', 'the Oscars'], ['grammy', 'the Grammys'],
  ['emmy', 'the Emmys'], ['golden globe', 'the Golden Globes'], ['vma', 'the VMAs'],
  ['tony award', 'the Tonys'], ['billboard music award', 'the Billboard Music Awards'],
  ['amas', 'the AMAs'], ['sag award', 'the SAG Awards'],
];
const FESTIVALS = ['coachella', 'lollapalooza', 'glastonbury', 'rolling loud', 'bonnaroo', 'governors ball', 'austin city limits', 'acl fest'];

// Trending-news drafts only fire for names the culture actually talks about —
// this is what keeps 'SK Hynix IPO' out while SpaceX/OpenAI/Netflix stay in.
const CULTURE_BRANDS = ['spacex', 'tesla', 'openai', 'apple', 'netflix', 'disney',
  'nintendo', 'sony', 'meta', 'instagram', 'tiktok', 'spotify', 'google', 'youtube',
  'amazon', 'microsoft', 'xai', 'anthropic', 'rockstar', 'epic games', 'letterboxd',
  'reddit', 'warner', 'paramount', 'hbo', 'a24', 'marvel', 'playstation', 'xbox',
  'steam', 'valve', 'mrbeast', 'kanye', 'x corp', 'twitter', 'snapchat', 'discord',
  'twitch', 'uber', 'airbnb', 'stripe', 'nvidia', 'starlink'];

// Music drafts only surface for artists people actually talk about — the
// RSS feeds cover every band's album news equally, which is how 'Gilla Band'
// and 'Eli Young Band' flooded the queue next to zero cultural conversation.
const A_LIST = ['drake', 'kendrick lamar', 'taylor swift', 'kanye', ' ye ', 'playboi carti',
  'travis scott', 'don toliver', 'rihanna', 'beyonce', 'beyoncé', 'sza', 'doja cat',
  'olivia rodrigo', 'billie eilish', 'ariana grande', 'the weeknd', 'bad bunny',
  '21 savage', 'future', 'metro boomin', 'cardi b', 'nicki minaj', 'ice spice',
  'sabrina carpenter', 'chappell roan', 'post malone', 'justin bieber', 'selena gomez',
  'dua lipa', 'charli xcx', 'frank ocean', 'tyler, the creator', 'tyler the creator',
  'asap rocky', 'a$ap rocky', 'lil uzi', 'lil baby', 'gunna', 'yeat', 'ken carson',
  'destroy lonely', 'lana del rey', 'bruno mars', 'lady gaga', 'adele', 'ed sheeran',
  'morgan wallen', 'zach bryan', 'luke combs', 'j. cole', 'j cole', 'lil wayne',
  '2 chainz', 'young thug', 'central cee', 'burna boy', 'rosalia', 'rosalía',
  'karol g', 'peso pluma', 'blackpink', 'bts', 'stray kids', 'newjeans', 'mitski',
  'hozier', 'noah kahan', 'jack harlow', 'megan thee stallion', 'glorilla', 'latto',
  'summer walker', 'brent faiyaz', 'steve lacy', 'daniel caesar', 'partynextdoor'];

function isAList(text) {
  const t = ` ${(text || '').toLowerCase()} `;
  return A_LIST.some(a => t.includes(a));
}

function isCultureBrand(name) {
  const n = (name || '').toLowerCase();
  return CULTURE_BRANDS.some(b => n === b || n.includes(b) || b.includes(n));
}

function ceremonyIn(t) {
  const hit = CEREMONY_NAMES.find(([k]) => t.includes(k));
  return hit ? hit[1] : null;
}

function draftQuestion(headline, category) {
  const h = (headline || '').trim();
  const t = h.toLowerCase();
  const quoted = (h.match(/['\u2018"\u201C]([^'\u2019"\u201D]{2,60})['\u2019"\u201D]/) || [])[1];
  const lead = extractLead(h);

  // Music: something was announced/teased → the tradeable question is whether
  // it actually SHIPS (announcements already happened; delivery is the bet)
  if (category === 'music' && lead && /(announc|teas|confirm|reveal|hint|preview)/.test(t) && /(album|mixtape|\bep\b|single)/.test(t)) {
    const what = t.includes('single') ? 'single' : 'album';
    const named = quoted ? `'${quoted}'` : `the announced ${what}`;
    return `Will ${lead} release ${named} on streaming platforms before [DATE]?`;
  }
  // Tour announcements: already happened, no clean follow-up market — drop
  if (category === 'music' && /(announc|reveal|confirm)/.test(t) && /tour/.test(t)) {
    return null;
  }
  // Music: fresh drops → chart question
  if (category === 'music' && lead && /(drops|releases|to release|is releasing|shares)/.test(t) && /(album|mixtape|\bep\b|single)/.test(t)) {
    const named = quoted ? `'${quoted}'` : null;
    if (t.includes('single')) {
      return `Will ${lead}'s ${named ? `single ${named}` : 'new single'} reach the top 10 of the Billboard Hot 100 within 4 weeks of release?`;
    }
    return `Will ${lead}'s ${named ? `album ${named}` : 'new album'} debut at #1 on the Billboard 200 in its first chart week?`;
  }
  // Charts: something just hit #1 → does it hold?
  if (/(debuts at no\.? ?1|hits no\.? ?1|tops the (billboard|chart)|number one debut)/.test(t) && (quoted || lead)) {
    const chart = /hot 100/.test(t) ? 'the Billboard Hot 100' : /billboard 200/.test(t) ? 'the Billboard 200' : 'the Billboard chart';
    return `Will ${quoted ? `'${quoted}'` : lead} hold the #1 spot on ${chart} for a second consecutive week?`;
  }
  // Sequel/franchise speculation → the greenlight question
  if (quoted && /(sequel|part two|part 3|part three|part ii|follow-up|next installment)/.test(t)) {
    return `Will a sequel to '${quoted}' be officially greenlit before [DATE]?`;
  }
  // Biopics & documentaries in the works → the release question
  if ((quoted || lead) && /(biopic|documentary|docuseries)/.test(t) && /(in the works|developing|announc|in development|greenlit|coming)/.test(t)) {
    const kind = /biopic/.test(t) ? 'biopic' : 'documentary';
    return `Will the ${quoted ? `'${quoted}'` : lead} ${kind} be released before [DATE]?`;
  }
  // Box-office champs → the repeat question
  if (quoted && /(tops box office|no\.? ?1 at the box office|wins the (weekend )?box office|box office crown)/.test(t)) {
    return `Will '${quoted}' stay #1 at the domestic box office for a second weekend?`;
  }
  // Fight bookings → the winner question ("Will A beat B at UFC 331?")
  if (/(ufc|boxing|fight)/.test(t)) {
    const fm = h.match(/([A-Z][\w'.-]+(?:\s+[A-Z][\w'.-]+){0,2})\s+(?:[Vv][Ss]\.?|[Vv]ersus|[Ff]aces|[Mm]eets|[Tt]akes [Oo]n|[Bb]attles)\s+([A-Z][\w'.-]+(?:\s+[A-Z][\w'.-]+){0,2})/);
    if (fm) {
      const eventMatch = h.match(/UFC\s*\d+|UFC Fight Night/i);
      const where = eventMatch ? ` at ${eventMatch[0].toUpperCase().replace('FIGHT NIGHT', 'Fight Night')}` : '';
      return `Will ${fm[1]} beat ${fm[2]}${where}?`;
    }
  }
  // Award nominations → the win question (WHO wins WHAT at WHERE)
  if ((quoted || lead) && /(nominated|nomination|snub|frontrunner|shortlist)/.test(t)) {
    const ceremony = ceremonyIn(t);
    if (ceremony) return `Will ${quoted ? `'${quoted}'` : lead} win at least one award at ${ceremony}?`;
  }
  // NEW: renewal limbo → the renewal question
  if (quoted && /(renew|another season|next season|future of|fate of)/.test(t) && /(await|decision|uncertain|limbo|talks|undecided|has yet|not yet)/.test(t)) {
    return `Will '${quoted}' be officially renewed for another season before [DATE]?`;
  }
  // NEW: festival headliners → scheduled-set question
  if (lead && /headlin/.test(t)) {
    const fest = FESTIVALS.find(f => t.includes(f));
    if (fest) {
      const festName = fest.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
      return `Will ${lead} perform their scheduled ${festName} headlining set?`;
    }
  }
  // Box office → #1-opening question (verifiable with zero threshold guessing;
  // dollar-bracket markets come from exchange mirroring + the curated batch,
  // where the thresholds are real numbers, not blanks)
  if (quoted && /(box office|opening weekend|opens to|debuts with|debut of)/.test(t)) {
    return `Will '${quoted}' finish #1 at the domestic box office in its opening weekend?`;
  }
  // Film/TV release timing
  if (quoted && /(release date|premiere|premieres|hits theaters|coming to|arrives on)/.test(t)) {
    return `Will '${quoted}' be released before [DATE]?`;
  }
  // Streaming performance
  if (quoted && /(netflix|streaming|top 10|most-watched|most watched)/.test(t)) {
    return `Will '${quoted}' stay in the Netflix Top 10 for 4 or more weeks?`;
  }
  // Delays — "will they delay it again?" is one of the most tradeable questions there is
  if ((quoted || lead) && /(delay|delayed|pushed back|postponed|pushes)/.test(t)) {
    const obj = (h.match(/(?:Delays|Pushes Back|Postpones)\s+(.+?)(?:\s+Again)?\s*$/i) || [])[1];
    const subject = quoted ? `'${quoted}'` : obj ? `${lead}'s ${obj}` : lead;
    return `Will ${subject} be delayed again before [DATE]?`;
  }
  // Acquisitions — "Netflix May Buy Letterboxd" → the deal-completion question
  if (lead && lead.split(' ').length <= 3 && (category !== 'trending' || isCultureBrand(lead)) && /(acquir|buy|buys|buying|purchase|takeover|in talks)/.test(t)) {
    let target = (h.match(/(?:buy(?:s|ing)?|acquir(?:e|es|ing)|purchase(?:s)?|takeover of|talks (?:to buy|to acquire|for|with))\s+(?:the\s+)?([A-Z][\w.'&-]+(?:\s+[A-Z][\w.'&-]+){0,2})/i) || [])[1];
    if (target) {
      const kept = [];
      for (const w of target.trim().split(/\s+/)) { if (!/^[A-Z0-9]/.test(w) || LEAD_STOPWORDS.has(w)) break; kept.push(w); }
      target = kept.join(' ') || null;
    }
    if (target && target.toLowerCase() !== lead.toLowerCase()) {
      return `Will ${lead} complete an acquisition of ${target} before [DATE]?`;
    }
  }
  // IPOs — the cleanest trending-news market there is
  if (lead && lead.split(' ').length <= 3 && !/ipo/i.test(lead) && (category !== 'trending' || isCultureBrand(lead)) && /\bipo\b/.test(t)) {
    return `Will ${lead} complete its IPO before [DATE]?`;
  }
  // Gaming / product launches — ONLY future-tense ("set to launch", "launching in
  // November"); "X Launches Y" is a recap of something that already happened
  if ((quoted || lead) && /((will|to|set to|plans to|expected to|slated to|scheduled to)\s+launch|launching (in|next|this)|launch(es)? (in|next|this) (\d{4}|january|february|march|april|may|june|july|august|september|october|november|december))/.test(t) && !/(lawsuit|layoff)/.test(t)) {
    let obj = (h.match(/launch(?:es|ing)?\s+(?:of\s+)?([A-Z][A-Za-z0-9 .'&-]{2,40})/i) || [])[1];
    if (obj) {
      const kept = [];
      for (const w of obj.trim().split(/\s+/)) { if (LEAD_STOPWORDS.has(w)) break; kept.push(w); }
      obj = kept.join(' ') || null;
    }
    const subject = quoted ? `'${quoted}'` : obj ? `${lead}'s ${obj}` : lead;
    return `Will ${subject} launch on or before [DATE]?`;
  }
  // Trailer buzz → measurable view milestone
  if ((quoted || lead) && /trailer/.test(t) && /(views|record|million|breaks)/.test(t)) {
    return `Will the ${quoted ? `'${quoted}'` : lead} trailer pass 100M views in its first week?`;
  }
  // Sales / streaming records in progress
  if ((quoted || lead) && /(on pace|on track|projected|expected to)/.test(t) && /(record|no\.? ?1|million|billion|chart)/.test(t)) {
    return `Will ${quoted ? `'${quoted}'` : lead} hit the projected mark by [DATE]?`;
  }
  return null;
}

// ── AI DRAFTING (optional, needs ANTHROPIC_API_KEY) ──
// Rule templates can only go so far; Claude Haiku turns raw headlines into
// Kalshi-grade questions with real thresholds and real close dates, and
// rejects recaps/opinion pieces that rules might miss. Falls back to the
// rule-based drafter silently when no key is configured.
async function llmDraft(candidates) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || candidates.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const list = candidates.map((c, i) => `${i}. [${c.category}] ${c.headline}`).join('\n');
  const prompt = `Today is ${today}. You screen news headlines for an entertainment prediction market (like Kalshi, but for music/movies/gaming/culture).

For each numbered headline, decide if it can become a REAL tradeable yes/no market about a verifiable FUTURE event with a public data source (chart position, box office gross, release/launch date, award result, renewal). Recaps of finished events, opinion pieces, power rankings, listicles, and vague narratives ("Can X turn his season around?") are NOT tradeable.

Question rules: start with "Will", name the exact subject, include one concrete measurable threshold, and imply a clear resolution deadline. NEVER reference anyone's personal life, relationships, health, legal trouble, or safety.

Reply with ONLY a JSON array (no prose, no markdown): one object per headline like
{"i": 0, "tradeable": true, "question": "Will 'The Odyssey' gross over $80M in its domestic opening weekend?", "close_date": "2026-07-20"}
or {"i": 1, "tradeable": false}.

Headlines:
${list}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || '').join('');
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// ── EXCHANGE MIRRORING: real live markets from Kalshi & Polymarket ──
// The best "free API" for market questions is other prediction markets:
// their questions are already tradeable, dated, and verifiable. We pull
// their open entertainment/music/media markets as ready-to-publish
// suggestions. Once published, the daily price-sync auto-matcher links
// the copy to its original (near-identical titles), so it price-syncs
// and auto-resolves with zero extra setup.

const ENT_ALLOW = ['album', 'song', 'single', 'billboard', 'rapper', 'singer', 'artist',
  'box office', 'movie', 'film', 'opening weekend', 'gross', 'oscar', 'academy award',
  'grammy', 'emmy', 'golden globe', 'netflix', 'hbo', 'disney', 'spotify', 'stream',
  'tour', 'concert', 'trailer', 'season', 'series', 'renewed', 'rotten tomatoes',
  'video game', 'gta', 'nintendo', 'playstation', 'xbox', 'game of the year',
  'tv show', 'showrunner', 'sequel', 'franchise', 'premiere',
  // Marquee sports: the talk-of-the-town events (regular-season noise has no
  // allow keyword, so it stays out naturally)
  'ufc', 'mma', 'boxing', 'heavyweight', 'fight night', 'mcgregor', 'super bowl',
  'nba finals', 'world series', 'stanley cup', 'world cup', 'grand slam',
  'wimbledon', 'olympics', 'march madness', 'champion'];

const ENT_EXCLUDE = [
  // Elections & politics: the exact category the CFTC is moving to ban —
  // Dobium stays out even in paper money
  'election', 'president', 'senate', 'congress', 'governor', 'mayor', 'primary',
  'ballot', 'midterm', 'shutdown', 'impeach', 'supreme court',
  // Finance/macro/crypto noise
  'fed ', 'rate cut', 'inflation', 'bitcoin', 'ethereum', 'crypto', 'tariff',
  'gdp', 'stock', 's&p', 'nasdaq',
  // Weather + geopolitics
  'temperature', 'weather', 'war', 'ukraine', 'israel', 'gaza', 'russia'];

function isEntertainmentMarket(title) {
  const t = (title || '').toLowerCase();
  if (!t) return false;
  if (ENT_EXCLUDE.some(k => t.includes(k))) return false;
  return ENT_ALLOW.some(k => t.includes(k));
}

function volumeScore(vol) {
  const v = Number(vol) || 0;
  return Math.min(100, Math.round(Math.log10(v + 1) * 18));
}

async function fetchExchangeSuggestions() {
  const out = [];

  // Kalshi — bare requests, cursor pagination
  try {
    let cursor = null;
    for (let page = 0; page < 2; page++) {
      const url = `https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) break;
      const data = await res.json();
      for (const m of data.markets || []) {
        const title = `${m.title || ''}`.trim();
        if (!isEntertainmentMarket(title) || isHarmful(title)) continue;
        const close = m.close_time ? new Date(m.close_time) : null;
        out.push({
          headline: (title.endsWith('?') ? title : `${title}?`).slice(0, 290),
          url: null,
          source: 'Kalshi',
          category: /album|song|single|billboard|grammy|tour|concert|rapper|singer|spotify/i.test(title) ? 'music' : 'entertainment',
          score: volumeScore(m.volume),
          suggested_close_date: close && close > new Date() ? close : null,
          preDrafted: true,
        });
      }
      cursor = data.cursor;
      if (!cursor || (data.markets || []).length === 0) break;
      await new Promise(r => setTimeout(r, 300));
    }
  } catch (e) {
    console.error('Scout: Kalshi mirror failed:', e.message);
  }

  // Polymarket Gamma — needs a browser-like UA
  try {
    for (let offset = 0; offset < 1000; offset += 500) {
      const res = await fetch(`https://gamma-api.polymarket.com/markets?closed=false&limit=500&offset=${offset}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' },
      });
      if (!res.ok) break;
      const arr = await res.json();
      if (!Array.isArray(arr) || arr.length === 0) break;
      for (const m of arr) {
        const title = (m.question || '').trim();
        if (!isEntertainmentMarket(title) || isHarmful(title)) continue;
        const close = m.endDate ? new Date(m.endDate) : null;
        out.push({
          headline: title.slice(0, 290),
          url: null,
          source: 'Polymarket',
          category: /album|song|single|billboard|grammy|tour|concert|rapper|singer|spotify/i.test(title) ? 'music' : 'entertainment',
          score: volumeScore(m.volumeNum ?? m.volume),
          suggested_close_date: close && close > new Date() ? close : null,
          preDrafted: true,
        });
      }
      if (arr.length < 500) break;
      await new Promise(r => setTimeout(r, 300));
    }
  } catch (e) {
    console.error('Scout: Polymarket mirror failed:', e.message);
  }

  // Hottest first, capped so the queue stays reviewable
  return out.sort((a, b) => b.score - a.score).slice(0, 25);
}


async function runMarketScout() {
  const found = [];

  // ---- Purge old junk: pending suggestions that aren't proper questions ----
  const { Op } = require('sequelize');
  let purged = 0;
  try {
    purged = await MarketSuggestion.destroy({
      where: {
        status: 'pending',
        headline: { [Op.notLike]: 'Will %' },
        source: { [Op.notIn]: ['Kalshi', 'Polymarket'] },
      },
    });
    // Purge non-A-list music suggestions (the Gilla Band problem)
    try {
      const pendingMusic = await MarketSuggestion.findAll({ where: { status: 'pending', category: 'music', source: { [Op.notIn]: ['Kalshi', 'Polymarket'] } } });
      const obscure = pendingMusic.filter(m => !isAList(m.headline));
      if (obscure.length) {
        await MarketSuggestion.destroy({ where: { id: { [Op.in]: obscure.map(m => m.id) } } });
        purged += obscure.length;
      }
    } catch (e) { /* non-fatal */ }
    // Also purge grammar-garbage from the old drafter ("Will Ringo Starr Fall
    // announce…", "Will X Announces…") — case-sensitive LIKE only hits
    // Title-Case verb leakage, never legit lowercase wording.
    purged += await MarketSuggestion.destroy({
      where: {
        status: 'pending',
        [Op.or]: [
          { headline: { [Op.like]: '% Announces %' } },
          { headline: { [Op.like]: '% Reveals %' } },
          { headline: { [Op.like]: '% Teases %' } },
          { headline: { [Op.like]: '% Confirms %' } },
          { headline: { [Op.like]: '%announce official tour dates%' } },
          { headline: { [Op.like]: '%[AMOUNT]%' } },
          { headline: { [Op.like]: '%[N]%' } },
          { headline: { [Op.like]: '%[DATE]%' } },
          { headline: { [Op.like]: 'Will ANALYSIS%' } },
          { headline: { [Op.like]: 'Will Forget%' } },
          { headline: { [Op.like]: '%IPO complete its IPO%' } },
          { headline: { [Op.like]: 'Will News %' } },
          { headline: { [Op.like]: 'Will SK Hynix%' } },
        ],
      },
    });
  } catch (e) {
    console.error('Scout: junk purge failed:', e.message);
  }

  // ---- Live markets from real exchanges (Kalshi + Polymarket) ----
  let exchangeCount = 0;
  try {
    const mirrored = await fetchExchangeSuggestions();
    exchangeCount = mirrored.length;
    found.push(...mirrored);
  } catch (e) {
    console.error('Scout: exchange mirroring failed:', e.message);
  }

  // ---- Apple Music most-played albums → clean chart questions ----
  try {
    const data = await fetchJson(APPLE_MUSIC_FEED);
    for (const album of (data?.feed?.results || []).slice(0, 10)) {
      if (!album.name || !album.artistName) continue;
      if (isHarmful(`${album.name} ${album.artistName}`)) continue;
      found.push({
        headline: `Will '${album.name}' by ${album.artistName} still be a top-10 most-played album on Apple Music on [DATE]?`,
        url: album.url || null,
        source: 'Apple Music',
        category: 'music',
        score: 100,
        preDrafted: true,
      });
    }
  } catch (e) {
    console.error('Scout: Apple Music feed failed:', e.message);
  }

  // ---- Reddit hot posts ----
  for (const src of REDDIT_SOURCES) {
    try {
      const data = await fetchJson(`https://www.reddit.com/r/${src.sub}/hot.json?limit=25`);
      const posts = data?.data?.children || [];
      for (const p of posts) {
        const d = p.data || {};
        if (d.stickied || d.over_18) continue;
        if (d.is_self) continue;              // no meme/discussion self-posts, only link posts to real coverage
        if ((d.ups || 0) < 800) continue;      // raised bar — genuinely trending, not just active
        found.push({
          headline: decodeEntities(d.title || '').slice(0, 290),
          url: d.url_overridden_by_dest || `https://www.reddit.com${d.permalink || ''}`,
          source: `r/${src.sub}`,
          category: detectCategory(d.title, src.category),
          score: d.ups || 0,
        });
      }
    } catch (e) {
      console.error(`Scout: reddit r/${src.sub} failed:`, e.message);
    }
  }

  // ---- News RSS ----
  for (const src of RSS_SOURCES) {
    try {
      const xml = await fetchText(src.url);
      for (const item of parseRssTitles(xml)) {
        found.push({
          headline: item.title.slice(0, 290),
          url: item.link,
          source: src.name,
          category: detectCategory(item.title, src.category),
          score: 100,
        });
      }
    } catch (e) {
      console.error(`Scout: rss ${src.name} failed:`, e.message);
    }
  }

  // ---- Filters: harmful content out, then keep only market-worthy headlines ----
  const noHarm = found.filter(f => f.headline && !isHarmful(f.headline));
  const relevant = noHarm.filter(f => f.preDrafted || isMarketWorthy(f.headline, f.category));

  // ---- Dedupe against existing suggestions + markets ----
  const existingSuggestions = await MarketSuggestion.findAll({ attributes: ['headline'] });
  const existingMarkets = await Market.findAll({ attributes: ['title'] });
  const known = new Set([
    ...existingSuggestions.map(s => s.headline.toLowerCase()),
    ...existingMarkets.map(m => (m.title || '').toLowerCase()),
  ]);

  // New candidates only (dedupe first so we don't waste LLM tokens on repeats)
  const fresh = [];
  for (const f of relevant) {
    const key = f.headline.toLowerCase();
    if (known.has(key)) continue;
    known.add(key);
    fresh.push(f);
  }

  // ── Stage 1: AI drafting (Kalshi-grade questions with real dates) ──
  let llmResults = null;
  let usedLlm = false;
  const llmCandidates = fresh.filter(f => !f.preDrafted).slice(0, 50);
  try {
    llmResults = await llmDraft(llmCandidates);
    usedLlm = Array.isArray(llmResults);
  } catch (e) {
    console.error('Scout: AI drafting unavailable, using rule templates:', e.message);
  }

  let created = 0;
  let dropped = 0;
  for (const f of fresh) {
    let drafted = null;
    let closeDate = null;
    if (f.preDrafted) {
      drafted = f.headline;
    } else if (usedLlm) {
      const idx = llmCandidates.indexOf(f);
      const verdict = idx >= 0 ? llmResults.find(r => r && r.i === idx) : null;
      if (verdict?.tradeable && typeof verdict.question === 'string' && verdict.question.startsWith('Will')) {
        if (isHarmful(verdict.question)) { dropped++; continue; } // harm filter applies to AI output too
        drafted = verdict.question;
        const d = new Date(verdict.close_date);
        if (!isNaN(d) && d > new Date()) closeDate = d;
      }
    } else {
      // STRICT rule fallback: if a headline can't become a real "Will …?"
      // question, it doesn't belong in the queue. Recaps, opinion pieces,
      // and "Can X turn his season around?" narratives get dropped here.
      drafted = draftQuestion(f.headline, f.category);
    }
    if (!drafted) { dropped++; continue; }
    // Talk-of-the-town gate: music questions only for A-list artists
    if (f.category === 'music' && f.source !== 'Kalshi' && f.source !== 'Polymarket' && !isAList(f.headline) && !isAList(drafted)) { dropped++; continue; }
    // Verb leakage / grammar-garbage gate — better no suggestion than a broken one
    if (/^Will [^?]*\b(Announces|Reveals|Teases|Confirms|Debuts|Unveils)\b/.test(drafted) ||
        /announce official tour dates/.test(drafted)) { dropped++; continue; }
    try {
      // Fill [DATE] with a real date — 30 days out by default — instead of a blank
      const closeTarget = closeDate || new Date(Date.now() + 30 * 86400000);
      const human = closeTarget.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      f.headline = drafted.replace(/\[DATE\]/g, human).slice(0, 290);
      f.suggested_close_date = closeTarget;
      delete f.preDrafted;
      const draftKey = f.headline.toLowerCase();
      if (known.has(draftKey)) continue;
      known.add(draftKey);
      await MarketSuggestion.create(f);
      created++;
    } catch (e) {
      console.error('Scout: save failed:', e.message);
    }
  }

  return {
    scanned: found.length,
    harm_filtered: found.length - noHarm.length,
    not_market_worthy: noHarm.length - relevant.length,
    undraftable_dropped: dropped,
    junk_purged: purged,
    exchange_markets: exchangeCount,
    ai_drafting: usedLlm,
    new_suggestions: created,
  };
}

module.exports = { runMarketScout };
