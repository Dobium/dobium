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

module.exports = { getYesProbability };
