// ── Recurring chart markets ────────────────────────────────────────────────
//
// The scout is reactive: news breaks, an LLM drafts a question, and we hope it
// can be settled. This is the opposite. The Billboard Hot 100 refreshes every
// Tuesday, so next week's market can be written on Monday already knowing the
// exact moment it resolves and the exact source that resolves it.
//
// That matters because unresolvable markets void after three days under
// voidUnresolvableMarkets. A market drafted from a headline often has no
// settlement source at all. A chart market has one by construction.
//
// Two halves, and the second is the one that counts:
//   ensureWeeklyChartMarkets()  – writes next week's market if absent
//   resolveChartMarkets()       – reads the chart and settles the due ones
//
// Generating markets without resolving them just automates the production of
// markets that die.
//
// Source: Wikipedia's Hot 100 article via the public REST API. Billboard has no
// free public API and scraping their site is both fragile and against their
// terms; Wikipedia is structured, permissively licensed, and updated within
// hours of each chart. If the shape ever changes, resolution fails closed —
// the market stays open and is reported, rather than being settled wrongly.

const crypto = require('crypto');

// Matches the id helper in server.js — nanoid is not a backend dependency.
const nanoid = (size = 12) => crypto.randomBytes(Math.ceil(size / 2)).toString('hex').slice(0, size);

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const CHART_KIND = 'hot100_number_one';

// Tuesday, in UTC, on or after the given date.
function nextChartDate(from = new Date()) {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const daysUntilTue = (2 - d.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + daysUntilTue);
  d.setUTCHours(17, 0, 0, 0); // chart is live well before this
  return d;
}

function humanDate(d) {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

// Current Hot 100 number one, as { song, artist }, or null when unreadable.
async function fetchHot100NumberOne() {
  const url = `${WIKI_API}?action=query&prop=extracts&explaintext=1&format=json&titles=Billboard%20Hot%20100&origin=*`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Dobium/1.0 (markets@dobium.com)' } });
  if (!res.ok) throw new Error(`wikipedia ${res.status}`);
  const data = await res.json();
  const pages = data?.query?.pages || {};
  const extract = Object.values(pages)[0]?.extract || '';

  // The article states the current chart-topper in prose. Accept only a clear
  // single match; anything ambiguous returns null so we fail closed.
  const patterns = [
    /current number[- ]one song[^."]*?is "([^"]+)" by ([^.\n(]+)/i,
    /number[- ]one (?:song|single) (?:on the chart )?is "([^"]+)" by ([^.\n(]+)/i,
  ];
  for (const re of patterns) {
    const m = extract.match(re);
    if (m) return { song: m[1].trim(), artist: m[2].trim().replace(/\s+$/, '') };
  }
  return null;
}

// "Will <song> still be #1 on the Hot 100 on <date>?" — binary, and settled by
// one lookup on the day. Deliberately not "who will be #1": an open field can't
// be enumerated in advance, so it couldn't resolve automatically.
async function ensureWeeklyChartMarkets(models, { dryRun = false } = {}) {
  const { Market, Outcome, sequelize } = models;
  const current = await fetchHot100NumberOne();
  if (!current) return { created: [], skipped: 'could not read current number one' };

  const chartDate = nextChartDate();
  const title = `Will "${current.song}" still be #1 on the Billboard Hot 100 on ${humanDate(chartDate)}?`;

  const existing = await Market.findOne({ where: { title } });
  if (existing) return { created: [], skipped: 'already exists' };
  if (dryRun) return { created: [title], dryRun: true };

  const marketId = nanoid(12);
  await sequelize.transaction(async (t) => {
    await Market.create({
      id: marketId,
      title,
      description: `Resolves YES if "${current.song}" by ${current.artist} is the number one song on the Billboard Hot 100 chart dated ${humanDate(chartDate)}, per Billboard's published chart. Resolves NO otherwise. Settled automatically when the chart refreshes.`,
      category: 'music',
      market_type: 'binary',
      status: 'active',
      close_date: chartDate,
      resolution_date: chartDate,
      total_volume: 0,
      winning_outcome_id: null,
      search_keywords: `billboard hot 100 ${current.song} ${current.artist} chart`,
      is_trending: true,
      // Tagged so the resolver can find its own markets without title matching.
      price_source: CHART_KIND,
    }, { transaction: t });
    await Outcome.bulkCreate([
      { id: `${marketId}_yes`, market_id: marketId, title: 'Yes', probability: 50, total_stake: 0 },
      { id: `${marketId}_no`, market_id: marketId, title: 'No', probability: 50, total_stake: 0 },
    ], { transaction: t });
  });

  return { created: [title], marketId };
}

// Settle any chart market whose date has arrived, by reading the chart.
async function resolveChartMarkets(models, resolveMarketInstance, { dryRun = false } = {}) {
  const { Market, Outcome, Op } = models;
  const due = await Market.findAll({
    where: {
      status: 'active',
      price_source: CHART_KIND,
      resolution_date: { [Op.lte]: new Date() },
    },
  });
  if (due.length === 0) return { resolved: [], checked: 0 };

  const current = await fetchHot100NumberOne();
  if (!current) return { resolved: [], checked: due.length, error: 'could not read chart — left open' };

  const resolved = [];
  for (const market of due) {
    // The song is the quoted portion of the title we wrote.
    const quoted = (market.title.match(/"([^"]+)"/) || [])[1];
    if (!quoted) continue;
    const stillNumberOne = quoted.toLowerCase() === current.song.toLowerCase();

    const outcomes = await Outcome.findAll({ where: { market_id: market.id } });
    const winner = outcomes.find((o) => (o.title || '').toLowerCase() === (stillNumberOne ? 'yes' : 'no'));
    if (!winner) continue;

    if (!dryRun) await resolveMarketInstance(market, [winner.id], { resolutionDate: new Date() });
    resolved.push({ id: market.id, title: market.title, outcome: stillNumberOne ? 'Yes' : 'No', chartNumberOne: current.song });
  }
  return { resolved, checked: due.length, dryRun };
}

module.exports = { ensureWeeklyChartMarkets, resolveChartMarkets, fetchHot100NumberOne, nextChartDate, CHART_KIND };
