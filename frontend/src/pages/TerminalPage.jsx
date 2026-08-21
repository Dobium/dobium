import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';

// ── DOBIUM Terminal (/terminal) — matched to the reference mock ────────────
// Own chrome (ticker + DOBIUM Terminal nav; the site TopNav is suppressed by
// Layout on this route). Sections: NEXT ERA FINANCE hero, FEATURED EVENT with
// a green probability bar chart + YES/NO price boxes, Live Activity feed
// (mock demo rows), Trending Markets cards from live data, and the gold
// "Gain the Quantitative Edge." banner. Palette sampled from the screenshot:
// page #00132D, hero well #000E24, panels #0C203A, insets #081C36/#182A45,
// gold #FFDF9B (on-gold #79612A), green #4BE176, salmon #FFB4AB.
const WARM = '#CFC5B5';
const GOLD = '#FFDF9B';
const GOLD_DIM = '#E1C382';
const ON_GOLD = '#79612A';
const GREEN = '#4BE176';
const SALMON = '#FFB4AB';

const mono = (extra = {}) => ({ fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.12em', ...extra });

function shortName(t) {
  return (t || '').replace(/^will\s+/i, '').replace(/\?+\s*$/, '');
}

function yesOutcome(m) {
  return (m.outcomes || []).find((o) => (o.title || '').toLowerCase().startsWith('yes'));
}

function leaderOf(m) {
  return [...(m.outcomes || [])].sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];
}

function deltaFor(m, outcome) {
  const h = m?.price_history || [];
  if (h.length >= 2 && outcome) {
    const last = h[h.length - 1]?.prices?.[outcome.id];
    const prev = h[h.length - 2]?.prices?.[outcome.id];
    if (typeof last === 'number' && typeof prev === 'number') return Math.round(last - prev);
  }
  return 0;
}

function TerminalTicker({ markets }) {
  const liveVol = markets.reduce((s, m) => s + (m.total_volume || 0), 0);
  const items = [...markets]
    .filter((m) => m.status === 'active')
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 6)
    .map((m) => {
      const yes = yesOutcome(m);
      const lead = leaderOf(m);
      const target = yes || lead;
      const side = yes ? ((yes.probability || 0) >= 50 ? 'YES' : 'NO') : (lead?.title || '').replace(/\s*\((Yes|No)\)\s*$/i, '').slice(0, 10).toUpperCase();
      const priceP = side === 'NO' && yes ? 100 - (yes.probability || 0) : (target?.probability || 0);
      return {
        label: `${shortName(m.title).slice(0, 18).toUpperCase()}:`,
        side,
        price: (priceP / 100).toFixed(2),
        delta: deltaFor(m, target),
      };
    });
  const volItem = { vol: `$${liveVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (24H)` };
  const loop = [volItem, ...items, volItem, ...items];

  return (
    <div style={{ background: '#000814', borderBottom: '1px solid #0E1B30', overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <div className="dbm-term-tape" style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 0' }}>
        {loop.map((it, i) => it.vol ? (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 22px', ...mono({ fontSize: 8 }) }}>
            <span style={{ width: 4, height: 4, borderRadius: 999, background: GREEN, display: 'inline-block' }} />
            <span style={{ color: WARM }}>LIVE VOLUME:</span>
            <span style={{ color: GOLD_DIM }}>{it.vol}</span>
          </span>
        ) : (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, margin: '0 22px', ...mono({ fontSize: 8 }) }}>
            <span style={{ color: WARM }}>{it.label}</span>
            <span style={{ color: it.side === 'NO' ? SALMON : GREEN }}>{it.side}</span>
            <span style={{ color: '#DCE6F5' }}>@ {it.price}</span>
            {it.delta !== 0 && (
              <span style={{ color: it.delta > 0 ? GREEN : SALMON }}>
                {it.delta > 0 ? '▲' : '▼'} {Math.abs(it.delta)}%
              </span>
            )}
          </span>
        ))}
      </div>
      <style>{`
        .dbm-term-tape { animation: dbm-term-tape 46s linear infinite; }
        .dbm-term-tape:hover { animation-play-state: paused; }
        @keyframes dbm-term-tape { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .dbm-term-tape { animation: none; } }
      `}</style>
    </div>
  );
}

function TerminalNav({ navigate }) {
  // Radar and Intelligence both pointed at /radar — two labels for one
  // destination — and Portfolio duplicated the main nav's own link.
  const TABS = [
    { label: 'Markets', to: null },
  ];
  return (
    <div style={{ background: '#001128', borderBottom: '1px solid #14223E' }}>
      <div className="max-w-7xl mx-auto" style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '0 20px', minHeight: 44 }}>
        <span onClick={() => navigate('/')} style={{ cursor: 'pointer', ...mono({ fontSize: 11, letterSpacing: '0.06em' }) }}>
          <span style={{ color: '#F2F6FF', fontWeight: 800 }}>DOBIUM</span>
          <span style={{ color: '#8E9AB0', fontWeight: 700 }}> Terminal</span>
        </span>
        <nav style={{ display: 'flex', alignItems: 'stretch', gap: 2, flex: 1, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button key={t.label} onClick={() => t.to && navigate(t.to)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                ...mono({ fontSize: 9.5, letterSpacing: '0.08em' }),
                padding: '14px 10px 12px',
                color: t.to === null ? '#F2F6FF' : '#8E9AB0',
                borderBottom: t.to === null ? '2px solid #F2F6FF' : '2px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </nav>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E9AB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M10.3 21a2 2 0 003.4 0" />
          </svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E9AB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
          </svg>
        </span>
      </div>
    </div>
  );
}

const SHOWCASE_TABS = [
  { label: 'Trade on the chart',
    copy: 'Place orders, adjust size and exit positions without leaving the chart. Every fill lands where you can see it.' },
  { label: 'Technical indicators',
    copy: 'Layer moving averages, volume profiles and probability bands straight onto a market and keep them per-symbol.' },
  { label: 'Drawing tools',
    copy: 'Mark levels, trendlines and resolution dates. Annotations persist across sessions and follow the market.' },
  { label: 'Custom intervals',
    copy: 'Move from one-minute ticks to the full life of a contract, and set your own interval when the presets do not fit.' },
];

function ChartMock() {
  const candles = [
    [22, 46, 18, 50, 1], [40, 62, 36, 66, 1], [58, 44, 40, 64, 0], [44, 70, 40, 76, 1],
    [68, 58, 54, 72, 0], [56, 84, 52, 88, 1], [82, 96, 78, 102, 1], [94, 74, 70, 98, 0],
    [72, 88, 68, 92, 1], [86, 112, 82, 118, 1], [110, 100, 96, 116, 0], [98, 124, 94, 130, 1],
    [122, 116, 110, 128, 0], [114, 138, 110, 144, 1], [136, 150, 130, 156, 1], [148, 132, 128, 154, 0],
  ];
  return (
    <svg viewBox="0 0 720 300" style={{ width: '100%', height: 'auto', display: 'block' }}>
      <rect x="0" y="0" width="720" height="300" fill="#0A1830" />
      {[60, 110, 160, 210].map((y) => (
        <line key={y} x1="12" y1={y} x2="516" y2={y} stroke="#17283F" strokeWidth="1" />
      ))}
      {candles.map((c, i) => {
        const x = 26 + i * 30;
        const [o, cl, lo, hi, up] = c;
        const col = up ? '#4BE176' : '#FF6B6B';
        const top = 250 - Math.max(o, cl);
        const h = Math.max(3, Math.abs(cl - o));
        return (
          <g key={i}>
            <line x1={x} y1={250 - hi} x2={x} y2={250 - lo} stroke={col} strokeWidth="1.4" />
            <rect x={x - 6} y={top} width="12" height={h} fill={col} rx="1" />
            <rect x={x - 6} y={268 - (i % 5) * 3.2} width="12" height={(i % 5) * 3.2 + 6} fill={col} opacity="0.35" rx="1" />
          </g>
        );
      })}
      <rect x="528" y="10" width="180" height="280" rx="4" fill="#0C203A" stroke="#1D3350" />
      <text x="540" y="30" fill="#8E9AB0" fontFamily="var(--mono), monospace" fontSize="9">ORDER</text>
      <rect x="540" y="40" width="156" height="22" rx="3" fill="#132844" />
      <rect x="540" y="70" width="156" height="22" rx="3" fill="#132844" />
      <rect x="540" y="100" width="74" height="24" rx="3" fill="#1D8F4E" />
      <text x="577" y="116" fill="#FFFFFF" fontFamily="var(--mono), monospace" fontSize="9" fontWeight="700" textAnchor="middle">YES</text>
      <rect x="622" y="100" width="74" height="24" rx="3" fill="#22344F" />
      <text x="659" y="116" fill="#9FB2CC" fontFamily="var(--mono), monospace" fontSize="9" fontWeight="700" textAnchor="middle">NO</text>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={i}>
          <rect x="540" y={140 + i * 16} width={110 - i * 9} height="9" fill={i < 3 ? '#FF6B6B' : '#4BE176'} opacity="0.28" rx="1" />
          <text x="660" y={148 + i * 16} fill="#8E9AB0" fontFamily="var(--mono), monospace" fontSize="7.5" textAnchor="end">
            {(0.62 - i * 0.03).toFixed(2)}
          </text>
        </g>
      ))}
      <rect x="540" y="258" width="156" height="22" rx="3" fill="#FFD98A" />
      <text x="618" y="273" fill="#2A1F00" fontFamily="var(--mono), monospace" fontSize="9" fontWeight="700" textAnchor="middle">PLACE ORDER</text>
    </svg>
  );
}

function TradeShowcase() {
  const [tab, setTab] = useState(0);
  const step = (d) => setTab((t) => (t + d + SHOWCASE_TABS.length) % SHOWCASE_TABS.length);
  const arrow = { background: '#0C203A', border: '1px solid #23364F', borderRadius: 4, width: 26, height: 26, cursor: 'pointer', color: '#8E9AB0', flexShrink: 0 };

  return (
    <div style={{ background: '#000E24', border: '1px solid #25303F', borderRadius: 8, padding: '48px 20px 34px' }}>
      <h1 style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 'clamp(26px,3.4vw,38px)', lineHeight: 1.2, margin: '0 auto', maxWidth: 520, textAlign: 'center' }}>
        Trade predictions as they move
      </h1>

      <div style={{ maxWidth: 860, margin: '32px auto 0', background: '#0C203A', border: '1px solid #1D3350', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '8px 12px', borderBottom: '1px solid #1D3350', ...mono({ fontSize: 8, letterSpacing: '0.06em', color: '#8E9AB0' }) }}>
          <span style={{ background: '#132844', borderRadius: 3, padding: '2px 6px', color: '#F2F6FF' }}>DOB</span>
          <span style={{ color: '#F2F6FF' }}>$18,245.50</span>
          <span style={{ color: GREEN }}>▲ $142.30 (1.45%)</span>
          <span>O 18,103.20</span><span>H 18,258.00</span>
          <span style={{ color: SALMON }}>L 18,034.10</span><span>C 18,245.50</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
            {['1m', '5m', '15m', '1h', '4h', '1D'].map((iv, i) => (
              <span key={iv} style={{ color: i === 2 ? GOLD : '#8E9AB0' }}>{iv}</span>
            ))}
          </span>
        </div>
        <ChartMock />
      </div>

      <div style={{ maxWidth: 860, margin: '18px auto 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => step(-1)} style={arrow} aria-label="Previous">‹</button>
        <div style={{ flex: 1, display: 'flex', gap: 8, overflowX: 'auto', justifyContent: 'center' }}>
          {SHOWCASE_TABS.map((t, i) => (
            <button key={t.label} onClick={() => setTab(i)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                padding: '7px 10px', borderBottom: i === tab ? `2px solid ${GOLD}` : '2px solid transparent',
                color: i === tab ? '#FFFFFF' : '#8E9AB0', fontSize: 11.5, fontWeight: i === tab ? 700 : 500,
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => step(1)} style={arrow} aria-label="Next">›</button>
      </div>

      <p style={{ color: '#8E9AB0', fontSize: 12.5, lineHeight: 1.7, margin: '16px auto 0', maxWidth: 470, textAlign: 'center' }}>
        {SHOWCASE_TABS[tab].copy}
      </p>
    </div>
  );
}

export default function TerminalPage() {
  const navigate = useNavigate();
  const { markets } = useMarkets();

  return (
    <div style={{ background: '#00132D', minHeight: '100%' }}>
      <TerminalTicker markets={markets} />
      <TerminalNav navigate={navigate} />

      <div className="max-w-7xl mx-auto" style={{ padding: '16px 20px 40px' }}>
        <TradeShowcase />
      </div>
    </div>
  );
}
