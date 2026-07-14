import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

// "MAJOR MARKET" hero — the mock's centerpiece: featured question with live
// probability, total volume, BET YES/NO buttons with real payout multipliers
// (from the actual payout formula: win = stake + stake*(1-p)*0.99), plus a
// 7-day probability chart and the latest headline for the market.
export default function MajorMarket({ markets }) {
  const navigate = useNavigate();
  const [news, setNews] = useState(null);

  const candidates = (markets || [])
    .filter((m) => m.status === 'active' && (m.outcomes || []).length > 0)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const market = candidates[0];

  useEffect(() => {
    if (!market?.id) return;
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

  // Real payout multipliers from the live payout formula
  const yesMult = (1 + (1 - p) * 0.99).toFixed(2);
  const noMult = (1 + p * 0.99).toFixed(2);

  // Probability delta from the last two snapshots
  const hist = market.price_history || [];
  const target = isBinary ? yes : leader;
  let delta = 0;
  if (hist.length >= 2 && target) {
    const last = hist[hist.length - 1]?.prices?.[target.id];
    const prev = hist[hist.length - 2]?.prices?.[target.id];
    if (typeof last === 'number' && typeof prev === 'number') delta = Math.round(last - prev);
  }

  // 7-day chart points from price history
  const cutoff = Date.now() - 7 * 86400000;
  const points = hist
    .filter((h) => new Date(h.timestamp).getTime() >= cutoff)
    .map((h) => h.prices?.[target?.id])
    .filter((v) => typeof v === 'number');
  const chartData = points.length >= 2 ? points : [p * 100, p * 100];

  const W = 260; const H = 120; const PAD = 6;
  const min = 0; const max = 100;
  const px = (i) => PAD + (i / (chartData.length - 1)) * (W - 2 * PAD);
  const py = (v) => PAD + ((max - v) / (max - min)) * (H - 2 * PAD);
  const path = chartData.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(v)}`).join(' ');

  const closes = market.close_date
    ? new Date(market.close_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
    : null;
  const vol = Number(market.total_volume || 0);
  const volLabel = `$${vol.toLocaleString('en-US')}`;
  const chanceName = isBinary ? 'YES' : (leader?.title || '').replace(/\s*\((Yes|No)\)\s*$/i, '').slice(0, 12).toUpperCase();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4" style={{ marginBottom: 26 }}>
      {/* Left: the major market card */}
      <div style={{ background: '#181E36', border: '1px solid #33312E', borderRadius: 12, padding: 22, cursor: 'pointer' }}
        onClick={() => navigate(`/markets/${market.id}`)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: '#1a1405', background: 'linear-gradient(180deg,#FFDF9B,#F0C04A)', borderRadius: 4, padding: '4px 8px' }}>
            MAJOR MARKET
          </span>
          {closes && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.06em', color: '#948D87' }}>
              CLOSES {closes}
            </span>
          )}
        </div>

        <h2 style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 24, lineHeight: 1.25, color: '#DCE1FF', margin: '0 0 18px' }}>
          {market.title}
        </h2>

        <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em', color: '#948D87', marginBottom: 4 }}>{chanceName} PROBABILITY</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 800, color: '#4AE176' }}>
              {Math.round(p * 100)}%{' '}
              {delta !== 0 && (
                <span style={{ fontSize: 12, color: delta > 0 ? '#4AE176' : '#FFB4AB' }}>({delta > 0 ? '+' : ''}{delta}%)</span>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em', color: '#948D87', marginBottom: 4 }}>TOTAL VOLUME</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 800, color: '#DCE1FF' }}>{volLabel}</div>
          </div>
        </div>

        {isBinary ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/markets/${market.id}`); }}
              style={{ background: 'rgba(74,225,118,.12)', border: '1px solid #2E7D4F', borderRadius: 8, padding: '13px 10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 13.5, color: '#4AE176' }}>BET YES</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: '#8E94AF', marginTop: 3 }}>Payout: {yesMult}x</div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/markets/${market.id}`); }}
              style={{ background: 'rgba(255,180,171,.06)', border: '1px solid #6E3B44', borderRadius: 8, padding: '13px 10px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 13.5, color: '#FFB4AB' }}>BET NO</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: '#8E94AF', marginTop: 3 }}>Payout: {noMult}x</div>
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/markets/${market.id}`); }}
            style={{ width: '100%', background: 'linear-gradient(180deg,#FFDF9B,#F0C04A)', border: 'none', borderRadius: 8, padding: '13px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 13.5, color: '#1a1405' }}>
            VIEW {outcomes.length} OUTCOMES
          </button>
        )}
      </div>

      {/* Right: 7-day probability chart + latest news */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: '#181E36', border: '1px solid #33312E', borderRadius: 12, padding: 14, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.08em', color: '#948D87' }}>7-DAY PROBABILITY CHART</span>
            <span style={{ display: 'inline-flex', gap: 2 }}>
              {['1H', '1D', 'ALL'].map((r) => (
                <span key={r} style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 7px', borderRadius: 3, background: r === 'ALL' ? '#F0C04A' : '#0B1229', color: r === 'ALL' ? '#4A3600' : '#8E94AF', fontWeight: 700 }}>{r}</span>
              ))}
            </span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {[0.25, 0.5, 0.75].map((r) => (
              <line key={r} x1={PAD} y1={PAD + r * (H - 2 * PAD)} x2={W - PAD} y2={PAD + r * (H - 2 * PAD)} stroke="#3A4160" strokeWidth="1" strokeDasharray="1,5" opacity="0.7" />
            ))}
            <path d={path} fill="none" stroke="#4AE176" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={px(chartData.length - 1)} cy={py(chartData[chartData.length - 1])} r="3.5" fill="#4AE176" />
          </svg>
        </div>

        {news && (
          <a href={news.link} target="_blank" rel="noopener noreferrer"
            style={{ background: '#181E36', border: '1px solid #33312E', borderRadius: 12, padding: 14, textDecoration: 'none', display: 'block' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.08em', color: '#FFDF9B' }}>LATEST NEWS</span>
            <p style={{ color: '#D2C5AF', fontSize: 12, lineHeight: 1.5, margin: '7px 0 0' }}>
              {news.title.slice(0, 110)}{news.title.length > 110 ? '…' : ''}
            </p>
          </a>
        )}
      </div>
    </div>
  );
}
