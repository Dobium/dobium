import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import MarketIcon from '../components/MarketIcon';

// ── DOBIUM Terminal (/terminal) — matched to the reference mock ────────────
// Own chrome (ticker + DOBIUM Terminal nav; the site TopNav is suppressed by
// Layout on this route). Sections: NEXT ERA FINANCE hero, FEATURED EVENT with
// a green probability bar chart + YES/NO price boxes, Live Activity feed
// (mock demo rows), Trending Markets cards from live data, and the gold
// "Gain the Quantitative Edge." banner. Palette sampled from the screenshot:
// page #00132D, hero well #000E24, panels #0C203A, insets #081C36/#182A45,
// gold #FFDF9B (on-gold #79612A), green #4BE176, salmon #FFB4AB.
const WARM = '#CFC5B5';
const GOLD = '#FFDF9B';
const GOLD_DIM = '#E1C382';
const ON_GOLD = '#79612A';
const GREEN = '#4BE176';
const SALMON = '#FFB4AB';

const mono = (extra = {}) => ({ fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.12em', ...extra });

const LIVE_ACTIVITY = [
  { time: '2m ago', who: '0x8f...4e2', verb: 'bought', side: 'YES', market: 'SZA Headliner Leak', pos: 'Position: $12,400 @ 0.45' },
  { time: '5m ago', who: 'anon_user', verb: 'sold', side: 'NO', market: 'Dune 2 Oscar Wins', pos: 'Position: $4,200 @ 0.12' },
  { time: '8m ago', who: 'whale_01', verb: 'bought', side: 'YES', market: 'GPT-5 Launch Q4', pos: 'Position: $250,000 @ 0.68' },
  { time: '12m ago', who: 'system', alert: 'alert: Market Finalizing: EMMY Best Drama' },
];

function shortName(t) {
  return (t || '').replace(/^will\s+/i, '').replace(/\?+\s*$/, '');
}

function yesOutcome(m) {
  return (m.outcomes || []).find((o) => (o.title || '').toLowerCase().startsWith('yes'));
}

function leaderOf(m) {
  return [...(m.outcomes || [])].sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];
}

function deltaFor(m, outcome) {
  const h = m?.price_history || [];
  if (h.length >= 2 && outcome) {
    const last = h[h.length - 1]?.prices?.[outcome.id];
    const prev = h[h.length - 2]?.prices?.[outcome.id];
    if (typeof last === 'number' && typeof prev === 'number') return Math.round(last - prev);
  }
  return 0;
}

function TerminalTicker({ markets }) {
  const liveVol = markets.reduce((s, m) => s + (m.total_volume || 0), 0);
  const items = [...markets]
    .filter((m) => m.status === 'active')
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 6)
    .map((m) => {
      const yes = yesOutcome(m);
      const lead = leaderOf(m);
      const target = yes || lead;
      const side = yes ? ((yes.probability || 0) >= 50 ? 'YES' : 'NO') : (lead?.title || '').replace(/\s*\((Yes|No)\)\s*$/i, '').slice(0, 10).toUpperCase();
      const priceP = side === 'NO' && yes ? 100 - (yes.probability || 0) : (target?.probability || 0);
      return {
        label: `${shortName(m.title).slice(0, 18).toUpperCase()}:`,
        side,
        price: (priceP / 100).toFixed(2),
        delta: deltaFor(m, target),
      };
    });
  const volItem = { vol: `$${liveVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (24H)` };
  const loop = [volItem, ...items, volItem, ...items];

  return (
    <div style={{ background: '#000814', borderBottom: '1px solid #0E1B30', overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <div className="dbm-term-tape" style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 0' }}>
        {loop.map((it, i) => it.vol ? (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 22px', ...mono({ fontSize: 8 }) }}>
            <span style={{ width: 4, height: 4, borderRadius: 999, background: GREEN, display: 'inline-block' }} />
            <span style={{ color: WARM }}>LIVE VOLUME:</span>
            <span style={{ color: GOLD_DIM }}>{it.vol}</span>
          </span>
        ) : (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, margin: '0 22px', ...mono({ fontSize: 8 }) }}>
            <span style={{ color: WARM }}>{it.label}</span>
            <span style={{ color: it.side === 'NO' ? SALMON : GREEN }}>{it.side}</span>
            <span style={{ color: '#DCE6F5' }}>@ {it.price}</span>
            {it.delta !== 0 && (
              <span style={{ color: it.delta > 0 ? GREEN : SALMON }}>
                {it.delta > 0 ? '▲' : '▼'} {Math.abs(it.delta)}%
              </span>
            )}
          </span>
        ))}
      </div>
      <style>{`
        .dbm-term-tape { animation: dbm-term-tape 46s linear infinite; }
        .dbm-term-tape:hover { animation-play-state: paused; }
        @keyframes dbm-term-tape { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .dbm-term-tape { animation: none; } }
      `}</style>
    </div>
  );
}

function TerminalNav({ navigate }) {
  const TABS = [
    { label: 'Markets', to: null },
    { label: 'Radar', to: '/radar' },
    { label: 'Intelligence', to: '/radar' },
    { label: 'Portfolio', to: '/portfolio' },
  ];
  return (
    <div style={{ background: '#001128', borderBottom: '1px solid #14223E' }}>
      <div className="max-w-7xl mx-auto" style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '0 20px', minHeight: 44 }}>
        <span onClick={() => navigate('/')} style={{ cursor: 'pointer', ...mono({ fontSize: 11, letterSpacing: '0.06em' }) }}>
          <span style={{ color: '#F2F6FF', fontWeight: 800 }}>DOBIUM</span>
          <span style={{ color: '#8E9AB0', fontWeight: 700 }}> Terminal</span>
        </span>
        <nav style={{ display: 'flex', alignItems: 'stretch', gap: 2, flex: 1, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button key={t.label} onClick={() => t.to && navigate(t.to)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                ...mono({ fontSize: 9.5, letterSpacing: '0.08em' }),
                padding: '14px 10px 12px',
                color: t.to === null ? '#F2F6FF' : '#8E9AB0',
                borderBottom: t.to === null ? '2px solid #F2F6FF' : '2px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </nav>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E9AB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M10.3 21a2 2 0 003.4 0" />
          </svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E9AB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
          </svg>
        </span>
      </div>
    </div>
  );
}

function FeaturedEvent({ market, navigate }) {
  if (!market) return null;
  const yes = yesOutcome(market);
  const yesP = Math.round(yes?.probability ?? 50);
  const delta = deltaFor(market, yes);
  const hist = (market.price_history || [])
    .map((h) => h.prices?.[yes?.id])
    .filter((v) => typeof v === 'number')
    .slice(-7);
  const bars = hist.length >= 3 ? hist : [34, 52, 41, 66, 58, 79, yesP || 82];
  const lo = Math.min(...bars); const hi = Math.max(...bars); const span = Math.max(hi - lo, 1);
  const vol = market.total_volume || 0;
  const volLabel = vol >= 1e6 ? `$${(vol / 1e6).toFixed(1)}M` : vol >= 1e3 ? `$${(vol / 1e3).toFixed(1).replace(/\.0$/, '')}K` : `$${Math.round(vol)}`;
  const go = () => navigate(`/markets/${market.id}`);

  return (
    <div style={{ background: '#0C203A', border: '1px solid #2F3A4A', borderRadius: 8, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...mono({ fontSize: 8.5, letterSpacing: '0.16em', color: GOLD_DIM }) }}>FEATURED EVENT</div>
          <h2 onClick={go} style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 'clamp(17px,2vw,21px)', lineHeight: 1.35, margin: '9px 0 0', cursor: 'pointer' }}>
            {market.title}
          </h2>
        </div>
        <div style={{ background: '#182A45', border: '1px solid #2A3F63', borderRadius: 4, padding: '8px 12px', textAlign: 'right', flexShrink: 0 }}>
          <div style={{ ...mono({ fontSize: 9.5, color: '#F2F6FF' }) }}>{volLabel} Vol</div>
          <div style={{ ...mono({ fontSize: 8, color: '#8E9AB0' }), marginTop: 3 }}>
            {market.trader_count ? `${market.trader_count} Traders` : '2.1k Traders'}
          </div>
        </div>
      </div>

      <div style={{ background: '#081C36', border: '1px solid #22314A', borderRadius: 4, padding: '12px 14px 10px', marginTop: 16 }}>
        <div style={{ ...mono({ fontSize: 8.5, letterSpacing: '0.1em', color: GREEN }) }}>
          {yesP}% Probability {delta < 0 ? '↓' : '↑'}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 96, marginTop: 12 }}>
          {bars.map((v, i) => {
            const t = (v - lo) / span; // 0..1 → dim..bright green
            const g = Math.round(0x7f + t * (0xda - 0x7f));
            const r = Math.round(0x2a + t * (0x49 - 0x2a));
            const b = Math.round(0x56 + t * (0x74 - 0x56));
            return (
              <span key={i} style={{ flex: 1, height: `${18 + ((v - lo) / span) * 82}%`, background: `rgb(${r},${g},${b})`, borderRadius: 2, display: 'inline-block' }} />
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
        <button onClick={go}
          style={{ flex: 1, background: '#133440', border: `1px solid rgba(75,225,118,.55)`, borderRadius: 4, padding: '11px 8px', cursor: 'pointer', textAlign: 'center' }}>
          <div style={{ ...mono({ fontSize: 10, color: GREEN }) }}>YES</div>
          <div style={{ ...mono({ fontSize: 9, color: GREEN }), opacity: .85, marginTop: 3 }}>${(yesP / 100).toFixed(2)}</div>
        </button>
        <button onClick={go}
          style={{ flex: 1, background: '#252F45', border: '1px solid #39465F', borderRadius: 4, padding: '11px 8px', cursor: 'pointer', textAlign: 'center' }}>
          <div style={{ ...mono({ fontSize: 10, color: SALMON }) }}>NO</div>
          <div style={{ ...mono({ fontSize: 9, color: '#C6D3E8' }), marginTop: 3 }}>${((100 - yesP) / 100).toFixed(2)}</div>
        </button>
      </div>
    </div>
  );
}

function LiveActivity({ navigate }) {
  return (
    <div style={{ border: '1px solid #2F3A4A', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#0C203A', borderBottom: '1px solid #22314A', padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F2F6FF" strokeWidth="2" strokeLinecap="round">
            <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M12 9v6" />
          </svg>
          <span style={{ color: '#F2F6FF', fontWeight: 700, fontSize: 12.5 }}>Live Activity</span>
        </span>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN }} />
      </div>
      <div style={{ background: '#000E24', flex: 1 }}>
        {LIVE_ACTIVITY.map((a, i) => (
          <div key={i} style={{ padding: '11px 14px', borderBottom: i < LIVE_ACTIVITY.length - 1 ? '1px solid rgba(20,34,62,.8)' : 'none' }}>
            <div style={{ ...mono({ fontSize: 7.5, color: '#5C7391' }) }}>{a.time}</div>
            {a.alert ? (
              <div style={{ ...mono({ fontSize: 9, letterSpacing: '0.06em' }), marginTop: 5, lineHeight: 1.6 }}>
                <span style={{ color: GOLD_DIM }}>{a.who}</span>{' '}
                <span style={{ color: WARM }}>{a.alert}</span>
              </div>
            ) : (
              <>
                <div style={{ ...mono({ fontSize: 9, letterSpacing: '0.06em' }), marginTop: 5, lineHeight: 1.6 }}>
                  <span style={{ color: GOLD_DIM }}>{a.who}</span>{' '}
                  <span style={{ color: '#8E9AB0' }}>{a.verb}</span>{' '}
                  <span style={{ color: a.side === 'YES' ? GREEN : SALMON }}>{a.side}</span>{' '}
                  <span style={{ color: '#8E9AB0' }}>on</span>{' '}
                  <span style={{ color: '#E6EDF9' }}>{a.market}</span>
                </div>
                <div style={{ ...mono({ fontSize: 8, color: '#5C7391', letterSpacing: '0.06em' }), marginTop: 4 }}>{a.pos}</div>
              </>
            )}
          </div>
        ))}
        <div style={{ padding: '11px 14px', borderTop: '1px solid rgba(20,34,62,.8)' }}>
          <button onClick={() => navigate('/radar')}
            style={{ width: '100%', background: 'transparent', border: '1px solid #39465F', borderRadius: 3, padding: '9px 0', cursor: 'pointer', ...mono({ fontSize: 8.5, letterSpacing: '0.14em', color: WARM }) }}>
            View Terminal Full Screen
          </button>
        </div>
      </div>
    </div>
  );
}

function TrendingCard({ market, navigate }) {
  const yes = yesOutcome(market);
  const lead = leaderOf(market);
  const isBinary = !!yes && (market.outcomes || []).length === 2;
  let odds;
  if (isBinary) {
    const yesLeads = (yes.probability || 0) >= 50;
    const p = yesLeads ? yes.probability : 100 - yes.probability;
    odds = { text: `${yesLeads ? 'YES' : 'NO'} @ ${(p / 100).toFixed(2)}`, color: yesLeads ? GREEN : '#E6EDF9' };
  } else {
    const name = (lead?.title || '').replace(/\s*\((Yes|No)\)\s*$/i, '').slice(0, 16);
    odds = { text: `${name} @ ${((lead?.probability || 0) / 100).toFixed(2)}`, color: GOLD_DIM };
  }
  const img = market.image || market.event_image;
  const go = () => navigate(`/markets/${market.id}`);

  return (
    <div onClick={go} style={{ background: '#0C203A', border: '1px solid #2F3A4A', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'border-color .15s ease' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2F3A4A')}>
      <div style={{ position: 'relative', height: 96, background: 'linear-gradient(135deg,#0A1730 0%,#050915 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {img && /^https?:/.test(img) ? (
          <img src={img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <MarketIcon market={market} size={44} radius={8} />
        )}
        <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,10,26,.85)', border: '1px solid #2A3F63', borderRadius: 2, padding: '3px 7px', ...mono({ fontSize: 7, letterSpacing: '0.14em', color: GOLD_DIM }) }}>
          {(market.category || 'trending').toUpperCase()}
        </span>
      </div>
      <div style={{ padding: '11px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ color: '#F2F6FF', fontWeight: 700, fontSize: 11.5, lineHeight: 1.45, flex: 1 }}>{shortName(market.title)}{(market.title || '').includes('?') ? '?' : ''}</div>
        <div style={{ ...mono({ fontSize: 7, letterSpacing: '0.12em', color: '#5C7391' }), marginTop: 10 }}>Best Odds</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 5 }}>
          <span style={{ ...mono({ fontSize: 9, letterSpacing: '0.04em', color: odds.color }), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{odds.text}</span>
          <span style={{ flexShrink: 0, background: '#283A55', borderRadius: 2, padding: '5px 10px', ...mono({ fontSize: 7.5, letterSpacing: '0.14em', color: '#F2F6FF' }) }}>TRADE</span>
        </div>
      </div>
    </div>
  );
}

export default function TerminalPage() {
  const navigate = useNavigate();
  const { markets } = useMarkets();

  const active = markets.filter((m) => m.status === 'active');
  const featured = [...active]
    .filter((m) => yesOutcome(m) && (m.outcomes || []).length === 2)
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))[0] || null;
  const trending = [...active]
    .filter((m) => m.id !== featured?.id)
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 4);

  return (
    <div style={{ background: '#00132D', minHeight: '100%' }}>
      <TerminalTicker markets={markets} />
      <TerminalNav navigate={navigate} />

      <div className="max-w-7xl mx-auto" style={{ padding: '16px 20px 0' }}>
        {/* Hero */}
        <div style={{ background: '#000E24', border: '1px solid #25303F', borderRadius: 8, padding: '46px 24px 42px', textAlign: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${GOLD_DIM}`, borderRadius: 999, padding: '5px 13px', ...mono({ fontSize: 7.5, letterSpacing: '0.18em', color: GOLD_DIM }) }}>
            ✦ NEXT ERA FINANCE
          </span>
          <h1 style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 'clamp(26px,3.4vw,38px)', lineHeight: 1.2, margin: '18px auto 0', maxWidth: 640 }}>
            Forecast the Future of Entertainment
          </h1>
          <p style={{ color: '#8E9AB0', fontSize: 12.5, lineHeight: 1.7, margin: '14px auto 0', maxWidth: 470 }}>
            High-stakes predictions on the culture that moves you. Precise data, real-time settlement, and high-fidelity market intelligence.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/explore')}
              style={{ background: GOLD, border: 'none', borderRadius: 4, padding: '12px 22px', cursor: 'pointer', ...mono({ fontSize: 10, letterSpacing: '0.08em', color: '#0A1A33' }) }}>
              Start Forecasting ↗
            </button>
            <button onClick={() => navigate('/')}
              style={{ background: '#000E24', border: '1px solid #2C3E54', borderRadius: 4, padding: '12px 22px', cursor: 'pointer', ...mono({ fontSize: 10, letterSpacing: '0.08em', color: '#F2F6FF' }) }}>
              View Markets
            </button>
          </div>
        </div>

        {/* Featured event + live activity */}
        <div className="dbm-term-featured" style={{ marginTop: 18 }}>
          <FeaturedEvent market={featured} navigate={navigate} />
          <LiveActivity navigate={navigate} />
        </div>

        {/* Trending markets */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, margin: '28px 0 14px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 17 }}>Trending Markets</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD_DIM} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
            </svg>
          </span>
          <button onClick={() => navigate('/explore')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', ...mono({ fontSize: 8.5, letterSpacing: '0.14em', color: WARM }) }}>
            View All
          </button>
        </div>
        <div className="dbm-term-cards">
          {trending.map((m) => <TrendingCard key={m.id} market={m} navigate={navigate} />)}
          {trending.length === 0 && (
            <p style={{ color: '#8E9AB0', fontSize: 12.5 }}>Markets are loading…</p>
          )}
        </div>

        {/* Gold quantitative-edge banner */}
        <div className="dbm-term-banner" style={{ background: GOLD, borderRadius: 8, padding: '26px 28px', margin: '28px 0 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 26, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 420, minWidth: 240 }}>
            <h2 style={{ color: ON_GOLD, fontWeight: 800, fontSize: 19, margin: 0 }}>Gain the Quantitative Edge.</h2>
            <p style={{ color: ON_GOLD, fontSize: 11.5, lineHeight: 1.65, margin: '9px 0 0', opacity: .95 }}>
              Unlock institutional-grade market data, AI-driven sentiment analysis, and exclusive intelligence feeds with Dobium Terminal.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/waitlist')}
                style={{ background: ON_GOLD, border: 'none', borderRadius: 3, padding: '10px 16px', cursor: 'pointer', ...mono({ fontSize: 8.5, letterSpacing: '0.1em', color: GOLD }) }}>
                Upgrade to Terminal
              </button>
              <button onClick={() => navigate('/explore')}
                style={{ background: 'transparent', border: `1px solid ${ON_GOLD}`, borderRadius: 3, padding: '10px 16px', cursor: 'pointer', ...mono({ fontSize: 8.5, letterSpacing: '0.1em', color: ON_GOLD }) }}>
                Read Whitepaper
              </button>
            </div>
          </div>
          <div style={{ background: '#F1D28F', border: `1px solid rgba(121,97,42,.35)`, borderRadius: 4, padding: '14px 16px', minWidth: 220, flex: '0 1 260px' }}>
            {[{ label: 'DATA SYNC', pct: 92, val: 'STABLE' }, { label: 'API LATENCY', pct: 30, val: '23ms' }].map((r) => (
              <div key={r.label} style={{ marginBottom: r.label === 'DATA SYNC' ? 13 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ ...mono({ fontSize: 7.5, letterSpacing: '0.14em', color: ON_GOLD }) }}>{r.label}</span>
                  <span style={{ ...mono({ fontSize: 7.5, letterSpacing: '0.1em', color: ON_GOLD }) }}>{r.val}</span>
                </div>
                <div style={{ height: 3, background: 'rgba(121,97,42,.25)', borderRadius: 2, marginTop: 6 }}>
                  <div style={{ width: `${r.pct}%`, height: '100%', background: ON_GOLD, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .dbm-term-featured { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .dbm-term-cards { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px) { .dbm-term-cards { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) {
          .dbm-term-featured { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); align-items: stretch; }
          .dbm-term-cards { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>
    </div>
  );
}
