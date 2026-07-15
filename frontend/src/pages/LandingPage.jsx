import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { api } from '../api/client';
import HomeFeedCard from '../components/HomeFeedCard';
import { categoryBucket } from '../lib/categories';
import { MarketGridSkeleton } from '../components/MarketCardSkeleton';
import MajorMarket from '../components/MajorMarket';

const HIPHOP_NAMES = ['carti', 'drake', 'kendrick', 'travis scott', 'don toliver', 'kanye', ' ye ', '21 savage', 'future', 'metro boomin', 'cardi b', 'nicki minaj', 'ice spice', 'lil uzi', 'lil baby', 'gunna', 'yeat', 'ken carson', 'destroy lonely', 'megan thee stallion', 'glorilla', 'latto', 'central cee', 'j. cole', 'j cole', 'lil wayne', '2 chainz', 'young thug', 'asap', 'a$ap', 'tyler'];
const FESTIVAL_WORDS = ['coachella', 'lollapalooza', 'glastonbury', 'rolling loud', 'bonnaroo', 'festival', 'headlin', 'tour', 'concert'];

function inGenre(m, genre) {
  const t = (m.title || '').toLowerCase();
  const bucket = categoryBucket(m.category);
  switch (genre) {
    case 'trending': return true; // newest-first feed, everything
    case 'hiphop': return HIPHOP_NAMES.some((n) => t.includes(n));
    case 'popculture': return bucket === 'trending' || bucket === 'media';
    case 'festivals': return FESTIVAL_WORDS.some((w) => t.includes(w));
    case 'grammys': return m.category === 'awards' || /grammy|oscar|emmy|award|aoty/.test(t);
    default: return true;
  }
}

function leaderOf(market) {
  const outcomes = market.outcomes || [];
  return [...outcomes].sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];
}

function leaderDelta(market, leader) {
  const h = market?.price_history || [];
  if (h.length >= 2 && leader) {
    const last = h[h.length - 1]?.prices?.[leader.id];
    const prev = h[h.length - 2]?.prices?.[leader.id];
    if (typeof last === 'number' && typeof prev === 'number') return last - prev;
  }
  return 0;
}

function compactMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

// "$5k"-style stake for the live-feed sentence (mock uses lowercase k)
function compactStake(n) {
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/* ── News ticker (top of page) — mock format:
   ● TITLE VOL: $1.8M  -7.3%  ── */
function Ticker({ markets }) {
  const items = [...markets]
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 10)
    .map((m) => {
      const leader = leaderOf(m);
      return {
        id: m.id,
        title: (m.title || '').replace(/^will\s+/i, '').replace(/\?+$/, '').slice(0, 30).toUpperCase(),
        vol: compactMoney(m.total_volume || 0),
        delta: leaderDelta(m, leader),
      };
    });

  if (items.length === 0) return null;
  const loop = [...items, ...items]; // duplicated for a seamless marquee

  return (
    <div style={{ overflow: 'hidden', borderBottom: '1px solid #1B2240', background: '#060D24', whiteSpace: 'nowrap' }}>
      <div className="dbm-ticker-track" style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 0' }}>
        {loop.map((it, i) => (
          <span
            key={`${it.id}-${i}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              margin: '0 26px', fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: i % 2 === 0 ? '#F0C04A' : '#4AE176', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: '#DCE1FF', letterSpacing: '0.04em' }}>{it.title}</span>
            <span style={{ color: '#8E94AF' }}>VOL: <span style={{ color: '#DCE1FF' }}>{it.vol}</span></span>
            <span style={{ color: it.delta < 0 ? '#FF7B72' : '#4AE176' }}>
              {it.delta >= 0 ? '+' : ''}{it.delta.toFixed(1)}%
            </span>
          </span>
        ))}
      </div>
      <style>{`
        .dbm-ticker-track { animation: dbm-marquee 48s linear infinite; }
        .dbm-ticker-track:hover { animation-play-state: paused; }
        @keyframes dbm-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}

export default function LandingPage() {
  const { markets, loading } = useMarkets();
  const navigate = useNavigate();
  const [pulse, setPulse] = useState(null); // { paper_volume_traded, markets_active, users }
  const [liveFeed, setLiveFeed] = useState(null);
  const [genre, setGenre] = useState('trending'); // trending | hiphop | popculture | festivals | grammys

  // Ground-truth platform stats: sums the real trade ledger server-side, not
  // a cached per-market field — this is the number that can't drift stale.
  const fetchPulse = useCallback(() => {
    api.getPulse().then((r) => setPulse(r)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchFeed = () => api.getLatestActivity().then((r) => setLiveFeed(r?.item || null)).catch(() => {});
    fetchFeed();
    const feedInterval = setInterval(fetchFeed, 25000);
    window.addEventListener('dobium:trade', fetchFeed);
    fetchPulse();
    // Live-ish updates without a websocket: poll every 20s, and Dobium
    // refetches immediately the moment the current tab places a trade
    // (see the 'dobium:trade' event dispatched from the trade panel).
    const interval = setInterval(fetchPulse, 20000);
    window.addEventListener('dobium:trade', fetchPulse);
    return () => { clearInterval(interval); clearInterval(feedInterval); window.removeEventListener('dobium:trade', fetchPulse); window.removeEventListener('dobium:trade', fetchFeed); };
  }, [fetchPulse]);

  const totalVolume = pulse ? pulse.paper_volume_traded : markets.reduce((s, m) => s + (m.total_volume || 0), 0);

  // Genre-filtered feed, newest first
  const feedMarkets = [...markets]
    .filter((m) => m.status === 'active')
    .filter((m) => inGenre(m, genre))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 12);

  // Trending artists: which names appear across live market titles
  const ARTIST_NAMES = ['Playboi Carti', 'Don Toliver', 'Kendrick Lamar', 'Drake', 'Taylor Swift',
    'Rihanna', 'Kanye', 'Travis Scott', 'SZA', 'Bad Bunny', 'Morgan Wallen', 'Ariana Grande',
    'Billie Eilish', 'The Weeknd', 'Olivia Rodrigo', 'Frank Ocean', 'Beyonc\u00e9', 'Chappell Roan', 'Ice Spice'];
  const trendingArtists = ARTIST_NAMES
    .map((name) => ({ name, count: markets.filter((m) => m.status === 'active' && (m.title || '').toLowerCase().includes(name.toLowerCase())).length }))
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Biggest probability shift across live markets (last two snapshots)
  const biggestShift = markets
    .filter((m) => m.status === 'active' && (m.price_history || []).length >= 2)
    .map((m) => {
      const lead = leaderOf(m);
      const d = Math.round(leaderDelta(m, lead));
      return { name: (m.title || '').replace(/^will\s+/i, '').slice(0, 18), delta: d, abs: Math.abs(d) };
    })
    .sort((a, b) => b.abs - a.abs)[0] || null;

  const feedHeading =
    genre === 'trending' ? 'All Music Markets'
      : genre === 'hiphop' ? 'All Hip Hop Markets'
        : genre === 'popculture' ? 'All Pop Culture Markets'
          : genre === 'festivals' ? 'All Festival Markets'
            : 'All Awards Markets';

  return (
    <div style={{ background: '#0B1229' }}>
      <Ticker markets={markets} />

      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* ── Mock layout: genre sidebar · feed · trending rail ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[190px_minmax(0,1fr)_270px] gap-6" style={{ paddingTop: 8 }}>

          {/* Left: genre navigation */}
          <aside>
            <div className="lg:sticky lg:top-6" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
              <div className="hidden lg:block" style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: '#8E94AF', marginBottom: 8 }}>CATEGORIES</div>
              {[
                { key: 'trending', label: 'Trending', icon: 'local_fire_department' },
                { key: 'hiphop', label: 'Hip Hop', icon: 'mic' },
                { key: 'popculture', label: 'Pop Culture', icon: 'star' },
                { key: 'festivals', label: 'Festivals', icon: 'festival' },
                { key: 'grammys', label: 'Grammys', icon: 'emoji_events' },
              ].map((g) => (
                <button
                  key={g.key}
                  onClick={() => setGenre(g.key)}
                  className="lg:w-full"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                    background: genre === g.key ? '#1E2540' : 'transparent',
                    border: 'none',
                    borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                    color: genre === g.key ? '#DCE1FF' : '#8E94AF',
                    fontWeight: 600, fontSize: 13.5,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 17, color: genre === g.key ? '#DCE1FF' : '#8E94AF' }}>{g.icon}</span>
                  {g.label}
                </button>
              ))}
              {liveFeed && (
                <div className="hidden lg:block" style={{ width: '100%', marginTop: 130, background: '#181E36', border: '1px solid #2D344C', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.1em', color: '#FFDF9B', marginBottom: 7 }}>LIVE FEED</div>
                  <p style={{ color: '#8E94AF', fontSize: 11.5, lineHeight: 1.55, margin: 0 }}>
                    User <span style={{ color: '#DCE1FF', fontWeight: 700 }}>@{String(liveFeed.handle || '').replace(/^@/, '')}</span> just bet{' '}
                    <span style={{ color: '#FFDF9B', fontWeight: 700 }}>{compactStake(Number(liveFeed.stake))}</span> on{' '}
                    <span style={{ color: '#4AE176', fontWeight: 700 }}>{liveFeed.side}</span> for {liveFeed.market}
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* Center: major market + feed */}
          <main style={{ minWidth: 0 }}>
            {!loading && <MajorMarket markets={markets} />}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 14, marginTop: 6 }}>
              <h2 style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 19, color: '#DCE1FF', margin: 0 }}>
                {feedHeading}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => navigate('/explore')} aria-label="Filter markets"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8E94AF', padding: 4, display: 'flex' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>filter_list</span>
                </button>
                <button onClick={() => navigate('/explore')} aria-label="View all markets"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8E94AF', padding: 4, display: 'flex' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>grid_view</span>
                </button>
              </div>
            </div>

            {loading ? (
              <MarketGridSkeleton count={4} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {feedMarkets.map((m) => <HomeFeedCard key={m.id} market={m} />)}
              </div>
            )}
            {!loading && feedMarkets.length === 0 && (
              <p style={{ color: '#8E94AF', fontSize: 13 }}>No markets in this category yet — check Trending.</p>
            )}
          </main>

          {/* Right: trending artists + analytics + customize view */}
          <aside>
            <div className="lg:sticky lg:top-6" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {trendingArtists.length > 0 && (
                <div style={{ background: '#181E36', border: '1px solid #2D344C', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 14.5, color: '#DCE1FF' }}>Trending Artists</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#F0C04A' }}>auto_awesome</span>
                  </div>
                  {trendingArtists.map((a, i) => (
                    <button
                      key={a.name}
                      onClick={() => navigate(`/explore?q=${encodeURIComponent(a.name)}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}
                    >
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#8E94AF', width: 16, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                      <span style={{
                        width: 32, height: 32, borderRadius: 999, background: '#232A45', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#8E94AF', fontWeight: 700, fontSize: 12,
                      }}>{a.name.charAt(0)}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', color: '#DCE1FF', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                        <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 9.5, color: '#8E94AF', marginTop: 2 }}>{a.count} Market{a.count === 1 ? '' : 's'} Live</span>
                      </span>
                      <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#4AE176', flexShrink: 0 }}>trending_up</span>
                    </button>
                  ))}
                  <button onClick={() => navigate('/leagues/leaderboard')}
                    style={{ width: '100%', marginTop: 12, background: '#0B1229', border: '1px solid #2D344C', borderRadius: 6, padding: '9px 0', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: '#8E94AF', fontWeight: 700 }}>
                    VIEW ALL LEADERS
                  </button>
                </div>
              )}

              <div style={{ background: '#181E36', border: '1px solid #2D344C', borderRadius: 10, padding: 16 }}>
                <div style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 14.5, color: '#DCE1FF', marginBottom: 12 }}>Market Analytics</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0B1229', borderRadius: 6, padding: '10px 12px' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.06em', color: '#8E94AF' }}>GLOBAL VOL (24H)</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800, color: '#DCE1FF' }}>{loading && !pulse ? '—' : compactMoney(totalVolume)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0B1229', borderRadius: 6, padding: '10px 12px' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.06em', color: '#8E94AF' }}>ACTIVE TRADERS</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800, color: '#DCE1FF' }}>{pulse?.users != null ? pulse.users.toLocaleString('en-US') : '—'}</span>
                  </div>
                  {biggestShift && (
                    <div style={{ background: '#0B1229', borderRadius: 6, padding: '10px 12px' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.06em', color: '#8E94AF', marginBottom: 5 }}>HIGHEST PROBABILITY SHIFT</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#DCE1FF', fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{biggestShift.name}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 800, color: biggestShift.delta < 0 ? '#FF7B72' : '#4AE176', flexShrink: 0, marginLeft: 8 }}>
                          {biggestShift.delta > 0 ? '+' : ''}{biggestShift.delta}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button onClick={() => navigate('/portfolio')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'linear-gradient(180deg,#FFE9B8,#F0C04A)', border: 'none', borderRadius: 10, padding: '16px 16px', cursor: 'pointer', textAlign: 'left' }}>
                <span>
                  <span style={{ display: 'block', fontWeight: 800, fontSize: 14, color: '#3A2A00' }}>Customize View</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: '#6B5314', marginTop: 4, lineHeight: 1.5 }}>
                    Switch to 'Pro Trader' dashboard for advanced charts
                  </span>
                </span>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#3A2A00', flexShrink: 0 }}>chevron_right</span>
              </button>
            </div>
          </aside>
        </div>

        {loading && (
          <div style={{ marginTop: 72 }}>
            <MarketGridSkeleton count={3} />
          </div>
        )}
      </div>
    </div>
  );
}
