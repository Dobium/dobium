import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import MarketCard from '../components/MarketCard';
import WaitlistCard from '../components/WaitlistCard';

// Shown in the hero stats until the waitlist count is wired to the database.
const WAITLIST_COUNT = 347;

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

export default function LandingPage() {
  const { markets, loading } = useMarkets();
  const navigate = useNavigate();

  const totalVolume = markets.reduce((s, m) => s + (m.total_volume || 0), 0);
  const topMarkets = [...markets]
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 6);

  const scrollToWaitlist = () =>
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div>
      <Ticker markets={markets} />

      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', padding: '64px 24px 40px', position: 'relative' }}>
          <div
            style={{
              position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
              width: 580, height: 320,
              background: 'radial-gradient(ellipse at center,rgba(240,192,74,.10),transparent 65%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
            <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 600, fontSize: 'clamp(44px,7vw,72px)', background: 'linear-gradient(180deg,#F7D573,var(--gold-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', lineHeight: 1 }}>
              obium
            </span>
          </div>

          <p style={{ color: 'var(--text)', fontSize: 'clamp(18px,2.6vw,24px)', fontWeight: 400, maxWidth: 620, margin: '0 auto 12px', opacity: .93 }}>
            The entertainment prediction market
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 14.5, maxWidth: 520, margin: '0 auto 34px', lineHeight: 1.6 }}>
            Trade on music drops, box office, awards and the biggest moments in culture
            — with $100 paper money. <span style={{ color: 'var(--gold)' }}>⚡ World Cup markets are live.</span>
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 42 }}>
            <button
              onClick={() => navigate('/explore')}
              style={{
                background: 'linear-gradient(180deg,#F7D573,var(--gold-2))',
                color: '#1a1405', fontWeight: 700, fontSize: 15,
                border: 'none', borderRadius: 12, padding: '13px 26px',
                cursor: 'pointer', boxShadow: '0 6px 22px rgba(240,192,74,.28)',
              }}
            >
              Start Predicting →
            </button>
            <button
              onClick={scrollToWaitlist}
              style={{
                background: 'rgba(17,26,57,.65)', color: 'var(--text)',
                fontWeight: 600, fontSize: 15,
                border: '1px solid var(--line)', borderRadius: 12, padding: '13px 26px',
                cursor: 'pointer',
              }}
            >
              Join Waitlist for Real Money
            </button>
          </div>

          {/* Stats row */}
          {!loading && (
            <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'stretch' }}>
              <div style={{ textAlign: 'center', minWidth: 120 }}>
                <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
                  ${totalVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>paper volume traded</span>
              </div>
              <div style={{ width: 1, background: 'var(--line)' }} />
              <div style={{ textAlign: 'center', minWidth: 100 }}>
                <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
                  {markets.length}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>live markets</span>
              </div>
              <div style={{ width: 1, background: 'var(--line)' }} />
              <div style={{ textAlign: 'center', minWidth: 130 }}>
                <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
                  {WAITLIST_COUNT}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>on the real-money waitlist</span>
              </div>
            </div>
          )}
        </div>
        {/* ── /Hero ── */}

        {/* ── Waitlist (the #1 priority element) ── */}
        <div id="waitlist" style={{ scrollMarginTop: 24, padding: '14px 0 6px' }}>
          <WaitlistCard />
        </div>

        {/* ── Live Markets preview ── */}
        {!loading && topMarkets.length > 0 && (
          <div style={{ marginTop: 64 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
              <h2 style={{ fontFamily: '"DM Serif Text", serif', fontSize: 30, color: 'var(--text)', margin: 0 }}>
                Live Markets
              </h2>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                Sorted by <span style={{ color: 'var(--gold)', fontWeight: 600 }}>volume</span> · updates live
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
              {topMarkets.map((m) => <MarketCard key={m.id} market={m} />)}
            </div>
            <div style={{ textAlign: 'center', marginTop: 30 }}>
              <button
                onClick={() => navigate('/explore')}
                style={{
                  background: 'transparent', color: 'var(--gold)',
                  fontWeight: 600, fontSize: 14,
                  border: '1px solid var(--gold)', borderRadius: 12, padding: '11px 24px',
                  cursor: 'pointer',
                }}
              >
                See all markets →
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-slate-700 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
