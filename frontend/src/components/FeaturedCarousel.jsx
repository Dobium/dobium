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

function MiniChart({ market, outcomes }) {
  const W = 420; const H = 210; const PAD = 8; const AXIS = 40;
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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: 230 }}>
        {/* Dobium watermark, like the mockup */}
        <text x={W - AXIS - 10} y={26} textAnchor="end" fontSize="15" fontWeight="700"
          fill="#DCE1FF" opacity="0.10" fontFamily="Hanken Grotesk, sans-serif">Dobium</text>
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <g key={r}>
            <line x1={PAD} x2={PAD + plotW} y1={PAD + r * (H - PAD * 2)} y2={PAD + r * (H - PAD * 2)}
              stroke="#2D344C" strokeWidth="0.6" strokeDasharray="3,4" opacity="0.45" />
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
  const featured = [...markets]
    .filter((m) => m.status === 'active' && (m.outcomes || []).length > 0)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 7);

  const count = featured.length;

  useEffect(() => {
    if (count < 2) return undefined;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % count), 10000);
    return () => clearInterval(timer.current);
  }, [count]);

  if (count === 0) return null;

  const market = featured[Math.min(idx, count - 1)];
  const { rows, hidden, binary } = topOutcomes(market);
  const chartOutcomes = rows.slice(0, 2);

  const go = (dir) => {
    setIdx((i) => (i + dir + count) % count);
    if (timer.current) { clearInterval(timer.current); timer.current = setInterval(() => setIdx((i2) => (i2 + 1) % count), 10000); }
  };

  // Fetch one real headline per slide (cached per market for the session)
  useEffect(() => {
    if (!market?.id || newsByMarket[market.id] !== undefined) return;
    let alive = true;
    api.getMarketNews(market.id)
      .then((r) => { if (alive) setNewsByMarket((prev) => ({ ...prev, [market.id]: (r?.items || [])[0] || null })); })
      .catch(() => { if (alive) setNewsByMarket((prev) => ({ ...prev, [market.id]: null })); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market?.id]);

  const headline = newsByMarket[market.id];
  const blurb = headline
    ? `${headline.title} — ${headline.source}`
    : (market.description || '').replace(/\s+/g, ' ').trim();
  const blurbLabel = headline ? 'NEWS' : 'ABOUT';

  return (
    <div
      onClick={() => navigate(`/markets/${market.id}`)}
      style={{
        margin: '0 auto', textAlign: 'left', cursor: 'pointer',
        background: '#181E36', border: '1px solid #33312E', borderRadius: 8,
        padding: '26px 30px 24px', minHeight: 330,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 34 }}>
        {/* Left: tag, title, outcomes table, volume */}
        <div style={{ flex: '1.05 1 340px', minWidth: 300, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#D2C5AF', background: '#2D344C', borderRadius: 3, padding: '4px 9px' }}>
            {bucketLabel(market.category)}
          </span>
          <h3 style={{ color: '#DCE1FF', fontSize: 19, fontWeight: 600, margin: '14px 0 18px', lineHeight: 1.4 }}>
            {market.title}
          </h3>

          {/* Outcomes mini-table */}
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>
            <div style={{ display: 'flex', color: '#948D87', fontSize: 10, paddingBottom: 7, borderBottom: '1px solid rgba(45,52,76,.7)' }}>
              <span style={{ flex: 2.1 }}>{binary ? 'Outcome' : 'Market'}</span>
              <span style={{ flex: 0.8, textAlign: 'center' }}>Yes</span>
              <span style={{ flex: 0.8, textAlign: 'center' }}>No</span>
              <span style={{ flex: 1.1, textAlign: 'right' }} />
            </div>
            {rows.map((o) => {
              const p = Math.round(o.probability || 0);
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(45,52,76,.35)' }}>
                  <span style={{ flex: 2.1, color: '#DCE1FF', fontFamily: 'var(--wordmark)', fontSize: 13.5, paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.title}
                  </span>
                  <span style={{ flex: 0.8, textAlign: 'center' }}>
                    <span style={{ background: '#1D323D', color: '#48D773', borderRadius: 3, padding: '3px 8px' }}>{p}¢</span>
                  </span>
                  <span style={{ flex: 0.8, textAlign: 'center' }}>
                    <span style={{ background: '#2A1620', color: '#CF9290', borderRadius: 3, padding: '3px 8px' }}>{100 - p}¢</span>
                  </span>
                  <span style={{ flex: 1.1, textAlign: 'right', color: '#948D87', fontSize: 10.5 }}>{(o.probability || 0).toFixed(1)}% prob</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 16 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: '#9D968D' }}>
              ${(market.total_volume || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} vol
            </span>
            {hidden > 0 && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#B7A77E' }}>+{hidden} more →</span>
            )}
          </div>
        </div>

        {/* Right: legend + chart + carousel controls */}
        <div style={{ flex: '1 1 340px', minWidth: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {chartOutcomes.map((o, i) => (
                <span key={o.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--mono)', fontSize: 10.5, color: '#D2C5AF' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: LINE_COLORS[i % LINE_COLORS.length], display: 'inline-block' }} />
                  <span style={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
                  <span style={{ color: LINE_COLORS[i % LINE_COLORS.length], fontWeight: 700 }}>{(o.probability || 0).toFixed(1)}%</span>
                </span>
              ))}
            </div>
            {count > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => go(-1)} aria-label="Previous market"
                  style={{ width: 24, height: 24, borderRadius: 4, background: '#0B1229', border: '1px solid #33312E', color: '#D2C5AF', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>
                  ◀
                </button>
                <button onClick={() => go(1)} aria-label="Next market"
                  style={{ width: 24, height: 24, borderRadius: 4, background: '#0B1229', border: '1px solid #33312E', color: '#D2C5AF', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>
                  ▶
                </button>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#8E94AF' }}>{Math.min(idx, count - 1) + 1} of {count}</span>
              </div>
            )}
          </div>
          <MiniChart market={market} outcomes={chartOutcomes} />

          {/* Context blurb sits under the chart, mockup-style */}
          {blurb && (
            <p style={{ margin: '14px 0 0', paddingTop: 13, borderTop: '1px solid rgba(45,52,76,.6)', fontSize: 12, lineHeight: 1.65, color: '#B7A77E' }}>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 10.5, letterSpacing: '0.06em', marginRight: 8, color: '#FFDF9B' }}>{blurbLabel}</span>
              {blurb.length > 170 ? `${blurb.slice(0, 170)}…` : blurb}
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
