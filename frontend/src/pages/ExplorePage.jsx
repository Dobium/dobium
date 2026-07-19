import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ExploreCard from '../components/ExploreCard';
import { MarketGridSkeleton } from '../components/MarketCardSkeleton';
import { useMarkets } from '../hooks/useMarkets';
import { api } from '../api/client';
import { categoryBucket } from '../lib/categories';
import { EXPLORE_FLASH, MARKET_INTEL } from '../lib/demoContent';

// ── Above-nav stat band (mock): ACTIVE MARKETS · LEADERBOARD TOP · LIVE
// VOLUME on a near-black strip. Rendered by Layout on the /explore route.
function compactPoints(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}

export function ExploreStatBand() {
  const { markets } = useMarkets();
  const [top, setTop] = useState(null);

  useEffect(() => {
    let alive = true;
    api.getGlobalLeaderboard(1)
      .then((r) => {
        const row = Array.isArray(r) ? r[0] : (r?.leaderboard || r?.rows || [])[0];
        if (alive && row) setTop(row);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const activeCount = markets.filter((m) => m.status === 'active').length;
  const liveVol = markets.reduce((sum, m) => sum + (m.total_volume || 0), 0);
  const label = { fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', color: '#CFC5B5' };
  const value = { fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 800, color: '#FFFFFF' };

  return (
    <div style={{ background: '#000B1D', borderBottom: '1px solid #10203A', padding: '8px 26px', overflowX: 'auto', scrollbarWidth: 'none' }}>
      <div className="dbm-navwrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
          <span style={label}>ACTIVE MARKETS:</span>
          <span style={value}>{activeCount.toLocaleString('en-US')}</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
          <span style={label}>LEADERBOARD TOP:</span>
          {top ? (
            <>
              <span style={{ ...value, color: '#4BE176' }}>@{String(top.username || 'trader').replace(/^@/, '')}</span>
              <span style={{ ...value, color: '#4BE176' }}>+{compactPoints(top.total_points)}</span>
            </>
          ) : (
            <span style={{ ...value, color: '#4BE176' }}>—</span>
          )}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#4BE176', flexShrink: 0 }} />
          <span style={label}>LIVE VOLUME:</span>
          <span style={value}>${Math.round(liveVol).toLocaleString('en-US')}</span>
        </span>
      </div>
    </div>
  );
}

// ── Explore Markets — matched to the reference mock ──────────────────────
// Live markets in the mock's crisp card grid, gold-active filter chips
// (search arrives via the nav's ?q= param), and the FLASH MARKET banner +
// Market Intelligence rail underneath.

const CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'trending', label: 'Trending' },
  { id: 'music', label: 'Music' },
  { id: 'media', label: 'Media' },
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
    <div style={{ background: '#00132D', minHeight: '100%' }}>
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '8px 24px 0' }}>

      {/* ── Header: title + subtitle left, filter chips right ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, padding: '28px 0 20px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 'clamp(30px,3.8vw,46px)', color: '#FFFFFF', margin: 0, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
            Explore Markets
          </h1>
          <p style={{ color: '#CFC5B5', fontSize: 13, margin: '8px 0 0' }}>
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
                  fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
                  padding: '8px 18px', borderRadius: 4, cursor: 'pointer',
                  background: active ? '#FFDF9B' : '#001F43',
                  border: active ? '1px solid #FFDF9B' : '1px solid #2F3A4A',
                  color: active ? '#00132D' : '#CFC5B5',
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
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.04em', color: '#8E9AB0' }}>
            Results for "{search}"
          </span>
          <button onClick={clearSearch} aria-label="Clear search"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8E9AB0', padding: 0, display: 'flex' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
          </button>
        </div>
      )}

      {/* ── Markets grid (live data, mock styling) ── */}
      {loading ? (
        <MarketGridSkeleton count={9} />
      ) : filtered.length === 0 ? (
        <p style={{ color: '#8E9AB0', textAlign: 'center', padding: '48px 0' }}>
          No markets match — try another category.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 20 }}>
          {filtered.map((m) => <ExploreCard key={m.id} market={m} />)}
        </div>
      )}

      {/* ── Flash market banner + market intelligence ── */}
      <div className="dbm-explore-flash" style={{ marginTop: 20 }}>
        <div style={{ position: 'relative', overflow: 'hidden', background: '#1B3A62', border: '1px solid #2F4D73', borderRadius: 8, padding: '28px 30px' }}>
          <svg viewBox="0 0 220 140" aria-hidden="true"
            style={{ position: 'absolute', right: -10, top: 0, height: '100%', width: 'auto', opacity: 0.3, pointerEvents: 'none' }}>
            <path d="M8,110 L48,84 L84,96 L124,58 L164,70 L208,26" fill="none" stroke="#5C7FB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M116,30 l3.5,8 8,3.5 -8,3.5 -3.5,8 -3.5,-8 -8,-3.5 8,-3.5 Z" fill="#8FA8D0" />
            <path d="M176,96 l2.5,6 6,2.5 -6,2.5 -2.5,6 -2.5,-6 -6,-2.5 6,-2.5 Z" fill="#8FA8D0" />
          </svg>
          <span style={{ position: 'relative', display: 'inline-block', background: '#FFFFFF', borderRadius: 2, padding: '4px 10px', fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', color: '#00132D' }}>
            FLASH MARKET
          </span>
          <h2 style={{ position: 'relative', fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 'clamp(24px,2.6vw,32px)', lineHeight: 1.22, color: '#FFFFFF', margin: '16px 0 10px', maxWidth: 460 }}>
            {EXPLORE_FLASH.title}
          </h2>
          <p style={{ position: 'relative', color: '#E1C382', fontSize: 12, lineHeight: 1.6, margin: 0, maxWidth: 450 }}>
            {EXPLORE_FLASH.body}
          </p>
          <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
            <button onClick={() => navigate('/')}
              style={{ background: '#FFDF9B', border: 'none', borderRadius: 4, padding: '11px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#00132D', fontFamily: 'var(--wordmark)' }}>
              Trade Now
            </button>
            <button onClick={() => navigate('/terminal')}
              style={{ background: '#00132D', border: '1px solid #2C3E54', borderRadius: 4, padding: '11px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#FFFFFF', fontFamily: 'var(--wordmark)' }}>
              Market Intel
            </button>
          </div>
        </div>

        <div style={{ background: '#182A45', border: '1px solid #2F3A4A', borderRadius: 8, padding: 16 }}>
          <div style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 14, color: '#FFFFFF', marginBottom: 12 }}>
            Market Intelligence
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MARKET_INTEL.map((a) => {
              const tone = /whale/i.test(a.label) ? '#4BE176' : /volatility/i.test(a.label) ? '#E1C382' : '#CFC5B5';
              return (
                <div key={a.label} style={{ background: '#00132D', border: '1px solid #22314A', borderRadius: 4, padding: '11px 13px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', color: tone, marginBottom: 6 }}>{a.label}</div>
                  <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: '#C6D3E8' }}>{a.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
