import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMarkets } from '../hooks/useMarkets';

const RADAR_KEY = 'dobium-radar-9247';
const STORAGE_KEY = 'dobium_radar_unlocked';

// A standalone, passphrase-gated review page for the Trending Radar.
// Reachable only by URL (like /pulse) — sidesteps the Supabase-auth admin gate.
// The passphrase is a light lock (this repo is public), not real secrecy —
// it stops anyone who stumbles onto the link, not a determined source-code reader.
export default function RadarPage() {
  const navigate = useNavigate();
  const { markets } = useMarkets();
  const { openAuthModal } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('trending'); // trending|hiphop|popculture|festivals|grammys | live

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === RADAR_KEY) setUnlocked(true);
  }, []);

  const tryUnlock = () => {
    if (input.trim() === RADAR_KEY) {
      sessionStorage.setItem(STORAGE_KEY, RADAR_KEY);
      setUnlocked(true);
      setError('');
    } else {
      setError('Wrong passphrase.');
    }
  };

  if (!unlocked) {
    return <RadarGate input={input} setInput={setInput} tryUnlock={tryUnlock} error={error} />;
  }

  return (
    <div style={{ background: '#00132D', minHeight: '100%' }}>
      <RadarTopBar tab={tab} setTab={setTab} onBrand={() => navigate('/')} />
      <RadarVolTicker markets={markets} />

      {tab !== 'live' && (
        <div className="max-w-7xl mx-auto" style={{ padding: '18px 20px 34px' }}>
          <div className="dbm-radar-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <IntelFeed />
            </div>

            <RadarHero markets={markets} onOpen={(id) => navigate(`/markets/${id}`)} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <TurbulenceIndex />
              <HotMediaMarkets markets={markets} onOpen={(id) => navigate(`/markets/${id}`)} />
            </div>
          </div>

          <LiveMarketGrid markets={markets} genre={tab} onOpen={(id) => navigate(`/markets/${id}`)} />

          <style>{`
            .dbm-radar-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 18px; }
            @media (min-width: 1024px) {
              .dbm-radar-grid { grid-template-columns: 290px minmax(0,1fr) 300px; align-items: start; }
            }
          `}</style>
        </div>
      )}

      {tab !== 'live' && (
        <div style={{ background: '#000E24', borderTop: '1px solid #10203A', padding: '12px 26px' }}>
          <div className="max-w-7xl mx-auto">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: RADAR_GOLD_DIM }} />
              <span style={radarMono({ fontSize: 8.5, color: '#CFC5B5' })}>DOBIUM RADAR INTELLIGENCE NODE</span>
            </span>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', color: RADAR_GOLD_DIM, marginTop: 5 }}>Data ingested</div>
          </div>
        </div>
      )}

{tab === 'live' && (
        <LiveMarketsBrowser
          markets={markets}
          onOpen={(id) => navigate(`/markets/${id}`)}
        />
      )}

    </div>
  );
}

// ── Passphrase gate, matched to the terminal reference mock ────────────────
// Near-black stat band up top (GLOBAL VOL real, BTC/USD demo per mock,
// TRENDING MARKET = top-volume live title), dimmed TRAFFIC FLOW / ACTIVE
// NODES decor on the left, centered card with the radar glyph, gold title,
// AES-256 input chip, flat gold "Unlock →", and the ENCRYPTED / NODE row.
const RADAR_WARM = '#CFC5B5';
const BARS = [7, 12, 9, 16, 11, 19, 14, 22, 12, 17];

function radarLabel(extra = {}) {
  return { fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.16em', color: RADAR_WARM, ...extra };
}

function RadarStatBand({ markets }) {
  const liveVol = markets.reduce((sum, m) => sum + (m.total_volume || 0), 0);
  const volLabel = liveVol >= 1e9 ? `$${(liveVol / 1e9).toFixed(2)}B` : liveVol >= 1e6 ? `$${(liveVol / 1e6).toFixed(1)}M` : `$${Math.round(liveVol).toLocaleString('en-US')}`;
  const top = [...markets].filter((m) => m.status === 'active').sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))[0];
  const trendingTitle = (top?.title || 'GTA VI Release Date Prediction').replace(/\?+\s*$/, '');
  return (
    <div style={{ background: '#000E24', borderBottom: '1px solid #10203A', padding: '9px 26px', overflowX: 'auto', scrollbarWidth: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, whiteSpace: 'nowrap', maxWidth: 1440, margin: '0 auto' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#4BE176', flexShrink: 0 }} />
          <span style={radarLabel()}>GLOBAL VOL:</span>
          <span style={radarLabel({ fontSize: 9.5, color: '#FFFFFF' })}>{volLabel}</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 7 }}>
          <span style={radarLabel()}>BTC/USD:</span>
          <span style={radarLabel({ fontSize: 9.5, color: '#E1C382' })}>$67,241.12</span>
          <span style={radarLabel({ fontSize: 9.5, color: '#4BE176' })}>(+1.2%)</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 7, minWidth: 0 }}>
          <span style={radarLabel()}>TRENDING MARKET:</span>
          <span style={radarLabel({ fontSize: 9.5, color: '#C6D3E8', letterSpacing: '0.1em' })}>{trendingTitle}</span>
        </span>
      </div>
    </div>
  );
}

function RadarDecor() {
  return (
    <div className="dbm-radar-decor" style={{ position: 'absolute', left: 'max(18px, 4vw)', top: 46, width: 196, opacity: 0.6, pointerEvents: 'none', userSelect: 'none' }}>
      <div style={{ background: '#031731', border: '1px solid #14263F', borderRadius: 6, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={radarLabel({ fontSize: 8 })}>TRAFFIC FLOW</span>
          <span style={radarLabel({ fontSize: 8 })}>LIVE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 26 }}>
          {BARS.map((h, i) => (
            <span key={i} style={{ width: 5, height: h, background: '#8C7A4A', borderRadius: 1, display: 'inline-block' }} />
          ))}
        </div>
      </div>
      <div style={{ background: '#031731', border: '1px solid #14263F', borderRadius: 6, padding: 14, marginTop: 18 }}>
        <div style={{ ...radarLabel({ fontSize: 8 }), marginBottom: 12 }}>ACTIVE NODES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} style={{ aspectRatio: '1', borderRadius: 4, background: i === 3 ? '#18243A' : '#0B2938', border: '1px solid #14323E', display: 'block' }} />
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 1023px) { .dbm-radar-decor { display: none; } }`}</style>
    </div>
  );
}

function RadarGate({ input, setInput, tryUnlock, error }) {
  const { markets } = useMarkets();
  return (
    <div style={{ background: '#00132D', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <RadarStatBand markets={markets} />

      <div style={{ position: 'relative', flex: 1, padding: '64px 20px 96px' }}>
        <RadarDecor />

        <div style={{ maxWidth: 400, margin: '0 auto', background: '#001F43', border: '1px solid #2F3A4A', borderRadius: 10, padding: '34px 30px 20px', textAlign: 'center' }}>
          <span style={{ width: 54, height: 54, margin: '0 auto', borderRadius: 12, background: '#182A45', border: '1px solid #39465F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={RADAR_WARM} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="2.6" fill={RADAR_WARM} stroke="none" />
              <path d="M12 4a8 8 0 018 8" opacity=".45" />
            </svg>
          </span>

          <h1 style={{ fontFamily: 'var(--wordmark)', fontSize: 24, fontWeight: 800, color: '#FFDF9B', margin: '18px 0 0' }}>
            Trending Radar
          </h1>
          <p style={{ color: '#C6D3E8', fontSize: 12.5, lineHeight: 1.6, margin: '10px auto 22px', maxWidth: 260 }}>
            Enter the passphrase to review pending markets.
          </p>

          <div style={{ position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E9AB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 018 0v4" />
            </svg>
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && tryUnlock()}
              placeholder="Passphrase"
              autoFocus
              style={{
                width: '100%', background: '#00132D', border: '1px solid #2A3F63',
                borderRadius: 6, padding: '14px 84px 14px 38px', color: '#E6EDF9', fontSize: 13,
                fontFamily: 'var(--mono)', outline: 'none',
              }}
            />
            <span style={{ ...radarLabel({ fontSize: 7.5 }), position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: '#182A45', border: '1px solid #2A3F63', borderRadius: 2, padding: '3px 7px' }}>
              AES-256
            </span>
          </div>

          <button
            onClick={tryUnlock}
            style={{
              width: '100%', marginTop: 14, background: '#FFDF9B', border: 'none', borderRadius: 6,
              padding: '15px 10px', cursor: 'pointer',
              fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 12, letterSpacing: '0.1em', color: '#79612A',
            }}
          >
            Unlock →
          </button>
          {error && <p style={{ color: '#FF9E8E', fontSize: 12, marginTop: 12, marginBottom: 0, fontFamily: 'var(--mono)' }}>{error}</p>}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: '1px solid rgba(28,48,79,.7)', marginTop: 24, padding: '14px 2px 2px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={RADAR_WARM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6z" />
              </svg>
              <span style={radarLabel()}>ENCRYPTED</span>
            </span>
            <span style={radarLabel()}>NODE: US-EAST-1</span>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Unlocked "Music & Media Radar" dashboard pieces (terminal mock) ────────
const RADAR_GOLD = '#FFDF9B';
const RADAR_GOLD_DIM = '#E1C382';
const RADAR_GREEN = '#4BE176';
const RADAR_SALMON = '#FFB4AB';

// Demo copy pinned to the reference mock
const INTEL_FEED = [
  { time: '14:02 UTC', chip: 'Score: 87%', body: 'Kendrick Lamar studio session leak confirmed by top-tier audio engineers in LA.', prob: 'YES prob: 78%', up: true },
  { time: '13:45 UTC', chip: 'Verified', body: 'Ticketmaster updates backend API routes for SZA stadium tour locations.', prob: 'YES prob: 92%', up: true },
  { time: '12:38 UTC', chip: 'Contested', body: 'Rumors of Frank Ocean Coachella headliner officially denied by Goldenvoice.', prob: 'YES prob: 12%', up: false },
];
const DEMO_TICKER_ITEMS = [
  { label: 'BEYONCE ACT III', value: '$3.1M', dir: 1 },
  { label: 'FRANK OCEAN', value: '$120k', dir: 0 },
  { label: 'K.DOT DROP', value: '$4.2M', dir: 1 },
  { label: 'SZA TOUR', value: '$1.8M', dir: 1 },
  { label: 'OSCARS BP', value: '$890k', dir: -1 },
];
const DEMO_HOT = [
  { id: null, title: 'Will Kendrick drop an album before Q3?', yes: 78, no: 22 },
  { id: null, title: 'SZA Tour dates announced in May?', yes: 92, no: 8 },
];
const DEMO_NODES = [
  { id: null, kind: 'ACTIVE NODE', name: 'SZA Global Tour', yes: 92, no: 8 },
  { id: null, kind: 'TRENDING NODE', name: "Kendrick Drop '24", yes: 78, no: 22 },
];
const SPARK = '0,26 18,22 34,27 52,18 70,21 88,13 106,17 124,9 142,12 160,5';

function radarMono(extra = {}) {
  return { fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.14em', color: '#CFC5B5', ...extra };
}

function shortTitle(t) {
  return (t || '').replace(/^will\s+/i, '').replace(/\?+\s*$/, '');
}

function binaryTop(markets, n) {
  return [...(markets || [])]
    .filter((m) => m.status === 'active' && (m.outcomes || []).length === 2 && m.outcomes.some((o) => (o.title || '').toLowerCase().startsWith('yes')))
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, n)
    .map((m) => {
      const yes = m.outcomes.find((o) => (o.title || '').toLowerCase().startsWith('yes'));
      const yp = Math.round(yes?.probability ?? 50);
      return { id: m.id, title: m.title, name: shortTitle(m.title), yes: yp, no: 100 - yp };
    });
}

export function RadarTopBar({ tab, setTab, onBrand }) {
  const TABS = [
    { id: 'trending', label: 'Trending' },
  ];
  return (
    <div style={{ background: '#00132D', borderBottom: '1px solid #14223E' }}>
      <div className="max-w-7xl mx-auto" style={{ display: 'flex', alignItems: 'center', gap: 30, padding: '0 20px', minHeight: 50, flexWrap: 'wrap' }}>
        <span onClick={onBrand} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F2F6FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 15, color: '#F2F6FF' }}>Dobium Radar</span>
        </span>
        <nav style={{ display: 'flex', alignItems: 'stretch', gap: 2, flexWrap: 'wrap', flex: 1 }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em',
                padding: '17px 12px 15px',
                color: tab === t.id ? RADAR_GOLD : '#D5E3FF',
                borderBottom: tab === t.id ? `2px solid ${RADAR_GOLD}` : '2px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </nav>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, background: RADAR_GREEN }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', color: RADAR_GREEN }}>LIVE_FEED OK</span>
        </span>
      </div>
    </div>
  );
}

export function RadarVolTicker({ markets }) {
  const live = [...(markets || [])]
    .filter((m) => m.status === 'active')
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 8)
    .map((m) => {
      const v = m.total_volume || 0;
      const value = v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}k` : `$${Math.round(v)}`;
      const hist = m.price_history || [];
      const lead = [...(m.outcomes || [])].sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];
      let dir = 0;
      if (lead && hist.length >= 2) {
        const cur = hist[hist.length - 1]?.prices?.[lead.id];
        const prev = hist[hist.length - 2]?.prices?.[lead.id];
        if (typeof cur === 'number' && typeof prev === 'number') dir = Math.sign(cur - prev);
      }
      return { label: shortTitle(m.title).slice(0, 22).toUpperCase(), value, dir };
    });
  const items = live.length > 0 ? live : DEMO_TICKER_ITEMS;
  const loop = [...items, ...items, ...items];
  const arrow = (dir) => dir > 0 ? { ch: '↗', color: RADAR_GREEN } : dir < 0 ? { ch: '↘', color: RADAR_SALMON } : { ch: '→', color: '#8E9AB0' };

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', background: '#243550', borderBottom: '1px solid #14223E', overflow: 'hidden' }}>
      <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', background: RADAR_GOLD, color: '#00132D', fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em', padding: '9px 14px', zIndex: 1 }}>
        GLOBAL VOL
      </span>
      <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
        <div className="dbm-radar-tape" style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 0' }}>
          {loop.map((it, i) => {
            const a = arrow(it.dir);
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, margin: '0 26px', fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em' }}>
                <span style={{ color: '#CFC5B5' }}>{it.label}</span>
                <span style={{ color: '#8E9AB0' }}>Vol:</span>
                <span style={{ color: RADAR_GREEN }}>{it.value}</span>
                <span style={{ color: a.color }}>{a.ch}</span>
              </span>
            );
          })}
        </div>
      </div>
      <style>{`
        .dbm-radar-tape { animation: dbm-radar-tape 44s linear infinite; }
        .dbm-radar-tape:hover { animation-play-state: paused; }
        @keyframes dbm-radar-tape { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        @media (prefers-reduced-motion: reduce) { .dbm-radar-tape { animation: none; } }
      `}</style>
    </div>
  );
}

export function IntelFeed() {
  return (
    <div style={{ background: '#001F43', border: '1px solid #2F3A4A', borderRadius: 6, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={RADAR_GOLD_DIM} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
          <span style={radarMono({ fontSize: 9.5, color: RADAR_GOLD_DIM })}>INTELLIGENCE FEED</span>
        </span>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: RADAR_GREEN }} />
      </div>
      {INTEL_FEED.slice(0, 2).map((e, i) => (
        <div key={e.time} style={{ paddingTop: i === 0 ? 0 : 13, paddingBottom: 13, borderBottom: i === 0 ? '1px solid rgba(28,48,79,.6)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <span style={radarMono({ fontSize: 9 })}>{e.time}</span>
            <span style={radarMono({ fontSize: 8.5, letterSpacing: '0.08em', color: '#8E9AB0' })}>{e.chip}</span>
          </div>
          <p style={{ color: '#E6EDF9', fontSize: 11.5, lineHeight: 1.55, margin: 0 }}>{e.body}</p>
        </div>
      ))}
    </div>
  );
}

function NodeCard({ node, onOpen, style }) {
  return (
    <div
      className="dbm-radar-node"
      onClick={() => node.id && onOpen && onOpen(node.id)}
      style={{ background: '#001E40', border: '1px solid #2A3F63', borderRadius: 6, padding: '10px 13px', minWidth: 170, maxWidth: 220, cursor: node.id ? 'pointer' : 'default', boxShadow: '0 8px 22px rgba(0,5,15,.35)', ...style }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 7 }}>
        <span style={radarMono({ fontSize: 8, color: '#8E9AB0' })}>{node.kind}</span>
        {node.kind === 'TRENDING NODE' ? (
          <span style={{ width: 6, height: 6, borderRadius: 999, background: RADAR_GREEN, boxShadow: '0 0 0 3px rgba(75,225,118,.18)' }} />
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8E9AB0" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" />
          </svg>
        )}
      </div>
      <div style={{ color: '#F2F6FF', fontWeight: 700, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 7, fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em' }}>
        <span style={{ color: RADAR_GREEN }}>YES {node.yes}¢</span>
        <span style={{ color: '#8E9AB0' }}>NO {node.no}¢</span>
      </div>
    </div>
  );
}

export function RadarHero({ markets, onOpen }) {
  const real = binaryTop(markets, 1);
  const node = real[0] || DEMO_NODES[1];
  return (
    <div style={{ position: 'relative', minHeight: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 10px', background: '#02152F', border: '1px solid #14263F', borderRadius: 6 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 'clamp(20px,2.4vw,27px)', letterSpacing: '0.22em', color: RADAR_GOLD, margin: 0 }}>
          RADAR CORE
        </h1>
        <p style={{ ...radarMono({ fontSize: 9.5, letterSpacing: '0.18em', color: '#CFC5B5' }), margin: '13px 0 0' }}>
          System Status: Active
        </p>
      </div>
      <div
        className="dbm-radar-node"
        onClick={() => node.id && onOpen && onOpen(node.id)}
        style={{ position: 'absolute', left: '6%', top: 34, background: '#001E41', border: '1px solid #2A3F63', borderRadius: 6, padding: '10px 13px', minWidth: 155, maxWidth: 210, cursor: node.id ? 'pointer' : 'default', boxShadow: '0 8px 22px rgba(0,5,15,.35)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 7 }}>
          <span style={radarMono({ fontSize: 8, color: '#8E9AB0' })}>TRENDING</span>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: RADAR_GREEN, boxShadow: '0 0 0 3px rgba(75,225,118,.18)' }} />
        </div>
        <div style={{ color: '#F2F6FF', fontWeight: 700, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 8, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
          <span style={{ color: RADAR_GREEN }}>{node.yes}%</span>
          <span style={{ color: '#CFC5B5' }}>{node.no}%</span>
        </div>
      </div>
      <style>{`
        @media (max-width: 1023px) {
          .dbm-radar-node { position: static !important; margin: 14px auto 0; }
        }
      `}</style>
    </div>
  );
}

export function TurbulenceIndex() {
  return (
    <div style={{ background: '#001F43', border: '1px solid #2F3A4A', borderRadius: 6, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={RADAR_GOLD_DIM} strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 019 9h-9z" fill={RADAR_GOLD_DIM} stroke="none" opacity=".5" />
        </svg>
        <span style={radarMono({ fontSize: 9.5, color: RADAR_GOLD_DIM })}>CULTURE TURBULENCE</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 38, lineHeight: 1 }}>84.2</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 800, color: RADAR_GOLD }}>↗+4.5</span>
      </div>
      <svg viewBox="0 0 160 30" style={{ width: '100%', height: 34, display: 'block', marginTop: 12 }}>
        <polyline points={SPARK} fill="none" stroke={RADAR_GOLD_DIM} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function HotMediaMarkets({ markets, onOpen }) {
  const real = binaryTop(markets, 1);
  const rows = real.length > 0 ? real : [{ id: null, title: 'Drake x Cole Tour?', yes: 64, no: 36 }];
  return (
    <div style={{ background: '#182A45', border: '1px solid #2F3A4A', borderRadius: 6, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 13 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={RADAR_GOLD_DIM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
        </svg>
        <span style={radarMono({ fontSize: 9.5, color: RADAR_GOLD_DIM })}>HOT ALERTS</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((m, i) => (
          <div key={m.id || i}
            onClick={() => m.id && onOpen && onOpen(m.id)}
            style={{ borderTop: '1px solid rgba(47,58,74,.7)', paddingTop: 11, cursor: m.id ? 'pointer' : 'default' }}>
            <div style={{ color: '#F2F6FF', fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>{m.title}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
              <span style={{ flex: 1, textAlign: 'center', background: '#224F4F', border: '1px solid rgba(75,225,118,.5)', borderRadius: 3, padding: '7px 4px', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: RADAR_GREEN }}>
                YES {m.yes}¢
              </span>
              <span style={{ flex: 1, textAlign: 'center', background: '#464659', border: '1px solid rgba(255,180,171,.4)', borderRadius: 3, padding: '7px 4px', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: RADAR_SALMON }}>
                NO {m.no}¢
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── LIVE MARKET GRID (mock): five genre columns of real markets ────────────
const GENRES = [
  { id: 'trending', label: 'TRENDING' },
  { id: 'hiphop', label: 'HIP HOP' },
  { id: 'popculture', label: 'POP CULTURE' },
  { id: 'festivals', label: 'FESTIVALS' },
  { id: 'grammys', label: 'GRAMMYS' },
];
const GRID_DEMO = {
  trending: [{ id: null, title: 'Will Kendrick Lamar headline Coachella 2025?', yes: 78, no: 22, vol: '$6.2M', dir: 1 }],
  hiphop: [{ id: null, title: 'Drake to release "The Heart Part 6" response?', yes: 45, no: 55, vol: '$8.1M', dir: -1 }],
  popculture: [{ id: null, title: "Taylor Swift to announce 'Reputation TV' in Q3?", yes: 61, no: 39, vol: '$12.5M', dir: 0 }],
  festivals: [{ id: null, title: 'SZA 2026 Global Stadium Tour official dates in May?', yes: 92, no: 8, vol: '$1.8M', dir: 1 }],
  grammys: [{ id: null, title: 'Will Kendrick Lamar win Best Rap Album?', yes: 66, no: 34, vol: '$3.4M', dir: 1 }],
};
const HIPHOP_RE = /kendrick|drake|carti|travis scott|kanye|\bye\b|21 savage|future|metro boomin|cardi b|nicki|ice spice|lil (uzi|baby|wayne)|gunna|yeat|megan thee|glorilla|latto|central cee|j\.? ?cole|young thug|a\$?ap|tyler|rap/i;
const POP_RE = /taylor|viral|tiktok|netflix|hbo|show|\btv\b|movie|film|stream|billboard|hot 100|meme|instagram|youtube/i;
const FEST_RE = /coachella|tour|festival|stadium|glastonbury|lollapalooza|rolling loud|bonnaroo|headlin|concert/i;
const GRAMMY_RE = /grammy|award|aoty|album of the year|best new artist|song of the year|record of the year|best .{0,20}album/i;

function genreOf(title) {
  const t = title || '';
  if (GRAMMY_RE.test(t)) return 'grammys';
  if (FEST_RE.test(t)) return 'festivals';
  if (HIPHOP_RE.test(t)) return 'hiphop';
  if (POP_RE.test(t)) return 'popculture';
  return null;
}

function gridVol(v) {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return `$${Math.round(v || 0)}`;
}

export function LiveMarketGrid({ markets, genre, onOpen }) {
  const binaries = [...(markets || [])]
    .filter((m) => m.status === 'active' && (m.outcomes || []).length === 2 && m.outcomes.some((o) => (o.title || '').toLowerCase().startsWith('yes')))
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .map((m) => {
      const yes = m.outcomes.find((o) => (o.title || '').toLowerCase().startsWith('yes'));
      const yp = Math.round(yes?.probability ?? 50);
      const hist = m.price_history || [];
      let dir = 0;
      if (yes && hist.length >= 2) {
        const cur = hist[hist.length - 1]?.prices?.[yes.id];
        const prev = hist[hist.length - 2]?.prices?.[yes.id];
        if (typeof cur === 'number' && typeof prev === 'number') dir = Math.sign(cur - prev);
      }
      return { id: m.id, title: m.title, yes: yp, no: 100 - yp, vol: gridVol(m.total_volume || 0), dir, g: genreOf(m.title) };
    });

  const colMarkets = (gid) => {
    const pool = gid === 'trending' ? binaries : binaries.filter((m) => m.g === gid);
    const rows = pool.slice(0, 2);
    return rows.length > 0 ? rows : GRID_DEMO[gid];
  };

  const sync = new Date().toISOString().slice(11, 19);
  const trendBits = (dir) => dir > 0
    ? { text: 'Trend ↗', color: RADAR_GREEN }
    : dir < 0 ? { text: 'Trend ↘', color: RADAR_SALMON } : { text: 'STABLE', color: '#CFC5B5' };

  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F2F6FF" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" />
            <rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" />
          </svg>
          <span style={{ color: '#F2F6FF', fontWeight: 800, fontSize: 13 }}>LIVE MARKET GRID</span>
        </span>
        <span style={radarMono({ fontSize: 7.5, letterSpacing: '0.12em', background: '#243550', borderRadius: 2, padding: '4px 8px' })}>ALL SYSTEMS GO</span>
        <span style={radarMono({ fontSize: 7.5, letterSpacing: '0.12em', background: '#243550', borderRadius: 2, padding: '4px 8px' })}>SYNC: {sync} UTC</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <span style={radarMono({ fontSize: 8.5 })}>SORT BY VOL</span>
        </span>
      </div>

      <div className="dbm-radar-marketgrid">
        {GENRES.map((g) => (
          <div key={g.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
              <span style={{ width: 3, height: 9, background: genre === g.id ? RADAR_GOLD : '#39465F', display: 'inline-block' }} />
              <span style={radarMono({ fontSize: 8, color: genre === g.id ? RADAR_GOLD : '#CFC5B5' })}>
                {g.label}{genre === g.id ? ' ▾' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {colMarkets(g.id).map((m, i) => {
                const t = trendBits(m.dir);
                return (
                  <div key={m.id || i}
                    onClick={() => m.id && onOpen && onOpen(m.id)}
                    style={{ background: '#081C36', border: '1px solid #22314A', borderRadius: 4, padding: '11px 11px 9px', cursor: m.id ? 'pointer' : 'default' }}>
                    <div style={{ color: '#F2F6FF', fontSize: 10.5, fontWeight: 600, lineHeight: 1.45, minHeight: 30 }}>{m.title}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
                      <span style={{ flex: 1, textAlign: 'center', background: '#224F4F', border: '1px solid rgba(75,225,118,.5)', borderRadius: 3, padding: '6px 2px', fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.08em', color: RADAR_GREEN }}>
                        YES {m.yes}¢
                      </span>
                      <span style={{ flex: 1, textAlign: 'center', background: '#464659', border: '1px solid rgba(255,180,171,.4)', borderRadius: 3, padding: '6px 2px', fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.08em', color: RADAR_SALMON }}>
                        NO {String(m.no).padStart(2, '0')}¢
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginTop: 9 }}>
                      <span style={radarMono({ fontSize: 7.5, letterSpacing: '0.08em' })}>▲ {m.vol} Vol</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.08em', color: t.color }}>{t.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .dbm-radar-marketgrid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 640px) { .dbm-radar-marketgrid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .dbm-radar-marketgrid { grid-template-columns: repeat(5, 1fr); } }
      `}</style>
    </div>
  );
}


// ── Live Markets browser (sector dashboard), matched to the reference mocks.
// Sits inside the Radar shell (below RadarTopBar/RadarVolTicker). Admin
// functions (resolve, scan/scout, waitlist, seeding, image regen) still all
// live — they're one tap away behind Settings / Deploy Market / the "+"
// button rather than being inlined here, so nothing that used to work here
// stopped working; it just moved behind the drawer.
const SECTORS = [
  { id: 'trending', label: 'Trending', icon: 'trend' },
  { id: 'music', label: 'Music', icon: 'note',
    re: /kendrick|drake|sza|beyonc|taylor swift|billboard|album|tour(?!nament)|stream(ing)?|spotify|chart|single|mixtape|rapper|grammy nom/i },
  { id: 'movies', label: 'Movies & TV', icon: 'film',
    re: /movie|film|box office|netflix|hbo|disney|marvel|oscar|premiere|sequel|series|renewal|episode|season \d|trailer/i },
  { id: 'gaming', label: 'Gaming', icon: 'gamepad',
    re: /game|gta|esports|twitch|streamer|valorant|fortnite|minecraft|playstation|xbox|nintendo|steam|worlds \d|league of legends|call of duty|overwatch/i },
  { id: 'festivals', label: 'Festivals', icon: 'stage',
    re: /coachella|festival|tour dates|stadium|concert|headlin|glastonbury|lollapalooza|rolling loud|bonnaroo/i },
  { id: 'awards', label: 'Awards', icon: 'trophy',
    re: /grammy|oscar|award|aoty|emmy|vma|bet awards|album of the year|best new artist|song of the year|record of the year/i },
  { id: 'social', label: 'Social Trends', icon: 'hash',
    re: /tiktok|viral|meme|trending on|twitter|x\.com|instagram|influencer|challenge/i },
  { id: 'news', label: 'News', icon: 'news', re: null },
];

const SECTOR_DEMO = {
  music: [
    { title: 'Kendrick Lamar New Album Drops Before Q4?', vol: '$4.2M', yes: 78, no: 22, status: 'PEAK' },
    { title: "SZA 'Lana' to Debut at #1 Billboard?", vol: '$1.8M', yes: 64, no: 36, status: 'RISING' },
    { title: 'Spotify Peak Stream Milestones for Mid-Year?', vol: '$850K', yes: 51, no: 49, status: 'STABLE' },
  ],
  movies: [
    { title: 'Box Office: Joker 2 Opening Weekend > $120M?', vol: '$12.4M', yes: 42, no: 58, status: 'FALLING' },
    { title: "Netflix Series: 'Beef' Season 2 Renewal?", vol: '$3.1M', yes: 88, no: 12, status: 'PEAK' },
  ],
  gaming: [
    { title: 'GTA VI to be delayed to 2026?', vol: '$4.2M', yes: 22, no: 78, status: 'HOT' },
    { title: 'Twitch: Kai Cenat to break peak viewership record?', vol: '$890K', yes: 64, no: 36, status: 'RISING' },
    { title: 'E-sports: T1 to win Worlds 2024?', vol: '$1.5M', yes: 41, no: 59, status: 'STABLE' },
  ],
  festivals: [
    { title: 'Coachella 2025 headliner announced by March?', vol: '$920K', yes: 71, no: 29, status: 'RISING' },
    { title: 'Glastonbury 2025 sells out in under a day?', vol: '$410K', yes: 55, no: 45, status: 'STABLE' },
  ],
  awards: [
    { title: 'Album of the Year goes to a female artist?', vol: '$2.1M', yes: 58, no: 42, status: 'RISING' },
    { title: 'Best New Artist upset at the Grammys?', vol: '$630K', yes: 33, no: 67, status: 'FALLING' },
  ],
  social: [
    { title: "New Drake track goes viral on TikTok this week?", vol: '$540K', yes: 62, no: 38, status: 'RISING' },
    { title: 'A Coachella meme becomes a top-10 trend?', vol: '$210K', yes: 47, no: 53, status: 'STABLE' },
  ],
  news: [
    { title: 'Major label M&A announced this quarter?', vol: '$380K', yes: 29, no: 71, status: 'STABLE' },
    { title: 'Streaming payout rates change industry-wide?', vol: '$260K', yes: 44, no: 56, status: 'FALLING' },
  ],
};

function SectorIcon({ kind, color }) {
  const c = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', style: { flexShrink: 0 } };
  switch (kind) {
    case 'trend': return <svg {...c}><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>;
    case 'note': return <svg {...c}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
    case 'film': return <svg {...c}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" /></svg>;
    case 'gamepad': return <svg {...c}><rect x="2" y="8" width="20" height="9" rx="4" /><path d="M7 11v3M5.5 12.5h3M15.5 12.5h.01M18.5 11h.01" /></svg>;
    case 'stage': return <svg {...c}><path d="M3 21h18M4 18h16M6 18v-7M10 18v-7M14 18v-7M18 18v-7M3 9l9-6 9 6z" /></svg>;
    case 'trophy': return <svg {...c}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM7 6H4a2 2 0 002 4h1M17 6h3a2 2 0 01-2 4h-1" /></svg>;
    case 'hash': return <svg {...c}><path d="M5 9h14M5 15h14M10 3L8 21M16 3l-2 18" /></svg>;
    case 'news': return <svg {...c}><path d="M4 4h13a3 3 0 013 3v13H7a3 3 0 01-3-3z" /><path d="M4 4v13a3 3 0 003 3M9 9h7M9 13h7M9 17h4" /></svg>;
    case 'gear': return <svg {...c}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
    case 'life': return <svg {...c}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="M5.5 5.5l3.2 3.2M18.5 5.5l-3.2 3.2M5.5 18.5l3.2-3.2M18.5 18.5l-3.2-3.2" /></svg>;
    default: return null;
  }
}

function statusColor(status) {
  if (status === 'FALLING') return RADAR_SALMON;
  if (status === 'STABLE') return RADAR_GOLD_DIM;
  return RADAR_GREEN; // PEAK / RISING / HOT
}

function MiniSpark({ status }) {
  const shapes = {
    PEAK: '0,20 10,15 20,17 30,9 40,11 50,4',
    RISING: '0,22 10,18 20,19 30,12 40,9 50,5',
    HOT: '0,18 10,20 20,10 30,14 40,6 50,3',
    STABLE: '0,12 10,11 20,13 30,11 40,12 50,11',
    FALLING: '0,4 10,9 20,7 30,14 40,13 50,20',
  };
  const color = statusColor(status);
  return (
    <svg viewBox="0 0 50 24" style={{ width: 46, height: 20, display: 'block' }}>
      <polyline points={shapes[status] || shapes.STABLE} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

function classifySector(title) {
  for (const s of SECTORS) {
    if (s.re && s.re.test(title || '')) return s.id;
  }
  return null;
}

function sectorRows(markets, sectorId) {
  const real = [...(markets || [])]
    .filter((m) => m.status === 'active' && classifySector(m.title) === sectorId)
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .map((m, i) => {
      const yes = (m.outcomes || []).find((o) => (o.title || '').toLowerCase().startsWith('yes'));
      const lead = yes || [...(m.outcomes || [])].sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];
      const yesP = yes ? Math.round(yes.probability || 0) : Math.round(lead?.probability || 50);
      const noP = yes ? 100 - yesP : 100 - yesP;
      const vol = m.total_volume || 0;
      const volLabel = vol >= 1e6 ? `$${(vol / 1e6).toFixed(1)}M` : vol >= 1e3 ? `$${(vol / 1e3).toFixed(1).replace(/\.0$/, '')}K` : `$${Math.round(vol)}`;
      const delta = deltaFor(m, lead);
      const status = i === 0 ? 'PEAK' : delta > 0 ? 'RISING' : delta < 0 ? 'FALLING' : (vol > 2e6 ? 'HOT' : 'STABLE');
      return { id: m.id, title: m.title, vol: volLabel, yes: yesP, no: noP, status, image: m.image || m.event_image, _vol: vol };
    });
  const demo = SECTOR_DEMO[sectorId] || [];
  const need = Math.max(0, Math.min(3, demo.length) - real.length);
  return [...real.slice(0, 3), ...demo.slice(0, need)];
}

function LiveMarketCard({ m, onOpen }) {
  return (
    <div
      onClick={() => m.id && onOpen && onOpen(m.id)}
      style={{ background: '#0C203A', border: '1px solid #2F3A4A', borderRadius: 8, overflow: 'hidden', cursor: m.id ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', transition: 'border-color .15s ease' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = RADAR_GOLD)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2F3A4A')}
    >
      <div style={{ position: 'relative', height: 78, background: 'linear-gradient(135deg,#122040 0%,#050A18 75%)' }}>
        {m.image && /^https?:/.test(m.image) && (
          <img src={m.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,10,26,.85)', border: '1px solid #2A3F63', borderRadius: 2, padding: '3px 7px', fontFamily: 'var(--mono)', fontSize: 7.5, fontWeight: 800, letterSpacing: '0.12em', color: statusColor(m.status) }}>
          {m.status}
        </span>
      </div>
      <div style={{ padding: '11px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ color: '#F2F6FF', fontWeight: 700, fontSize: 11.5, lineHeight: 1.4, minHeight: 32 }}>{m.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, color: '#8E9AB0' }}>{m.vol} Vol</span>
          <MiniSpark status={m.status} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <span style={{ flex: 1, textAlign: 'center', background: '#224F4F', border: '1px solid rgba(75,225,118,.5)', borderRadius: 3, padding: '6px 2px', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: RADAR_GREEN }}>
            YES {m.yes}¢
          </span>
          <span style={{ flex: 1, textAlign: 'center', background: '#464659', border: '1px solid rgba(255,180,171,.4)', borderRadius: 3, padding: '6px 2px', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: RADAR_SALMON }}>
            NO {m.no}¢
          </span>
        </div>
      </div>
    </div>
  );
}

function SectorSection({ sector, markets, onOpen, forwardRef }) {
  const rows = sectorRows(markets, sector.id);
  const descriptions = {
    music: 'Tracking drops, charts, and tour performance.',
    movies: 'Predicting box office, critics, and series renewals.',
    gaming: 'Predicting releases, viewership, and tournament outcomes.',
    festivals: 'Lineups, sellouts, and on-site surprises.',
    awards: 'Ballots, upsets, and show-night predictions.',
    social: 'What breaks out next, before it breaks out.',
    news: 'Industry moves worth having a position on.',
  };
  return (
    <div ref={forwardRef} style={{ marginBottom: 30, scrollMarginTop: 90 }}>
      <div style={{ marginBottom: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <SectorIcon kind={sector.icon} color={RADAR_GOLD_DIM} />
          <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 16 }}>{sector.label} Markets</span>
        </span>
        <p style={{ color: '#8E9AB0', fontSize: 11.5, margin: '5px 0 0 22px' }}>{descriptions[sector.id]}</p>
      </div>
      <div className="dbm-live-cards" style={{ marginTop: 14 }}>
        {rows.map((m, i) => <LiveMarketCard key={m.id || `${sector.id}-${i}`} m={m} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

export function LiveMarketsBrowser({ markets, onOpen }) {
  const navigate = useNavigate();
  const [activeSector, setActiveSector] = useState('trending');
  const refs = {};
  const goTo = (id) => {
    setActiveSector(id);
    if (id !== 'trending' && refs[id]?.current) {
      refs[id].current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (id === 'trending') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const active = markets.filter((m) => m.status === 'active');
  const globalVol = active.reduce((sum, m) => sum + (m.total_volume || 0), 0);
  const globalVolLabel = globalVol >= 1e6 ? `$${(globalVol / 1e6).toFixed(1)}M` : `$${Math.round(globalVol).toLocaleString('en-US')}`;

  const sectorVols = {};
  for (const m of active) {
    const sid = classifySector(m.title);
    if (sid) sectorVols[sid] = (sectorVols[sid] || 0) + (m.total_volume || 0);
  }
  const topSectorId = Object.keys(sectorVols).sort((a, b) => sectorVols[b] - sectorVols[a])[0] || 'music';
  const topSectorLabel = (SECTORS.find((s) => s.id === topSectorId) || SECTORS[1]).label.toUpperCase();

  const contentSectors = SECTORS.filter((s) => s.id !== 'trending' && s.id !== 'news').concat(SECTORS.filter((s) => s.id === 'news'));
  contentSectors.forEach((s) => { refs[s.id] = refs[s.id] || { current: null }; });

  return (
    <div className="dbm-live-shell">
      <aside style={{ borderRight: '1px solid #14223E', padding: '18px 14px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: '#8E9AB0', marginBottom: 8 }}>LIVE MARKETS</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.16em', color: '#CFC5B5', margin: '18px 0 10px' }}>SECTORS</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTORS.map((s) => {
            const isActive = activeSector === s.id;
            return (
              <button key={s.id} onClick={() => goTo(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, background: isActive ? '#182A45' : 'transparent',
                  border: 'none', borderRadius: 5, padding: '9px 10px', cursor: 'pointer', textAlign: 'left',
                  color: isActive ? '#FFFFFF' : '#8E9AB0', fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                }}>
                <SectorIcon kind={s.icon} color={isActive ? RADAR_GOLD_DIM : '#8E9AB0'} />
                {s.label}
              </button>
            );
          })}
        </nav>
        <div style={{ borderTop: '1px solid #1C304F', marginTop: 20, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', borderRadius: 5, padding: '9px 10px', cursor: 'default', textAlign: 'left', color: '#5C7391', fontSize: 12 }}>
            <SectorIcon kind="life" color="#5C7391" /> Support
          </button>
        </div>
        <button onClick={() => navigate('/explore')}
          style={{ width: '100%', marginTop: 16, background: RADAR_GOLD, color: '#00132D', fontWeight: 800, fontSize: 12.5, border: 'none', borderRadius: 5, padding: '11px 0', cursor: 'pointer' }}>
          Quick Trade
        </button>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: '16px 22px 44px' }}>
        <div className="dbm-live-statbar" style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap', marginBottom: 22, paddingBottom: 14, borderBottom: '1px solid #14223E' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: RADAR_GREEN }} />
            <span style={radarMono({ fontSize: 8.5 })}>ALL SYSTEMS GO</span>
          </span>
          <span style={radarMono({ fontSize: 8.5 })}>SYNC: <span style={{ color: '#FFFFFF' }}>LIVE 24/7</span></span>
          <span style={radarMono({ fontSize: 8.5 })}>LATENCY: <span style={{ color: '#FFFFFF' }}>12ms</span></span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
            <span style={radarMono({ fontSize: 8.5 })}>GLOBAL VOL: <span style={{ color: '#FFFFFF' }}>{globalVolLabel}</span></span>
            <span style={radarMono({ fontSize: 8.5 })}>TOP SECTOR: <span style={{ color: RADAR_GREEN }}>{topSectorLabel} (+12.4%)</span></span>
          </span>
        </div>

        {contentSectors.map((s) => (
          <SectorSection key={s.id} sector={s} markets={markets} onOpen={onOpen} forwardRef={refs[s.id]} />
        ))}
      </main>

      <style>{`
        .dbm-live-shell { display: flex; align-items: flex-start; }
        .dbm-live-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 640px) { .dbm-live-cards { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1024px) { .dbm-live-cards { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 767px) {
          .dbm-live-shell { flex-direction: column; }
          .dbm-live-shell > aside { width: 100% !important; border-right: none !important; border-bottom: 1px solid #14223E; }
        }
        @media (min-width: 768px) { .dbm-live-shell > aside { width: 210px; } }
      `}</style>
    </div>
  );
}

// ── Admin tools drawer: everything that used to live inline under the old
// "Live Markets" tab (resolve queue, scan/scout, waitlist, curated seeding,
// image regeneration) — now one tap away instead of taking over the tab.
// ── Admin tooling (resolve queue, scan/scout, waitlist management, curated
// seeding, image regeneration) has been removed from the Radar page per
// Neel — deleted rather than hidden.
