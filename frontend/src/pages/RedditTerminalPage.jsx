// ── DOBIUM Reddit Terminal ─────────────────────────────────────────────────
// Trending-subreddit board from Neel's mock. Shares chrome with the other
// terminals; its right rail is Reddit-specific (event log + tinted hypothesis
// cards) rather than the News/X quote board. All content is demo data.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  T_PAGE, T_RAIL, T_PANEL, T_TILE, T_LINE, T_ANALYSIS, T_MAP,
  GREEN, GOLD, MUTED, WHITE, tmono, ExchangeTopBar, SourceRail,
} from '../components/TerminalChrome';
import { SUBREDDITS, REDDIT_EVENTS, REDDIT_HYPOTHESES } from '../data/redditSignals';

export default function RedditTerminalPage() {
  const navigate = useNavigate();
  const [source, setSource] = useState('Reddit');
  const [impactsOnly, setImpactsOnly] = useState(true);

  return (
    <div style={{ background: T_PAGE, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ExchangeTopBar onBrand={() => navigate('/')} />

      <div className="dbm-rd-shell" style={{ flex: 1, minHeight: 0 }}>
        <SourceRail source={source} setSource={setSource} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <NetworkStrip on={impactsOnly} toggle={() => setImpactsOnly((v) => !v)} />

          <div className="dbm-rd-body">
            <div style={{ minWidth: 0, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                <div>
                  <div style={tmono({ fontSize: 8.5, letterSpacing: '0.18em', color: GOLD, marginBottom: 9 })}>SOCIAL SIGNAL AGGREGATOR</div>
                  <h1 style={{ color: WHITE, fontWeight: 800, fontSize: 'clamp(22px,2.6vw,30px)', margin: 0, letterSpacing: '0.01em' }}>TRENDING SUBREDDITS</h1>
                </div>
                <div style={{ display: 'flex', gap: 9 }}>
                  <button style={btn()}>FILTER</button>
                  <button style={btn(true)}>SORT: ACTIVITY</button>
                </div>
              </div>

              <div className="dbm-rd-grid">
                {SUBREDDITS.map((s) => (
                  <SubCard key={s.slug} s={s} onOpen={() => navigate(`/reddit/${s.slug}`)} />
                ))}
              </div>

              <SpatialMap />
            </div>

            <div style={{ minWidth: 0, borderLeft: `1px solid ${T_LINE}`, display: 'flex', flexDirection: 'column' }}>
              <EventStream />
              <HypothesisPanel />
              <div style={{ padding: '0 16px 18px' }}>
                <button style={{
                  ...tmono({ fontSize: 9 }), width: '100%',
                  background: T_TILE, color: '#C6D3E8', border: `1px solid ${T_LINE}`,
                  borderRadius: 4, padding: '13px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                }}>
                  GENERATE NEW MODELS
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round"><path d="M20 12a8 8 0 11-2.3-5.6M20 4v4h-4" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dbm-rd-shell { display: flex; align-items: stretch; }
        .dbm-rd-body { display: grid; grid-template-columns: minmax(0,1fr); flex: 1; min-height: 0; }
        .dbm-rd-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 14px; }
        @media (min-width: 760px) { .dbm-rd-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (min-width: 1100px) { .dbm-rd-body { grid-template-columns: minmax(0,1fr) 340px; } }
        @media (max-width: 899px) {
          .dbm-rd-shell { flex-direction: column; }
          .dbm-rd-shell > aside { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

function btn(gold) {
  return {
    ...tmono({ fontSize: 9 }),
    background: gold ? GOLD : T_TILE, color: gold ? '#0A1A33' : '#C6D3E8',
    border: `1px solid ${gold ? GOLD : T_LINE}`, borderRadius: 4,
    padding: '10px 15px', cursor: 'pointer',
  };
}

function NetworkStrip({ on, toggle }) {
  const Stat = ({ k, children }) => (
    <div>
      <div style={tmono({ fontSize: 8, letterSpacing: '0.16em', color: MUTED, marginBottom: 6 })}>{k}</div>
      {children}
    </div>
  );
  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}`, padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
      <Stat k="NETWORK STATE">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN }} />
          <span style={tmono({ fontSize: 10, color: GREEN })}>REDDIT TERMINAL / LIVE</span>
        </span>
      </Stat>
      <Stat k="GLOBAL VELOCITY"><span style={{ ...tmono({ fontSize: 10 }), color: WHITE }}>14,209 EPS <span style={{ color: MUTED }}>(EVENTS/SEC)</span></span></Stat>
      <Stat k="SENTIMENT BIAS"><span style={{ ...tmono({ fontSize: 10 }), color: GREEN }}>BULLISH <span style={{ color: MUTED }}>/ 0.72</span></span></Stat>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 13 }}>
        <button onClick={toggle} aria-pressed={on} style={{
          width: 40, height: 20, borderRadius: 999, cursor: 'pointer', position: 'relative',
          background: on ? GOLD : T_TILE, border: `1px solid ${on ? GOLD : T_LINE}`, padding: 0,
        }}>
          <span style={{ position: 'absolute', top: 2, left: on ? 21 : 2, width: 14, height: 14, borderRadius: 999, background: on ? '#0A1A33' : MUTED, transition: 'left 160ms ease' }} />
        </button>
        <span style={tmono({ fontSize: 9, color: MUTED })}>842 NODES ACTIVE</span>
      </div>
    </div>
  );
}

function SubCard({ s, onOpen }) {
  const Stat = ({ k, v, glyph }) => (
    <div>
      <div style={tmono({ fontSize: 7.5, letterSpacing: '0.14em', color: MUTED, marginBottom: 7 })}>{k}</div>
      <span style={{ ...tmono({ fontSize: 11 }), color: WHITE }}>{v} <span style={{ color: MUTED, fontSize: 9 }}>{glyph}</span></span>
    </div>
  );

  return (
    <article style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 5, padding: '14px 16px 16px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <span style={tmono({ fontSize: 7.5, letterSpacing: '0.16em', color: MUTED })}>SUBREDDIT</span>
        <span style={{ ...tmono({ fontSize: 8.5 }), background: `${GREEN}1A`, color: GREEN, border: `1px solid ${GREEN}44`, borderRadius: 3, padding: '5px 8px' }}>+{s.velocity}% VELOCITY</span>
      </div>

      <h2 style={{ color: WHITE, fontWeight: 700, fontSize: 19, margin: '11px 0 16px' }}>{s.name}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
        <Stat k="POSTS" v={s.posts} glyph="▲" />
        <Stat k="UPVOTES" v={s.upvotes} glyph="▲" />
        <Stat k="COMMENTS" v={s.comments} glyph="▸" />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, marginTop: 20 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: 'block', height: 3, background: '#0A1622', borderRadius: 2, marginBottom: 11, maxWidth: 96 }}>
            <span style={{ display: 'block', width: `${s.fill}%`, height: '100%', background: GOLD, borderRadius: 2 }} />
          </span>
          <span style={tmono({ fontSize: 8, letterSpacing: '0.12em', color: MUTED })}>SIGNAL STRENGTH: {s.strength}</span>
        </div>
        <button onClick={onOpen} style={{
          ...tmono({ fontSize: 8.5 }), flexShrink: 0,
          background: 'transparent', color: '#C6D3E8', border: `1px solid ${T_LINE}`,
          borderRadius: 3, padding: '10px 13px', cursor: 'pointer', lineHeight: 1.4,
        }}>VIEW<br />MORE</button>
      </div>
    </article>
  );
}

function SpatialMap() {
  const [secs, setSecs] = useState(14);
  useEffect(() => {
    const t = setInterval(() => setSecs((v) => (v <= 1 ? 30 : v - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 5, padding: '14px 16px 16px', marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>SPATIAL SENTIMENT MAP // GLOBAL NODE CLUSTER</span>
        <span style={tmono({ fontSize: 8.5, color: GOLD })}>REFRESH IN {secs}s</span>
      </div>
      <div style={{ position: 'relative', background: T_MAP, border: `1px solid ${T_LINE}`, borderRadius: 3, height: 150, overflow: 'hidden' }}>
        <svg viewBox="0 0 100 44" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {[11, 22, 33, 44, 55, 66, 77, 88].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="44" stroke={T_LINE} strokeWidth="0.25" />)}
          {[11, 22, 33].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke={T_LINE} strokeWidth="0.25" />)}
        </svg>
        <Node left="45%" top="42%" color={GREEN} />
        <Node left="21%" top="72%" color={GOLD} />
        <Node left="66%" top="80%" color={WHITE} />
      </div>
      <div style={tmono({ fontSize: 8, letterSpacing: '0.12em', color: MUTED, marginTop: 11 })}>COORD: 44.03 // -121.31</div>
    </div>
  );
}

function Node({ left, top, color }) {
  return (
    <span style={{ position: 'absolute', left, top, width: 9, height: 9, borderRadius: 999, background: color, boxShadow: `0 0 14px 4px ${color}55` }} />
  );
}

function EventStream() {
  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 16px 13px' }}>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: WHITE })}>MARKET STREAM</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.9" strokeLinecap="round"><path d="M4 12h4l3-7 3 14 3-7h3" /></svg>
      </div>
      {REDDIT_EVENTS.map((e) => (
        <div key={e.at} style={{ borderTop: `1px solid ${T_LINE}`, padding: '12px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <span style={tmono({ fontSize: 8.5, color: '#5C7391' })}>{e.at}</span>
            <span style={tmono({ fontSize: 8, letterSpacing: '0.12em', color: GOLD })}>{e.tag}</span>
          </div>
          <p style={{ color: '#8FA3BC', fontSize: 11, lineHeight: 1.6, margin: 0 }}>{e.body}</p>
        </div>
      ))}
    </div>
  );
}

function HypothesisPanel() {
  return (
    <div style={{ padding: '15px 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>AI HYPOTHESES</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.9"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {REDDIT_HYPOTHESES.map((h) => {
          const tinted = h.tone === 'green';
          return (
            <div key={h.id} style={{
              background: tinted ? 'rgba(74,222,128,0.07)' : T_ANALYSIS,
              border: `1px solid ${tinted ? `${GREEN}33` : T_LINE}`,
              borderLeft: `2px solid ${tinted ? GREEN : GOLD}`,
              borderRadius: 3, padding: '12px 13px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9, flexWrap: 'wrap' }}>
                <span style={{ ...tmono({ fontSize: 8.5 }), color: WHITE }}>HYPOTHESIS {h.id}</span>
                <span style={{ ...tmono({ fontSize: 8 }), background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}55`, borderRadius: 3, padding: '4px 7px' }}>{h.prob}% PROB</span>
              </div>
              <p style={{ color: '#C6D3E8', fontSize: 11, lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>&ldquo;{h.body}&rdquo;</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
