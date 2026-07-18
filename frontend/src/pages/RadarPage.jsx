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
  const { openAuthModal } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [seedBusy, setSeedBusy] = useState(false);
  const [badgeBusy, setBadgeBusy] = useState(false);
  const [badgeMsg, setBadgeMsg] = useState('');
  const [seedMsg, setSeedMsg] = useState('');

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
    <div>
      {/* Mock top bar: Dobium Radar brand · Markets / Portfolio / Radar / Activity · Connect Wallet */}
      <div style={{ borderBottom: '1px solid var(--line)', background: '#0B1229' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, height: 58 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
            <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 17, color: 'var(--gold)', cursor: 'pointer' }} onClick={() => navigate('/')}>
              Dobium Radar
            </span>
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {[
                { label: 'Markets', to: '/explore' },
                { label: 'Portfolio', to: '/portfolio' },
                { label: 'Radar', to: '/radar' },
                { label: 'Activity', to: '/portfolio' },
              ].map((l) => (
                <button key={l.label} onClick={() => navigate(l.to)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    padding: '6px 10px', color: l.label === 'Radar' ? '#DCE1FF' : '#8E94AF',
                    borderBottom: l.label === 'Radar' ? '2px solid var(--gold)' : '2px solid transparent',
                  }}>
                  {l.label}
                </button>
              ))}
            </nav>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 19, color: '#8E94AF', cursor: 'pointer' }}>notifications</span>
            <span className="material-symbols-outlined" style={{ fontSize: 19, color: '#8E94AF', cursor: 'pointer' }}>settings</span>
            <button onClick={() => openAuthModal('login')}
              style={{ background: 'linear-gradient(180deg,#FFDF9B,var(--gold-2))', color: '#1a1405', fontWeight: 800, fontSize: 12.5, border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer' }}>
              Connect Wallet
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 lg:p-8">
      {/* Mock header: Dobium Radar + one-line purpose */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: 'var(--wordmark)', fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
          Dobium Radar
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 6 }}>
          Real-time market discovery and resolution engine.
        </p>
      </div>

      {/* Only appears when a market actually needs a human resolution */}
      <ResolveQueue radarKey={RADAR_KEY} />

      <TrendingRadar
        radarKey={RADAR_KEY}
        sidebar={
          <>
            <WaitlistAdmin radarKey={RADAR_KEY} />

            <div style={{ padding: 16, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--panel)' }}>
              <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>Curated starter batch</div>
              <div style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 4, lineHeight: 1.55 }}>
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
                  width: '100%', marginTop: 12, background: 'linear-gradient(180deg,#FFDF9B,var(--gold-2))',
                  color: '#1a1405', fontWeight: 800, fontSize: 13.5, border: 'none',
                  borderRadius: 10, padding: '11px 14px', cursor: 'pointer', opacity: seedBusy ? 0.6 : 1,
                }}
              >
                {seedBusy ? 'Creating…' : 'Publish curated batch'}
              </button>
              {seedMsg && <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 10, marginBottom: 0, fontFamily: 'var(--mono)' }}>{seedMsg}</p>}
            </div>

            <div style={{ padding: 16, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--panel)' }}>
              <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>Regenerate all market images</div>
              <div style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 4, lineHeight: 1.55 }}>
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
                  width: '100%', marginTop: 12, background: '#2D344C', color: '#DCE1FF',
                  fontWeight: 700, fontSize: 13.5, border: 'none', borderRadius: 10,
                  padding: '11px 14px', cursor: 'pointer', opacity: badgeBusy ? 0.6 : 1,
                }}
              >
                {badgeBusy ? 'Regenerating…' : 'Regenerate all images'}
              </button>
              {badgeMsg && <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 10, marginBottom: 0, fontFamily: 'var(--mono)' }}>{badgeMsg}</p>}
            </div>
          </>
        }
      />
      </div>
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
