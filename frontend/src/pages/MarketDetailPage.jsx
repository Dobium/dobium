import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarket } from '../hooks/useMarkets';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { api } from '../api/client';

// ── Market detail page ─────────────────────────────────────────────────────
//
// Rebuilt to the reference design. What the previous version did and this one
// deliberately does not:
//
//   · Two large pill buttons, YES in green beside NO in red, at equal weight.
//     That is a betting slip. This page quotes one side at a time.
//   · "Chance of Yes 86%". A percentage framed as a chance is odds language.
//     This shows a price — 86¢ — the same number saying a different thing:
//     what the contract costs, not how likely you are to win.
//   · A green price line. Green is a result colour. The line is gold, which is
//     the page's only accent, so nothing on the chart reads as winning.
//   · A "Recent Activity" feed of other people's trades. Watching strangers
//     bet is a casino floor, not a quote screen.
//   · A four-step "Trading Timeline" bulleted down the page. The same facts
//     now sit folded into Resolution and Trading hours, available when wanted
//     rather than narrated at you.
//
// The trade flow underneath is unchanged: same useMarket, same wallet hook,
// same api.createPrediction. Only presentation moved.

const PAGE_BG = '#00132D';   // matches the site page field
const PANEL_BG = '#09192E';  // order ticket surface
const LINE = '#0E2744';      // panel borders, dividers
const HAIRLINE = '#122E50';  // chart grid
const WHITE = '#FFFFFF';
const MUTED = '#7E91A8';
const DIM = '#62778F';
const GOLD = '#FFDF9B';
const GOLD_BTN = '#FFDF9B';
const ON_GOLD = '#00132D';

const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const SANS = "'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif";

const RANGES = ['1D', '1W', '1M', '3M', 'ALL'];

// ── helpers ────────────────────────────────────────────────────────────────

const cents = (p) => Math.min(99, Math.max(1, Math.round(Number(p) || 0)));

function formatVolume(v) {
  const n = Number(v) || 0;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `$${n.toLocaleString('en-US')}`;
}

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// The reference header is a short subject line above a short question
// ("Penn State — 2027 CFP" / "Win the championship?"). That needs a
// short_title on the market. Where one exists we use it; otherwise the full
// question is the heading.
function splitHeading(market) {
  if (!market) return { heading: '', sub: null };
  if (market.short_title) return { heading: market.short_title, sub: market.subtitle || market.title };
  if (market.subtitle) return { heading: market.title, sub: market.subtitle };
  // No short_title on this market: show the question whole rather than
  // guessing where to cut it.
  return { heading: String(market.title || '').trim(), sub: null };
}

// Quote the leading side. Bid/ask only when the market actually carries a
// book — no synthetic spread painted around the mid to fill the line out.
function quoteFor(outcome) {
  if (!outcome) return null;
  const bid = Number(outcome.best_bid ?? outcome.bid);
  const ask = Number(outcome.best_ask ?? outcome.ask);
  const hasBook = Number.isFinite(bid) && Number.isFinite(ask);
  return {
    side: String(outcome.name || outcome.title || 'YES').toUpperCase(),
    price: cents(outcome.probability),
    bid: hasBook ? cents(bid) : null,
    ask: hasBook ? cents(ask) : null,
    hasBook,
  };
}

// ── chart ──────────────────────────────────────────────────────────────────

function PriceChart({ history, outcomeId, fallbackPrice }) {
  const W = 640;
  const H = 240;
  const PAD_R = 40;
  const PAD_B = 26;

  const series = useMemo(() => {
    if (Array.isArray(history) && history.length >= 2) {
      return history.map((snap) => ({
        t: snap.timestamp,
        v: Number(snap.prices?.[outcomeId] ?? fallbackPrice) || 0,
      }));
    }
    // A market with no trades yet is a flat line at its opening price. Drawing
    // an invented squiggle here would be showing price action that never
    // happened.
    return [
      { t: null, v: fallbackPrice },
      { t: null, v: fallbackPrice },
    ];
  }, [history, outcomeId, fallbackPrice]);

  const vals = series.map((s) => s.v);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);

  // Pick a step that gives about four gridlines, then snap the bounds to it,
  // so labels always land on round numbers.
  const niceStep = (r) => [1, 2, 5, 10, 20, 25, 50].find((n) => r / n <= 4) ?? 100;
  const breathe = Math.max(4, (rawMax - rawMin) * 0.6) / 2;
  const step = niceStep(Math.min(100, rawMax + breathe) - Math.max(0, rawMin - breathe));
  const lo = Math.max(0, Math.floor((rawMin - breathe) / step) * step);
  const hi = Math.min(100, Math.ceil((rawMax + breathe) / step) * step);
  const span = Math.max(step, hi - lo);

  const plotW = W - PAD_R;
  const plotH = H - PAD_B;
  const x = (i) => (series.length === 1 ? 0 : (i / (series.length - 1)) * plotW);
  const y = (v) => plotH - ((v - lo) / span) * plotH;

  const d = series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(s.v).toFixed(1)}`).join(' ');

  const gridlines = [];
  for (let v = lo; v <= hi + 0.001; v += step) gridlines.push(Math.round(v));

  const xTicks = [];
  if (series[0].t) {
    const n = Math.min(5, series.length);
    for (let k = 0; k < n; k += 1) {
      const idx = Math.round((k / Math.max(1, n - 1)) * (series.length - 1));
      const dt = new Date(series[idx].t);
      if (!Number.isNaN(dt.getTime())) {
        xTicks.push({ x: x(idx), label: dt.toLocaleDateString('en-US', { month: 'short' }) });
      }
    }
  }

  const last = series[series.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      <rect x="0" y="0" width={plotW} height={plotH} fill="none" stroke={HAIRLINE} strokeWidth="1" />
      {gridlines.map((v) => (
        <g key={v}>
          <line x1="0" x2={plotW} y1={y(v)} y2={y(v)} stroke={HAIRLINE} strokeWidth="1" />
          <text x={plotW + 8} y={y(v) + 3.5} fill={DIM} fontSize="10.5" fontFamily={MONO}>
            {v}%
          </text>
        </g>
      ))}

      <path d={d} fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(series.length - 1)} cy={y(last.v)} r="3.5" fill={GOLD} />

      {xTicks.map((t, i) => (
        <text
          key={i}
          x={t.x}
          y={H - 6}
          fill={DIM}
          fontSize="10.5"
          fontFamily={MONO}
          textAnchor={i === 0 ? 'start' : 'middle'}
        >
          {t.label}
        </text>
      ))}
    </svg>
  );
}

const outcomeLabel = (o) => String(o?.name || o?.title || '').trim() || 'YES';

// ── outcomes ───────────────────────────────────────────────────────────────
//
// Every outcome is listed on the page. The previous version put them behind a
// caret on the order ticket, which meant a market with 21 teams in it showed
// exactly one of them and gave no hint the other twenty existed.
function OutcomeList({ outcomes, selectedId, onSelect }) {
  const [showAll, setShowAll] = useState(false);
  const binary = outcomes.length <= 2;
  const LIMIT = 8;
  const rows = binary || showAll ? outcomes : outcomes.slice(0, LIMIT);

  return (
    <div style={{ marginTop: 32 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: binary ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)',
          gap: binary ? 14 : 8,
        }}
      >
        {rows.map((o) => {
          const on = o.id === selectedId;
          return (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              aria-pressed={on}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: PANEL_BG,
                border: `1px solid ${on ? GOLD : LINE}`,
                borderRadius: 9,
                padding: '14px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: SANS,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <span
                  style={{
                    color: WHITE,
                    fontSize: 14.5,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {binary ? `Buy ${outcomeLabel(o).toUpperCase()}` : outcomeLabel(o)}
                </span>
                {on && (
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 9,
                      letterSpacing: '.08em',
                      color: GOLD,
                      border: `1px solid ${GOLD}44`,
                      borderRadius: 3,
                      padding: '2px 6px',
                      flexShrink: 0,
                    }}
                  >
                    ACTIVE
                  </span>
                )}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 15, color: on ? GOLD : WHITE, fontWeight: 600, flexShrink: 0 }}>
                {cents(o.probability)}¢
              </span>
            </button>
          );
        })}
      </div>

      {!binary && outcomes.length > LIMIT && (
        <button
          onClick={() => setShowAll((v) => !v)}
          style={{
            width: '100%',
            marginTop: 10,
            background: 'none',
            border: `1px solid ${LINE}`,
            borderRadius: 9,
            padding: '12px 16px',
            cursor: 'pointer',
            color: MUTED,
            fontFamily: SANS,
            fontSize: 13.5,
            fontWeight: 500,
          }}
        >
          {showAll ? 'Show fewer' : `View all ${outcomes.length} options`}
        </button>
      )}
    </div>
  );
}

// ── disclosure panel ───────────────────────────────────────────────────────

function Disclosure({ label, children }) {
  const [open, setOpen] = useState(false);
  if (!children) return null;
  return (
    <div style={{ borderBottom: `1px solid ${LINE}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '20px 2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          color: WHITE,
          fontFamily: SANS,
          fontSize: 15.5,
          fontWeight: 500,
          textAlign: 'left',
        }}
      >
        {label}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={MUTED}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .16s ease', flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '0 2px 18px', color: MUTED, fontSize: 14.5, lineHeight: 1.7, maxWidth: '72ch' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────

export default function MarketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { market, loading, error } = useMarket(id);
  const { session } = useAuth();
  // useWallet exposes this as `balance`; aliasing rather than renaming so the
  // guard below actually receives a number instead of undefined.
  const { balance: buyingPower, refetch: refetchWallet } = useWallet();

  const [outcomeId, setOutcomeId] = useState(null);
  const [shares, setShares] = useState('100');
  const [range, setRange] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const outcomes = useMemo(() => (Array.isArray(market?.outcomes) ? market.outcomes : []), [market]);

  // Default to the leading side, which is what the reference quotes.
  useEffect(() => {
    if (!outcomeId && outcomes.length) {
      const lead = outcomes.reduce((a, b) => ((b.probability || 0) > (a?.probability || 0) ? b : a), null);
      setOutcomeId(lead?.id ?? outcomes[0].id);
    }
  }, [outcomes, outcomeId]);

  const selected = outcomes.find((o) => o.id === outcomeId) || null;
  const quote = quoteFor(selected);
  const { heading, sub } = splitHeading(market);

  const shareCount = Math.max(0, Math.floor(Number(shares) || 0));
  const cost = quote ? (shareCount * quote.price) / 100 : 0;
  const payout = shareCount;

  const isOpen = market?.status === 'active';
  const canAfford = buyingPower == null || cost <= buyingPower;

  async function submit() {
    if (!market || !selected || shareCount <= 0 || submitting) return;
    if (!canAfford) {
      setMsg(`Not enough buying power. This order costs $${cost.toFixed(2)}.`);
      return;
    }
    setSubmitting(true);
    setMsg('');
    try {
      await api.createPrediction({
        market_id: market.id,
        outcome_id: selected.id,
        stake_amount: Number(cost.toFixed(2)),
        odds_at_prediction: selected.probability || 50,
        user_id: session?.user?.id || 'demo_user',
      });
      setMsg(`Order filled. ${shareCount} ${quote.side} at ${quote.price}¢.`);
      window.dispatchEvent(new CustomEvent('dobium:trade'));
      if (session?.user?.id && session.user.id !== 'demo_user') await refetchWallet();
    } catch (err) {
      setMsg(err.message || 'That order did not go through. Nothing was charged.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ background: PAGE_BG, minHeight: '100vh', padding: 40, color: MUTED, fontFamily: SANS }}>
        Loading market…
      </div>
    );
  }

  if (error || !market) {
    return (
      <div style={{ background: PAGE_BG, minHeight: '100vh', padding: 40, fontFamily: SANS }}>
        <div style={{ color: WHITE, fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
          This market could not be loaded.
        </div>
        <div style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>
          {error || 'It may have been removed, or the link may be wrong.'}
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: `1px solid ${LINE}`,
            color: WHITE,
            borderRadius: 8,
            padding: '9px 15px',
            cursor: 'pointer',
            fontFamily: SANS,
            fontSize: 13.5,
          }}
        >
          Back to markets
        </button>
      </div>
    );
  }

  const disabled = submitting || !isOpen || shareCount <= 0;

  return (
    <div style={{ background: PAGE_BG, minHeight: '100vh', fontFamily: SANS }}>
      <div className="dbm-market-grid">
        {/* ── left column ── */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
            <div style={{ minWidth: 0, maxWidth: '40ch' }}>
              <h1 style={{ color: WHITE, fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: 0, lineHeight: 1.25 }}>
                {heading}
              </h1>
              {sub && <div style={{ color: MUTED, fontSize: 15, marginTop: 7 }}>{sub}</div>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.15em', color: DIM }}>VOLUME</div>
              <div style={{ fontFamily: MONO, fontSize: 15, color: WHITE, marginTop: 4 }}>
                {formatVolume(market.total_volume)}
              </div>
            </div>
          </div>

          {/* the quote */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 22, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: GOLD, alignSelf: 'center' }} />
              <span style={{ fontFamily: MONO, fontSize: 13, color: MUTED }}>{quote?.side} Price</span>
              <span style={{ fontFamily: MONO, fontSize: 16, color: WHITE, fontWeight: 600 }}>{quote?.price}¢</span>
              {quote?.hasBook && (
                <span style={{ fontFamily: MONO, fontSize: 12, color: DIM }}>
                  Bid {quote.bid}¢ · Ask {quote.ask}¢
                </span>
              )}
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: MUTED, fontSize: 12.5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M10 8.5l5 3.5-5 3.5z" fill={MUTED} stroke="none" />
              </svg>
              Dobium
            </span>
          </div>

          <div style={{ marginTop: 16 }}>
            <PriceChart history={market.price_history} outcomeId={outcomeId} fallbackPrice={quote?.price ?? 50} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: DIM }}>{formatVolume(market.total_volume)} vol</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '5px 9px',
                    borderRadius: 5,
                    fontFamily: MONO,
                    fontSize: 11.5,
                    letterSpacing: '.04em',
                    color: range === r ? WHITE : DIM,
                    fontWeight: range === r ? 600 : 400,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <OutcomeList
            outcomes={outcomes}
            selectedId={outcomeId}
            onSelect={(oid) => {
              setOutcomeId(oid);
              setMsg('');
            }}
          />

          {/* disclosures */}
          <div style={{ marginTop: 44, borderTop: `1px solid ${LINE}` }}>
            <Disclosure label="About this market">
              {market.description || 'No description has been published for this market yet.'}
            </Disclosure>

            <Disclosure label="Resolution">
              <p style={{ margin: '0 0 12px' }}>
                {market.description || 'Resolution criteria have not been published for this market yet.'}
              </p>
              {fmtDate(market.resolution_date) && (
                <p style={{ margin: 0, color: DIM }}>
                  The contract resolves on {fmtDate(market.resolution_date)}. Each share of the winning outcome pays
                  $1.00; losing shares pay nothing.
                </p>
              )}
            </Disclosure>

            <Disclosure label="Trading hours">
              <p style={{ margin: '0 0 8px' }}>Open continuously until this market closes.</p>
              {fmtDate(market.close_date) && (
                <p style={{ margin: 0, color: DIM }}>Trading closes {fmtDate(market.close_date)}.</p>
              )}
            </Disclosure>
          </div>
        </div>

        {/* ── order panel ── */}
        <aside style={{ minWidth: 0 }}>
          <div style={{ background: PANEL_BG, border: `1px solid ${LINE}`, borderRadius: 12, padding: 22, position: 'sticky', top: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: WHITE, fontFamily: SANS, fontSize: 17, fontWeight: 600, minWidth: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Buy {quote?.side}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 17, color: GOLD, fontWeight: 600 }}>{quote?.price}¢</span>
            </div>

            {!isOpen && (
              <div
                style={{
                  marginTop: 16,
                  border: `1px solid ${LINE}`,
                  borderRadius: 9,
                  padding: '11px 13px',
                  color: MUTED,
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
              >
                This market has closed and is awaiting resolution. Trading is disabled.
              </div>
            )}

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: PAGE_BG,
                border: `1px solid ${LINE}`,
                borderRadius: 9,
                padding: '14px 15px',
                marginTop: 20,
              }}
            >
              <span style={{ color: MUTED, fontSize: 14.5 }}>Shares</span>
              <input
                type="number"
                min="1"
                step="1"
                value={shares}
                onChange={(e) => {
                  setShares(e.target.value);
                  setMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  textAlign: 'right',
                  color: WHITE,
                  fontFamily: MONO,
                  fontSize: 15,
                  width: 95,
                }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
              <span style={{ color: MUTED, fontSize: 14.5 }}>Estimated Cost</span>
              <span style={{ fontFamily: MONO, fontSize: 14.5, color: WHITE }}>${cost.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 15 }}>
              <span style={{ color: MUTED, fontSize: 14.5 }}>If {quote?.side} wins</span>
              <span style={{ fontFamily: MONO, fontSize: 22, color: GOLD, fontWeight: 600 }}>${payout.toFixed(2)}</span>
            </div>

            <button
              onClick={submit}
              disabled={disabled}
              style={{
                width: '100%',
                marginTop: 20,
                padding: '14px 16px',
                borderRadius: 9,
                border: 'none',
                background: disabled ? '#5C5236' : GOLD_BTN,
                color: ON_GOLD,
                fontFamily: SANS,
                fontSize: 15.5,
                fontWeight: 600,
                cursor: disabled ? 'default' : 'pointer',
              }}
            >
              {!isOpen ? 'Market closed' : submitting ? 'Placing order…' : 'Confirm Order'}
            </button>

            {msg && <div style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.5, color: MUTED }}>{msg}</div>}
          </div>
        </aside>
      </div>

      <style>{`
        .dbm-market-grid {
          max-width: 1240px;
          margin: 0 auto;
          padding: 38px 28px 80px;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 28px;
        }
        @media (min-width: 900px) {
          .dbm-market-grid {
            grid-template-columns: minmax(0, 1fr) 340px;
            gap: 52px;
          }
        }
      `}</style>
    </div>
  );
}
