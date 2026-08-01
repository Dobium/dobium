// ── DOBIUM Google Trends Terminal ──────────────────────────────────────────
// Ranked search-signal board from Neel's mock. Shares chrome with the other
// terminals; its right rail is Trends-specific. All content is demo data.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  T_PAGE, T_PANEL, T_TILE, T_LINE, T_ANALYSIS,
  GREEN, GOLD, MUTED, WHITE, tmono, ExchangeTopBar, SourceRail,
} from '../components/TerminalChrome';
import { TREND_SIGNALS, TREND_EVENTS, TREND_HYPOTHESES } from '../data/trendsSignals';

const RED = '#FF6B6B';
const TONES = { gold: GOLD, red: RED, plain: MUTED };

export default function TrendsTerminalPage() {
  const navigate = useNavigate();
  const [source, setSource] = useState('Google Trends');

  return (
    <div style={{ background: T_PAGE, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ExchangeTopBar onBrand={() => navigate('/')} />

      <div className="dbm-gt-shell" style={{ flex: 1, minHeight: 0 }}>
        <SourceRail source={source} setSource={setSource} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="dbm-gt-body">
            <div style={{ minWidth: 0, padding: '20px 18px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 26 }}>
                <div>
                  <h1 style={{ color: WHITE, fontWeight: 800, fontSize: 'clamp(23px,2.7vw,31px)', lineHeight: 1.2, margin: '0 0 11px', maxWidth: 260 }}>GOOGLE TRENDS SEARCHES</h1>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: GOLD }} />
                    <span style={tmono({ fontSize: 8.5, letterSpacing: '0.14em', color: MUTED })}>LIVE GLOBAL SEARCH VECTORIZATION</span>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <MetricBox k="ACTIVE SIGNALS" v="1,482 Units" />
                  <MetricBox k="LATENCY" v="14ms" />
                </div>
              </div>

              <div style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 5, overflow: 'hidden' }}>
                {TREND_SIGNALS.slice(0, 4).map((t, i) => (
                  <TrendRow key={t.slug} t={t} last={i === 3} onOpen={() => navigate(`/trends/${t.slug}`)} />
                ))}
              </div>

              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button onClick={() => navigate(`/trends/${TREND_SIGNALS[0].slug}`)} style={{
                  ...tmono({ fontSize: 9.5 }), background: 'transparent', color: '#C6D3E8',
                  border: 'none', cursor: 'pointer', padding: '10px 14px',
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                }}>VIEW MORE INTELLIGENCE <span style={{ color: GOLD }}>→</span></button>
              </div>
            </div>

            <div style={{ minWidth: 0, borderLeft: `1px solid ${T_LINE}`, display: 'flex', flexDirection: 'column' }}>
              <EventStream />
              <HypothesisPanel />
              <QueryBar />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dbm-gt-shell { display: flex; align-items: stretch; }
        .dbm-gt-body { display: grid; grid-template-columns: minmax(0,1fr); flex: 1; min-height: 0; }
        @media (min-width: 1100px) { .dbm-gt-body { grid-template-columns: minmax(0,1fr) 300px; } }
        @media (max-width: 899px) {
          .dbm-gt-shell { flex-direction: column; }
          .dbm-gt-shell > aside { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

function MetricBox({ k, v }) {
  return (
    <div style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '11px 16px' }}>
      <div style={tmono({ fontSize: 7.5, letterSpacing: '0.14em', color: MUTED, marginBottom: 8 })}>{k}</div>
      <div style={{ ...tmono({ fontSize: 11 }), color: WHITE }}>{v}</div>
    </div>
  );
}

function TrendRow({ t, last, onOpen }) {
  const tone = TONES[t.tone] || MUTED;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 18px', borderBottom: last ? 'none' : `1px solid ${T_LINE}`, flexWrap: 'wrap' }}>
      <div style={{ width: 44, flexShrink: 0 }}>
        <div style={tmono({ fontSize: 7.5, letterSpacing: '0.14em', color: MUTED, marginBottom: 5 })}>RANK</div>
        <div style={{ ...tmono({ fontSize: 19 }), color: WHITE, marginBottom: 7 }}>{t.rank}</div>
        <button onClick={onOpen} style={{
          ...tmono({ fontSize: 7.5, color: '#8FA3BC' }), background: 'transparent',
          border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', lineHeight: 1.5,
        }}>VIEW<br />MORE</button>
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap', marginBottom: 13 }}>
          <h2 style={{ color: WHITE, fontWeight: 700, fontSize: 17, margin: 0 }}>{t.title}</h2>
          <span style={{ ...tmono({ fontSize: 7.5 }), color: tone, border: `1px solid ${tone}66`, borderRadius: 3, padding: '4px 8px' }}>{t.badge}</span>
        </div>

        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <div>
            <div style={tmono({ fontSize: 7.5, letterSpacing: '0.13em', color: MUTED, marginBottom: 6 })}>REGION</div>
            <div style={{ color: '#C6D3E8', fontSize: 11.5, maxWidth: 80, lineHeight: 1.4 }}>{t.region}</div>
          </div>
          <div>
            <div style={tmono({ fontSize: 7.5, letterSpacing: '0.13em', color: MUTED, marginBottom: 6 })}>GROWTH</div>
            <div style={{ ...tmono({ fontSize: 10.5 }), color: GREEN }}>+{t.growth}%</div>
          </div>
          <div style={{ minWidth: 110 }}>
            <div style={tmono({ fontSize: 7.5, letterSpacing: '0.13em', color: MUTED, marginBottom: 6 })}>INTEREST SCORE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ ...tmono({ fontSize: 10.5 }), color: WHITE }}>{t.interest}</span>
              <span style={{ flex: 1, height: 3, background: '#0A1622', borderRadius: 2, overflow: 'hidden', maxWidth: 60 }}>
                <span style={{ display: 'block', width: `${t.interest}%`, height: '100%', background: GOLD, borderRadius: 2 }} />
              </span>
            </div>
          </div>
        </div>
      </div>

      <button style={{
        ...tmono({ fontSize: 8.5 }), flexShrink: 0,
        background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}66`,
        borderRadius: 3, padding: '11px 15px', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 8,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round"><path d="M4 20V4M4 20h16M8 16l4-6 3 3 5-7" /></svg>
        GENERATE MARKETS
      </button>
    </div>
  );
}

function EventStream() {
  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}`, padding: '15px 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.9" strokeLinecap="round"><path d="M4 12h4l3-7 3 14 3-7h3" /></svg>
          <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: WHITE })}>MARKET STREAM</span>
        </span>
        <span style={tmono({ fontSize: 8.5, color: GOLD })}>V.88</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {TREND_EVENTS.map((e) => (
          <div key={e.at} style={{ background: T_ANALYSIS, border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '11px 12px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 9, flexWrap: 'wrap' }}>
              <span style={tmono({ fontSize: 8, color: '#5C7391' })}>{e.at}</span>
              <span style={tmono({ fontSize: 8, letterSpacing: '0.1em', color: GOLD })}>{e.tag}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <p style={{ color: '#C6D3E8', fontSize: 11, lineHeight: 1.6, margin: 0, flex: 1 }}>{e.body}</p>
              {e.spark && (
                <svg width="26" height="16" viewBox="0 0 26 16" fill="none" stroke={GREEN} strokeWidth="1.4" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <path d="M1 13l6-5 4 3 6-8" /><path d="M15 3h4v4" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HypothesisPanel() {
  return (
    <div style={{ padding: '15px 16px 8px', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.9"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></svg>
          <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: WHITE })}>AI HYPOTHESES</span>
        </span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.9"><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {TREND_HYPOTHESES.map((h) => (
          <div key={h.id}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 9 }}>
              <span style={{ ...tmono({ fontSize: 8.5 }), color: WHITE }}>HYPOTHESIS_{h.id}</span>
              <span style={{ ...tmono({ fontSize: 8.5 }), color: GOLD }}>{h.conf}% CONF</span>
            </div>
            <p style={{ color: '#8FA3BC', fontSize: 11, lineHeight: 1.65, margin: 0 }}>{h.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function QueryBar() {
  const [q, setQ] = useState('');
  return (
    <div style={{ padding: '14px 16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, border: `1px solid ${T_LINE}`, borderRadius: 4, overflow: 'hidden' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="EXECUTE CMD_QUERY"
          style={{
            ...tmono({ fontSize: 9 }), flex: 1, minWidth: 0,
            background: T_TILE, color: WHITE, border: 'none', padding: '12px 13px',
          }}
        />
        <button style={{ background: GOLD, border: 'none', padding: '0 14px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0A1A33" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  );
}
