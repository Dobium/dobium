import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarket } from '../hooks/useMarkets';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { api } from '../api/client';

// ── Market detail page ─────────────────────────────────────────────────────
//
// Built to the reference: breadcrumb and volume, title over question, a legend
// of the live contracts, one multi-series chart, a "Select a contract" list,
// and a Timeline. The order ticket sits to the right.
//
// What this page deliberately doesn't do, carried over from the last rebuild:
// no YES-in-green beside NO-in-red pill pair, no "Chance of Yes 86%" (a price
// is shown instead of odds), and no feed of other people's trades.

const PAGE_BG = '#00132D';
const PANEL_BG = '#091934';
const ROW_BG = '#051732';
const LINE = '#0E2744';
// Dividers *inside* the ticket sit only a few shades off the panel. Using the
// same LINE as the outer border made them roughly three times too bright
// against the panel fill, which read as the card being the wrong colour.
const TICKET_LINE = '#0B1D3A';
const HAIRLINE = '#122E50';
const WHITE = '#FFFFFF';
const MUTED = '#7E91A8';
const DIM = '#62778F';
const GOLD = '#FFDF9B';
const ON_GOLD = '#00132D';

// The selected contract is always gold; the rest cycle. Sampled off the
// reference legend.
const SERIES = ['#FF7068', '#00E475', '#6FA8FF', '#C792EA', '#FFB454', '#4DD0E1'];

const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const SANS = "'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif";

const RANGES = ['1D', '1W', '1M', '3M', 'ALL'];

// ── helpers ────────────────────────────────────────────────────────────────

const cents = (p) => Math.min(99, Math.max(1, Math.round(Number(p) || 0)));
const outcomeLabel = (o) => String(o?.name || o?.title || '').trim() || 'YES';

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

// The reference header is a short subject over a short question ("Penn State —
// 2027 CFP" / "Win the championship?"). That needs a short_title on the market.
// Where one exists we use it; otherwise the full question is the heading.
function splitHeading(market) {
  if (!market) return { heading: '', sub: null };
  if (market.short_title) return { heading: market.short_title, sub: market.subtitle || market.title };
  if (market.subtitle) return { heading: market.title, sub: market.subtitle };
  return { heading: String(market.title || '').trim(), sub: null };
}

// ── chart ──────────────────────────────────────────────────────────────────

function PriceChart({ history, series, fallback }) {
  const W = 640;
  const H = 220;
  const PAD_R = 40;
  const PAD_B = 24;

  const lines = useMemo(() => {
    const hasHistory = Array.isArray(history) && history.length >= 2;
    return series.map((s) => ({
      ...s,
      points: hasHistory
        ? history.map((snap) => ({ t: snap.timestamp, v: Number(snap.prices?.[s.id] ?? s.price) || 0 }))
        // A market with no trades yet is a flat line at its opening price.
        // Drawing a squiggle would be showing price action that never happened.
        : [{ t: null, v: s.price }, { t: null, v: s.price }],
    }));
  }, [history, series]);

  const all = lines.flatMap((l) => l.points.map((p) => p.v));
  const rawMin = all.length ? Math.min(...all) : fallback;
  const rawMax = all.length ? Math.max(...all) : fallback;

  const niceStep = (r) => [1, 2, 5, 10, 20, 25, 50].find((n) => r / n <= 4) ?? 100;
  const breathe = Math.max(2.5, (rawMax - rawMin) * 0.45) / 2;
  const step = niceStep(Math.min(100, rawMax + breathe) - Math.max(0, rawMin - breathe));
  const lo = Math.max(0, Math.floor((rawMin - breathe) / step) * step);
  const hi = Math.min(100, Math.ceil((rawMax + breathe) / step) * step);
  const span = Math.max(step, hi - lo);

  const plotW = W - PAD_R;
  const plotH = H - PAD_B;
  const n = lines[0]?.points.length || 2;
  const x = (i) => (n === 1 ? 0 : (i / (n - 1)) * plotW);
  const y = (v) => plotH - ((v - lo) / span) * plotH;

  const gridlines = [];
  for (let v = lo; v <= hi + 0.001; v += step) gridlines.push(Math.round(v));

  const xTicks = [];
  const stamps = lines[0]?.points || [];
  if (stamps[0]?.t) {
    const k = Math.min(5, stamps.length);
    for (let i = 0; i < k; i += 1) {
      const idx = Math.round((i / Math.max(1, k - 1)) * (stamps.length - 1));
      const dt = new Date(stamps[idx].t);
      if (!Number.isNaN(dt.getTime())) {
        xTicks.push({ x: x(idx), label: dt.toLocaleDateString('en-US', { month: 'short' }) });
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      {gridlines.map((v) => (
        <g key={v}>
          <line x1="0" x2={plotW} y1={y(v)} y2={y(v)} stroke={HAIRLINE} strokeWidth="1" />
          <text x={plotW + 8} y={y(v) + 3.5} fill={DIM} fontSize="10" fontFamily={MONO}>
            {v}%
          </text>
        </g>
      ))}

      {lines.map((l) => {
        const d = l.points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
        return (
          <g key={l.id}>
            <path
              d={d}
              fill="none"
              stroke={l.color}
              strokeWidth={l.selected ? 2 : 1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={l.selected ? 1 : 0.75}
            />
            {l.selected && <circle cx={x(l.points.length - 1)} cy={y(l.points.at(-1).v)} r="3.5" fill={l.color} />}
          </g>
        );
      })}

      {xTicks.map((t, i) => (
        <text key={i} x={t.x} y={H - 6} fill={DIM} fontSize="10" fontFamily={MONO} textAnchor={i === 0 ? 'start' : 'middle'}>
          {t.label}
        </text>
      ))}
    </svg>
  );
}

// ── ticket row ─────────────────────────────────────────────────────────────

function Row({ label, sub, info, children, last }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '13px 18px',
        borderBottom: last ? 'none' : `1px solid ${TICKET_LINE}`,
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: MUTED, fontSize: 13 }}>
          {label}
          {info && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={DIM} strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-5M12 8h.01" strokeLinecap="round" />
            </svg>
          )}
        </span>
        {sub && <span style={{ display: 'block', color: DIM, fontFamily: MONO, fontSize: 10, marginTop: 3 }}>{sub}</span>}
      </span>
      <span style={{ flexShrink: 0 }}>{children}</span>
    </div>
  );
}

// ── timeline ───────────────────────────────────────────────────────────────

function Timeline({ items }) {
  return (
    <div style={{ marginTop: 34 }}>
      <h2 style={{ color: WHITE, fontSize: 14.5, fontWeight: 600, margin: '0 0 16px' }}>Timeline</h2>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((it, i) => (
          <div key={it.label} style={{ display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: GOLD, marginTop: 5 }} />
              {i < items.length - 1 && <span style={{ width: 1, flex: 1, background: LINE, marginTop: 4 }} />}
            </div>
            <div style={{ paddingBottom: i < items.length - 1 ? 20 : 0, minWidth: 0 }}>
              <div style={{ color: WHITE, fontSize: 13, fontWeight: 600 }}>{it.label}</div>
              <div style={{ color: MUTED, fontSize: 12.5, marginTop: 3, lineHeight: 1.5 }}>{it.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────

export default function MarketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { market, loading, error } = useMarket(id);
  const { session, openAuthModal } = useAuth();
  const { balance: buyingPower, refetch: refetchWallet } = useWallet();

  const [outcomeId, setOutcomeId] = useState(null);
  const [shares, setShares] = useState('100');
  const [range, setRange] = useState('ALL');
  const [showAll, setShowAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const outcomes = useMemo(() => (Array.isArray(market?.outcomes) ? market.outcomes : []), [market]);

  useEffect(() => {
    if (!outcomeId && outcomes.length) {
      const lead = outcomes.reduce((a, b) => ((b.probability || 0) > (a?.probability || 0) ? b : a), null);
      setOutcomeId(lead?.id ?? outcomes[0].id);
    }
  }, [outcomes, outcomeId]);

  const selected = outcomes.find((o) => o.id === outcomeId) || null;
  const price = selected ? cents(selected.probability) : 50;
  const { heading, sub } = splitHeading(market);

  // A NO contract only exists where the market carries the opposite leg. On a
  // field of 21 teams there is nothing to sell, so no No tab is offered.
  const binary = outcomes.length === 2;
  const complement = binary ? outcomes.find((o) => o.id !== outcomeId) : null;
  const sideName = binary ? outcomeLabel(selected).toUpperCase() : 'YES';

  // The reference quotes the opposite side of the selected contract: Penn State
  // at 5c shows "NO Price 95c". Bid/ask only where the market carries a book.
  const rawBid = Number(selected?.best_bid ?? selected?.bid);
  const rawAsk = Number(selected?.best_ask ?? selected?.ask);
  const hasBook = Number.isFinite(rawBid) && Number.isFinite(rawAsk);
  const noPrice = 100 - price;

  // Legend and chart share one list so a colour can't mean two things.
  const legend = useMemo(() => {
    const ranked = [...outcomes].sort((a, b) => (b.probability || 0) - (a.probability || 0)).slice(0, 4);
    if (selected && !ranked.some((o) => o.id === selected.id)) ranked[ranked.length - 1] = selected;
    let c = 0;
    return ranked.map((o) => ({
      id: o.id,
      name: outcomeLabel(o),
      price: cents(o.probability),
      selected: o.id === outcomeId,
      color: o.id === outcomeId ? GOLD : SERIES[c++ % SERIES.length],
    }));
  }, [outcomes, outcomeId, selected]);

  const shareCount = Math.max(0, Math.floor(Number(shares) || 0));
  const cost = (shareCount * price) / 100;
  const payout = shareCount;

  const isOpen = market?.status === 'active';
  const signedIn = Boolean(session?.user?.id);
  const canAfford = buyingPower == null || cost <= buyingPower;
  const disabled = submitting || !isOpen || shareCount <= 0;

  async function submit() {
    if (!signedIn) {
      openAuthModal('signup');
      return;
    }
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
        user_id: session.user.id,
      });
      setMsg(`Order filled. ${shareCount} ${outcomeLabel(selected)} at ${price}¢.`);
      window.dispatchEvent(new CustomEvent('dobium:trade'));
      await refetchWallet();
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
        <div style={{ color: WHITE, fontSize: 17, fontWeight: 600, marginBottom: 8 }}>This market could not be loaded.</div>
        <div style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>
          {error || 'It may have been removed, or the link may be wrong.'}
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: `1px solid ${LINE}`, color: WHITE, borderRadius: 8,
            padding: '9px 15px', cursor: 'pointer', fontFamily: SANS, fontSize: 13.5,
          }}
        >
          Back to markets
        </button>
      </div>
    );
  }

  const titleCase = (t) =>
    String(t).replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1));
  const crumbs = ['Prediction markets', market.category && titleCase(market.category), market.short_title]
    .filter(Boolean);
  const contracts = showAll || outcomes.length <= 8 ? outcomes : outcomes.slice(0, 8);

  const timeline = [
    { label: 'Trading hours', value: '24 hours a day, except Thursday 3AM-5AM ET' },
    fmtDate(market.close_date) && { label: 'Event day', value: fmtDate(market.close_date) },
    { label: 'Contract resolves', value: 'Determines the outcome of the contract' },
    { label: 'Payout', value: 'Usually within 1 hour of event resolution' },
  ].filter(Boolean);

  return (
    <div style={{ background: PAGE_BG, minHeight: '100vh', fontFamily: SANS }}>
      <div className="dbm-market-grid">
        {/* ── left column ── */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20 }}>
            <span style={{ color: DIM, fontSize: 11.5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {crumbs.join('  /  ')}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.15em', color: DIM }}>VOLUME</span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: WHITE }}>{formatVolume(market.total_volume)}</span>
            </span>
          </div>

          <h1 style={{ color: WHITE, fontSize: 26, fontWeight: 600, letterSpacing: '-.02em', margin: '10px 0 0', lineHeight: 1.25, maxWidth: '34ch' }}>
            {heading}
          </h1>
          {sub && <div style={{ color: MUTED, fontSize: 14, marginTop: 6 }}>{sub}</div>}

          {/* contract legend — same colours the chart uses */}
          {legend.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', marginTop: 16 }}>
              {legend.map((l) => (
                <span key={l.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: l.color, flexShrink: 0 }} />
                  <span style={{ color: MUTED, fontSize: 12.5 }}>{l.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12.5, color: WHITE, fontWeight: 600 }}>{l.price}¢</span>
                </span>
              ))}
            </div>
          )}

          {/* the quote */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: GOLD, alignSelf: 'center' }} />
              <span style={{ fontFamily: MONO, fontSize: 12, color: MUTED }}>NO Price</span>
              <span style={{ fontFamily: MONO, fontSize: 14, color: WHITE, fontWeight: 600 }}>{noPrice}¢</span>
              {hasBook && (
                <span style={{ fontFamily: MONO, fontSize: 11, color: DIM }}>
                  Bid {cents(100 - rawAsk)}¢ · Ask {cents(100 - rawBid)}¢
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

          <div style={{ marginTop: 14 }}>
            <PriceChart
              history={market.price_history}
              series={binary ? legend.filter((l) => l.selected) : legend}
              fallback={price}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 11.5, color: DIM }}>{formatVolume(market.total_volume)} vol</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '5px 8px', borderRadius: 5,
                    fontFamily: MONO, fontSize: 11, letterSpacing: '.04em',
                    color: range === r ? WHITE : DIM, fontWeight: range === r ? 600 : 400,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* ── select a contract ── */}
          <div style={{ marginTop: 34 }}>
            <h2 style={{ color: WHITE, fontSize: 14.5, fontWeight: 600, margin: '0 0 14px' }}>Select a contract</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contracts.map((o) => {
                const on = o.id === outcomeId;
                return (
                  <button
                    key={o.id}
                    onClick={() => { setOutcomeId(o.id); setMsg(''); }}
                    aria-pressed={on}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      background: on ? PANEL_BG : ROW_BG,
                      border: `1px solid ${on ? GOLD : LINE}`,
                      borderRadius: 9, padding: '15px 16px', cursor: 'pointer',
                      textAlign: 'left', fontFamily: SANS,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                      <span style={{ color: WHITE, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {outcomeLabel(o)}
                      </span>
                      {on && (
                        <span
                          style={{
                            fontFamily: MONO, fontSize: 8, letterSpacing: '.07em', color: GOLD,
                            border: `1px solid ${GOLD}44`, borderRadius: 3, padding: '2px 5px', flexShrink: 0,
                          }}
                        >
                          SELECTED
                        </span>
                      )}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 13.5, color: WHITE, flexShrink: 0 }}>{cents(o.probability)}¢</span>
                  </button>
                );
              })}
            </div>
            {outcomes.length > 8 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                style={{
                  width: '100%', marginTop: 8, background: 'none', border: `1px solid ${LINE}`,
                  borderRadius: 9, padding: '12px 16px', cursor: 'pointer',
                  color: MUTED, fontFamily: SANS, fontSize: 13, fontWeight: 500,
                }}
              >
                {showAll ? 'Show fewer' : `View all ${outcomes.length} contracts`}
              </button>
            )}
          </div>

          <Timeline items={timeline} />
        </div>

        {/* ── order ticket ── */}
        <aside style={{ minWidth: 0 }}>
          <div style={{ background: PANEL_BG, border: `1px solid ${LINE}`, borderRadius: 12, position: 'sticky', top: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '16px 18px' }}>
              <span style={{ color: WHITE, fontSize: 15, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected ? outcomeLabel(selected) : '—'}
              </span>
              {(market.short_title || market.category) && (
                <span
                  style={{
                    fontFamily: MONO, fontSize: 9, letterSpacing: '.06em', color: GOLD,
                    border: `1px solid ${GOLD}44`, borderRadius: 4, padding: '3px 7px', flexShrink: 0,
                  }}
                >
                  {String(market.short_title || market.category).toUpperCase()}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 18, padding: '0 18px' }}>
              {(complement ? ['Yes', 'No'] : ['Yes']).map((t) => {
                const on = sideName === t.toUpperCase();
                return (
                  <button
                    key={t}
                    onClick={() => { if (complement && !on) setOutcomeId(complement.id); setMsg(''); }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px',
                      color: on ? GOLD : MUTED, fontFamily: SANS, fontSize: 13.5, fontWeight: 600,
                      borderBottom: `2px solid ${on ? GOLD : 'transparent'}`, marginBottom: -1,
                    }}
                  >
                    Buy {t}
                  </button>
                );
              })}
            </div>

            <Row label="Quantity">
              <input
                type="number" min="1" step="1" value={shares}
                onChange={(e) => { setShares(e.target.value); setMsg(''); }}
                style={{
                  background: PAGE_BG, border: `1px solid ${LINE}`, borderRadius: 7, outline: 'none',
                  textAlign: 'right', color: WHITE, fontFamily: MONO, fontSize: 13.5, width: 78, padding: '7px 10px',
                }}
              />
            </Row>

            <Row label="Price" info>
              <span style={{ fontFamily: MONO, fontSize: 14, color: WHITE }}>{price}¢</span>
            </Row>

            <Row label="Est. cost" sub="$0.00 commissions & fees">
              <span style={{ fontFamily: MONO, fontSize: 14, color: WHITE }}>${cost.toFixed(2)}</span>
            </Row>

            <Row label={`Payout if ${selected ? outcomeLabel(selected) : 'this'} is correct`} last>
              <span style={{ fontFamily: MONO, fontSize: 15, color: WHITE, fontWeight: 600 }}>${payout.toFixed(2)}</span>
            </Row>

            <div style={{ padding: '4px 18px 18px' }}>
              {!isOpen && (
                <div style={{ border: `1px solid ${TICKET_LINE}`, borderRadius: 8, padding: '10px 12px', marginBottom: 12, color: MUTED, fontSize: 12, lineHeight: 1.5 }}>
                  This market has closed and is awaiting resolution. Trading is disabled.
                </div>
              )}
              <button
                onClick={submit}
                disabled={disabled}
                style={{
                  width: '100%', padding: '13px 16px', borderRadius: 9, border: 'none',
                  background: disabled ? '#5C5236' : GOLD, color: ON_GOLD,
                  fontFamily: SANS, fontSize: 14.5, fontWeight: 600,
                  cursor: disabled ? 'default' : 'pointer',
                }}
              >
                {!isOpen ? 'Market closed' : submitting ? 'Placing order…' : signedIn ? 'Confirm Order' : 'Sign up to trade'}
              </button>
              {msg && <div style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.5, color: MUTED }}>{msg}</div>}
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .dbm-market-grid {
          max-width: 1240px;
          margin: 0 auto;
          padding: 30px 28px 80px;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 28px;
        }
        @media (min-width: 900px) {
          .dbm-market-grid {
            grid-template-columns: minmax(0, 1fr) 330px;
            gap: 52px;
          }
        }
      `}</style>
    </div>
  );
}
