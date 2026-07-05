// ============================================================================
// MARKET SCOUT — finds trending topics 24/7 for admin review
// ============================================================================
// Pulls Reddit hot posts + entertainment/sports news RSS, categorizes them,
// applies a harm filter (nothing that hurts or shames a real person),
// dedupes, and stores suggestions for one-tap review in the admin.

const { MarketSuggestion, Market } = require('../lib/database/models');

const UA = 'DobiumMarketScout/1.0 (entertainment prediction markets; contact: team@dobium.com)';

// Subreddit -> category
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

// RSS feeds -> category
const RSS_SOURCES = [
  { name: 'Variety', url: 'https://variety.com/feed/', category: 'entertainment' },
  { name: 'Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/', category: 'entertainment' },
  { name: 'Billboard', url: 'https://www.billboard.com/feed/', category: 'music' },
  { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news', category: 'sports' },
];

// Anything that puts a real person in a harmful or private-life spotlight is dropped.
const HARM_BLOCKLIST = [
  'dies', 'dead', 'death', 'killed', 'passes away', 'arrest', 'jail', 'prison',
  'lawsuit', 'sues', 'sued', 'divorce', 'cheat', 'affair', 'assault', 'abuse',
  'allegation', 'accused', 'drugs', 'overdose', 'rehab', 'scandal', 'leak',
  'nude', 'racist', 'slur', 'hospitalized', 'hospital', 'cancer', 'suicide',
  'shooting', 'custody', 'restraining order', 'dui', 'pregnan', 'dating',
  'breakup', 'break up', 'split from', 'feud', 'stalker', 'harass'
];

const AWARDS_KEYWORDS = ['oscar', 'academy award', 'grammy', 'emmy', 'golden globe', 'vma', 'tony award', 'billboard music award', 'amas', 'sag award'];

function isHarmful(text) {
  const t = (text || '').toLowerCase();
  return HARM_BLOCKLIST.some(term => t.includes(term));
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

function parseRssTitles(xml) {
  const items = [];
  const itemBlocks = xml.split(/<item[\s>]/).slice(1);
  for (const block of itemBlocks.slice(0, 15)) {
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
    if (titleMatch) {
      items.push({
        title: titleMatch[1].replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, "'").replace(/&quot;/g, '"').trim(),
        link: linkMatch ? linkMatch[1].trim() : null,
      });
    }
  }
  return items;
}

async function runMarketScout() {
  const found = [];

  // ---- Reddit hot posts ----
  for (const src of REDDIT_SOURCES) {
    try {
      const data = await fetchJson(`https://www.reddit.com/r/${src.sub}/hot.json?limit=12`);
      const posts = data?.data?.children || [];
      for (const p of posts) {
        const d = p.data || {};
        if (d.stickied || d.over_18) continue;
        if ((d.ups || 0) < 500) continue; // only genuinely trending posts
        found.push({
          headline: (d.title || '').slice(0, 290),
          url: `https://www.reddit.com${d.permalink || ''}`,
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

  // ---- Harm filter ----
  const safe = found.filter(f => f.headline && !isHarmful(f.headline));

  // ---- Dedupe against existing suggestions + markets ----
  const existingSuggestions = await MarketSuggestion.findAll({ attributes: ['headline'] });
  const existingMarkets = await Market.findAll({ attributes: ['title'] });
  const known = new Set([
    ...existingSuggestions.map(s => s.headline.toLowerCase()),
    ...existingMarkets.map(m => (m.title || '').toLowerCase()),
  ]);

  let created = 0;
  for (const f of safe) {
    const key = f.headline.toLowerCase();
    if (known.has(key)) continue;
    known.add(key);
    try {
      await MarketSuggestion.create(f);
      created++;
    } catch (e) {
      console.error('Scout: save failed:', e.message);
    }
  }

  return { scanned: found.length, safe: safe.length, filtered_out: found.length - safe.length, new_suggestions: created };
}

module.exports = { runMarketScout };
