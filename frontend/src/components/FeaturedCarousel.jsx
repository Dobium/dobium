import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { bucketLabel } from '../lib/categories';

// Featured trending carousel — the homepage centerpiece.
// Rotates through the hottest markets (is_trending flag first, then volume):
// outcomes mini-table + volume on the left, price chart + legend on the right,
// market context blurb along the bottom. Matches the approved mockup.

const LINE_COLORS = ['#4AE176', '#5CC8FF', '#C792EA'];

function isBinary(outcomes) {
  if (outcomes.length !== 2) return false;
  const t = outcomes.map((o) => (o.title || '').toLowerCase());
  return t.some((x) => x.startsWith('yes')) && t.some((x) => x.startsWith('no'));
}

function topOutcomes(market) {
  const sorted = [...(market.outcomes || [])].sort((a, b) => (b.probability || 0) - (a.probability || 0));
  if (isBinary(sorted)) {
    const yes = sorted.find((o) => (o.title || '').toLowerCase().startsWith('yes')) || sorted[0];
    return { rows: [yes], hidden: 0, binary: true };
  }
  return { rows: sorted.slice(0, 3), hidden: Math.max(0, sorted.length - 3), binary: false };
}

function historyFor(market, outcome) {
  const h = market.price_history || [];
  if (h.length >= 2) {
    const data = h.map((snap) => snap.prices?.[outcome.id] ?? outcome.probability ?? 50);
    data.push(outcome.probability ?? 50);
    return data;
  }
  const p = outcome.probability ?? 50;
  return [p, p];
}

const navBtn = {
  width: 30, height: 30, borderRadius: 999, background: 'transparent',
  border: '1px solid #2A3A57', color: '#C3CBDE', cursor: 'pointer',
  fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// No outcome artwork exists in the repo, so avatars are tinted monogram discs.
const AVATAR_TINTS = [
  ['#2E4A6B', '#4B7BA8'], ['#4B3A6B', '#6E5AA8'], ['#6B4A2E', '#A87B4B'],
  ['#2E6B55', '#4BA882'], ['#6B2E45', '#A84B6E'],
];

function MiniChart({ market, outcomes }) {
  const W = 420; const H = 260; const PAD = 8; const AXIS = 40;
  const series = outcomes.map((o, i) => ({
    id: o.id,
    color: LINE_COLORS[i % LINE_COLORS.length],
    data: historyFor(market, o),
  }));
  const plotW = W - PAD * 2 - AXIS;
  const path = (data) => {
    const n = data.length;
    return data
      .map((v, i) => {
        const x = PAD + (i / (n - 1)) * plotW;
        const y = PAD + (1 - v / 100) * (H - PAD * 2);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const hist = market.price_history || [];
  const firstDate = hist[0]?.timestamp ? new Date(hist[0].timestamp) : null;
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: 'auto' }}>
        {/* Dobium watermark, like the mockup */}
        <text x={W - AXIS - 10} y={28} textAnchor="end" fontSize="17" fontWeight="800" letterSpacing="1.5"
          fill="#3B4954" fontFamily="Hanken Grotesk, sans-serif">DOBIUM</text>
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <g key={r}>
            <line x1={PAD} x2={PAD + plotW} y1={PAD + r * (H - PAD * 2)} y2={PAD + r * (H - PAD * 2)}
              stroke="#12294A" strokeWidth="0.6" strokeDasharray="3,4" opacity="0.45" />
            <text x={PAD + plotW + 8} y={PAD + r * (H - PAD * 2)} dominantBaseline="middle"
              fontSize="9.5" fill="#8E94AF" fontFamily="JetBrains Mono, monospace">
              {Math.round((1 - r) * 100)}%
            </text>
          </g>
        ))}
        {series.map((sr) => {
          const n = sr.data.length;
          const lastX = PAD + plotW;
          const lastY = PAD + (1 - sr.data[n - 1] / 100) * (H - PAD * 2);
          return (
            <g key={sr.id}>
              <path d={path(sr.data)} fill="none" stroke={sr.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={lastX} cy={lastY} r="3.2" fill={sr.color} />
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9.5, color: '#8E94AF', padding: '2px 4px 0' }}>
        <span>{firstDate ? fmt(firstDate) : ''}</span>
        <span>{fmt(new Date())}</span>
      </div>
    </div>
  );
}

export default function FeaturedCarousel({ markets }) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [newsByMarket, setNewsByMarket] = useState({});
  const timer = useRef(null);

  // Newest first — the carousel is the "what's happening right now" surface
  // Rank by what makes a slide worth looking at, not just recency. Sorting by
  // created_at alone surfaced brand-new markets with a single outcome, $0
  // volume and a flat 50% line — which is what the carousel was showing.
  // Traded markets come first, then richer multi-outcome ones, then recency as
  // the tie-break so a quiet catalogue still fills all seven slides.
  const featured = [...markets]
    .filter((m) => m.status === 'active' && (m.outcomes || []).length > 0)
    .sort((a, b) => {
      const vol = (Number(b.total_volume) || 0) - (Number(a.total_volume) || 0);
      if (vol !== 0) return vol;
      const outs = (b.outcomes || []).length - (a.outcomes || []).length;
      if (outs !== 0) return outs;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    })
    .slice(0, 7);

  const count = featured.length;

  useEffect(() => {
    if (count < 2) return undefined;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % count), 10000);
    return () => clearInterval(timer.current);
  }, [count]);

  // NOTE: every hook must run before the `count === 0` early return below.
  // markets arrives empty on first paint and populates after the fetch, so a
  // hook placed after that return runs 4 hooks then 5 — React throws
  // "Rendered more hooks than during the previous render" and unmounts.
  const market = count > 0 ? featured[Math.min(idx, count - 1)] : null;

  // Fetch one real headline per slide (cached per market for the session)
  useEffect(() => {
    if (!market?.id || newsByMarket[market.id] !== undefined) return undefined;
    let alive = true;
    api.getMarketNews(market.id)
      .then((r) => { if (alive) setNewsByMarket((prev) => ({ ...prev, [market.id]: (r?.items || [])[0] || null })); })
      .catch(() => { if (alive) setNewsByMarket((prev) => ({ ...prev, [market.id]: null })); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market?.id]);

  if (count === 0 || !market) return null;

  const { rows, hidden, binary } = topOutcomes(market);
  const chartOutcomes = rows.slice(0, 2);

  const go = (dir) => {
    setIdx((i) => (i + dir + count) % count);
    if (timer.current) { clearInterval(timer.current); timer.current = setInterval(() => setIdx((i2) => (i2 + 1) % count), 10000); }
  };

  const headline = newsByMarket[market.id];
  const blurb = headline
    ? `${headline.title} — ${headline.source}`
    : (market.description || '').replace(/\s+/g, ' ').trim();
  const blurbLabel = headline ? 'NEWS' : 'ABOUT';

  const leaderProb = Math.max(...rows.map((o) => Number(o.probability) || 0), 0);

  return (
    <div
      onClick={() => navigate(`/markets/${market.id}`)}
      style={{
        margin: '0 auto', textAlign: 'left', cursor: 'pointer',
        background: '#0A2342', border: '1px solid #0A2342', borderRadius: 10,
        padding: '18px 22px 20px',
      }}
    >
      {/* Header: tags left, pagination right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 11 }}>
        <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 11, color: '#FFFFFF', background: '#2563EB', borderRadius: 5, padding: '4px 9px' }}>
          Trending Attention &amp; News
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', color: '#2A1F00', background: '#FFDF9B', borderRadius: 5, padding: '4px 9px' }}>
          SECTOR: {bucketLabel(market.category).toUpperCase()}
        </span>

        {count > 1 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => go(-1)} aria-label="Previous market" style={navBtn}>‹</button>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#C3CBDE' }}>{Math.min(idx, count - 1) + 1} of {count}</span>
            <button onClick={() => go(1)} aria-label="Next market" style={navBtn}>›</button>
          </div>
        )}
      </div>

      <h3 style={{ color: '#FFFFFF', fontFamily: 'var(--wordmark)', fontSize: 'clamp(16.5px, 1.7vw, 22px)', fontWeight: 800, margin: '0 0 9px', lineHeight: 1.2 }}>
        {market.title}
      </h3>

      {/* Status line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap', marginBottom: 13, fontFamily: 'var(--mono)', fontSize: 10.5 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#FF8A8A' }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: '#FF8A8A' }} />LIVE
        </span>
        <span style={{ color: '#C3CBDE' }}>{rows.length + hidden} outcome{rows.length + hidden === 1 ? '' : 's'}</span>
        <span style={{ color: '#C3CBDE' }}>${(market.total_volume || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} vol</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
        {/* Left: outcome rows + news blurb */}
        <div style={{ flex: '1 1 200px', minWidth: 190, display: 'flex', flexDirection: 'column' }}>
          {/* Column headers, per the Kalshi reference — the multiplier and
              percentage columns were previously unlabelled. */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '0 0 6px',
            borderBottom: '1px solid rgba(42,58,87,.55)',
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.06em', color: '#8E94AF',
          }}>
            <span style={{ width: 28, flexShrink: 0 }} aria-hidden="true" />
            <span style={{ flex: 1, minWidth: 0 }}>Market</span>
            <span style={{ flexShrink: 0 }}>Pays out</span>
            <span style={{ flexShrink: 0, minWidth: 54, textAlign: 'center' }}>Odds</span>
          </div>

          {rows.map((o, i) => {
            const p = Number(o.probability) || 0;
            const mult = p > 0 ? (100 / p).toFixed(2) : null;
            const lead = p >= leaderProb && p > 0;
            return (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
                <span style={{
                  width: 31, height: 31, borderRadius: 999, flexShrink: 0,
                  background: `linear-gradient(145deg, ${AVATAR_TINTS[i % AVATAR_TINTS.length][0]}, ${AVATAR_TINTS[i % AVATAR_TINTS.length][1]})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 11, color: 'rgba(255,255,255,.85)',
                }}>{(o.title || '?').trim().charAt(0).toUpperCase()}</span>

                <span style={{ flex: 1, minWidth: 0, color: '#FFFFFF', fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 12.5, lineHeight: 1.3 }}>
                  {o.title}
                </span>

                {mult && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: '#8E94AF', flexShrink: 0 }}>{mult}x</span>
                )}

                <span style={{
                  flexShrink: 0, minWidth: 52, textAlign: 'center',
                  fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 12,
                  color: lead ? '#4BE176' : '#DCE1FF',
                  border: `1px solid ${lead ? 'rgba(75,225,118,.55)' : '#2A3A57'}`,
                  borderRadius: 999, padding: '5px 10px',
                }}>{Math.round(p)}%</span>
              </div>
            );
          })}

          {hidden > 0 && (
            <div style={{ textAlign: 'right', marginTop: 4 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: '#8E94AF' }}>{hidden} more</span>
            </div>
          )}

          {blurb && (
            <p style={{ margin: '14px 0 0', paddingTop: 12, borderTop: '1px solid rgba(45,52,76,.6)', fontSize: 11.5, lineHeight: 1.65, color: '#8E94AF' }}>
              <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 13.5, marginRight: 7, color: '#FFFFFF' }}>{blurbLabel === 'NEWS' ? 'News' : 'About'}</span>
              · {blurb.length > 190 ? `${blurb.slice(0, 190)}…` : blurb}
            </p>
          )}
        </div>

        {/* Right: legend + chart */}
        <div style={{ flex: '1.5 1 260px', minWidth: 215 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginBottom: 10 }}>
            {chartOutcomes.map((o, i) => (
              <span key={o.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--wordmark)', fontSize: 11, color: '#DCE1FF' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: LINE_COLORS[i % LINE_COLORS.length], display: 'inline-block' }} />
                <span style={{ maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
                <span style={{ color: LINE_COLORS[i % LINE_COLORS.length], fontWeight: 800 }}>{(o.probability || 0).toFixed(1)}%</span>
              </span>
            ))}
          </div>
          <MiniChart market={market} outcomes={chartOutcomes} />
        </div>
      </div>

    </div>
  );
}
