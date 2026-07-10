import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { api } from '../api/client';
import TrendingMarketCard from '../components/TrendingMarketCard';
import { MarketGridSkeleton } from '../components/MarketCardSkeleton';
import WaitlistCard from '../components/WaitlistCard';
import FeaturedCarousel from '../components/FeaturedCarousel';

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

  useEffect(() => {
    api.getWaitlistCount()
      .then((r) => setWaitlistCount(typeof r?.count === 'number' ? r.count : WAITLIST_FALLBACK))
      .catch(() => setWaitlistCount(WAITLIST_FALLBACK));
  }, []);

  const totalVolume = markets.reduce((s, m) => s + (m.total_volume || 0), 0);
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
      <Ticker markets={markets} />

      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', padding: '68px 24px 0' }}>
          <h1
            style={{
              fontFamily: 'var(--wordmark)',
              fontWeight: 600,
              fontSize: 'clamp(36px,5.5vw,58px)',
              lineHeight: 1.15,
              margin: '0 auto 44px',
              maxWidth: 720,
              color: '#FFDF9B',
            }}
          >
            The entertainment
            <br />
            prediction market
          </h1>

          <p style={{ color: '#D2C5AF', fontSize: 13.5, margin: '-26px auto 34px', maxWidth: 460 }}>
            High-stakes predictions on the culture that moves you.
          </p>

          {/* Featured trending carousel (mockup) */}
          {!loading && (
            <div style={{ marginBottom: 44, maxWidth: 1120, marginLeft: 'auto', marginRight: 'auto' }}>
              <FeaturedCarousel markets={markets} />
            </div>
          )}

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 96 }}>
            <button
              onClick={() => navigate('/explore')}
              style={{
                background: '#F0C04A',
                color: '#4A3600',
                fontFamily: 'var(--mono)',
                fontWeight: 600, fontSize: 13.5,
                border: 'none', borderRadius: 4,
                padding: '12px 22px',
                cursor: 'pointer',
              }}
            >
              Start Predicting
            </button>
            <button
              onClick={scrollToWaitlist}
              style={{
                background: 'transparent',
                color: '#DCE1FF',
                fontFamily: 'var(--mono)',
                fontWeight: 500, fontSize: 13.5,
                border: '1px solid #33312E', borderRadius: 4,
                padding: '12px 22px',
                cursor: 'pointer',
              }}
            >
              Join Waitlist for Real Money
            </button>
          </div>

          {/* Stats strip */}
          <div
            style={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'stretch',
              textAlign: 'left',
              background: '#181E36',
              borderRadius: 6, overflow: 'hidden',
              marginBottom: 40,
            }}
          >
            <StatBlock label="Paper Volume Traded" value={loading ? '—' : compactMoney(totalVolume)} gold />
            <div style={{ width: 1, background: '#313136' }} />
            <StatBlock label="Live Markets" value={loading ? '—' : markets.length.toLocaleString('en-US')} />
            <div style={{ width: 1, background: '#313136' }} />
            <StatBlock
              label="Waitlist Count"
              value={waitlistCount === null ? '—' : waitlistCount.toLocaleString('en-US')}
            />
          </div>
        </div>
        {/* ── /Hero ── */}

        {/* ── Secure Early Access (waitlist — the #1 priority element) ── */}
        <div id="waitlist" style={{ scrollMarginTop: 24 }}>
          <WaitlistCard />
        </div>

        {/* ── Trending Markets ── */}
        {!loading && topMarkets.length > 0 && (
          <div style={{ marginTop: 72, marginBottom: 40 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 8,
                borderBottom: '1px solid #33312E',
                paddingBottom: 14, marginBottom: 28,
              }}
            >
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 19, color: '#DCE1FF', margin: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#FFDF9B' }}>trending_up</span>
                Trending Markets
              </h2>
              <button
                onClick={() => navigate('/explore')}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#D2C5AF', fontFamily: 'var(--mono)', fontSize: 12, padding: 0,
                }}
              >
                View All →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
              {topMarkets.map((m) => <TrendingMarketCard key={m.id} market={m} />)}
            </div>
          </div>
        )}

        {loading && (
          <div style={{ marginTop: 72 }}>
            <MarketGridSkeleton count={3} />
          </div>
        )}
      </div>
    </div>
  );
}
