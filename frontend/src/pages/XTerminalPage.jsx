// ── DOBIUM X Terminal ──────────────────────────────────────────────────────
// Trend-signal board for X/Twitter, built from Neel's mock. Same shell as the
// News terminal — shared chrome from TerminalChrome, shared right-rail panels
// from TerminalPanels. All content is demo data; see data/xSignals.js.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  T_PAGE, T_PANEL, T_TILE, T_LINE, GREEN, SALMON, GOLD, MUTED, WHITE,
  tmono, ExchangeTopBar, SourceRail,
} from '../components/TerminalChrome';
import { StatusStrip, MarketStreamTable, Hypotheses, TerminalStatusBar, TerminalHeader } from '../components/TerminalPanels';
import { X_SIGNALS } from '../data/xSignals';

const TONES = {
  gold: GOLD,
  red: '#FF6B6B',
  orange: '#FFA657',
  green: GREEN,
};

export default function XTerminalPage() {
  const navigate = useNavigate();
  const [source, setSource] = useState('X (Twitter)');

  return (
    <div style={{ background: T_PAGE, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ExchangeTopBar onBrand={() => navigate('/')} />

      <div className="dbm-x-shell" style={{ flex: 1, minHeight: 0 }}>
        <SourceRail source={source} setSource={setSource} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <StatusStrip />
          <div className="dbm-x-body">
            <div style={{ minWidth: 0, padding: 14 }}>
              <TerminalHeader name="X TERMINAL" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {X_SIGNALS.map((s) => (
                  <SignalCard key={s.id} s={s} onOpen={() => navigate(`/x/${s.slug}`)} />
                ))}
              </div>
            </div>
            <div style={{ minWidth: 0, borderLeft: `1px solid ${T_LINE}`, display: 'flex', flexDirection: 'column' }}>
              <MarketStreamTable />
              <Hypotheses />
            </div>
          </div>
          <TerminalStatusBar />
        </div>
      </div>

      <style>{`
        .dbm-x-shell { display: flex; align-items: stretch; }
        .dbm-x-body { display: grid; grid-template-columns: minmax(0,1fr); flex: 1; min-height: 0; }
        @media (min-width: 1100px) { .dbm-x-body { grid-template-columns: minmax(0,1fr) 340px; } }
        @media (max-width: 899px) {
          .dbm-x-shell { flex-direction: column; }
          .dbm-x-shell > aside { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

function SignalCard({ s, onOpen }) {
  const tone = TONES[s.tone] || GOLD;
  return (
    <article style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderLeft: `2px solid ${tone}`, borderRadius: 4, padding: '13px 16px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ ...tmono({ fontSize: 8.5 }), background: `${tone}22`, color: tone, border: `1px solid ${tone}66`, borderRadius: 3, padding: '5px 9px', flexShrink: 0 }}>{s.badge}</span>
        <span style={{ ...tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED }), lineHeight: 1.5, flexShrink: 0, maxWidth: 90 }}>{s.kicker}</span>
        <h2 style={{ color: WHITE, fontSize: 14.5, fontWeight: 700, lineHeight: 1.35, margin: 0, flex: 1, minWidth: 120 }}>{s.title}</h2>

        <button style={{
          ...tmono({ fontSize: 8.5 }), flexShrink: 0,
          background: 'transparent', color: GOLD, border: `1px solid ${GOLD}88`,
          borderRadius: 3, padding: '9px 12px', cursor: 'pointer', lineHeight: 1.4,
        }}>⚡ GENERATE<br />MARKETS</button>

        <button onClick={onOpen} style={{
          ...tmono({ fontSize: 8.5 }), flexShrink: 0,
          background: 'transparent', color: '#8FA3BC', border: 'none',
          padding: '9px 4px', cursor: 'pointer', lineHeight: 1.4, textAlign: 'left',
        }}>VIEW<br />MORE</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 12 }}>
        <span style={{ ...tmono({ fontSize: 10 }), color: GREEN }}>▲ +{s.velocity}%</span>
        <span style={{ color: '#8FA3BC', fontSize: 12 }}>Mentions</span>
        <span style={{ color: '#3A4A5C' }}>|</span>
        <span style={{ ...tmono({ fontSize: 10 }), color: '#C6D3E8' }}>{s.posts.toLocaleString('en-US')} posts</span>
      </div>

      {s.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 11 }}>
          {s.tags.map((t) => (
            <span key={t} style={{ ...tmono({ fontSize: 8 }), background: T_TILE, color: '#8FA3BC', borderRadius: 3, padding: '5px 8px' }}>{t}</span>
          ))}
        </div>
      )}
    </article>
  );
}
