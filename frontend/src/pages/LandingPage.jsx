import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { api } from '../api/client';
import HomeFeedCard from '../components/HomeFeedCard';
import { categoryBucket } from '../lib/categories';
import { MarketGridSkeleton } from '../components/MarketCardSkeleton';
import MajorMarket from '../components/MajorMarket';
import { DEMO_PARITY, DEMO_HERO, DEMO_FEED, DEMO_TICKER, DEMO_ARTISTS, DEMO_ANALYTICS, DEMO_LIVE_FEED } from '../lib/demoContent';

const HIPHOP_NAMES = ['carti', 'drake', 'kendrick', 'travis scott', 'don toliver', 'kanye', ' ye ', '21 savage', 'future', 'metro boomin', 'cardi b', 'nicki minaj', 'ice spice', 'lil uzi', 'lil baby', 'gunna', 'yeat', 'ken carson', 'destroy lonely', 'megan thee stallion', 'glorilla', 'latto', 'central cee', 'j. cole', 'j cole', 'lil wayne', '2 chainz', 'young thug', 'asap', 'a$ap', 'tyler'];
const FESTIVAL_WORDS = ['coachella', 'lollapalooza', 'glastonbury', 'rolling loud', 'bonnaroo', 'festival', 'headlin', 'tour', 'concert'];
const MOVIE_WORDS = ['movie', 'film', 'box office', 'trailer', ' tv ', 'series', 'season ', 'netflix', 'hbo', 'streaming service', 'oscar', 'emmy', 'golden globe', 'documentary', 'premiere', 'sequel'];
const SOCIAL_WORDS = ['tiktok', 'viral', 'instagram', 'twitter', 'youtube', 'meme', 'trend', 'followers', 'streams', 'spotify', 'billboard', 'hot 100'];

function inGenre(m, genre) {
  const t = (m.title || '').toLowerCase();
  const bucket = categoryBucket(m.category);
  switch (genre) {
    case 'trending': return true; // newest-first feed, everything
    case 'music': return bucket === 'music' || HIPHOP_NAMES.some((n) => t.includes(n)) || /album|single|song|tour|artist|rapper|grammy|aoty|billboard/.test(t);
    case 'moviestv': return bucket === 'media' || MOVIE_WORDS.some((w) => t.includes(w));
    case 'socialtrends': return bucket === 'trending' || SOCIAL_WORDS.some((w) => t.includes(w));
    case 'festivals': return FESTIVAL_WORDS.some((w) => t.includes(w));
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

function trimFixed(x) {
  const v = x.toFixed(1);
  return v.endsWith('.0') ? v.slice(0, -2) : v;
}

function compactMoney(n) {
  if (n >= 1_000_000) return `$${trimFixed(n / 1_000_000)}M`;
  if (n >= 1_000) return `$${trimFixed(n / 1_000)}K`;
  return `$${(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

// "$5k"-style stake for the live-feed sentence (mock uses lowercase k)
function compactStake(n) {
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/* ── Top ticker — mock format on near-black:
   ● KENDRICK LAMAR VOL: $4.2M +12.4% ── */
function Ticker({ markets, fixedItems }) {
  const items = fixedItems || [...markets]
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 10)
    .map((m) => {
      const leader = leaderOf(m);
      return {
        id: m.id,
        label: `${(m.title || '').replace(/^will\s+/i, '').replace(/\?+$/, '').slice(0, 30).toUpperCase()} VOL:`,
        value: compactMoney(m.total_volume || 0),
        delta: leaderDelta(m, leader),
      };
    });

  if (items.length === 0) return null;
  const loop = [...items, ...items]; // duplicated for a seamless marquee

  return (
    <div style={{ overflow: 'hidden', background: '#070D1F', whiteSpace: 'nowrap' }}>
      <div className="dbm-ticker-track" style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 0' }}>
        {loop.map((it, i) => (
          <span
            key={`${it.id}-${i}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              margin: '0 34px', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#3DDC84', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: '#E8ECFF' }}>{it.label}</span>
            <span style={{ color: '#FFFFFF', fontWeight: 800 }}>{it.value}</span>
            <span style={{ color: it.delta < 0 ? '#F0655B' : '#3DDC84', fontWeight: 800 }}>
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

const CATEGORIES = [
  { key: 'trending', label: 'Trending', icon: 'trending_up' },
  { key: 'music', label: 'Music', icon: 'music_note' },
  { key: 'moviestv', label: 'Movies & TV', icon: 'movie' },
  { key: 'socialtrends', label: 'Social Trends', icon: 'tag' },
  { key: 'festivals', label: 'Festivals', icon: 'account_balance' },
];

export default function LandingPage() {
  const { markets, loading } = useMarkets();
  const navigate = useNavigate();
  const [pulse, setPulse] = useState(null); // { paper_volume_traded, markets_active, users }
  const [liveFeed, setLiveFeed] = useState(null);
  const [genre, setGenre] = useState('trending'); // trending | music | moviestv | socialtrends | festivals

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

  const demo = DEMO_PARITY;
  const totalVolume = pulse ? pulse.paper_volume_traded : markets.reduce((s, m) => s + (m.total_volume || 0), 0);
  const shownLiveFeed = demo ? DEMO_LIVE_FEED : liveFeed;

  // Genre-filtered feed, newest first
  const feedMarkets = [...(demo ? DEMO_FEED : markets)]
    .filter((m) => m.status === 'active')
    .filter((m) => inGenre(m, genre))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 12);

  // Trending artists: which names appear across live market titles
  const ARTIST_NAMES = ['Playboi Carti', 'Don Toliver', 'Kendrick Lamar', 'Drake', 'Taylor Swift',
    'Rihanna', 'Kanye', 'Travis Scott', 'SZA', 'Bad Bunny', 'Morgan Wallen', 'Ariana Grande',
    'Billie Eilish', 'The Weeknd', 'Olivia Rodrigo', 'Frank Ocean', 'Beyonc\u00e9', 'Chappell Roan', 'Ice Spice'];
  const trendingArtists = demo ? DEMO_ARTISTS : ARTIST_NAMES
    .map((name) => {
      const theirs = markets.filter((m) => m.status === 'active' && (m.title || '').toLowerCase().includes(name.toLowerCase()));
      const momentum = theirs.reduce((s2, m) => s2 + leaderDelta(m, leaderOf(m)), 0);
      return { name, count: theirs.length, momentum };
    })
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Biggest probability shift across live markets (last two snapshots)
  const biggestShift = demo ? DEMO_ANALYTICS.shift : markets
    .filter((m) => m.status === 'active' && (m.price_history || []).length >= 2)
    .map((m) => {
      const lead = leaderOf(m);
      const d = Math.round(leaderDelta(m, lead));
      return { name: (m.title || '').replace(/^will\s+/i, '').slice(0, 18), delta: d, abs: Math.abs(d) };
    })
    .sort((a, b) => b.abs - a.abs)[0] || null;

  const feedHeading = {
    trending: 'All Music Markets',
    music: 'All Music Markets',
    moviestv: 'All Movies & TV Markets',
    socialtrends: 'All Social Trends Markets',
    festivals: 'All Festival Markets',
  }[genre] || 'All Music Markets';

  const liveFeedCard = shownLiveFeed && (
    <div style={{ background: '#131A33', border: '1px solid #262E4E', borderRadius: 8, padding: 13 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em', color: '#F3C74F', marginBottom: 8 }}>LIVE FEED</div>
      <p style={{ color: '#8E94AF', fontSize: 11.5, lineHeight: 1.6, margin: 0 }}>
        User <span style={{ color: '#F2F5FF', fontWeight: 700 }}>@{String(shownLiveFeed.handle || '').replace(/^@/, '')}</span> just traded{' '}
        <span style={{ color: '#F3C74F', fontWeight: 700 }}>{compactStake(Number(shownLiveFeed.stake))}</span> on{' '}
        <span style={{ color: '#3DDC84', fontWeight: 700 }}>{shownLiveFeed.side}</span> for {shownLiveFeed.market}
      </p>
    </div>
  );

  return (
    <div style={{ background: '#0A1128' }}>
      <Ticker markets={markets} fixedItems={demo ? DEMO_TICKER : null} />

      {/* ── Mock structure: full-height bordered sidebar · content (main + rail) ── */}
      <div className="dbm-shell" style={{ display: 'flex', alignItems: 'stretch' }}>

        {/* Left: full-height category rail (desktop) */}
        <aside className="dbm-side" style={{ width: 264, flexShrink: 0, borderRight: '1px solid #1B2240' }}>
          <div style={{ padding: '18px 14px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: '#AEB6D2', margin: '0 0 12px 6px' }}>CATEGORIES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {CATEGORIES.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setGenre(g.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', width: '100%',
                    background: genre === g.key ? '#3A4262' : 'transparent',
                    border: 'none',
                    borderRadius: 8, padding: '13px 14px', cursor: 'pointer',
                    color: genre === g.key ? '#B7C1EE' : '#C9C5BA',
                    fontWeight: 600, fontSize: 16.5,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: genre === g.key ? '#B7C1EE' : '#C9C5BA' }}>{g.icon}</span>
                  {g.label}
                </button>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #1B2240', marginTop: 56, paddingTop: 18 }}>
              {liveFeedCard}
            </div>
          </div>
        </aside>

        {/* Content column */}
        <div style={{ flex: 1, minWidth: 0, padding: '18px 22px 0' }}>

          {/* Mobile category chips */}
          <div className="dbm-chips" style={{ gap: 6, marginBottom: 16 }}>
            {CATEGORIES.map((g) => (
              <button
                key={g.key}
                onClick={() => setGenre(g.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: genre === g.key ? '#3A4262' : 'transparent',
                  border: 'none', borderRadius: 8, padding: '9px 12px', cursor: 'pointer',
                  color: genre === g.key ? '#B7C1EE' : '#C9C5BA',
                  fontWeight: 600, fontSize: 13.5,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{g.icon}</span>
                {g.label}
              </button>
            ))}
          </div>

          <div className="dbm-main-grid">

            {/* Center: major market + feed */}
            <main style={{ minWidth: 0 }}>
              {(demo || !loading) && <MajorMarket markets={demo ? [DEMO_HERO] : markets} />}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 22, color: '#F2F5FF', margin: 0 }}>
                  {feedHeading}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => navigate('/explore')} aria-label="Filter markets"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7E86A6', padding: 4, display: 'flex' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 19 }}>filter_list</span>
                  </button>
                  <button onClick={() => navigate('/explore')} aria-label="View all markets"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7E86A6', padding: 4, display: 'flex' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 19 }}>grid_view</span>
                  </button>
                </div>
              </div>

              {!demo && loading ? (
                <MarketGridSkeleton count={4} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {feedMarkets.map((m) => <HomeFeedCard key={m.id} market={m} />)}
                </div>
              )}
              {(demo || !loading) && feedMarkets.length === 0 && (
                <p style={{ color: '#7E86A6', fontSize: 13 }}>No markets in this category yet — check Trending.</p>
              )}

              {/* Live feed shown inline on mobile where the sidebar is hidden */}
              <div className="dbm-mobile-only" style={{ marginTop: 18 }}>
                {liveFeedCard}
              </div>
            </main>

            {/* Right rail */}
            <aside>
              <div className="dbm-rail" style={{ display: 'flex', flexDirection: 'column', gap: 44 }}>
                {trendingArtists.length > 0 && (
                  <div style={{ background: '#161D3A', border: '1px solid #2A3352', borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingBottom: 10, borderBottom: '1px solid #2A3352' }}>
                      <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 13.5, color: '#E8ECFF' }}>Trending Artists</span>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#F3C74F' }}>auto_awesome</span>
                    </div>
                    {trendingArtists.map((a, i) => (
                      <button
                        key={a.name}
                        onClick={() => navigate(`/explore?q=${encodeURIComponent(a.name)}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0' }}
                      >
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: '#6E7694', width: 18, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                        <span style={{
                          width: 34, height: 34, borderRadius: 999, background: '#2A346B', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#8FA0E8', fontWeight: 700, fontSize: 12.5,
                        }}>{a.name.charAt(0)}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', color: '#F2F5FF', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                          <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 9.5, color: '#8E94AF', marginTop: 3 }}>{a.count} Market{a.count === 1 ? '' : 's'} Live</span>
                        </span>
                        <span className="material-symbols-outlined" style={{ fontSize: 15, color: a.momentum < 0 ? '#F0857B' : '#3DDC84', flexShrink: 0 }}>{a.momentum < 0 ? 'trending_down' : 'trending_up'}</span>
                      </button>
                    ))}
                    <button onClick={() => navigate('/leagues/leaderboard')}
                      style={{ width: '100%', marginTop: 12, background: '#0D1329', border: '1px solid #2A3352', borderRadius: 6, padding: '10px 0', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.16em', color: '#AEB6D6' }}>
                      VIEW ALL LEADERS
                    </button>
                  </div>
                )}

                <div style={{ background: '#161D3A', border: '1px solid #2A3352', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 13.5, color: '#F3C74F', marginBottom: 12 }}>Market Analytics</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#10172E', border: '1px solid #2A3352', borderRadius: 4, padding: '11px 12px' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#8E94AF' }}>GLOBAL VOL (24H)</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 800, color: '#F2F5FF' }}>{demo ? DEMO_ANALYTICS.globalVol : (loading && !pulse ? '—' : compactMoney(totalVolume))}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#10172E', border: '1px solid #2A3352', borderRadius: 4, padding: '11px 12px' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#8E94AF' }}>ACTIVE TRADERS</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 800, color: '#F2F5FF' }}>{demo ? DEMO_ANALYTICS.traders : (pulse?.users != null ? pulse.users.toLocaleString('en-US') : '—')}</span>
                    </div>
                    {biggestShift && (
                      <div style={{ background: '#10172E', border: '1px solid #2A3352', borderRadius: 4, padding: '11px 12px' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#8E94AF', marginBottom: 6 }}>HIGHEST PROBABILITY SHIFT</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: '#F2F5FF', fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{biggestShift.name}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 800, color: biggestShift.delta < 0 ? '#F0655B' : '#3DDC84', flexShrink: 0, marginLeft: 8 }}>
                            {biggestShift.delta > 0 ? '+' : ''}{biggestShift.delta}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button onClick={() => navigate('/portfolio')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#F3C74F', border: 'none', borderRadius: 8, padding: '14px 14px', cursor: 'pointer', textAlign: 'left' }}>
                  <span>
                    <span style={{ display: 'block', fontWeight: 800, fontSize: 13.5, color: '#2A1F00' }}>Customize View</span>
                    <span style={{ display: 'block', fontSize: 11, color: '#5C4A10', marginTop: 4, lineHeight: 1.45 }}>
                      Switch to 'Pro Trader' dashboard for advanced charts.
                    </span>
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#2A1F00', flexShrink: 0 }}>chevron_right</span>
                </button>
              </div>
            </aside>
          </div>

          {!demo && loading && (
            <div style={{ marginTop: 72 }}>
              <MarketGridSkeleton count={3} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
