import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MarketCard from '../components/MarketCard';
import { MarketGridSkeleton } from '../components/MarketCardSkeleton';
import WaitlistCard from '../components/WaitlistCard';
import { useMarkets } from '../hooks/useMarkets';

const CHIPS = [
  { id: 'all', label: 'All', icon: null },
  { id: 'short', label: 'Short resolution', icon: 'bolt' },
  { id: 'long', label: 'Long resolution', icon: 'trending_up' },
  { id: 'music', label: 'Music', icon: 'music_note' },
  { id: 'sports', label: 'Sports', icon: 'trophy' },
  { id: 'entertainment', label: 'Movies & TV', icon: 'movie' },
  { id: 'awards', label: 'Awards', icon: 'award_star' },
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

      {/* ── Page header (matches mockup: clean H1, no duplicate hero) ── */}
      <div style={{ padding: '28px 0 22px' }}>
        <h1 style={{ fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 'clamp(28px,4vw,38px)', color: 'var(--text)', margin: 0 }}>
          Explore Markets
        </h1>
      </div>

      {/* ── Search (left) + filter chips (right) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 26 }}>
        <div className="relative search-container" style={{ flex: '1 1 260px', maxWidth: 420 }}>
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input w-full pl-11 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
          />
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--gold)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
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
                {c.icon && <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: '-2px', marginRight: 4 }}>{c.icon}</span>}
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Markets grid ── */}
      {loading ? (
        <MarketGridSkeleton count={9} />
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
