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
  { sub: 'nba', category: 'sports' },
  { sub: 'nfl', category: 'sports' },
  { sub: 'soccer', category: 'sports' },
];

const RSS_SOURCES = [
  { name: 'Variety', url: 'https://variety.com/feed/', category: 'entertainment' },
  { name: 'Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/', category: 'entertainment' },
  { name: 'Billboard', url: 'https://www.billboard.com/feed/', category: 'music' },
  { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news', category: 'sports' },
];

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

// RSS titles arrive with HTML entities (&#8216; &amp; &quot;…) — decode them so
// suggestions read as normal English instead of jargon.
function decodeHtmlEntities(str) {
  return (str || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D')
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
    if (titleMatch) titleMatch[1] = decodeHtmlEntities(titleMatch[1]);
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
function draftQuestion(headline, category) {
  const h = (headline || '').trim();
  const t = h.toLowerCase();
  const quoted = (h.match(/['\u2018"\u201C]([^'\u2019"\u201D]{2,60})['\u2019"\u201D]/) || [])[1];
  const lead = (h.match(/^([A-Z][A-Za-z.$'-]+(?:\s+[A-Z][A-Za-z.$'-]+){0,3})/) || [])[1];

  // Music: announcements and teases → release question
  if (category === 'music' && lead && /(announc|teas|confirm|reveal|hint|preview)/.test(t) && /(album|mixtape|\bep\b|single|tour)/.test(t)) {
    if (t.includes('tour')) return `Will ${lead} announce official tour dates before [DATE]?`;
    const what = t.includes('single') ? 'single' : 'album';
    return `Will ${lead} release the new ${what} before [DATE]?`;
  }
  // Music: fresh drops → chart question
  if (category === 'music' && lead && /(drops|releases|to release|is releasing|shares)/.test(t) && /(album|mixtape|\bep\b|single)/.test(t)) {
    const what = t.includes('single') ? 'single' : 'album';
    return `Will ${lead}'s new ${what} debut at #1 on the Billboard 200?`;
  }
  // Charts: something just hit #1 → does it hold?
  if (/(debuts at no\.? ?1|hits no\.? ?1|tops the (billboard|chart)|number one debut)/.test(t) && (quoted || lead)) {
    return `Will ${quoted ? `'${quoted}'` : lead} hold the #1 spot for a second week?`;
  }
  // Box office → opening-weekend bracket question
  if (quoted && /(box office|opening weekend|opens to|debuts with|debut of)/.test(t)) {
    return `Will '${quoted}' gross over $[AMOUNT]M in its opening weekend domestically?`;
  }
  // Film/TV release timing
  if (quoted && /(release date|premiere|premieres|hits theaters|coming to|arrives on)/.test(t)) {
    return `Will '${quoted}' be released before [DATE]?`;
  }
  // Streaming performance
  if (quoted && /(netflix|streaming|top 10|most-watched|most watched)/.test(t)) {
    return `Will '${quoted}' stay in the Netflix Top 10 for [N]+ weeks?`;
  }
  return null;
}

async function runMarketScout() {
  const found = [];

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
  const relevant = noHarm.filter(f => isMarketWorthy(f.headline, f.category));

  // ---- Dedupe against existing suggestions + markets ----
  const existingSuggestions = await MarketSuggestion.findAll({ attributes: ['headline'] });
  const existingMarkets = await Market.findAll({ attributes: ['title'] });
  const known = new Set([
    ...existingSuggestions.map(s => s.headline.toLowerCase()),
    ...existingMarkets.map(m => (m.title || '').toLowerCase()),
  ]);

  let created = 0;
  for (const f of relevant) {
    const key = f.headline.toLowerCase();
    if (known.has(key)) continue;
    known.add(key);
    try {
      const drafted = draftQuestion(f.headline, f.category);
      if (drafted) f.headline = drafted.slice(0, 290);
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
    new_suggestions: created,
  };
}

module.exports = { runMarketScout };
