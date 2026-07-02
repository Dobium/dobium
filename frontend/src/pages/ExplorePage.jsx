import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketCard from '../components/MarketCard';
import { useMarkets } from '../hooks/useMarkets';

function TrendingMiniChart({ market }) {
  const width = 400;
  const height = 100;
  const outcomes = market.outcomes || [];
  const priceHistory = market.price_history || [];

  const trends = outcomes.slice(0, 3).map((o, idx) => {
    let data;

    if (priceHistory.length > 0) {
      // Use real price history
      data = priceHistory.map(snapshot => snapshot.prices[o.id] || o.probability || 20);

      // Ensure minimum 2 points
      if (data.length < 2) {
        data = [o.probability || 20, o.probability || 20];
      }
    } else {
      // No history - flat line
      data = [o.probability || 20, o.probability || 20];
    }

    return {
      data: data,
      color: o.title?.toLowerCase() === 'yes' ? '#22c55e' : o.title?.toLowerCase() === 'no' ? '#ef4444' : ['#3b82f6', '#f59e0b', '#8b5cf6'][idx]
    };
  });

  const allValues = trends.flatMap(t => t.data);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;

  const getY = (val) => ((maxVal - val) / range) * height;
  const getX = (idx, total) => (idx / (total - 1)) * width;

  return (
    <svg className="w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {trends.map((trend, idx) => {
        const points = trend.data.map((val, i) => ({
          x: getX(i, trend.data.length),
          y: getY(val)
        }));
        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

        return (
          <path
            key={idx}
            d={path}
            fill="none"
            stroke={trend.color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
        );
      })}
    </svg>
  );
}

const CATEGORIES = ['all', 'politics', 'international', 'environment', 'climate', 'science', 'health', 'finance', 'technology'];

export default function ExplorePage() {
  const { markets, loading } = useMarkets();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All Markets');
  const [search, setSearch] = useState('');
  const [trendingIndex, setTrendingIndex] = useState(0);

  const trending = [...markets]
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 5);

  const filtered = markets.filter(m => {
    const categoryMatch = selectedCategory === 'All Markets' || m.category === selectedCategory.toLowerCase();
    const searchMatch = !search || m.title?.toLowerCase().includes(search.toLowerCase());
    return categoryMatch && searchMatch;
  });

  useEffect(() => {
    if (trending.length === 0) return;
    const interval = setInterval(() => {
      setTrendingIndex(prev => (prev + 1) % trending.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [trending.length]);

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">

      {/* ── Hero ── */}
      <div style={{ textAlign: 'center', padding: '72px 24px 52px', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 580, height: 320,
          background: 'radial-gradient(ellipse at center,rgba(240,192,74,.10),transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
          <svg viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg" style={{ height: 'clamp(52px,8vw,80px)', width: 'auto', filter: 'drop-shadow(0 6px 24px rgba(240,192,74,.3))' }}>
            <defs>
              <linearGradient id="heroGoldG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F7D573" /><stop offset="1" stopColor="#D89B2B" />
              </linearGradient>
            </defs>
            <g stroke="url(#heroGoldG)" strokeWidth="14" strokeLinejoin="round" fill="url(#heroGoldG)">
              <path d="M60 12 L104 34 L104 78 L60 100 L16 78 L16 34 Z" />
            </g>
            <path d="M16 34 L60 54 L104 34 M60 54 L60 100" stroke="#0A1128" strokeWidth="4.5" fill="none" strokeLinecap="round" opacity=".9" />
            <path d="M68 62 C88 58 94 68 94 76 C94 86 84 92 70 90 C68.5 89.7 68 88 68 86 L68 66 C68 64 68 62.4 68 62 Z" fill="#0A1128" />
            <ellipse cx="78" cy="30" rx="6.5" ry="4.2" fill="#0A1128" transform="rotate(8 78 30)" />
            <ellipse cx="30" cy="56" rx="4.6" ry="5.4" fill="#0A1128" transform="rotate(-18 30 56)" />
            <ellipse cx="40" cy="74" rx="4.6" ry="5.4" fill="#0A1128" transform="rotate(-18 40 74)" />
          </svg>
          <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 600, fontSize: 'clamp(44px,7vw,72px)', background: 'linear-gradient(180deg,#F7D573,var(--gold-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', lineHeight: 1 }}>
            obium
          </span>
        </div>
        <p style={{ color: 'var(--text)', fontSize: 'clamp(17px,2.4vw,22px)', fontWeight: 400, maxWidth: 580, margin: '0 auto 10px', opacity: .92 }}>
          The entertainment prediction market
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 480, margin: '0 auto 40px' }}>
          Trade on music drops, box office, awards and the biggest moments in culture — with ${(100000).toLocaleString()} paper money.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
              {markets.length}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>live markets</span>
          </div>
          <div style={{ width: 1, background: 'var(--line)', margin: '4px 8px' }} />
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
              ${markets.reduce((s, m) => s + (m.total_volume || 0), 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>paper volume traded</span>
          </div>
        </div>
      </div>
      {/* ── /Hero ── */}

      <div className="mb-12">
        <div className="flex items-center justify-end mb-8">
          <div className="flex items-center gap-2.5">
            <div className="relative search-container">
              <input
                type="text"
                placeholder="Search markets..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="search-input pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
              />
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--gold)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </span>
            </div>
            <div className="relative category-dropdown-container">
              <button className="px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-950 font-semibold rounded-xl hover:brightness-110 transition flex items-center gap-2 whitespace-nowrap">
                <span>{selectedCategory}</span>
                <span className="text-sm">▼</span>
              </button>
              <div className="absolute right-0 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-10 hidden group-hover:block">
                {['All Markets', ...CATEGORIES.filter(c => c !== 'all').map(c => c.charAt(0).toUpperCase() + c.slice(1))].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-800 transition ${selectedCategory === cat ? 'text-white' : 'text-slate-300'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
{/* All Markets Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span style={{ color: 'var(--gold)' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </span>
          All Markets
        </h2>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-slate-700 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
          {filtered.map(m => <MarketCard key={m.id} market={m} />)}
        </div>
      )}
    </div>
  );
}
