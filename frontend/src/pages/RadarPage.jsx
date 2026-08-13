import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import {
  T_PAGE, T_RAIL, T_BAR, T_PANEL, T_TILE, T_TILE_ON, T_ROW_ON, T_LINE, T_ASK, T_BID,
  T_ANALYSIS, T_MAP, GREEN, SALMON, GOLD, MUTED, WHITE, tmono, PIPELINE,
  ExchangeTopBar, SourceRail,
} from '../components/TerminalChrome';

const RADAR_KEY = 'dobium-radar-9247';
const STORAGE_KEY = 'dobium_radar_unlocked';

// A standalone, passphrase-gated review page for the Trending Radar.
// Reachable only by URL (like /pulse) — sidesteps the Supabase-auth admin gate.
// The passphrase is a light lock (this repo is public), not real secrecy —
// it stops anyone who stumbles onto the link, not a determined source-code reader.
export default function RadarPage() {
  const navigate = useNavigate();
  const { markets } = useMarkets();
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [source, setSource] = useState('Home');
  const [sector, setSector] = useState('MUSIC');
  const feed = useSignalFeed(markets);

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
    <div style={{ background: T_PAGE, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ExchangeTopBar onBrand={() => navigate('/')} />
      <ExchangeTicker markets={markets} />

      <div className="dbm-xch-shell" style={{ flex: 1, minHeight: 0 }}>
        <SourceRail source={source} setSource={setSource} />

        <div className="dbm-xch-cols">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <SectorPicker sector={sector} setSector={setSector} />
            <OrderBook markets={markets} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <MarketIndexHero markets={markets} />
            <div className="dbm-xch-lower">
              <ProbabilityMatrix markets={markets} onOpen={(id) => navigate(`/markets/${id}`)} />
              <SentimentMap sector={sector} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <MarketClock />
            <TradeStream markets={markets} />
            <MarketStream feed={feed} />
            <AnalysisPanel />
          </div>
        </div>
      </div>

      <ExchangeStatusBar markets={markets} />

      <style>{`
        .dbm-xch-shell { display: flex; align-items: stretch; }
        .dbm-xch-cols {
          flex: 1; min-width: 0; display: grid; padding: 12px;
          grid-template-columns: minmax(0, 1fr); gap: 12px;
        }
        .dbm-xch-lower { display: grid; grid-template-columns: minmax(0,1fr); gap: 12px; }
        @media (min-width: 1100px) {
          .dbm-xch-cols { grid-template-columns: 250px minmax(0,1fr) 260px; align-items: start; }
          .dbm-xch-lower { grid-template-columns: minmax(0,1fr) minmax(0,1fr); }
        }
        @media (max-width: 899px) {
          .dbm-xch-shell { flex-direction: column; }
          .dbm-xch-shell > aside { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

// ── Top chrome: brand block, pipeline breadcrumb, search ───────────────────
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


// ── Shared helpers ─────────────────────────────────────────────────────────
function activeMarkets(markets) {
  return (markets || []).filter((m) => m.status === 'active');
}
function yesOf(m) {
  return (m.outcomes || []).find((o) => (o.title || '').toLowerCase().startsWith('yes'));
}
function leaderOf(m) {
  return [...(m.outcomes || [])].sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];
}
function pctDelta(m, outcome) {
  const h = m?.price_history || [];
  if (h.length >= 2 && outcome) {
    const last = h[h.length - 1]?.prices?.[outcome.id];
    const prev = h[h.length - 2]?.prices?.[outcome.id];
    if (typeof last === 'number' && typeof prev === 'number') return last - prev;
  }
  return 0;
}
// Turn a market title into an exchange-style ticker symbol (KNDRK.V, MARS.L…).
const SYMBOL_SUFFIX = ['.V', '.L', '.T', '.X', '.M'];
function symbolFor(title, i = 0) {
  const words = (title || '')
    .replace(/^will\s+/i, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const base = (words[0] || 'MKT').toUpperCase().replace(/[AEIOU]/g, (v, idx) => (idx === 0 ? v : '')).slice(0, 5)
    || (words[0] || 'MKT').toUpperCase().slice(0, 5);
  return base + SYMBOL_SUFFIX[i % SYMBOL_SUFFIX.length];
}
function compactMoney(v) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${Math.round(v || 0)}`;
}

// ── Under-nav quote tape ───────────────────────────────────────────────────
const TICKER_DEMO = [
  { label: 'NEURALINK TRIALS (2025)', value: '74.2%', dir: 1 },
  { label: 'KENDRICK ALBUM VELOCITY', value: '+412.8%', dir: 1 },
  { label: 'FED RATE CUT MAR', value: '12.5%', dir: -1 },
  { label: "SPACEX MARS LANDING '29", value: '4.2%', dir: 0 },
  { label: 'GTA VI DELAY RISK', value: '38.0%', dir: 1 },
];

function ExchangeTicker({ markets }) {
  const live = activeMarkets(markets)
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 6)
    .map((m) => {
      const lead = yesOf(m) || leaderOf(m);
      const d = pctDelta(m, lead);
      return {
        label: (m.title || '').replace(/^will\s+/i, '').replace(/\?+\s*$/, '').slice(0, 26).toUpperCase(),
        value: `${Math.round(lead?.probability || 0)}.0%`,
        dir: Math.sign(d),
      };
    });
  const items = live.length >= 4 ? live : TICKER_DEMO;
  const loop = [...items, ...items, ...items];
  const arrow = (d) => (d > 0 ? { ch: '↗', c: GREEN } : d < 0 ? { ch: '↘', c: SALMON } : { ch: '—', c: MUTED });

  return (
    <div style={{ background: T_PAGE, borderBottom: `1px solid ${T_LINE}`, overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <div className="dbm-xch-tape" style={{ display: 'inline-flex', alignItems: 'center', padding: '9px 0' }}>
        {loop.map((it, i) => {
          const a = arrow(it.dir);
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, margin: '0 26px', ...tmono({ fontSize: 10 }) }}>
              <span style={{ color: MUTED }}>{it.label}</span>
              <span style={{ color: WHITE }}>{it.value}</span>
              <span style={{ color: a.c }}>{a.ch}</span>
            </span>
          );
        })}
      </div>
      <style>{`
        .dbm-xch-tape { animation: dbm-xch-tape 48s linear infinite; }
        .dbm-xch-tape:hover { animation-play-state: paused; }
        @keyframes dbm-xch-tape { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        @media (prefers-reduced-motion: reduce) { .dbm-xch-tape { animation: none; } }
      `}</style>
    </div>
  );
}

// ── Left rail: signal sources ──────────────────────────────────────────────
// ── Sector picker ──────────────────────────────────────────────────────────
const SECTOR_TILES = [
  { id: 'GLOBAL ATTENTION', icon: 'globe' },
  { id: 'TECH & AI', icon: 'chip' },
  { id: 'MUSIC', icon: 'note' },
  { id: 'INTERNET TRENDS', icon: 'trend' },
  { id: 'MOVIES & TV', icon: 'film' },
  { id: 'FESTIVALS', icon: 'tent' },
  { id: 'GAMING', icon: 'pad' },
  { id: 'CREATORS & STREAMERS', icon: 'creator' },
  { id: 'FRONTIER', icon: 'rocket' },
  { id: 'STREAMING', icon: 'play' },
  { id: 'AWARDS', icon: 'trophy' },
];

function TileIcon({ kind, color }) {
  const c = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (kind) {
    case 'note': return <svg {...c}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
    case 'film': return <svg {...c}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" /></svg>;
    case 'chip': return <svg {...c}><rect x="7" y="7" width="10" height="10" rx="1.5" /><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" /></svg>;
    case 'rocket': return <svg {...c}><path d="M12 3c2.6 1.9 4.2 5 4.2 8.4 0 1.7-.8 3.3-1.7 4.2l-2.5 1.7-2.5-1.7c-.9-.9-1.7-2.5-1.7-4.2C7.8 8 9.4 4.9 12 3z" /><circle cx="12" cy="10" r="1.4" fill={color} stroke="none" /><path d="M9.6 16l-1.6 3.4M14.4 16l1.6 3.4" /></svg>;
    case 'globe': return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.4 2.6 3.8 5.7 3.8 9s-1.4 6.4-3.8 9c-2.4-2.6-3.8-5.7-3.8-9S9.6 5.6 12 3z" /></svg>;
    case 'tent': return <svg {...c}><path d="M3 20h18M12 4L4 20M12 4l8 16M12 4v16" /></svg>;
    case 'pad': return <svg {...c}><rect x="2" y="7" width="20" height="10" rx="4" /><path d="M7 10v4M5 12h4M15.5 11.5h.01M18 13.5h.01" /></svg>;
    case 'creator': return <svg {...c}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="12" cy="10.5" r="2.4" /><path d="M7.5 17c.9-1.9 2.6-3 4.5-3s3.6 1.1 4.5 3" /></svg>;
    case 'play': return <svg {...c}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10.5 9.5l5 2.5-5 2.5z" /></svg>;
    case 'trend': return <svg {...c}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>;
    case 'trophy': return <svg {...c}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM7 6H4a2 2 0 002 4h1M17 6h3a2 2 0 01-2 4h-1" /></svg>;
    default: return null;
  }
}

function SectorPicker({ sector, setSector }) {
  return (
    <div style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 6, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        <span style={tmono({ fontSize: 9, letterSpacing: '0.16em', color: MUTED })}>SECTORS</span>
        <span style={tmono({ fontSize: 9, color: GOLD })}>LIVE</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {SECTOR_TILES.map((t) => {
          const on = sector === t.id;
          return (
            <button key={t.id} onClick={() => setSector(t.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14,
                background: on ? T_TILE_ON : T_TILE,
                border: `1px solid ${on ? '#4A5560' : T_LINE}`,
                borderRadius: 5, padding: '12px 12px 11px', cursor: 'pointer', textAlign: 'left',
              }}>
              <TileIcon kind={t.icon} color={on ? WHITE : '#8FA3BC'} />
              <span style={tmono({ fontSize: 9.5, color: on ? WHITE : '#8FA3BC' })}>{t.id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Order book ─────────────────────────────────────────────────────────────
// Dobium is a paper prediction market with no resting limit orders, so this
// ladder is an illustrative depth view around each market's live probability
// rather than real book data.
function OrderBook({ markets }) {
  const top = activeMarkets(markets).sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))[0];
  const lead = top ? (yesOf(top) || leaderOf(top)) : null;
  const mid = lead ? (lead.probability || 50) / 100 : 0.838;
  const sym = top ? symbolFor(top.title, 0) : 'KNDRK.V';

  const asks = [3, 2, 1].map((step, i) => ({
    px: (mid + step * 0.002).toFixed(3),
    size: [12401, 42100, 8202][i],
    deep: i === 1,
  }));
  const bids = [1, 3, 7].map((step, i) => ({
    px: (mid - step * 0.001).toFixed(3),
    size: [15900, 98000, 1440][i],
    deep: i === 1,
  }));

  const Row = ({ px, size, side, deep }) => (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '6px 11px', background: side === 'ask' ? T_ASK : T_BID, ...tmono({ fontSize: 10.5, letterSpacing: '0.04em' }) }}>
      {deep && <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: side === 'ask' ? SALMON : GREEN }} />}
      <span style={{ color: side === 'ask' ? SALMON : GREEN }}>{px}</span>
      <span style={{ color: '#C6D3E8' }}>{size.toLocaleString('en-US')}</span>
    </div>
  );

  return (
    <div style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 12px' }}>
        <span style={tmono({ fontSize: 9, letterSpacing: '0.16em', color: MUTED })}>ORDER BOOK</span>
        <span style={tmono({ fontSize: 9.5, color: WHITE })}>{sym}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {asks.map((a) => <Row key={a.px} {...a} side="ask" />)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T_TILE, margin: '4px 0', padding: '13px 12px' }}>
        <span style={tmono({ fontSize: 9, letterSpacing: '0.14em', color: MUTED })}>SPREAD</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          <span style={{ ...tmono({ fontSize: 17, letterSpacing: '0.02em' }), color: WHITE }}>{mid.toFixed(3)}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round">
            <path d="M8 20V6M8 6L4.5 9.5M8 6l3.5 3.5M16 4v14M16 18l3.5-3.5M16 18l-3.5-3.5" />
          </svg>
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 2 }}>
        {bids.map((b) => <Row key={b.px} {...b} side="bid" />)}
      </div>
    </div>
  );
}

// ── Center hero: aggregate index ───────────────────────────────────────────
function MarketIndexHero({ markets }) {
  const live = activeMarkets(markets);
  const total = live.reduce((s, m) => s + (m.total_volume || 0), 0);
  // Index level: scaled aggregate so it reads like a market index, not a raw sum.
  const level = total > 0 ? (total / 100) + 14000 : 14291.5;
  const vol = live.length ? Math.min(48, 4 + live.length * 0.9) : 12.4;

  const pts = '0,58 26,44 52,50 78,30 104,36 130,18 156,26 182,8';
  return (
    <div style={{ position: 'relative', background: T_RAIL, border: `1px solid ${T_LINE}`, borderRadius: 6, padding: '20px 22px 0', minHeight: 210, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ color: WHITE, fontWeight: 800, fontSize: 'clamp(20px,2.4vw,29px)', lineHeight: 1.15, margin: 0, letterSpacing: '-0.01em' }}>
            MARKET INDEX : ALPHA
          </h2>
          <div style={{ ...tmono({ fontSize: 9.5, letterSpacing: '0.16em', color: MUTED }), marginTop: 9 }}>
            GLOBAL SENTIMENT AGGREGATION
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ ...tmono({ fontSize: 'clamp(20px,2.3vw,28px)', letterSpacing: '0.01em' }), color: GREEN }}>
            ${level.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ ...tmono({ fontSize: 10, color: GREEN }), marginTop: 5 }}>+{vol.toFixed(1)}% VOLATILITY</div>
        </div>
      </div>

      {/* ghost wordmark + index line, like the mock's watermarked chart */}
      <span style={{ position: 'absolute', right: 26, top: 96, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: 0.13, pointerEvents: 'none' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2" strokeLinecap="round">
          <path d="M4 14v-4M8.5 18V6M13 15.5v-7M17.5 12.5v-1M21 16V8" />
        </svg>
        <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 25, color: WHITE }}>Dobium</span>
      </span>
      <svg viewBox="0 0 182 70" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 86, display: 'block' }}>
        <polyline points={pts} fill="none" stroke="#2C3F52" strokeWidth="1.4" />
      </svg>
    </div>
  );
}

// ── Probability matrix ─────────────────────────────────────────────────────
const MATRIX_DEMO = [
  { title: 'Neuralink Human Trials Phase 3', pct: 68 },
  { title: 'GPT-5 Public Announcement', pct: 92 },
];

function ProbabilityMatrix({ markets, onOpen }) {
  const real = activeMarkets(markets)
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 2)
    .map((m) => {
      const lead = yesOf(m) || leaderOf(m);
      return { id: m.id, title: (m.title || '').replace(/^will\s+/i, '').replace(/\?+\s*$/, ''), pct: Math.round(lead?.probability || 50) };
    });
  const rows = real.length >= 2 ? real : MATRIX_DEMO;

  return (
    <div style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 6, padding: '12px 14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={tmono({ fontSize: 9, letterSpacing: '0.16em', color: MUTED })}>PROBABILITY MATRIX</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round">
          <path d="M4 19V9M10 19V5M16 19v-7M21 19H3" />
        </svg>
      </div>
      {rows.map((r, i) => (
        <div key={r.id || i} onClick={() => r.id && onOpen && onOpen(r.id)}
          style={{ marginBottom: i === rows.length - 1 ? 0 : 16, cursor: r.id ? 'pointer' : 'default' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: '#D4E4FA', fontSize: 12.5, lineHeight: 1.4 }}>{r.title}</span>
            <span style={{ ...tmono({ fontSize: 11 }), color: GOLD, flexShrink: 0 }}>{r.pct}%</span>
          </div>
          <div style={{ height: 3, background: '#0B1826', borderRadius: 2, marginTop: 9 }}>
            <div style={{ width: `${r.pct}%`, height: '100%', background: GOLD, borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Global sentiment map ───────────────────────────────────────────────────
function SentimentMap({ sector }) {
  return (
    <div style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 6, padding: '12px 14px 14px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={tmono({ fontSize: 9, letterSpacing: '0.16em', color: MUTED })}>GLOBAL SENTIMENT MAP</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.4 2.6 3.8 5.7 3.8 9s-1.4 6.4-3.8 9c-2.4-2.6-3.8-5.7-3.8-9S9.6 5.6 12 3z" />
        </svg>
      </div>
      <div style={{ flex: 1, minHeight: 92, background: T_MAP, borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
        <svg viewBox="0 0 240 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {[18, 42, 66, 90].map((y) => <line key={y} x1="0" y1={y} x2="240" y2={y} stroke="#16202B" strokeWidth="0.7" />)}
          {[40, 80, 120, 160, 200].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="#16202B" strokeWidth="0.7" />)}
          <circle cx="72" cy="40" r="4.5" fill={GREEN} opacity="0.85" />
          <circle cx="72" cy="40" r="11" fill={GREEN} opacity="0.13" />
          <circle cx="168" cy="58" r="3.4" fill={GOLD} opacity="0.8" />
          <circle cx="168" cy="58" r="9" fill={GOLD} opacity="0.12" />
        </svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
        <span>
          <span style={{ display: 'block', ...tmono({ fontSize: 8.5, letterSpacing: '0.14em', color: MUTED }) }}>PEAK VOL</span>
          <span style={{ display: 'block', ...tmono({ fontSize: 10.5, color: WHITE }), marginTop: 4 }}>TOKYO/NYC</span>
        </span>
        <span style={{ textAlign: 'right' }}>
          <span style={{ display: 'block', ...tmono({ fontSize: 8.5, letterSpacing: '0.14em', color: MUTED }) }}>HOT ZONE</span>
          <span style={{ display: 'block', ...tmono({ fontSize: 10.5, color: GREEN }), marginTop: 4 }}>{sector}</span>
        </span>
      </div>
    </div>
  );
}

// ── Right rail: clock, trade stream, analysis ──────────────────────────────
function MarketClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  return (
    <div style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 6, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>MARKET TIME</span>
        <span style={{ ...tmono({ fontSize: 12 }), color: WHITE }}>{hh}:{mm}:{ss}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: `1px solid ${T_LINE}`, paddingTop: 11 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN, flexShrink: 0 }} />
          <span style={tmono({ fontSize: 8.5, color: GREEN })}>ORACLE FEED SYNCED</span>
        </span>
        <span style={tmono({ fontSize: 8.5, color: MUTED })}>L: <span style={{ color: WHITE }}>12ms</span></span>
      </div>
    </div>
  );
}

const STREAM_DEMO = [
  { sym: 'MARS.L', side: 'BUY', qty: 4800, px: '0.220', usd: '$1.84' },
  { sym: 'KNDRK.V', side: 'BUY', qty: 500, px: '0.234', usd: '$860.35' },
  { sym: 'KNDRK.V', side: 'BUY', qty: 2500, px: '0.775', usd: '$159.23' },
  { sym: 'KNDRK.V', side: 'BUY', qty: 1000, px: '0.162', usd: '$198.34' },
  { sym: 'BTC.2025', side: 'SELL', qty: 1300, px: '0.730', usd: '$696.68' },
  { sym: 'ELON.T', side: 'BUY', qty: 400, px: '0.429', usd: '$417.57' },
  { sym: 'GTAVI.X', side: 'SELL', qty: 3400, px: '0.364', usd: '$383.18' },
  { sym: 'MARS.L', side: 'BUY', qty: 700, px: '0.719', usd: '$187.00' },
];

// Pool of printable instruments, derived from real markets where possible.
function streamPool(markets) {
  const live = activeMarkets(markets)
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 12)
    .map((m, i) => {
      const lead = yesOf(m) || leaderOf(m);
      return {
        sym: symbolFor(m.title, i),
        px: (lead?.probability || 50) / 100,
        vol: m.total_volume || 0,
        drift: pctDelta(m, lead),
      };
    });
  if (live.length >= 5) return live;
  return STREAM_DEMO.map((r) => ({
    sym: r.sym,
    px: parseFloat(r.px),
    vol: 500,
    drift: r.side === 'SELL' ? -1 : 1,
  }));
}

// One synthetic print off the pool: price jitters around the instrument's
// last mark, side leans with its recent drift, size is lot-rounded.
function makePrint(pool, seq) {
  const inst = pool[Math.floor(Math.random() * pool.length)];
  const jitter = (Math.random() - 0.5) * 0.03;
  const px = Math.min(0.999, Math.max(0.001, inst.px + jitter));
  const sellBias = inst.drift < 0 ? 0.65 : 0.3;
  const side = Math.random() < sellBias ? 'SELL' : 'BUY';
  const qty = (Math.floor(Math.random() * 48) + 2) * 100;
  return {
    id: seq,
    sym: inst.sym,
    side,
    qty,
    px: px.toFixed(3),
    usd: compactMoney(qty * px),
    at: Date.now(),
  };
}

function ageLabel(at, now) {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 3) return 'JUST NOW';
  if (s < 60) return `${s}S AGO`;
  return `${Math.floor(s / 60)}M AGO`;
}

const STREAM_MAX = 14;

function TradeStream({ markets }) {
  const pool = useMemo(() => streamPool(markets), [markets]);
  const seq = useRef(0);
  const [rows, setRows] = useState([]);
  const [now, setNow] = useState(Date.now());

  // Seed the tape so the panel is never empty on first paint.
  useEffect(() => {
    const seed = [];
    for (let i = 0; i < 8; i += 1) {
      const p = makePrint(pool, seq.current++);
      p.at = Date.now() - (8 - i) * 4200;
      seed.unshift(p);
    }
    setRows(seed);
  }, [pool]);

  // New prints land at irregular intervals, the way a real tape behaves.
  useEffect(() => {
    let timer;
    const tick = () => {
      setRows((prev) => [makePrint(pool, seq.current++), ...prev].slice(0, STREAM_MAX));
      timer = setTimeout(tick, 1400 + Math.random() * 2600);
    };
    timer = setTimeout(tick, 1200 + Math.random() * 1800);
    return () => clearTimeout(timer);
  }, [pool]);

  // Re-render once a second so the age labels count up.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 14px 10px' }}>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>TRADE STREAM</span>
      </div>
      <div style={{ background: T_RAIL, maxHeight: 400, overflowY: 'auto' }}>
        {rows.map((r, i) => (
          <div
            key={r.id}
            className="dbm-xch-print"
            style={{ position: 'relative', padding: '10px 13px', borderBottom: i < rows.length - 1 ? `1px solid ${T_LINE}` : 'none' }}>
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5, background: r.side === 'SELL' ? SALMON : GREEN }} />
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ ...tmono({ fontSize: 9.5 }), color: WHITE }}>{r.sym}</span>
              <span style={{ ...tmono({ fontSize: 9 }), color: r.side === 'SELL' ? SALMON : GREEN }}>
                {r.side} {r.qty.toLocaleString('en-US')} @ {r.px}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 5 }}>
              <span style={tmono({ fontSize: 8, color: '#5C7391' })}>{ageLabel(r.at, now)}</span>
              <span style={tmono({ fontSize: 8.5, color: MUTED })}>{r.usd}</span>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes dbmPrintIn {
          0%   { opacity: 0; transform: translateY(-6px); background: rgba(74,222,128,0.10); }
          60%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 1; transform: translateY(0); background: transparent; }
        }
        .dbm-xch-print { animation: dbmPrintIn 900ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .dbm-xch-print { animation: none; }
        }
      `}</style>
    </div>
  );
}

// ── Signal discovery feed ──────────────────────────────────────────────────
// Drives both the MARKET STREAM panel and the DISCOVERED overlay that floats
// over the order book. Both read the same feed so a signal shows up in the
// two places at once, the way the mock has it.
const SIGNAL_BANK = [
  { title: 'OPENAI GPT-5 RELEASE', via: 'REUTERS' },
  { title: 'GTA VI PC DELAY', via: 'REDDIT' },
  { title: 'SZA WORLD TOUR', via: 'X (TWITTER)' },
  { title: 'APPLE AI INTEGRATION', via: 'NEWS' },
  { title: 'NEURALINK TRIAL EXPANSION', via: 'NEWS' },
  { title: 'KENDRICK SURPRISE DROP', via: 'X (TWITTER)' },
  { title: 'STARSHIP LAUNCH WINDOW', via: 'REUTERS' },
  { title: 'FED MINUTES LEAK', via: 'HACKER NEWS' },
  { title: 'COACHELLA LINEUP TIER 1', via: 'GOOGLE TRENDS' },
  { title: 'TWITCH PAYOUT SHAKEUP', via: 'YOUTUBE' },
];

const SIGNAL_MAX = 6;

function makeSignal(pool, seq) {
  const s = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: seq,
    title: s.title,
    via: s.via,
    score: Math.floor(Math.random() * 45) + 55,
    at: Date.now(),
  };
}

function useSignalFeed(markets) {
  // Real market titles get folded into the bank when there are enough live.
  const pool = useMemo(() => {
    const real = activeMarkets(markets).slice(0, 6).map((m) => ({
      title: (m.title || '').toUpperCase().slice(0, 34),
      via: SIGNAL_BANK[Math.floor(Math.random() * SIGNAL_BANK.length)].via,
    })).filter((r) => r.title.length > 3);
    return real.length >= 3 ? [...real, ...SIGNAL_BANK.slice(0, 4)] : SIGNAL_BANK;
  }, [markets]);

  const seq = useRef(0);
  const [signals, setSignals] = useState([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const seed = [];
    for (let i = 0; i < 4; i += 1) {
      const s = makeSignal(pool, seq.current++);
      s.at = Date.now() - i * 190000; // JUST NOW, ~3M, ~6M, ~9M AGO
      seed.push(s);
    }
    setSignals(seed);
  }, [pool]);

  useEffect(() => {
    let timer;
    const tick = () => {
      setSignals((prev) => [makeSignal(pool, seq.current++), ...prev].slice(0, SIGNAL_MAX));
      timer = setTimeout(tick, 9000 + Math.random() * 11000);
    };
    timer = setTimeout(tick, 7000 + Math.random() * 6000);
    return () => clearTimeout(timer);
  }, [pool]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return { signals, now };
}

function MarketStream({ feed }) {
  const { signals, now } = feed;
  return (
    <div style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px 10px' }}>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>MARKET STREAM</span>
      </div>
      <div style={{ background: T_RAIL }}>
        {signals.slice(0, 4).map((s, i) => (
          <div key={s.id} className="dbm-xch-sig" style={{ position: 'relative', padding: '11px 13px', borderBottom: i < 3 ? `1px solid ${T_LINE}` : 'none' }}>
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5, background: GOLD }} />
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ ...tmono({ fontSize: 9.5 }), color: WHITE }}>{s.title}</span>
              <span style={tmono({ fontSize: 8.5, color: GOLD })}>DISCOVERED</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 5 }}>
              <span style={tmono({ fontSize: 8, color: '#5C7391' })}>VIA {s.via}</span>
              <span style={tmono({ fontSize: 8, color: '#5C7391' })}>{ageLabel(s.at, now)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
              <span style={tmono({ fontSize: 8, color: MUTED })}>V-SCORE:</span>
              <span style={{ ...tmono({ fontSize: 9.5 }), color: GOLD }}>{s.score}</span>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes dbmSigIn {
          0%   { opacity: 0; transform: translateY(-5px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .dbm-xch-sig { animation: dbmSigIn 550ms ease-out; }
        @media (prefers-reduced-motion: reduce) { .dbm-xch-sig { animation: none; } }
      `}</style>
    </div>
  );
}

function AnalysisPanel() {
  return (
    <div style={{ background: T_ANALYSIS, border: `1px solid ${T_LINE}`, borderRadius: 6, padding: '13px 14px 14px' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.9" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
        </svg>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: GOLD })}>DOBIUM ANALYSIS</span>
      </div>
      <p style={{ color: '#C6D3E8', fontSize: 11.5, lineHeight: 1.65, margin: '0 0 13px' }}>
        Unusual volume spike in <span style={{ color: GOLD }}>@Kendrick</span> volatility clusters.
        Prediction engine suggesting a 12% probability shift in next 4 hours due to leaked metadata strings.
      </p>
      <button
        style={{ width: '100%', background: GOLD, color: '#0A1A33', border: 'none', borderRadius: 4, padding: '10px 0', cursor: 'pointer', ...tmono({ fontSize: 9.5, letterSpacing: '0.14em' }) }}>
        EXECUTE ANALYSIS
      </button>
    </div>
  );
}

// ── Bottom status bar ──────────────────────────────────────────────────────
function ExchangeStatusBar({ markets }) {
  const count = activeMarkets(markets).length;
  const tps = 18000 + count * 34;
  return (
    <div style={{ background: T_RAIL, borderTop: `1px solid ${T_LINE}`, padding: '9px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN }} />
          <span style={tmono({ fontSize: 8.5, color: MUTED })}>CONNECTED: <span style={{ color: '#C6D3E8' }}>DOB-NODE-04</span></span>
        </span>
        <span style={tmono({ fontSize: 8.5, color: MUTED })}>BANDWIDTH: <span style={{ color: '#C6D3E8' }}>4.8 GB/S</span></span>
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <span style={tmono({ fontSize: 8.5, color: MUTED })}>TPS: <span style={{ color: '#C6D3E8' }}>{tps.toLocaleString('en-US')}</span></span>
        <span style={tmono({ fontSize: 8.5, color: GREEN })}>SECURE ENCLAVE ACTIVE</span>
      </span>
    </div>
  );
}
