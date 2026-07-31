// ── DOBIUM YouTube Terminal: channel signal queue ──────────────────────────
// Reached from the YouTube terminal's VIEW MORE. Built from Neel's second
// mock. All content is demo data; see data/youtubeSignals.js.
import { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  T_PAGE, T_PANEL, T_TILE, T_LINE, T_ANALYSIS,
  GREEN, SALMON, GOLD, MUTED, WHITE, tmono, ExchangeTopBar, SourceRail,
} from '../components/TerminalChrome';
import { ArtTile } from './YouTubeTerminalPage';
import { findChannel } from '../data/youtubeSignals';

const TONES = { red: '#FF6B6B', gold: GOLD, green: GREEN, plain: MUTED };

export default function YouTubeChannelPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [source, setSource] = useState('YouTube');
  const [tab, setTab] = useState('LIVE METRICS');
  const c = findChannel(slug);

  if (!c) return <Navigate to="/youtube" replace />;

  return (
    <div style={{ background: T_PAGE, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ExchangeTopBar onBrand={() => navigate('/')} />

      <div className="dbm-yc-shell" style={{ flex: 1, minHeight: 0 }}>
        <SourceRail source={source} setSource={setSource} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="dbm-yc-body">
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <ChannelHead c={c} onBack={() => navigate('/youtube')} />
              <QueueHeader tab={tab} setTab={setTab} />
              <div>
                {c.videos.map((v, i) => (
                  <VideoRow key={v.id} v={v} last={i === c.videos.length - 1} />
                ))}
              </div>
            </div>

            <div style={{ minWidth: 0, borderLeft: `1px solid ${T_LINE}`, display: 'flex', flexDirection: 'column' }}>
              <SentimentHead c={c} />
              <MarketHypotheses items={c.hyp} />
              <SignalStream rows={c.stream} />
              <PropagationCurve pct={c.curve} bars={c.bars} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dbm-yc-shell { display: flex; align-items: stretch; }
        .dbm-yc-body { display: grid; grid-template-columns: minmax(0,1fr); flex: 1; min-height: 0; }
        @media (min-width: 1100px) { .dbm-yc-body { grid-template-columns: minmax(0,1fr) 320px; } }
        @media (max-width: 899px) {
          .dbm-yc-shell { flex-direction: column; }
          .dbm-yc-shell > aside { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

function ChannelHead({ c, onBack }) {
  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}`, padding: '16px 18px 18px', display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0 }}>
        <ArtTile art={c.art} label={c.name.charAt(0)} size={72} radius={5} />
        <div style={{ ...tmono({ fontSize: 7.5, letterSpacing: '0.1em', color: GOLD }), marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.4"><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          OFFICIAL CHANNEL
        </div>
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <h1 style={{ ...tmono({ fontSize: 'clamp(22px,2.6vw,29px)' }), color: WHITE, margin: 0 }}>{c.display}</h1>
          <span style={{ background: T_TILE, border: `1px solid ${T_LINE}`, borderRadius: 3, padding: '6px 9px', ...tmono({ fontSize: 7.5, color: MUTED }), lineHeight: 1.5 }}>
            CID:<br />{c.cid}
          </span>
          <button onClick={onBack} style={{ ...tmono({ fontSize: 8.5, color: '#8FA3BC' }), marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer' }}>‹ ALL CHANNELS</button>
        </div>

        <div style={{ display: 'flex', gap: 34, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 16 }}>
          <div>
            <div style={tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED, marginBottom: 7 })}>SUBSCRIBERS</div>
            <div style={{ ...tmono({ fontSize: 17 }), color: GOLD }}>{c.subs}</div>
          </div>
          <div>
            <div style={tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED, marginBottom: 7, lineHeight: 1.4 })}>TOTAL<br />VELOCITY</div>
            <div style={{ ...tmono({ fontSize: 13 }), color: WHITE }}>{c.velocity} <span style={{ color: MUTED, fontSize: 9 }}>VPM</span></div>
          </div>
          <button style={{ ...tmono({ fontSize: 9 }), background: GOLD, color: '#0A1A33', border: `1px solid ${GOLD}`, borderRadius: 4, padding: '12px 18px', cursor: 'pointer', lineHeight: 1.5 }}>EXPORT<br />INTELLIGENCE</button>
          <button style={{ ...tmono({ fontSize: 9 }), background: T_TILE, color: '#C6D3E8', border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '12px 18px', cursor: 'pointer', lineHeight: 1.5 }}>API<br />ACCESS</button>
        </div>
      </div>
    </div>
  );
}

function QueueHeader({ tab, setTab }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', padding: '14px 18px 12px', borderBottom: `1px solid ${T_LINE}` }}>
      <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>SIGNAL QUEUE / ACTIVE CONTENT</span>
      <span style={{ display: 'inline-flex', gap: 16 }}>
        {['LIVE METRICS', 'HISTORICAL'].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            ...tmono({ fontSize: 8.5 }), background: 'transparent', border: 'none', cursor: 'pointer',
            color: tab === t ? WHITE : MUTED, paddingBottom: 5,
            borderBottom: `2px solid ${tab === t ? GOLD : 'transparent'}`,
          }}>{t}</button>
        ))}
      </span>
    </div>
  );
}

function VideoRow({ v, last }) {
  const tone = TONES[v.tone] || GOLD;
  const Stat = ({ k, val, unit }) => (
    <div>
      <div style={tmono({ fontSize: 7.5, letterSpacing: '0.13em', color: MUTED, marginBottom: 7 })}>{k}</div>
      <span style={{ ...tmono({ fontSize: 11.5 }), color: WHITE }}>{val}</span>
      {unit && <span style={{ ...tmono({ fontSize: 7.5 }), color: MUTED, marginLeft: 5 }}>{unit}</span>}
    </div>
  );

  return (
    <article style={{ display: 'flex', gap: 16, padding: '16px 18px 18px', borderBottom: last ? 'none' : `1px solid ${T_LINE}`, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <span style={{
          display: 'block', width: 148, height: 96, borderRadius: 4,
          background: `linear-gradient(145deg, ${v.art[0]}, ${v.art[1]})`,
          border: `1px solid ${T_LINE}`,
        }} />
        <span style={{
          position: 'absolute', left: 6, bottom: 6,
          ...tmono({ fontSize: 7.5 }), color: tone,
          background: 'rgba(5,20,36,0.88)', border: `1px solid ${tone}55`,
          borderRadius: 3, padding: '4px 7px',
        }}>{v.badge}</span>
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <h2 style={{ color: WHITE, fontWeight: 700, fontSize: 'clamp(15px,1.5vw,18px)', margin: 0 }}>{v.title}</h2>
          <span style={tmono({ fontSize: 8.5, color: MUTED })}>{v.ago}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: 14, marginTop: 16 }}>
          <Stat k="REACH" val={v.reach} />
          <Stat k="VELOCITY" val={v.vel} unit="VPM" />
          <Stat k="ENGAGEMENT" val={v.likes} unit="LIKES" />
          <Stat k="DISCOURSE" val={v.comm} unit="COMM" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <span style={{ ...tmono({ fontSize: 8.5 }), background: T_TILE, color: '#C6D3E8', border: `1px solid ${T_LINE}`, borderRadius: 3, padding: '8px 11px' }}>RETENTION: {v.retention}</span>
          <span style={{ ...tmono({ fontSize: 8.5 }), background: T_TILE, color: '#C6D3E8', border: `1px solid ${T_LINE}`, borderRadius: 3, padding: '8px 11px' }}>CTR: {v.ctr}</span>
          <button style={{
            ...tmono({ fontSize: 8.5 }), marginLeft: 'auto',
            background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}66`,
            borderRadius: 3, padding: '9px 14px', cursor: 'pointer',
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

function SentimentHead({ c }) {
  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}`, padding: '16px 16px 18px' }}>
      <div style={tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED, marginBottom: 12 })}>PRIMARY SENTIMENT INDEX</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ flex: 1, height: 5, background: '#0A1622', borderRadius: 3, overflow: 'hidden' }}>
          <span style={{ display: 'block', width: `${c.posIndex}%`, height: '100%', background: GOLD, borderRadius: 3 }} />
        </span>
        <span style={{ ...tmono({ fontSize: 10 }), color: WHITE, flexShrink: 0 }}>{c.posIndex}% POS</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        {[['ALPHA STATUS', c.alpha, GREEN], ['MARKET IMPACT', c.impact, GOLD]].map(([k, v, col]) => (
          <div key={k} style={{ background: T_ANALYSIS, border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '11px 12px' }}>
            <div style={tmono({ fontSize: 7.5, letterSpacing: '0.13em', color: MUTED, marginBottom: 8 })}>{k}</div>
            <div style={{ ...tmono({ fontSize: 10 }), color: col }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketHypotheses({ items }) {
  return (
    <div style={{ padding: '15px 16px 6px' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: GOLD }} />
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: WHITE })}>MARKET HYPOTHESES</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((h) => (
          <div key={h.id} style={{ background: T_ANALYSIS, border: `1px solid ${T_LINE}`, borderLeft: `2px solid ${GOLD}`, borderRadius: 3, padding: '12px 13px 13px' }}>
            <div style={tmono({ fontSize: 8, letterSpacing: '0.13em', color: GOLD, marginBottom: 10 })}>{h.id}: {h.label}</div>
            <p style={{ color: '#C6D3E8', fontSize: 12, lineHeight: 1.65, margin: '0 0 12px' }}>{h.body}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: T_TILE, borderRadius: 3, padding: '8px 10px' }}>
              <span style={tmono({ fontSize: 7.5, letterSpacing: '0.13em', color: MUTED })}>{h.kv}</span>
              <span style={tmono({ fontSize: 8.5, color: TONES[h.tone] || MUTED })}>{h.v}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalStream({ rows }) {
  return (
    <div style={{ padding: '16px 16px 6px' }}>
      <div style={tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED, marginBottom: 12 })}>MARKET SIGNAL STREAM</div>
      {rows.map((r) => (
        <div key={r.at} style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 9, flexWrap: 'wrap' }}>
          <span style={tmono({ fontSize: 8, color: '#5C7391' })}>{r.at}</span>
          <span style={tmono({ fontSize: 8, color: GOLD })}>{r.tag}:</span>
          <span style={tmono({ fontSize: 8, color: '#C6D3E8' })}>{r.val}</span>
          <span style={{ ...tmono({ fontSize: 8, color: MUTED }), marginLeft: 'auto' }}>{r.geo}</span>
        </div>
      ))}
    </div>
  );
}

function PropagationCurve({ pct, bars }) {
  const peak = Math.max(...bars);
  return (
    <div style={{ padding: '16px 16px 20px' }}>
      <div style={{ background: T_ANALYSIS, border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '14px 15px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <span style={tmono({ fontSize: 8, letterSpacing: '0.13em', color: MUTED })}>VIRAL PROPAGATION CURVE</span>
          <span style={{ ...tmono({ fontSize: 13 }), color: WHITE }}>+{pct}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 76 }}>
          {bars.map((h, i) => (
            <div key={i} style={{
              flex: 1, height: `${h}%`, borderRadius: '2px 2px 0 0',
              background: h === peak ? GOLD : `${GOLD}55`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
