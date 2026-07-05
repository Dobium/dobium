import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MarketCard from '../components/MarketCard';
import WaitlistCard from '../components/WaitlistCard';
import { useMarkets } from '../hooks/useMarkets';

const CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'short', label: '⚡ Short resolution' },
  { id: 'long', label: '📈 Long resolution' },
  { id: 'music', label: '🎵 Music' },
  { id: 'sports', label: '🏆 Sports' },
  { id: 'entertainment', label: '🎬 Movies & TV' },
  { id: 'awards', label: '🏅 Awards' },
];

// Same close-date fallbacks MarketCard uses, so fuse filters match the fuse labels.
function daysLeft(m) {
  const raw = m.close_time || m.closes_at || m.end_time || m.close_date || null;
  if (!raw) return null;
  return Math.ceil((new Date(raw) - Date.now()) / 86400000);
}

export default function ExplorePage() {
  const { markets, loading } = useMarkets();
  const [searchParams] = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const [chip, setChip] = useState(urlFilter || 'all');
  useEffect(() => { setChip(urlFilter || 'all'); }, [urlFilter]);
  const [search, setSearch] = useState('');

  const filtered = [...markets]
    .filter((m) => {
      const d = daysLeft(m);
      const chipMatch =
        chip === 'all' ? true :
        chip === 'short' ? d !== null && d > 0 && d <= 7 :
        chip === 'long' ? d !== null && d > 7 :
        m.category === chip;
      const searchMatch = !search || m.title?.toLowerCase().includes(search.toLowerCase());
      return chipMatch && searchMatch;
    })
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">

      {/* ── Hero ── */}
      <div style={{ textAlign: 'center', padding: '64px 24px 48px', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 580, height: 320,
          background: 'radial-gradient(ellipse at center,rgba(240,192,74,.10),transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ height: 'clamp(40px,6.2vw,64px)', width: 'auto', marginRight: -4 }}>
              <defs>
                <linearGradient id="heroDG" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#F7D573" /><stop offset="1" stopColor="#D89B2B" />
                </linearGradient>
              </defs>
              <path d="M11.5 7.5 h5 a8.5 8.5 0 0 1 0 17 h-5 Z" stroke="url(#heroDG)" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 600, fontSize: 'clamp(44px,7vw,72px)', background: 'linear-gradient(180deg,#F7D573,var(--gold-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', lineHeight: 1 }}>
            obium
          </span>
        </div>
        <p style={{ color: 'var(--text)', fontSize: 'clamp(17px,2.4vw,22px)', fontWeight: 400, maxWidth: 580, margin: '0 auto 10px', opacity: .92 }}>
          The entertainment prediction market
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 480, margin: '0 auto 36px' }}>
          Trade on music drops, box office, awards and the biggest moments in culture — with $100 paper money.
        </p>
        {!loading && (
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
            <div style={{ width: 1, background: 'var(--line)', margin: '4px 8px' }} />
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                347
              </span>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>on the real-money waitlist</span>
            </div>
          </div>
        )}
      </div>
      {/* ── /Hero ── */}

      {/* ── Live Markets heading ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        <h2 style={{ fontFamily: '"DM Serif Text", serif', fontSize: 30, color: 'var(--text)', margin: 0 }}>
          Live Markets
        </h2>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>
          Sorted by <span style={{ color: 'var(--gold)', fontWeight: 600 }}>volume</span> · updates live
        </span>
      </div>

      {/* ── Filter chips + search ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 26 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CHIPS.map((c) => {
            const active = chip === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setChip(c.id)}
                style={{
                  padding: '8px 15px', borderRadius: 999,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
                  background: active ? 'var(--gold-dim)' : 'rgba(17,26,57,.5)',
                  color: active ? 'var(--gold)' : 'var(--muted)',
                  transition: 'all .15s ease',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="relative search-container">
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input pl-11 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
          />
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--gold)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </span>
        </div>
      </div>

      {/* ── Markets grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-slate-700 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '48px 0' }}>
          No markets match — try another category.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
          {filtered.map((m) => <MarketCard key={m.id} market={m} />)}
        </div>
      )}

      {/* ── Waitlist, visible on the markets page too ── */}
      <div style={{ marginTop: 64, marginBottom: 24 }}>
        <WaitlistCard />
      </div>
    </div>
  );
}
