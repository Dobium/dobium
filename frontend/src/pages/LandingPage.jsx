import { useState, useEffect, useCallback } from 'react';
import FlipNumber from '../components/FlipNumber';
import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { api } from '../api/client';
import HomeFeedCard from '../components/HomeFeedCard';
import { categoryBucket } from '../lib/categories';
import { MarketGridSkeleton } from '../components/MarketCardSkeleton';
import WaitlistCard from '../components/WaitlistCard';
import FeaturedCarousel from '../components/FeaturedCarousel';
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

// Shown if the live waitlist count can't be fetched.
const WAITLIST_FALLBACK = 347;

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

/* ── News ticker (top of page) ── */
function VolumeBar({ pulse }) {
  if (!pulse) return null;
  const items = [
    { label: 'DOBIUM PAPER VOLUME', value: pulse.paper_volume_traded, gold: true },
    { label: 'KALSHI 24H VOLUME', value: pulse.kalshi_24h_volume },
    { label: 'POLYMARKET 24H VOLUME', value: pulse.polymarket_24h_volume },
  ].filter((i) => i.value != null);
  if (items.length === 0) return null;
  const loop = [...items, ...items, ...items, ...items]; // seamless marquee
  return (
    <div style={{ overflow: 'hidden', background: '#060D24', borderBottom: '1px solid #1B2240', whiteSpace: 'nowrap' }}>
      <div className="dbm-ticker-track" style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 0' }}>
        {loop.map((it, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, margin: '0 26px', fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: it.gold ? '#F0C04A' : '#4A5378', display: 'inline-block' }} />
            <span style={{ color: it.gold ? '#FFDF9B' : '#8E94AF', letterSpacing: '0.05em' }}>{it.label}:</span>
            <span style={{ color: it.gold ? '#FFDF9B' : '#DCE1FF' }}>{compactMoney(it.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Ticker({ markets }) {
  const items = [...markets]
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 10)
    .map((m) => {
      const leader = leaderOf(m);
      return {
        id: m.id,
        title: m.title,
        pct: Math.round(leader?.probability || 0),
        delta: leaderDelta(m, leader),
      };
    });

  if (items.length === 0) return null;
  const loop = [...items, ...items]; // duplicated for a seamless marquee

  return (
    <div
      style={{
        overflow: 'hidden',
        borderBottom: '1px solid #33312E',
        background: '#0B1229',
      }}
    >
      <div className="dbm-ticker-track" style={{ display: 'inline-flex', whiteSpace: 'nowrap', padding: '9px 0' }}>
        {loop.map((it, i) => (
          <span
            key={`${it.id}-${i}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 26px', fontSize: 12, color: '#DCE1FF',
              fontFamily: 'var(--mono)',
              borderRight: '1px solid rgba(45,52,76,.55)',
            }}
          >
            <span
              style={{
                display: 'inline-block', maxWidth: 250,
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap', verticalAlign: 'middle',
              }}
            >
              {it.title}
            </span>
            <span style={{ fontWeight: 700, color: it.delta < 0 ? '#FFB4AB' : '#64EB87' }}>
              {it.pct}¢ {it.delta < 0 ? '▼' : '▲'}
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

/* ── Stats strip: one wide card, three stats with vertical dividers ── */
function StatBlock({ label, value, gold }) {
  return (
    <div style={{ flex: '1 1 180px', padding: '20px 28px' }}>
      <span
        style={{
          display: 'block', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: '#D2C5AF', marginBottom: 8,
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: 'block', fontFamily: 'var(--mono)', fontSize: 27,
          fontWeight: 500, color: gold ? '#FFDF9B' : '#DCE1FF',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function LandingPage() {
  const { markets, loading } = useMarkets();
  const navigate = useNavigate();
  const [waitlistCount, setWaitlistCount] = useState(null);
  const [pulse, setPulse] = useState(null); // { paper_volume_traded, markets_active }
  const [liveFeed, setLiveFeed] = useState(null);
  const [genre, setGenre] = useState('trending'); // trending | hiphop | popculture | festivals | grammys

  // Ground-truth platform stats: sums the real trade ledger server-side, not
  // a cached per-market field — this is the number that can't drift stale.
  const fetchPulse = useCallback(() => {
    api.getPulse()
      .then((r) => { setPulse(r); if (typeof r?.waitlist === 'number') setWaitlistCount(r.waitlist); })
      .catch(() => {});
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

  useEffect(() => {
    if (pulse) return; // pulse (once loaded) already carries an authoritative waitlist count
    api.getWaitlistCount()
      .then((r) => setWaitlistCount(typeof r?.count === 'number' ? r.count : WAITLIST_FALLBACK))
      .catch(() => setWaitlistCount(WAITLIST_FALLBACK));
  }, [pulse]);

  const totalVolume = pulse ? pulse.paper_volume_traded : markets.reduce((s, m) => s + (m.total_volume || 0), 0);
  const liveMarketsCount = pulse ? pulse.markets_active : markets.length;

  // Genre-filtered feed, newest first
  const feedMarkets = [...markets]
    .filter((m) => m.status === 'active')
    .filter((m) => inGenre(m, genre))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 12);

  // Trending artists: which names appear across live market titles
  const ARTIST_NAMES = ['Playboi Carti', 'Don Toliver', 'Kendrick Lamar', 'Drake', 'Taylor Swift',
    'Rihanna', 'Kanye', 'Travis Scott', 'SZA', 'Bad Bunny', 'Morgan Wallen', 'Ariana Grande',
    'Billie Eilish', 'The Weeknd', 'Olivia Rodrigo', 'Frank Ocean', 'Beyonc\u00e9'];
  const trendingArtists = ARTIST_NAMES
    .map((name) => ({ name, count: markets.filter((m) => m.status === 'active' && (m.title || '').toLowerCase().includes(name.toLowerCase())).length }))
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Biggest probability shift across live markets (last two snapshots)
  const biggestShift = markets
    .filter((m) => m.status === 'active' && (m.price_history || []).length >= 2)
    .map((m) => {
      const lead = leaderOf(m);
      const d = Math.round(leaderDelta(m, lead));
      return { name: (m.title || '').replace(/^will\s+/i, '').slice(0, 18), delta: d, abs: Math.abs(d) };
    })
    .sort((a, b) => b.abs - a.abs)[0] || null;
  // Newest markets first — a trending site must show what's NEW, not let old
  // demo markets squat the homepage on stale volume forever.
  const topMarkets = [...markets]
    .filter((m) => m.status === 'active')
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 3);

  const scrollToWaitlist = () =>
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div style={{ background: '#0B1229' }}>
      <VolumeBar pulse={pulse} />
      <Ticker markets={markets} />

      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* ── Community-first layout: genre sidebar · feed · trending rail ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_270px] gap-6" style={{ paddingTop: 26 }}>

          {/* Left: genre navigation */}
          <aside>
            <div className="lg:sticky lg:top-6" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <div className="hidden lg:block" style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: '#948D87', marginBottom: 8 }}>CATEGORIES</div>
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
                    background: genre === g.key ? '#181E36' : 'transparent',
                    border: 'none',
                    borderLeft: genre === g.key ? '2px solid #F0C04A' : '2px solid transparent',
                    borderRadius: 6, padding: '9px 12px', cursor: 'pointer',
                    color: genre === g.key ? '#DCE1FF' : '#8E94AF',
                    fontWeight: 600, fontSize: 13.5,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 17, color: genre === g.key ? '#FFDF9B' : '#8E94AF' }}>{g.icon}</span>
                  {g.label}
                </button>
              ))}
              {liveFeed && (
                <div className="hidden lg:block" style={{ width: '100%', marginTop: 22, background: '#181E36', border: '1px solid #33312E', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.1em', color: '#FFDF9B', marginBottom: 7 }}>LIVE FEED</div>
                  <p style={{ color: '#8E94AF', fontSize: 11.5, lineHeight: 1.55, margin: 0 }}>
                    <span style={{ color: '#DCE1FF', fontWeight: 700 }}>{liveFeed.handle}</span> just bet{' '}
                    <span style={{ color: '#FFDF9B', fontWeight: 700 }}>${Number(liveFeed.stake).toLocaleString('en-US')}</span> on{' '}
                    <span style={{ color: '#4AE176', fontWeight: 700 }}>{liveFeed.side}</span> for {liveFeed.market}
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* Center: brand line + featured + feed */}
          <main style={{ minWidth: 0 }}>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 22, color: '#FFDF9B', margin: 0 }}>
                The entertainment prediction market
              </h1>
              <p style={{ color: '#948D87', fontSize: 12.5, margin: '5px 0 0' }}>
                High-stakes paper predictions on the culture that moves you.
              </p>
            </div>

            {!loading && <MajorMarket markets={markets} />}

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid #33312E', paddingBottom: 10, marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 16, color: '#DCE1FF', margin: 0 }}>
                {genre === 'trending' ? 'All Markets' : genre === 'hiphop' ? 'All Hip Hop Markets' : genre === 'popculture' ? 'All Pop Culture Markets' : genre === 'festivals' ? 'All Festival Markets' : 'All Awards Markets'}
              </h2>
              <button onClick={() => navigate('/explore')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#D2C5AF', fontFamily: 'var(--mono)', fontSize: 11.5, padding: 0 }}>
                View all →
              </button>
            </div>

            {loading ? (
              <MarketGridSkeleton count={4} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {feedMarkets.map((m) => <HomeFeedCard key={m.id} market={m} />)}
              </div>
            )}
            {!loading && feedMarkets.length === 0 && (
              <p style={{ color: '#948D87', fontSize: 13 }}>No markets in this category yet — check Trending.</p>
            )}
          </main>

          {/* Right: trending artists + analytics */}
          <aside>
            <div className="lg:sticky lg:top-6" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {trendingArtists.length > 0 && (
                <div style={{ background: '#181E36', border: '1px solid #33312E', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: '#948D87', marginBottom: 12 }}>TRENDING ARTISTS</div>
                  {trendingArtists.map((a, i) => (
                    <button
                      key={a.name}
                      onClick={() => navigate(`/explore?q=${encodeURIComponent(a.name)}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 0' }}
                    >
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#FFDF9B', width: 18 }}>{i + 1}</span>
                      <span style={{ color: '#DCE1FF', fontSize: 13, fontWeight: 600, flex: 1 }}>{a.name}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: '#948D87' }}>{a.count} Market{a.count === 1 ? '' : 's'} Live</span>
                    </button>
                  ))}
                  <button onClick={() => navigate('/explore')}
                    style={{ width: '100%', marginTop: 10, background: '#0B1229', border: '1px solid #33312E', borderRadius: 6, padding: '9px 0', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.08em', color: '#D2C5AF', fontWeight: 700 }}>
                    VIEW ALL MARKETS
                  </button>
                </div>
              )}

              <div style={{ background: '#181E36', border: '1px solid #33312E', borderRadius: 10, padding: 16 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: '#948D87', marginBottom: 12 }}>MARKET ANALYTICS</div>
                {[
                  ['GLOBAL PAPER VOL', loading && !pulse ? '—' : compactMoney(totalVolume)],
                  ['ACTIVE TRADERS', pulse?.users != null ? pulse.users.toLocaleString('en-US') : '—'],
                  ['LIVE MARKETS', loading && !pulse ? '—' : liveMarketsCount.toLocaleString('en-US')],
                  ...(biggestShift ? [['BIGGEST SHIFT', `${biggestShift.name} ${biggestShift.delta > 0 ? '+' : ''}${biggestShift.delta}%`]] : []),
                  ...(pulse?.kalshi_24h_volume != null ? [['KALSHI 24H', compactMoney(pulse.kalshi_24h_volume)]] : []),
                  ...(pulse?.polymarket_24h_volume != null ? [['POLYMARKET 24H', compactMoney(pulse.polymarket_24h_volume)]] : []),
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontFamily: 'var(--mono)', fontSize: 12 }}>
                    <span style={{ color: '#948D87' }}>{label}</span>
                    <span style={{ color: '#DCE1FF', fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
              </div>

              <button onClick={scrollToWaitlist}
                style={{ background: 'linear-gradient(180deg,#FFE9B8,#F0C04A)', border: 'none', borderRadius: 10, padding: 16, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: '#3A2A00' }}>Customize View</div>
                <div style={{ fontSize: 11.5, color: '#6B5314', marginTop: 4, lineHeight: 1.5 }}>
                  Pro Trader dashboard with advanced charts and instant artist alerts — coming soon. Join the waitlist for early access.
                </div>
              </button>
            </div>
          </aside>
        </div>

        {/* ── Stats strip ── */}
        <div
          style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'stretch',
            textAlign: 'left',
            background: '#181E36',
            borderRadius: 6, overflow: 'hidden',
            margin: '48px 0 40px',
          }}
        >
          <StatBlock label="Paper Volume Traded" value={loading && !pulse ? '—' : <FlipNumber text={compactMoney(totalVolume)} />} gold />
          <div style={{ width: 1, background: '#313136' }} />
          <StatBlock label="Live Markets" value={loading && !pulse ? '—' : <FlipNumber text={liveMarketsCount.toLocaleString('en-US')} />} />
          <div style={{ width: 1, background: '#313136' }} />
          <StatBlock
            label="Waitlist Count"
            value={waitlistCount === null ? '—' : <FlipNumber text={waitlistCount.toLocaleString('en-US')} />}
          />
          {pulse?.kalshi_24h_volume != null && (
            <>
              <div style={{ width: 1, background: '#313136' }} />
              <StatBlock label="Kalshi 24h Volume" value={<FlipNumber text={compactMoney(pulse.kalshi_24h_volume)} />} />
            </>
          )}
        </div>

        {/* ── Secure Early Access (waitlist — the #1 priority element) ── */}
        <div id="waitlist" style={{ scrollMarginTop: 24 }}>
          <WaitlistCard />
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
