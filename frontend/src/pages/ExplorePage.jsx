import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MarketCard from '../components/MarketCard';
import { MarketGridSkeleton } from '../components/MarketCardSkeleton';
import WaitlistCard from '../components/WaitlistCard';
import { useMarkets } from '../hooks/useMarkets';
import { categoryBucket } from '../lib/categories';

// Three buckets only — we're a music & media prediction market.
// Everything news-driven (sports, tech, elections…) lives under Trending.
const CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'trending', label: 'Trending' },
  { id: 'music', label: 'Music' },
  { id: 'media', label: 'Media' },
];

// Old links like /explore?filter=awards or ?filter=sports keep working
// by collapsing legacy categories into the bucket they now belong to.
function normalizeFilter(f) {
  if (!f) return 'all';
  const v = f.toLowerCase();
  if (['all', 'trending', 'music', 'media'].includes(v)) return v;
  return categoryBucket(v);
}

export default function ExplorePage() {
  const { markets, loading } = useMarkets();
  const [searchParams] = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const urlQuery = searchParams.get('q');
  const [chip, setChip] = useState(normalizeFilter(urlFilter));
  useEffect(() => { setChip(normalizeFilter(urlFilter)); }, [urlFilter]);
  const [search, setSearch] = useState(urlQuery || '');
  useEffect(() => { if (urlQuery !== null) setSearch(urlQuery); }, [urlQuery]);

  const filtered = [...markets]
    .filter((m) => {
      const chipMatch = chip === 'all' ? true : categoryBucket(m.category) === chip;
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
            className="search-input w-full pl-11 pr-4 py-2.5 focus:outline-none"
            style={{ background: '#181E36', border: '1px solid #33312E', borderRadius: 6, color: '#DCE1FF', fontSize: 13.5 }}
          />
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2" style={{ color: '#8E94AF' }}>
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
                  fontFamily: 'var(--mono)',
                  padding: '7px 13px', borderRadius: 4,
                  fontSize: 12, cursor: 'pointer',
                  border: 'none',
                  background: '#2D344C',
                  color: active ? '#FFDF9B' : '#8E94AF',
                  transition: 'color .15s ease',
                }}
              >
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
