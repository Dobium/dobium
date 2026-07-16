import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ExploreCard from '../components/ExploreCard';
import { MarketGridSkeleton } from '../components/MarketCardSkeleton';
import { useMarkets } from '../hooks/useMarkets';
import { categoryBucket } from '../lib/categories';
import { EXPLORE_FLASH, MARKET_INTEL } from '../lib/demoContent';

// ── Explore Markets — matched to the reference mock ──────────────────────
// Live markets in the mock's crisp card grid, gold-active filter chips
// (search arrives via the nav's ?q= param), and the FLASH MARKET banner +
// Market Intelligence rail underneath.

const CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'trending', label: 'Trending' },
  { id: 'music', label: 'Music' },
  { id: 'media', label: 'Media' },
  { id: 'politics', label: 'Politics' },
];

function normalizeFilter(f) {
  if (!f) return 'all';
  const v = f.toLowerCase();
  if (CHIPS.some((c) => c.id === v)) return v;
  return categoryBucket(v);
}

export default function ExplorePage() {
  const { markets, loading } = useMarkets();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const urlQuery = searchParams.get('q');
  const [chip, setChip] = useState(normalizeFilter(urlFilter));
  useEffect(() => { setChip(normalizeFilter(urlFilter)); }, [urlFilter]);
  const search = (urlQuery || '').trim();

  const filtered = [...markets]
    .filter((m) => {
      const chipMatch = chip === 'all' ? true : categoryBucket(m.category) === chip;
      const searchMatch = !search || m.title?.toLowerCase().includes(search.toLowerCase());
      return chipMatch && searchMatch;
    })
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));

  const clearSearch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    setSearchParams(next, { replace: true });
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 24px 0' }}>

      {/* ── Header: title + subtitle left, filter chips right ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, padding: '28px 0 20px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 'clamp(24px,2.6vw,30px)', color: '#F2F5FF', margin: 0, lineHeight: 1.15 }}>
            Explore Markets
          </h1>
          <p style={{ color: '#D2C5AF', fontSize: 12, margin: '6px 0 0' }}>
            High-fidelity data. Real-time predictions.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          {CHIPS.map((c) => {
            const active = chip === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setChip(c.id)}
                style={{
                  fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em',
                  padding: '7px 16px', borderRadius: 4, cursor: 'pointer',
                  background: active ? '#F3C74F' : '#1A2138',
                  border: active ? '1px solid #F3C74F' : '1px solid #2A3352',
                  color: active ? '#2A1F00' : '#AEB6D2',
                  transition: 'color .15s ease, background .15s ease',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active nav-search notice (search itself lives in the nav) ── */}
      {search && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.04em', color: '#7E88A6' }}>
            Results for "{search}"
          </span>
          <button onClick={clearSearch} aria-label="Clear search"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7E88A6', padding: 0, display: 'flex' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
          </button>
        </div>
      )}

      {/* ── Markets grid (live data, mock styling) ── */}
      {loading ? (
        <MarketGridSkeleton count={9} />
      ) : filtered.length === 0 ? (
        <p style={{ color: '#7E88A6', textAlign: 'center', padding: '48px 0' }}>
          No markets match — try another category.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 16 }}>
          {filtered.map((m) => <ExploreCard key={m.id} market={m} />)}
        </div>
      )}

      {/* ── Flash market banner + market intelligence ── */}
      <div className="dbm-explore-flash" style={{ marginTop: 16 }}>
        <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#2B3792 0%,#1C2354 55%,#161D48 100%)', border: '1px solid #3A46A0', borderRadius: 8, padding: '26px 28px' }}>
          <svg viewBox="0 0 220 140" aria-hidden="true"
            style={{ position: 'absolute', right: -10, top: 0, height: '100%', width: 'auto', opacity: 0.3, pointerEvents: 'none' }}>
            <path d="M8,110 L48,84 L84,96 L124,58 L164,70 L208,26" fill="none" stroke="#8FA0E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M116,30 l3.5,8 8,3.5 -8,3.5 -3.5,8 -3.5,-8 -8,-3.5 8,-3.5 Z" fill="#C9D4F2" />
            <path d="M176,96 l2.5,6 6,2.5 -6,2.5 -2.5,6 -2.5,-6 -6,-2.5 6,-2.5 Z" fill="#C9D4F2" />
          </svg>
          <span style={{ position: 'relative', display: 'inline-block', border: '1px solid rgba(255,255,255,.55)', borderRadius: 3, padding: '3px 9px', fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', color: '#FFFFFF' }}>
            FLASH MARKET
          </span>
          <h2 style={{ position: 'relative', fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 26, lineHeight: 1.25, color: '#FFFFFF', margin: '14px 0 10px', maxWidth: 430 }}>
            {EXPLORE_FLASH.title}
          </h2>
          <p style={{ position: 'relative', color: '#C9D4F2', fontSize: 11.8, lineHeight: 1.6, margin: 0, maxWidth: 440 }}>
            {EXPLORE_FLASH.body}
          </p>
          <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
            <button onClick={() => navigate('/')}
              style={{ background: '#F6D77E', border: 'none', borderRadius: 4, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, color: '#2A1F00', fontFamily: 'var(--wordmark)' }}>
              Trade Now
            </button>
            <button onClick={() => navigate('/news')}
              style={{ background: 'rgba(10,16,40,.55)', border: '1px solid #4A56B0', borderRadius: 4, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, color: '#DCE1FF', fontFamily: 'var(--wordmark)' }}>
              Market Intel
            </button>
          </div>
        </div>

        <div style={{ background: '#0D1226', border: '1px solid #262E4E', borderRadius: 8, padding: 16 }}>
          <div style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 13.5, color: '#F2F5FF', marginBottom: 12 }}>
            Market Intelligence
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MARKET_INTEL.map((a) => (
              <div key={a.label} style={{ background: '#131A33', border: '1px solid #262E4E', borderRadius: 4, padding: '10px 12px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.12em', color: '#F3C74F', marginBottom: 5 }}>{a.label}</div>
                <p style={{ margin: 0, fontSize: 11, lineHeight: 1.55, color: '#C3CBDE' }}>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
