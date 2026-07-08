// ============================================================================
// PRICING PROVIDERS — pull real market prices from Kalshi / Polymarket so
// Dobium paper prices move with real events (read-only public market data).
// ============================================================================

const KALSHI_BASE = 'https://api.elections.kalshi.com/trade-api/v2';
const GAMMA_BASE = 'https://gamma-api.polymarket.com';
// Kalshi's public API rejects requests with unusual headers — send bare requests.
// Polymarket's Gamma API 403s without a browser-like User-Agent.
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function kalshiYesPrice(ticker) {
  const res = await fetch(`${KALSHI_BASE}/markets/${encodeURIComponent(ticker)}`);
  if (!res.ok) throw new Error(`Kalshi ${res.status} for ${ticker}`);
  const data = await res.json();
  const m = data.market || data;
  // last_price is in cents (0-100); fall back to bid/ask midpoint
  let price = m.last_price;
  if (!price && m.yes_bid != null && m.yes_ask != null) price = (m.yes_bid + m.yes_ask) / 2;
  if (price == null) throw new Error(`Kalshi: no price on ${ticker}`);
  return Number(price);
}

async function polymarketYesPrice(slug) {
  const res = await fetch(`${GAMMA_BASE}/markets?slug=${encodeURIComponent(slug)}`, {
    headers: { 'User-Agent': BROWSER_UA },
  });
  if (!res.ok) throw new Error(`Polymarket ${res.status} for ${slug}`);
  const arr = await res.json();
  const m = Array.isArray(arr) ? arr[0] : arr;
  if (!m) throw new Error(`Polymarket: no market for slug ${slug}`);
  // outcomePrices is a JSON string like '["0.94","0.06"]' aligned with outcomes '["Yes","No"]'
  const outcomes = JSON.parse(m.outcomes || '[]');
  const prices = JSON.parse(m.outcomePrices || '[]');
  const yesIdx = outcomes.findIndex((o) => String(o).toLowerCase() === 'yes');
  const raw = prices[yesIdx >= 0 ? yesIdx : 0];
  if (raw == null) throw new Error(`Polymarket: no price for ${slug}`);
  return Number(raw) * 100; // 0-1 → cents
}

// Returns the real-market Yes probability in percent (1–99), or throws.
async function getYesProbability(source) {
  let pct;
  if (source.provider === 'kalshi') pct = await kalshiYesPrice(source.ticker);
  else if (source.provider === 'polymarket') pct = await polymarketYesPrice(source.slug);
  else throw new Error(`Unknown provider: ${source.provider}`);
  return Math.min(99, Math.max(1, Math.round(pct * 10) / 10));
}

// ── Settlement check: has the REAL market finished, and which side won? ──
// Returns { settled: false } while still trading, or { settled: true, result: 'yes'|'no' }
// once the real-world event has a final answer. This is what makes auto-resolution
// safe: we only ever copy a result the real exchange has already finalized.
async function getSettlement(source) {
  if (source.provider === 'kalshi') {
    const res = await fetch(`${KALSHI_BASE}/markets/${encodeURIComponent(source.ticker)}`);
    if (!res.ok) throw new Error(`Kalshi ${res.status} for ${source.ticker}`);
    const data = await res.json();
    const m = data.market || data;
    // Kalshi status lifecycle: unopened -> active -> closed -> settled/finalized
    if (m.status === 'settled' || m.status === 'finalized') {
      const result = (m.result || '').toLowerCase(); // 'yes' | 'no' | '' (voided)
      if (result === 'yes' || result === 'no') return { settled: true, result };
    }
    return { settled: false };
  }
  if (source.provider === 'polymarket') {
    const res = await fetch(`${GAMMA_BASE}/markets?slug=${encodeURIComponent(source.slug)}`, {
      headers: { 'User-Agent': BROWSER_UA },
    });
    if (!res.ok) throw new Error(`Polymarket ${res.status} for ${source.slug}`);
    const arr = await res.json();
    const m = Array.isArray(arr) ? arr[0] : arr;
    if (!m) throw new Error(`Polymarket: no market for slug ${source.slug}`);
    // Polymarket has no simple boolean flag exposed via Gamma for "resolved" in all cases,
    // so require BOTH closed=true AND the price to have converged near 0 or 1 —
    // that convergence only happens post-resolution, never from normal trading noise.
    if (m.closed === true) {
      const outcomes = JSON.parse(m.outcomes || '[]');
      const prices = JSON.parse(m.outcomePrices || '[]');
      const yesIdx = outcomes.findIndex((o) => String(o).toLowerCase() === 'yes');
      const yesPrice = Number(prices[yesIdx >= 0 ? yesIdx : 0]);
      if (yesPrice >= 0.98) return { settled: true, result: 'yes' };
      if (yesPrice <= 0.02) return { settled: true, result: 'no' };
    }
    return { settled: false };
  }
  throw new Error(`Unknown provider: ${source.provider}`);
}

// ── AUTO-MATCHING: find each Dobium market's real-money twin automatically ──
// Instead of manually pasting tickers, the daily job pulls the open-market
// listings from both exchanges and fuzzy-matches titles. Conservative
// thresholds — a wrong link would sync wrong prices, so no match > weak match.

const STOPWORDS = new Set(['will','the','a','an','in','on','by','before','after','of','at','be','to','for','and','or','is','it','its','their','with','vs','does','do','than','more','another','new','release','released','launch','launches','2026','2027']);

function tokens(str) {
  return (str || '').toLowerCase()
    .replace(/november/g, 'nov').replace(/december/g, 'dec').replace(/january/g, 'jan')
    .replace(/february/g, 'feb').replace(/september/g, 'sep').replace(/october/g, 'oct')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t));
}

async function fetchKalshiCandidates() {
  const out = [];
  let cursor = null;
  for (let page = 0; page < 3; page++) {
    const url = `${KALSHI_BASE}/markets?status=open&limit=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    for (const m of data.markets || []) {
      out.push({ provider: 'kalshi', ref: m.ticker, title: `${m.title || ''} ${m.subtitle || ''}`.trim() });
    }
    cursor = data.cursor;
    if (!cursor || (data.markets || []).length === 0) break;
    await new Promise((r) => setTimeout(r, 300)); // gentle on their rate limits
  }
  return out;
}

async function fetchPolymarketCandidates() {
  const out = [];
  for (let offset = 0; offset < 1500; offset += 500) {
    const res = await fetch(`${GAMMA_BASE}/markets?closed=false&limit=500&offset=${offset}`, {
      headers: { 'User-Agent': BROWSER_UA },
    });
    if (!res.ok) break;
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) break;
    for (const m of arr) out.push({ provider: 'polymarket', ref: m.slug, title: m.question || '' });
    if (arr.length < 500) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  return out;
}

async function fetchAllCandidates() {
  const [k, pm] = await Promise.all([
    fetchKalshiCandidates().catch(() => []),
    fetchPolymarketCandidates().catch(() => []),
  ]);
  return [...k, ...pm];
}

// Best fuzzy match for a Dobium title. Requirements to accept:
//  - ≥60% of the Dobium title's meaningful tokens appear in the candidate
//  - at least 3 overlapping tokens (so "Drake album" alone can't match)
//  - clearly better than the runner-up (avoids ambiguous links)
function bestMatch(marketTitle, candidates) {
  const mt = [...new Set(tokens(marketTitle))];
  if (mt.length < 3) return null;
  let best = null;
  let second = 0;
  for (const c of candidates) {
    if (!c.ref) continue;
    const ct = new Set(tokens(c.title));
    let inter = 0;
    for (const t of mt) if (ct.has(t)) inter++;
    const score = inter / mt.length;
    if (!best || score > best.score) {
      second = best ? best.score : second;
      if (score > (best ? best.score : 0)) { second = best ? best.score : 0; best = { ...c, score, inter }; }
    } else if (score > second) {
      second = score;
    }
  }
  if (!best) return null;
  if (best.score < 0.6 || best.inter < 3) return null;
  if (second > 0 && best.score - second < 0.1 && best.score < 0.85) return null; // ambiguous
  return best;
}

module.exports = { getYesProbability, getSettlement, fetchAllCandidates, bestMatch };
