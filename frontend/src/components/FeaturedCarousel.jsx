import { useState, useEffect, useRef } from 'react';
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
  const W = 320; const H = 120; const PAD = 6;
  const series = outcomes.map((o, i) => ({
    id: o.id,
    color: LINE_COLORS[i % LINE_COLORS.length],
    data: historyFor(market, o),
  }));
  const path = (data) => {
    const n = data.length;
    return data
      .map((v, i) => {
        const x = PAD + (i / (n - 1)) * (W - PAD * 2);
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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 110 }}>
        {[0.25, 0.5, 0.75].map((r) => (
          <line key={r} x1={PAD} x2={W - PAD} y1={PAD + r * (H - PAD * 2)} y2={PAD + r * (H - PAD * 2)}
            stroke="#2D344C" strokeWidth="0.6" strokeDasharray="3,4" opacity="0.5" />
        ))}
        {series.map((sr) => {
          const n = sr.data.length;
          const lastX = PAD + (W - PAD * 2);
          const lastY = PAD + (1 - sr.data[n - 1] / 100) * (H - PAD * 2);
          return (
            <g key={sr.id}>
              <path d={path(sr.data)} fill="none" stroke={sr.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={lastX} cy={lastY} r="2.6" fill={sr.color} />
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
  const timer = useRef(null);

  const featured = [...markets]
    .filter((m) => m.status === 'active' && (m.outcomes || []).length > 0)
    .sort((a, b) => (Number(b.is_trending) - Number(a.is_trending)) || ((b.total_volume || 0) - (a.total_volume || 0)))
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

  const blurb = (market.description || '').replace(/\s+/g, ' ').trim();

  return (
    <div
      onClick={() => navigate(`/markets/${market.id}`)}
      style={{
        maxWidth: 940, margin: '0 auto', textAlign: 'left', cursor: 'pointer',
        background: '#181E36', border: '1px solid #33312E', borderRadius: 8,
        padding: '20px 22px 18px',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26 }}>
        {/* Left: tag, title, outcomes table, volume */}
        <div style={{ flex: '1.2 1 320px', minWidth: 280 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#D2C5AF', background: '#2D344C', borderRadius: 3, padding: '4px 9px' }}>
            {bucketLabel(market.category)}
          </span>
          <h3 style={{ color: '#DCE1FF', fontSize: 16.5, fontWeight: 600, margin: '12px 0 14px', lineHeight: 1.4 }}>
            {market.title}
          </h3>

          {/* Outcomes mini-table */}
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5 }}>
            <div style={{ display: 'flex', color: '#948D87', fontSize: 10, paddingBottom: 7, borderBottom: '1px solid rgba(45,52,76,.7)' }}>
              <span style={{ flex: 2.1 }}>{binary ? 'Outcome' : 'Market'}</span>
              <span style={{ flex: 0.8, textAlign: 'center' }}>Yes</span>
              <span style={{ flex: 0.8, textAlign: 'center' }}>No</span>
              <span style={{ flex: 1.1, textAlign: 'right' }} />
            </div>
            {rows.map((o) => {
              const p = Math.round(o.probability || 0);
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(45,52,76,.35)' }}>
                  <span style={{ flex: 2.1, color: '#DCE1FF', fontFamily: 'var(--wordmark)', fontSize: 12.5, paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: '#9D968D' }}>
              ${(market.total_volume || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} vol
            </span>
            {hidden > 0 && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#B7A77E' }}>+{hidden} more →</span>
            )}
          </div>
        </div>

        {/* Right: legend + chart + carousel controls */}
        <div style={{ flex: '1 1 300px', minWidth: 260 }}>
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
        </div>
      </div>

      {/* Context blurb */}
      {blurb && (
        <p style={{ margin: '16px 0 0', paddingTop: 14, borderTop: '1px solid rgba(45,52,76,.6)', fontSize: 12, lineHeight: 1.6, color: '#B7A77E' }}>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 10.5, letterSpacing: '0.06em', marginRight: 8, color: '#FFDF9B' }}>ABOUT</span>
          {blurb.length > 200 ? `${blurb.slice(0, 200)}…` : blurb}
        </p>
      )}
    </div>
  );
}
