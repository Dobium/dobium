// ── DOBIUM Reddit Terminal: subreddit intel queue ──────────────────────────
// Reached from the Reddit terminal's VIEW MORE. Built from Neel's second mock.
// All content is demo data; see data/redditSignals.js.
import { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  T_PAGE, T_RAIL, T_PANEL, T_TILE, T_LINE, T_ANALYSIS,
  GREEN, SALMON, GOLD, MUTED, WHITE, tmono, ExchangeTopBar, SourceRail,
} from '../components/TerminalChrome';
import { findSub } from '../data/redditSignals';

const TONES = { green: GREEN, gold: GOLD, red: '#FF6B6B' };

export default function RedditSubPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [source, setSource] = useState('Reddit');
  const s = findSub(slug);

  if (!s) return <Navigate to="/reddit" replace />;

  return (
    <div style={{ background: T_PAGE, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ExchangeTopBar onBrand={() => navigate('/')} />

      <div className="dbm-rs-shell" style={{ flex: 1, minHeight: 0 }}>
        <SourceRail source={source} setSource={setSource} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <SubHead s={s} onBack={() => navigate('/reddit')} />

          <div className="dbm-rs-body">
            <div style={{ minWidth: 0, position: 'relative', paddingBottom: 44 }}>
              {s.feed.map((p, i) => (
                <PostRow key={p.id} p={p} last={i === s.feed.length - 1} />
              ))}
              <SentimentBar s={s} />
            </div>

            <div style={{ minWidth: 0, borderLeft: `1px solid ${T_LINE}`, display: 'flex', flexDirection: 'column' }}>
              <StreamCards rows={s.stream} />
              <HypothesisList items={s.hyp} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dbm-rs-shell { display: flex; align-items: stretch; }
        .dbm-rs-body { display: grid; grid-template-columns: minmax(0,1fr); flex: 1; min-height: 0; }
        @media (min-width: 1100px) { .dbm-rs-body { grid-template-columns: minmax(0,1fr) 320px; } }
        @media (max-width: 899px) {
          .dbm-rs-shell { flex-direction: column; }
          .dbm-rs-shell > aside { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

function SubHead({ s, onBack }) {
  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <span style={{ width: 30, height: 30, borderRadius: 999, background: '#FF5A2C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="#0A1A33">
          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
          <path d="M8 15.5c1.2 1 2.6 1.4 4 1.4s2.8-.4 4-1.4" stroke="#0A1A33" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      </span>
      <span style={{ ...tmono({ fontSize: 17 }), color: WHITE }}>{s.name.replace('r/', 'R/').toUpperCase()}</span>
      <span style={tmono({ fontSize: 8.5, letterSpacing: '0.14em', color: MUTED })}>INTEL_QUEUE · {s.nodes} ACTIVE NODES</span>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 9 }}>
        <button onClick={onBack} style={{ ...tmono({ fontSize: 9 }), background: T_TILE, color: '#C6D3E8', border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '10px 14px', cursor: 'pointer' }}>VELOCITY FILTER</button>
        <button style={{ ...tmono({ fontSize: 9 }), background: GOLD, color: '#0A1A33', border: `1px solid ${GOLD}`, borderRadius: 4, padding: '10px 14px', cursor: 'pointer' }}>SYNCHRONIZE</button>
      </div>
    </div>
  );
}

function PostRow({ p, last }) {
  const tone = TONES[p.flagTone] || GOLD;
  return (
    <article style={{ display: 'flex', gap: 16, padding: '18px 18px 20px', borderBottom: last ? 'none' : `1px solid ${T_LINE}` }}>
      <div style={{ width: 54, flexShrink: 0, textAlign: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 6px' }}>
          <path d="M5 14l7-7 7 7M5 19l7-7 7 7" />
        </svg>
        <div style={{ ...tmono({ fontSize: 11 }), color: WHITE }}>{p.vel}</div>
        <div style={tmono({ fontSize: 7.5, letterSpacing: '0.14em', color: MUTED, marginTop: 4 })}>VELOCITY</div>
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ ...tmono({ fontSize: 8 }), color: GOLD, border: `1px solid ${GOLD}66`, borderRadius: 3, padding: '4px 8px' }}>{p.badge}</span>
          <span style={tmono({ fontSize: 8.5, color: MUTED })}>{p.author} · {p.ago}</span>
        </div>

        <h2 style={{ color: WHITE, fontWeight: 700, fontSize: 'clamp(16px,1.7vw,20px)', lineHeight: 1.35, margin: '0 0 11px' }}>{p.head}</h2>
        <p style={{ color: '#8FA3BC', fontSize: 12.5, lineHeight: 1.7, margin: 0, maxWidth: 560 }}>{p.body}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap', marginTop: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.9"><path d="M4 5h16v11H9l-5 4z" strokeLinejoin="round" /></svg>
            <span style={{ ...tmono({ fontSize: 9.5 }), color: '#C6D3E8' }}>{p.comments} comments</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={tone} strokeWidth="2" strokeLinecap="round"><path d="M13 3L5 14h6l-1 7 8-11h-6z" strokeLinejoin="round" /></svg>
            <span style={{ ...tmono({ fontSize: 9.5 }), color: tone }}>{p.flag}</span>
          </span>
          <button style={{
            ...tmono({ fontSize: 8.5 }), marginLeft: 'auto',
            background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}66`,
            borderRadius: 3, padding: '10px 14px', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round"><path d="M4 20V4M4 20h16M8 16l4-6 3 3 5-7" /></svg>
            GENERATE MARKETS
          </button>
        </div>
      </div>
    </article>
  );
}

function SentimentBar({ s }) {
  return (
    <div style={{
      position: 'sticky', bottom: 0, background: T_RAIL, borderTop: `1px solid ${T_LINE}`,
      padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap',
    }}>
      <span style={tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED })}>
        GLOBAL SENTIMENT <span style={{ color: s.sentiment === 'BULLISH' ? GREEN : '#C6D3E8', marginLeft: 8 }}>{s.sentiment}</span>
      </span>
      <span style={tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED })}>
        SIGNAL NOISE <span style={{ color: '#C6D3E8', marginLeft: 8 }}>{s.noise}</span>
      </span>
    </div>
  );
}

function StreamCards({ rows }) {
  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 16px 13px' }}>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>MARKET STREAM</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3L5 14h6l-1 7 8-11h-6z" /></svg>
      </div>
      {rows.map((r) => (
        <div key={r.tag} style={{ borderTop: `1px solid ${T_LINE}`, padding: '13px 16px 15px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 9 }}>
            <span style={tmono({ fontSize: 8, letterSpacing: '0.12em', color: GOLD })}>{r.tag}</span>
            <span style={{ ...tmono({ fontSize: 9.5 }), color: r.chg < 0 ? SALMON : GREEN }}>{r.chg >= 0 ? '+' : ''}{r.chg.toFixed(1)}%</span>
          </div>
          <div style={{ color: WHITE, fontSize: 13, fontWeight: 700, marginBottom: 11 }}>{r.title}</div>
          <span style={{ display: 'block', height: 3, background: '#0A1622', borderRadius: 2, marginBottom: 10 }}>
            <span style={{ display: 'block', width: `${r.fill}%`, height: '100%', background: GOLD, borderRadius: 2 }} />
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <span style={tmono({ fontSize: 8, color: MUTED })}>{r.l}</span>
            <span style={tmono({ fontSize: 8, color: MUTED })}>{r.r}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function HypothesisList({ items }) {
  return (
    <div style={{ padding: '15px 16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>AI HYPOTHESES</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.9"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {items.map((h) => (
          <div key={h.id} style={{ display: 'flex', gap: 11 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: GOLD, flexShrink: 0, marginTop: 4 }} />
            <div style={{ minWidth: 0 }}>
              <div style={tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED, marginBottom: 8 })}>HYPOTHESIS {h.id}</div>
              <p style={{ color: '#C6D3E8', fontSize: 11.5, lineHeight: 1.65, margin: '0 0 10px' }}>{h.body}</p>
              <span style={{ ...tmono({ fontSize: 8 }), background: `${GOLD}1A`, color: GOLD, border: `1px solid ${GOLD}44`, borderRadius: 3, padding: '4px 8px' }}>CONFIDENCE: {h.conf}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
