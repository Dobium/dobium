// Single source of truth for how a market's price is presented.
//
// The old cards showed a YES pill in green next to a NO pill in salmon. That
// reads as a betting slip: two odds, pick a side. Every surface that shows a
// market now goes through quoteOf() and renders ONE quote — the leading side,
// its last price, and a bid/ask if the book actually has one — which is how a
// security is quoted rather than how a wager is offered.

export function outcomesOf(m) {
  return Array.isArray(m?.outcomes) ? m.outcomes : [];
}

export function yesOf(m) {
  return outcomesOf(m).find((o) => /^yes$/i.test(o?.name || o?.label || ''));
}

export function leaderOf(m) {
  return outcomesOf(m).reduce(
    (best, o) => (!best || (o?.probability || 0) > (best?.probability || 0) ? o : best),
    null,
  );
}

// Cents, clamped to a tradeable 1–99 band. A contract never quotes at 0 or 100
// while it is still open, and rounding artifacts that print "100¢" on a live
// market look broken.
export function toCents(probability) {
  const n = Math.round(Number(probability) || 0);
  return Math.min(99, Math.max(1, n));
}

export function formatVolume(v) {
  const n = Number(v) || 0;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `$${n.toLocaleString('en-US')}`;
}

// Build the display quote for a market.
//
// IMPORTANT: bid and ask are only returned when the market actually carries
// them. We do not synthesise a spread around the mid to make the UI look
// busier — a fabricated bid/ask is a fabricated market, and this platform is
// going to be shown to a regulator eventually. When there is no book, callers
// get bid: null / ask: null and should omit that line entirely.
export function quoteOf(m) {
  const yes = yesOf(m);
  const lead = yes || leaderOf(m);
  const side = (lead?.name || lead?.label || 'YES').toUpperCase();
  const last = toCents(lead?.probability);

  const rawBid = Number(lead?.best_bid ?? lead?.bid);
  const rawAsk = Number(lead?.best_ask ?? lead?.ask);
  const hasBook = Number.isFinite(rawBid) && Number.isFinite(rawAsk);

  return {
    side,
    last,
    bid: hasBook ? toCents(rawBid) : null,
    ask: hasBook ? toCents(rawAsk) : null,
    hasBook,
    volume: formatVolume(m?.total_volume || 0),
    volumeRaw: Number(m?.total_volume) || 0,
  };
}

// "NO Price 95¢ · Bid 94¢ · Ask 95¢" — collapses to just the price when the
// book is empty.
export function quoteLine(q) {
  const head = `${q.side} Price ${q.last}¢`;
  return q.hasBook ? `${head} · Bid ${q.bid}¢ · Ask ${q.ask}¢` : head;
}
