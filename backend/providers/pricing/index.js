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

module.exports = { getYesProbability, getSettlement };
