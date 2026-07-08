import { useState, useEffect } from 'react';
import TrendingRadar from '../components/TrendingRadar';
import ResolveQueue from '../components/ResolveQueue';
import WaitlistAdmin from '../components/WaitlistAdmin';
import PriceSyncPanel from '../components/PriceSyncPanel';
import { api } from '../api/client';

const RADAR_KEY = 'dobium-radar-9247';
const STORAGE_KEY = 'dobium_radar_unlocked';

// A standalone, passphrase-gated review page for the Trending Radar.
// Reachable only by URL (like /pulse) — sidesteps the Supabase-auth admin gate.
// The passphrase is a light lock (this repo is public), not real secrecy —
// it stops anyone who stumbles onto the link, not a determined source-code reader.
export default function RadarPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [seedBusy, setSeedBusy] = useState(false);
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
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: 'var(--wordmark)', fontSize: 26, color: 'var(--text)', margin: 0 }}>
          Trending <span style={{ color: 'var(--gold)' }}>Radar</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 6, maxWidth: 560 }}>
          Scans Reddit and entertainment/sports news every day, keeps only headlines about a real
          verifiable event (no memes or discussion threads), sorts into Music, Sports, Movies & TV,
          and Awards, and filters out anything that could put a real person in a harmful spotlight.
          Review, tighten the wording into a question, and publish.
        </p>
      </div>

      <WaitlistAdmin radarKey={RADAR_KEY} />
      <PriceSyncPanel radarKey={RADAR_KEY} />
      <ResolveQueue radarKey={RADAR_KEY} />

      <div style={{ marginBottom: 24, padding: 16, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--panel)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>Curated starter batch</div>
            <div style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 2 }}>
              21 hand-picked, properly categorized markets (Drake, Travis Scott, Kanye, Oscars, Grammys, Netflix, HBO Max...).
              Safe to click more than once — already-live markets are skipped automatically.
            </div>
          </div>
          <button
            onClick={async () => {
              setSeedBusy(true); setSeedMsg('');
              try {
                const r = await api.seedCuratedMarkets(RADAR_KEY);
                setSeedMsg(`Created ${r.created} new markets · skipped ${r.skipped_existing} already live`);
              } catch (e) {
                setSeedMsg(`Failed: ${e.message}`);
              }
              setSeedBusy(false);
            }}
            disabled={seedBusy}
            style={{
              flexShrink: 0, background: 'linear-gradient(180deg,#FFDF9B,var(--gold-2))',
              color: '#1a1405', fontWeight: 700, fontSize: 13.5, border: 'none',
              borderRadius: 10, padding: '10px 18px', cursor: 'pointer', opacity: seedBusy ? 0.6 : 1,
            }}
          >
            {seedBusy ? 'Creating…' : 'Publish curated batch'}
          </button>
        </div>
        {seedMsg && <p style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 10, marginBottom: 0 }}>{seedMsg}</p>}
      </div>

      <TrendingRadar radarKey={RADAR_KEY} />
    </div>
  );
}
