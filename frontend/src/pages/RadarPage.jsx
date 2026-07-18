import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMarkets } from '../hooks/useMarkets';
import TrendingRadar from '../components/TrendingRadar';
import ResolveQueue from '../components/ResolveQueue';
import WaitlistAdmin from '../components/WaitlistAdmin';
import { api } from '../api/client';

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
  const [seedBusy, setSeedBusy] = useState(false);
  const [badgeBusy, setBadgeBusy] = useState(false);
  const [badgeMsg, setBadgeMsg] = useState('');
  const [seedMsg, setSeedMsg] = useState('');
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
              <WaitlistAdmin radarKey={RADAR_KEY} compact />
            </div>

            <RadarHero markets={markets} onOpen={(id) => navigate(`/markets/${id}`)} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <TurbulenceIndex />
              <HotMediaMarkets markets={markets} onOpen={(id) => navigate(`/markets/${id}`)} />
            </div>
          </div>

          <LiveMarketGrid markets={markets} genre={tab} onCreate={() => setTab('live')} onOpen={(id) => navigate(`/markets/${id}`)} />

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
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {/* Only appears when a market actually needs a human resolution */}
          <ResolveQueue radarKey={RADAR_KEY} />

          <TrendingRadar
            radarKey={RADAR_KEY}
            sidebar={
              <>
                <WaitlistAdmin radarKey={RADAR_KEY} />

                <div style={{ padding: 16, borderRadius: 6, border: '1px solid #2F3A4A', background: '#001F43' }}>
                  <div style={{ color: '#F2F6FF', fontWeight: 700, fontSize: 14 }}>Curated starter batch</div>
                  <div style={{ color: '#8E9AB0', fontSize: 12.5, marginTop: 4, lineHeight: 1.55 }}>
                    Hand-picked markets — the original 21 (Drake, Travis Scott, Kanye…) plus the Sonotrade-style batch.
                    Safe to click more than once — already-live markets are skipped automatically.
                  </div>
                  <button
                    onClick={async () => {
                      setSeedBusy(true); setSeedMsg('');
                      try {
                        const r = await api.seedCuratedMarkets(RADAR_KEY);
                        setSeedMsg(r.created > 0
                          ? `✓ ${r.created} new markets published · ${r.skipped_existing} already live`
                          : `✓ All ${r.skipped_existing} curated markets are live on the site`);
                      } catch (e) {
                        setSeedMsg(`Failed: ${e.message}`);
                      }
                      setSeedBusy(false);
                    }}
                    disabled={seedBusy}
                    style={{
                      width: '100%', marginTop: 12, background: '#FFDF9B',
                      color: '#00132D', fontWeight: 800, fontSize: 13, border: 'none',
                      borderRadius: 4, padding: '11px 14px', cursor: 'pointer', opacity: seedBusy ? 0.6 : 1,
                    }}
                  >
                    {seedBusy ? 'Creating…' : 'Publish curated batch'}
                  </button>
                  {seedMsg && <p style={{ color: '#8E9AB0', fontSize: 12, marginTop: 10, marginBottom: 0, fontFamily: 'var(--mono)' }}>{seedMsg}</p>}
                </div>

                <div style={{ padding: 16, borderRadius: 6, border: '1px solid #2F3A4A', background: '#001F43' }}>
                  <div style={{ color: '#F2F6FF', fontWeight: 700, fontSize: 14 }}>Regenerate all market images</div>
                  <div style={{ color: '#8E9AB0', fontSize: 12.5, marginTop: 4, lineHeight: 1.55 }}>
                    Rebuilds every active market's icon badge from scratch — isolated from the scan and scout.
                    Use this if any market still shows an old image.
                  </div>
                  <button
                    onClick={async () => {
                      setBadgeBusy(true); setBadgeMsg('');
                      try {
                        const r = await api.regenerateBadges(RADAR_KEY);
                        setBadgeMsg(`Updated ${r.updated} of ${r.total} markets${r.errors?.length ? ` · ${r.errors.length} failed` : ''}`);
                      } catch (e) {
                        setBadgeMsg(`Failed: ${e.message}`);
                      }
                      setBadgeBusy(false);
                    }}
                    disabled={badgeBusy}
                    style={{
                      width: '100%', marginTop: 12, background: '#243550', color: '#D5E3FF',
                      fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 4,
                      padding: '11px 14px', cursor: 'pointer', opacity: badgeBusy ? 0.6 : 1,
                    }}
                  >
                    {badgeBusy ? 'Regenerating…' : 'Regenerate all images'}
                  </button>
                  {badgeMsg && <p style={{ color: '#8E9AB0', fontSize: 12, marginTop: 10, marginBottom: 0, fontFamily: 'var(--mono)' }}>{badgeMsg}</p>}
                </div>
              </>
            }
          />
        </div>
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
    { id: 'hiphop', label: 'Hip Hop' },
    { id: 'popculture', label: 'Pop Culture' },
    { id: 'festivals', label: 'Festivals' },
    { id: 'grammys', label: 'Grammys' },
    { id: 'live', label: 'Live Markets' },
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

export function LiveMarketGrid({ markets, genre, onCreate, onOpen }) {
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
          <button onClick={onCreate}
            style={{ background: RADAR_GOLD, color: '#00132D', fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.12em', border: 'none', borderRadius: 2, padding: '7px 12px', cursor: 'pointer' }}>
            CREATE MARKET
          </button>
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
