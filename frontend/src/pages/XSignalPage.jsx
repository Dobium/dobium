// ── DOBIUM X Terminal: signal detail ───────────────────────────────────────
// Reached from the X terminal's VIEW MORE. Built from Neel's second mock.
// All content is demo data; see data/xSignals.js.
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  T_PAGE, T_RAIL, T_PANEL, T_TILE, T_LINE, T_ANALYSIS,
  GREEN, SALMON, GOLD, MUTED, WHITE, tmono, ExchangeTopBar, SourceRail,
} from '../components/TerminalChrome';
import { Hypotheses } from '../components/TerminalPanels';
import { findSignal } from '../data/xSignals';

export default function XSignalPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [source, setSource] = useState('X (Twitter)');
  const s = findSignal(slug);

  if (!s) return <Navigate to="/x" replace />;

  return (
    <div style={{ background: T_PAGE, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ExchangeTopBar onBrand={() => navigate('/')} />

      <div className="dbm-xs-shell" style={{ flex: 1, minHeight: 0 }}>
        <SourceRail source={source} setSource={setSource} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="dbm-xs-body">
            <div style={{ minWidth: 0, padding: '16px 18px 20px' }}>
              <SignalHead s={s} onBack={() => navigate('/x')} />
              <StatRow s={s} />
              <div className="dbm-xs-charts">
                <PropagationCurve />
                <AuthorityDistribution rows={s.authority} />
              </div>
              <SemanticCloud items={s.semantic} />
              <Dissemination posts={s.posts_feed} />
              <FootRow />
            </div>

            <div style={{ minWidth: 0, borderLeft: `1px solid ${T_LINE}`, display: 'flex', flexDirection: 'column' }}>
              <SignalStream rows={s.stream} />
              <Hypotheses items={s.hyp} labelled />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dbm-xs-shell { display: flex; align-items: stretch; }
        .dbm-xs-body { display: grid; grid-template-columns: minmax(0,1fr); flex: 1; min-height: 0; }
        .dbm-xs-charts { display: grid; grid-template-columns: minmax(0,1fr); gap: 14px; margin-top: 18px; }
        @media (min-width: 1100px) {
          .dbm-xs-body { grid-template-columns: minmax(0,1fr) 320px; }
          .dbm-xs-charts { grid-template-columns: minmax(0,1.15fr) minmax(0,1fr); }
        }
        @media (max-width: 899px) {
          .dbm-xs-shell { flex-direction: column; }
          .dbm-xs-shell > aside { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

function SignalHead({ s, onBack }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ ...tmono({ fontSize: 8.5 }), background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}66`, borderRadius: 3, padding: '5px 9px' }}>{s.priority}</span>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.14em', color: MUTED })}>SIGNAL ID: {s.id}</span>
        <button onClick={onBack} style={{ ...tmono({ fontSize: 8.5, color: '#8FA3BC' }), marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer' }}>‹ BACK TO X TERMINAL</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ color: WHITE, fontWeight: 800, fontSize: 'clamp(24px,3vw,34px)', lineHeight: 1.15, margin: '0 0 12px' }}>{s.title}</h1>
          <p style={{ color: '#8FA3BC', fontSize: 12.5, lineHeight: 1.7, margin: 0, maxWidth: 520 }}>{s.summary}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...tmono({ fontSize: 26 }), color: GOLD }}>+{s.velocity}%</div>
          <div style={tmono({ fontSize: 8, letterSpacing: '0.16em', color: MUTED, marginTop: 6 })}>VELOCITY (24H)</div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ s }) {
  const Cell = ({ k, v, dot }) => (
    <div>
      <div style={tmono({ fontSize: 8, letterSpacing: '0.16em', color: MUTED, marginBottom: 8 })}>{k}</div>
      <div style={{ ...tmono({ fontSize: 15 }), color: WHITE, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        {v}{dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN }} />}
      </div>
    </div>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 18, borderTop: `1px solid ${T_LINE}`, borderBottom: `1px solid ${T_LINE}`, padding: '16px 0', marginTop: 20 }}>
      <Cell k="TOTAL MENTIONS" v={s.posts.toLocaleString('en-US')} />
      <Cell k="SENTIMENT INDEX" v={s.sentiment} dot />
      <Cell k="IMPACT SCORE" v={s.impact} />
      <Cell k="SOURCE REL." v={s.reliability} />
    </div>
  );
}

function PropagationCurve() {
  const path = 'M0,74 L12,72 L24,68 L36,60 L48,44 L60,30 L72,24 L84,20 L100,16';
  return (
    <div style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '13px 15px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>PROPAGATION CURVE</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round"><path d="M9 4H4v5M15 20h5v-5M4 4l7 7M20 20l-7-7" /></svg>
      </div>
      <svg viewBox="0 0 100 90" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 128 }}>
        <defs>
          <linearGradient id="xsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.16" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={`${path} L100,90 L0,90 Z`} fill="url(#xsFill)" />
        <path d={path} fill="none" stroke={GOLD} strokeWidth="0.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function AuthorityDistribution({ rows }) {
  return (
    <div style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '13px 15px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>AUTHORITY DISTRIBUTION</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
      </div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ ...tmono({ fontSize: 8, letterSpacing: '0.12em', color: MUTED }), width: 96, flexShrink: 0 }}>{k}</span>
          <span style={{ flex: 1, height: 4, background: '#0A1622', borderRadius: 2, overflow: 'hidden' }}>
            <span style={{ display: 'block', width: `${v}%`, height: '100%', background: GOLD, borderRadius: 2 }} />
          </span>
          <span style={{ ...tmono({ fontSize: 9.5 }), color: '#C6D3E8', width: 30, textAlign: 'right' }}>{v}%</span>
        </div>
      ))}
    </div>
  );
}

function SemanticCloud({ items }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED, marginBottom: 12 })}>SEMANTIC CLOUD</div>
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        {items.map((t) => (
          <span key={t} style={{ ...tmono({ fontSize: 8.5 }), background: T_TILE, color: '#C6D3E8', border: `1px solid ${T_LINE}`, borderRadius: 3, padding: '7px 11px' }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function Dissemination({ posts }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED, marginBottom: 14 })}>HIGH-AUTHORITY DISSEMINATION</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {posts.map((p) => (
          <div key={p.handle} style={{ display: 'flex', gap: 12, borderLeft: `2px solid ${T_LINE}`, paddingLeft: 13 }}>
            <span style={{ width: 30, height: 30, borderRadius: 6, background: T_TILE, border: `1px solid ${T_LINE}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...tmono({ fontSize: 11, color: MUTED }) }}>
              {p.name.charAt(0)}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ color: WHITE, fontSize: 12.5, fontWeight: 700 }}>{p.name}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill={GOLD}><path d="M12 1l2.3 1.5 2.7-.5 1.1 2.5 2.5 1.1-.5 2.7L22 11l-1.5 2.3.5 2.7-2.5 1.1-1.1 2.5-2.7-.5L12 21l-2.3-1.5-2.7.5-1.1-2.5-2.5-1.1.5-2.7L2 11l1.9-2.3-.5-2.7 2.5-1.1L7 2.5l2.7.5z" /></svg>
                <span style={{ color: MUTED, fontSize: 11.5 }}>{p.handle} · {p.ago}</span>
              </div>
              <p style={{ color: '#C6D3E8', fontSize: 12.5, lineHeight: 1.6, margin: '0 0 8px' }}>{p.body}</p>
              <div style={{ display: 'flex', gap: 18 }}>
                {p.stats.map((n, i) => (
                  <span key={i} style={tmono({ fontSize: 8.5, color: '#5C7391' })}>{n}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FootRow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const p = (n) => String(n).padStart(2, '0');
  const sync = `${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(now.getUTCSeconds())} GMT`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderTop: `1px solid ${T_LINE}`, marginTop: 26, paddingTop: 16 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN }} />
        <span style={tmono({ fontSize: 8.5, color: MUTED })}>MONITORING LIVE</span>
      </span>
      <span style={tmono({ fontSize: 8.5, color: MUTED })}>LAST SYNC: {sync}</span>
      <button style={{
        ...tmono({ fontSize: 9 }), marginLeft: 'auto',
        background: GOLD, color: '#0A1A33', border: `1px solid ${GOLD}`,
        borderRadius: 4, padding: '10px 16px', cursor: 'pointer',
      }}>⚡ GENERATE MARKETS</button>
    </div>
  );
}

function SignalStream({ rows }) {
  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 16px 13px' }}>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>MARKET STREAM</span>
        <span style={tmono({ fontSize: 8.5, color: GREEN })}>LIVE DATA</span>
      </div>
      {rows.map((r) => (
        <div key={r.sym} style={{ borderTop: `1px solid ${T_LINE}`, padding: '13px 16px 15px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ ...tmono({ fontSize: 10 }), color: WHITE }}>
              {r.sym}{r.venue && <span style={{ color: MUTED }}> / {r.venue}</span>}
            </span>
            <span style={{ ...tmono({ fontSize: 10 }), color: r.chg < 0 ? SALMON : GREEN }}>
              {r.chg >= 0 ? '+' : ''}{r.chg.toFixed(2)}%
            </span>
          </div>
          <p style={{ color: '#8FA3BC', fontSize: 11, lineHeight: 1.6, margin: '8px 0 0' }}>{r.note}</p>
        </div>
      ))}
    </div>
  );
}
