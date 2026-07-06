import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { api } from '../api/client';
import MarketCard from '../components/MarketCard';
import { MarketGridSkeleton } from '../components/MarketCardSkeleton';
import WaitlistCard from '../components/WaitlistCard';

// Shown in the hero stats until the live waitlist count loads.
const WAITLIST_COUNT_FALLBACK = 347;

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
        background: 'rgba(18,23,41,.85)',
      }}
    >
      <div className="dbm-ticker-track" style={{ display: 'inline-flex', whiteSpace: 'nowrap', padding: '8px 0' }}>
        {loop.map((it, i) => (
          <span
            key={`${it.id}-${i}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 22px', fontSize: 11.5,
              fontFamily: 'var(--mono)', color: 'var(--muted)',
              borderRight: '1px solid var(--line)',
            }}
          >
            <span
              style={{
                display: 'inline-block', maxWidth: 250,
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap', verticalAlign: 'middle', color: 'var(--text)',
              }}
            >
              {it.title}
            </span>
            <span style={{ fontWeight: 600, color: it.delta < 0 ? 'var(--no)' : 'var(--yes)' }}>
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

export default function LandingPage() {
  const { markets, loading } = useMarkets();
  const navigate = useNavigate();
  const [waitlistCount, setWaitlistCount] = useState(null);

  useEffect(() => {
    api.getWaitlistCount()
      .then(d => setWaitlistCount(d?.count ?? null))
      .catch(() => setWaitlistCount(null));
  }, []);

  const totalVolume = markets.reduce((s, m) => s + (m.total_volume || 0), 0);
  const topMarkets = [...markets]
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 3);

  const scrollToWaitlist = () =>
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const volLabel = totalVolume >= 1000000
    ? `$${(totalVolume / 1000000).toFixed(1)}M`
    : totalVolume >= 1000
      ? `$${(totalVolume / 1000).toFixed(1)}K`
      : `$${totalVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <div>
      <Ticker markets={markets} />

      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', padding: '84px 24px 64px', position: 'relative' }}>
          <div
            style={{
              position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
              width: 640, height: 340,
              background: 'radial-gradient(ellipse at center,rgba(232,196,104,.08),transparent 65%)',
              pointerEvents: 'none',
            }}
          />
          <h1 style={{
            fontFamily: 'var(--wordmark)', fontWeight: 400,
            fontSize: 'clamp(34px,5.4vw,52px)', lineHeight: 1.18,
            margin: '0 0 20px', color: 'var(--text)',
          }}>
            The entertainment<br />
            <span style={{
              background: 'linear-gradient(180deg, var(--gold-text), var(--gold-2))',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>
              prediction market
            </span>
          </h1>

          <p style={{ color: 'var(--muted)', fontSize: 14.5, maxWidth: 470, margin: '0 auto 30px', lineHeight: 1.6 }}>
            High-fidelity paper trading on pop culture, awards, and entertainment
            events. Trade your convictions with zero risk.
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 70 }}>
            <button
              onClick={() => navigate('/explore')}
              style={{
                background: 'var(--gold)', color: '#1a1405',
                fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13,
                border: 'none', borderRadius: 6, padding: '12px 22px',
                cursor: 'pointer', boxShadow: '0 4px 18px rgba(232,196,104,.22)',
              }}
            >
              Start Predicting
            </button>
            <button
              onClick={scrollToWaitlist}
              style={{
                background: 'transparent', color: 'var(--text)',
                fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13,
                border: '1px solid var(--line)', borderRadius: 6, padding: '12px 22px',
                cursor: 'pointer',
              }}
            >
              Join Waitlist
            </button>
          </div>

          {/* Stats strip — single bordered panel, three columns */}
          {!loading && (
            <div className="dbm-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', textAlign: 'left' }}>
              {[
                { label: 'Paper Volume Traded', value: volLabel, gold: true },
                { label: 'Live Markets', value: markets.length.toLocaleString('en-US') },
                { label: 'Waitlist Count', value: (waitlistCount ?? WAITLIST_COUNT_FALLBACK).toLocaleString('en-US') },
              ].map((s, i) => (
                <div key={s.label} style={{ padding: '20px 26px', borderLeft: i > 0 ? '1px solid var(--line)' : 'none' }}>
                  <span className="dbm-stat-label">{s.label}</span>
                  <span style={{
                    display: 'block', marginTop: 8,
                    fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 24,
                    color: s.gold ? 'var(--gold)' : 'var(--text)',
                  }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* ── /Hero ── */}

        {/* ── Secure Early Access ── */}
        <WaitlistCard />

        {/* ── Trending Markets ── */}
        <div style={{ marginTop: 56, paddingBottom: 40 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 8, marginBottom: 18,
            borderBottom: '1px solid var(--line)', paddingBottom: 14,
          }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 17, color: 'var(--text)', margin: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--gold)' }}>trending_up</span>
              Trending Markets
            </h2>
            <button
              onClick={() => navigate('/explore')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
            >
              View All →
            </button>
          </div>

          {loading ? (
            <MarketGridSkeleton count={3} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {topMarkets.map((m) => <MarketCard key={m.id} market={m} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--line)', marginTop: 40,
        padding: '26px 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <span style={{ fontFamily: 'var(--wordmark)', fontSize: 17, color: 'var(--text)' }}>Dobium</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          © {new Date().getFullYear()} Dobium Prediction Markets. High-fidelity paper trading.
        </span>
      </footer>
    </div>
  );
}
