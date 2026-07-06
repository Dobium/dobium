import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MarketCard from '../components/MarketCard';
import { MarketGridSkeleton } from '../components/MarketCardSkeleton';
import WaitlistCard from '../components/WaitlistCard';
import { useMarkets } from '../hooks/useMarkets';

const CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'music', label: 'Music' },
  { id: 'sports', label: 'Sports' },
  { id: 'entertainment', label: 'Movies & TV' },
  { id: 'awards', label: 'Awards' },
];

export default function ExplorePage() {
  const { markets, loading } = useMarkets();
  const [searchParams] = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const [chip, setChip] = useState(urlFilter || 'all');
  useEffect(() => { setChip(urlFilter || 'all'); }, [urlFilter]);
  const [search, setSearch] = useState('');

  const filtered = [...markets]
    .filter((m) => {
      const chipMatch = chip === 'all' ? true : m.category === chip;
      const searchMatch = !search || m.title?.toLowerCase().includes(search.toLowerCase());
      return chipMatch && searchMatch;
    })
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">

      {/* ── Heading ── */}
      <h1 style={{
        fontFamily: 'var(--wordmark)', fontWeight: 400, fontSize: 'clamp(28px,4vw,36px)',
        color: 'var(--text)', margin: '10px 0 24px',
      }}>
        Explore Markets
      </h1>

      {/* ── Search left + filter pills right ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div style={{ position: 'relative', flex: '0 1 340px', minWidth: 240 }}>
          <span className="material-symbols-outlined" style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, color: 'var(--gold)',
          }}>
            search
          </span>
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6,
              padding: '10px 14px 10px 36px',
              color: 'var(--text)', fontSize: 13.5, outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CHIPS.map((c) => {
            const active = chip === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setChip(c.id)}
                style={{
                  padding: '8px 14px', borderRadius: 5,
                  fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
                  background: active ? 'var(--gold-dim)' : 'var(--panel)',
                  color: active ? 'var(--gold)' : 'var(--muted)',
                  transition: 'all .15s ease',
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
