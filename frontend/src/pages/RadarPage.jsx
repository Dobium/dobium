import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
    return (
      <div className="max-w-sm mx-auto p-6" style={{ paddingTop: '18vh' }}>
        <h1 style={{ fontFamily: 'var(--wordmark)', fontSize: 22, color: 'var(--text)', marginBottom: 8, textAlign: 'center' }}>
          Trending <span style={{ color: 'var(--gold)' }}>Radar</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
          Enter the passphrase to review pending markets.
        </p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && tryUnlock()}
          placeholder="Passphrase"
          autoFocus
          style={{
            width: '100%', background: 'rgba(10,17,40,.65)', border: '1px solid var(--line)',
            borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 14,
            outline: 'none', marginBottom: 10, textAlign: 'center',
          }}
        />
        <button
          onClick={tryUnlock}
          style={{
            width: '100%', background: 'linear-gradient(180deg,#FFDF9B,var(--gold-2))',
            color: '#1a1405', fontWeight: 700, fontSize: 14, border: 'none',
            borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
          }}
        >
          Unlock
        </button>
        {error && <p style={{ color: 'var(--no)', fontSize: 13, textAlign: 'center', marginTop: 10 }}>{error}</p>}
      </div>
    );
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
