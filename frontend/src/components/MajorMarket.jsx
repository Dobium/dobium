import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

// "MAJOR MARKET" hero — matched to the reference mock: ONE card, split by an
// internal vertical divider. Left: badge row, big question, probability +
// volume stats, large YES/NO payout buttons. Right: 7-day probability chart
// (solid green YES line, dashed salmon NO line, % axis on the right, 1H/1D/ALL
// chips) with the LATEST NEWS inset box underneath.
export default function MajorMarket({ markets }) {
  const navigate = useNavigate();
  const [news, setNews] = useState(null);

  const candidates = (markets || [])
    .filter((m) => m.status === 'active' && (m.outcomes || []).length > 0)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const market = candidates[0];
  const dest = market?.demo ? '/explore' : `/markets/${market?.id}`;

  useEffect(() => {
    if (!market?.id) return;
    if (market.demo_news) { setNews(market.demo_news); return; }
    let alive = true;
    api.getMarketNews(market.id)
      .then((r) => { if (alive) setNews((r?.items || [])[0] || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [market?.id]);

  if (!market) return null;

  const outcomes = market.outcomes || [];
  const isBinary = outcomes.length === 2 && outcomes.some((o) => (o.title || '').toLowerCase().startsWith('yes'));
  const yes = isBinary ? outcomes.find((o) => (o.title || '').toLowerCase().startsWith('yes')) : null;
  const leader = [...outcomes].sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];
  const p = ((isBinary ? yes?.probability : leader?.probability) || 50) / 100;

  // Real payout multipliers from the live payout formula (demo content pins
  // the reference screenshot's figures)
  const yesMult = market.demo_payouts?.yes || (1 + (1 - p) * 0.99).toFixed(2);
  const noMult = market.demo_payouts?.no || (1 + p * 0.99).toFixed(2);

  // Probability delta from the last two snapshots
  const hist = market.price_history || [];
  const target = isBinary ? yes : leader;
  let delta = 0;
  if (hist.length >= 2 && target) {
    const last = hist[hist.length - 1]?.prices?.[target.id];
    const prev = hist[hist.length - 2]?.prices?.[target.id];
    if (typeof last === 'number' && typeof prev === 'number') delta = Math.round(last - prev);
  }
  if (typeof market.demo_delta === 'number') delta = market.demo_delta;

  // 7-day chart points from price history
  const cutoff = Date.now() - 7 * 86400000;
  const points = hist
    .filter((h) => new Date(h.timestamp).getTime() >= cutoff)
    .map((h) => h.prices?.[target?.id])
    .filter((v) => typeof v === 'number');
  const chartData = points.length >= 2 ? points : [p * 100, p * 100];

  const W = 380; const H = 205; const PAD = 10; const RPAD = 42; // room for the % axis labels
  const px = (i) => PAD + (i / (chartData.length - 1)) * (W - PAD - RPAD);
  const py = (v) => PAD + ((100 - v) / 100) * (H - 2 * PAD);
  const yesPath = chartData.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(v)}`).join(' ');
  const noPath = chartData.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(100 - v)}`).join(' ');

  const closes = market.close_date
    ? new Date(market.close_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
    : null;
  const vol = Number(market.total_volume || 0);
  const volLabel = `$${vol.toLocaleString('en-US')}`;
  const chanceName = isBinary ? 'YES' : (leader?.title || '').replace(/\s*\((Yes|No)\)\s*$/i, '').slice(0, 12).toUpperCase();

  return (
    <div
      className="dbm-hero-grid"
      style={{ background: '#182A45', border: '1px solid #2F3A4A', borderRadius: 8, marginBottom: 30, overflow: 'hidden' }}
    >
      {/* Left: question, stats, YES/NO */}
      <div
        style={{ padding: '40px 40px 28px', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
        onClick={() => navigate(dest)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#00132D', background: '#FFDF9B', borderRadius: 4, padding: '5px 10px' }}>
            MAJOR MARKET
          </span>
          {closes && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#CFC5B5' }}>
              CLOSES {closes}
            </span>
          )}
        </div>

        <h2 style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 31, lineHeight: 1.25, color: '#F2F5FF', margin: '18px 0 22px', maxWidth: 480 }}>
          {market.title}
        </h2>

        <div style={{ display: 'flex', gap: 44, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#CFC5B5', marginBottom: 6 }}>{chanceName} PROBABILITY</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 800, color: '#4BE176' }}>
              {Math.round(p * 100)}%{' '}
              {delta !== 0 && (
                <span style={{ fontSize: 14, fontWeight: 700, color: '#CFC5B5' }}>({delta > 0 ? '+' : ''}{delta}%)</span>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#CFC5B5', marginBottom: 6 }}>TOTAL VOLUME</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 800, color: '#F2F5FF' }}>{volLabel}</div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 42 }} />

        {isBinary ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(dest); }}
              style={{ background: '#1D3D4A', border: '1px solid #4BE176', borderRadius: 6, padding: '13px 10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 16, letterSpacing: '0.04em', color: '#4BE176' }}>YES</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#CFC5B5', marginTop: 5 }}>Payout: {yesMult}x</div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(dest); }}
              style={{ background: '#30384F', border: '1px solid #FFB4AB', borderRadius: 6, padding: '13px 10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 16, letterSpacing: '0.04em', color: '#FFB4AB' }}>NO</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#CFC5B5', marginTop: 5 }}>Payout: {noMult}x</div>
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(dest); }}
            style={{ width: '100%', background: '#FFDF9B', border: 'none', borderRadius: 6, padding: '14px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 14, color: '#00132D' }}>
            VIEW {outcomes.length} OUTCOMES
          </button>
        )}
      </div>

      {/* Right: chart panel behind the internal divider */}
      <div className="dbm-hero-chart" style={{ background: '#0C1E39', padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: '#CFC5B5' }}>7-DAY PROBABILITY CHART</span>
          <span style={{ display: 'inline-flex', gap: 4 }}>
            {['1H', '1D', 'ALL'].map((r) => (
              <span key={r} style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '5px 10px', borderRadius: 5, background: r === '1H' ? '#1B3A62' : 'transparent', color: r === '1H' ? '#FFFFFF' : '#8E9AB0' }}>{r}</span>
            ))}
          </span>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', flex: 1 }}>
          {[100, 75, 50, 25, 0].map((v) => (
            <text key={v} x={W - RPAD + 10} y={py(v) + 3} fontSize="9.5" fill="#8E9AB0" fontFamily="var(--mono)">{v}%</text>
          ))}
          <path d={noPath} fill="none" stroke="#FFB4AB" strokeWidth="2.2" strokeDasharray="1,6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
          <path d={yesPath} fill="none" stroke="#6BFE8F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {news && (
          <a href={news.link} target="_blank" rel="noopener noreferrer"
            style={{ background: '#0C203A', border: '1px solid #22314A', borderRadius: 6, padding: 14, textDecoration: 'none', display: 'flex', gap: 14, alignItems: 'center', marginTop: 14 }}>
            <span style={{
              width: 48, height: 48, borderRadius: 6, background: '#192855', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#7B86D9' }}>album</span>
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', color: '#CFC5B5' }}>LATEST NEWS</span>
              <span style={{ display: 'block', color: '#C6D3E8', fontSize: 12.5, lineHeight: 1.5, margin: '5px 0 0' }}>
                {news.title.slice(0, 100)}{news.title.length > 100 ? '…' : ''}
              </span>
            </span>
          </a>
        )}
      </div>
    </div>
  );
}
