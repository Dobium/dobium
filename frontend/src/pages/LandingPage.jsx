import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { api } from '../api/client';
import MarketCard from '../components/MarketCard';
import { MarketGridSkeleton } from '../components/MarketCardSkeleton';
import WaitlistCard from '../components/WaitlistCard';

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

/* ── News ticker (top of page, matches mockup) ── */
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
        borderBottom: '1px solid var(--line)',
        background: 'rgba(14,22,49,.8)',
      }}
    >
      <div className="dbm-ticker-track" style={{ display: 'inline-flex', whiteSpace: 'nowrap', padding: '9px 0' }}>
        {loop.map((it, i) => (
          <span
            key={`${it.id}-${i}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 26px', fontSize: 12.5, color: 'var(--text)',
              borderRight: '1px solid rgba(33,48,92,.55)',
            }}
          >
            <span
              style={{
                display: 'inline-block', maxWidth: 250,
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap', verticalAlign: 'middle', fontWeight: 500,
              }}
            >
              {it.title}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: it.delta < 0 ? 'var(--no)' : 'var(--yes)' }}>
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

/* ── Stats strip: one wide card split into three stats (matches mockup) ── */
function StatBlock({ label, value, gold }) {
  return (
    <div style={{ flex: '1 1 180px', padding: '18px 24px' }}>
      <span
        style={{
          display: 'block', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: 6,
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: 'block', fontFamily: 'var(--mono)', fontSize: 26,
          fontWeight: 700, color: gold ? 'var(--gold)' : 'var(--text)',
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
  const topMarkets = [...markets]
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 3);

  const scrollToWaitlist = () =>
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div>
      <Ticker markets={markets} />

      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', padding: '56px 24px 44px', position: 'relative' }}>
          <div
            style={{
              position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
              width: 580, height: 320,
              background: 'radial-gradient(ellipse at center,rgba(240,192,74,.10),transparent 65%)',
              pointerEvents: 'none',
            }}
          />
          <h1
            style={{
              fontFamily: 'var(--wordmark)',
              fontWeight: 700,
              fontSize: 'clamp(34px,5.5vw,58px)',
              lineHeight: 1.12,
              margin: '0 auto 26px',
              maxWidth: 700,
              background: 'linear-gradient(180deg,#FFDF9B,var(--gold-2))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            The entertainment
            <br />
            prediction market
          </h1>

          <p style={{ color: 'var(--muted)', fontSize: 14.5, maxWidth: 520, margin: '0 auto 34px', lineHeight: 1.6 }}>
            Trade on music drops, box office, awards and the biggest moments in culture
            — with $100 paper money.
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 46 }}>
            <button
              onClick={() => navigate('/explore')}
              style={{
                background: 'linear-gradient(180deg,#FFDF9B,var(--gold-2))',
                color: '#1a1405', fontWeight: 700, fontSize: 15,
                border: 'none', borderRadius: 10, padding: '13px 28px',
                cursor: 'pointer', boxShadow: '0 6px 22px rgba(240,192,74,.28)',
              }}
            >
              Start Predicting
            </button>
            <button
              onClick={scrollToWaitlist}
              style={{
                background: 'rgba(17,26,57,.65)', color: 'var(--text)',
                fontWeight: 600, fontSize: 15,
                border: '1px solid var(--line)', borderRadius: 10, padding: '13px 28px',
                cursor: 'pointer',
              }}
            >
              Join Waitlist
            </button>
          </div>

          {/* Stats strip — one wide card, three stats */}
          <div
            style={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'stretch',
              textAlign: 'left', maxWidth: 860, margin: '0 auto',
              background: 'var(--panel)', border: '1px solid var(--line)',
              borderRadius: 12, overflow: 'hidden',
            }}
          >
            <StatBlock label="Paper Volume Traded" value={loading ? '—' : compactMoney(totalVolume)} gold />
            <div style={{ width: 1, background: 'var(--line)' }} />
            <StatBlock label="Live Markets" value={loading ? '—' : markets.length.toLocaleString('en-US')} />
            <div style={{ width: 1, background: 'var(--line)' }} />
            <StatBlock
              label="Waitlist Count"
              value={waitlistCount === null ? '—' : waitlistCount.toLocaleString('en-US')}
            />
          </div>
        </div>
        {/* ── /Hero ── */}

        {/* ── Secure Early Access (waitlist — the #1 priority element) ── */}
        <div id="waitlist" style={{ scrollMarginTop: 24, padding: '10px 0 6px' }}>
          <WaitlistCard />
        </div>

        {/* ── Trending Markets ── */}
        {!loading && topMarkets.length > 0 && (
          <div style={{ marginTop: 56 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 24, color: 'var(--text)', margin: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--gold)' }}>trending_up</span>
                Trending Markets
              </h2>
              <button
                onClick={() => navigate('/explore')}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--gold)', fontWeight: 600, fontSize: 13.5, padding: 0,
                }}
              >
                View All →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
              {topMarkets.map((m) => <MarketCard key={m.id} market={m} />)}
            </div>
          </div>
        )}

        {loading && (
          <div style={{ marginTop: 56 }}>
            <MarketGridSkeleton count={3} />
          </div>
        )}
      </div>
    </div>
  );
}
