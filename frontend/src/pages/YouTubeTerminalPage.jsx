// ── DOBIUM YouTube Terminal ────────────────────────────────────────────────
// Trending-channels board from Neel's mock. Shares chrome with the other
// terminals; its right rail is YouTube-specific. All content is demo data.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  T_PAGE, T_PANEL, T_TILE, T_LINE, T_ANALYSIS,
  GREEN, SALMON, GOLD, MUTED, WHITE, tmono, ExchangeTopBar, SourceRail,
} from '../components/TerminalChrome';
import { CHANNELS, YT_QUOTES, YT_HYPOTHESES, YT_LOG } from '../data/youtubeSignals';

// No image generation in this environment and no channel artwork in the repo,
// so thumbnails are generated gradient tiles carrying the entity's monogram.
export function ArtTile({ art, label, size = 46, radius = 6 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: `linear-gradient(145deg, ${art[0]}, ${art[1]})`,
      border: `1px solid ${T_LINE}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...tmono({ fontSize: size * 0.34, color: 'rgba(255,255,255,0.82)' }),
    }}>{label}</span>
  );
}

export default function YouTubeTerminalPage() {
  const navigate = useNavigate();
  const [source, setSource] = useState('YouTube');

  return (
    <div style={{ background: T_PAGE, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ExchangeTopBar onBrand={() => navigate('/')} />

      <div className="dbm-yt-shell" style={{ flex: 1, minHeight: 0 }}>
        <SourceRail source={source} setSource={setSource} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="dbm-yt-body">
            <div style={{ minWidth: 0, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${T_LINE}`, borderRadius: 3, padding: '5px 10px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN }} />
                  <span style={tmono({ fontSize: 8.5, color: GREEN })}>YOUTUBE TERMINAL / LIVE</span>
                </span>
                <span style={tmono({ fontSize: 8.5, letterSpacing: '0.14em', color: MUTED })}>VOD.ALPHA_SIGMA</span>
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ textAlign: 'right' }}>
                    <span style={{ ...tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED }), display: 'block', marginBottom: 5 }}>GLOBAL VELOCITY</span>
                    <span style={{ ...tmono({ fontSize: 10 }), color: WHITE }}>1.4M REQ/SEC</span>
                  </span>
                  <button style={{
                    ...tmono({ fontSize: 9 }), background: GOLD, color: '#0A1A33',
                    border: `1px solid ${GOLD}`, borderRadius: 4, padding: '11px 16px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 9,
                  }}>
                    REFRESH FEED
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0A1A33" strokeWidth="2.4" strokeLinecap="round"><path d="M20 12a8 8 0 11-2.3-5.6M20 4v4h-4" /></svg>
                  </button>
                </span>
              </div>

              <h1 style={{ color: WHITE, fontWeight: 800, fontSize: 'clamp(22px,2.6vw,30px)', margin: '0 0 20px' }}>TRENDING CHANNELS</h1>

              <div className="dbm-yt-grid">
                {CHANNELS.map((c) => (
                  <ChannelCard key={c.slug} c={c} onOpen={() => navigate(`/youtube/${c.slug}`)} />
                ))}
              </div>
            </div>

            <div style={{ minWidth: 0, borderLeft: `1px solid ${T_LINE}`, display: 'flex', flexDirection: 'column' }}>
              <QuoteBoard />
              <HypothesisCards />
              <LogTrace />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dbm-yt-shell { display: flex; align-items: stretch; }
        .dbm-yt-body { display: grid; grid-template-columns: minmax(0,1fr); flex: 1; min-height: 0; }
        .dbm-yt-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 14px; }
        @media (min-width: 760px) { .dbm-yt-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (min-width: 1100px) { .dbm-yt-body { grid-template-columns: minmax(0,1fr) 300px; } }
        @media (max-width: 899px) {
          .dbm-yt-shell { flex-direction: column; }
          .dbm-yt-shell > aside { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

function ChannelCard({ c, onOpen }) {
  const Stat = ({ k, v, sub }) => (
    <div>
      <div style={tmono({ fontSize: 7.5, letterSpacing: '0.13em', color: MUTED, marginBottom: 8, lineHeight: 1.4 })}>{k}</div>
      <span style={{ ...tmono({ fontSize: 12 }), color: WHITE }}>{v}</span>
      {sub && <div style={tmono({ fontSize: 7.5, letterSpacing: '0.13em', color: MUTED, marginTop: 4 })}>{sub}</div>}
    </div>
  );

  return (
    <article style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 5, padding: '15px 16px 16px' }}>
      <div style={{ display: 'flex', gap: 13 }}>
        <span style={{ position: 'relative', flexShrink: 0 }}>
          <ArtTile art={c.art} label={c.name.charAt(0)} size={46} />
          <span style={{ position: 'absolute', right: -2, bottom: -2, width: 8, height: 8, borderRadius: 999, background: GREEN, border: `2px solid ${T_PANEL}` }} />
        </span>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <span style={tmono({ fontSize: 7.5, letterSpacing: '0.14em', color: MUTED, lineHeight: 1.5 })}>{c.kicker}</span>
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" stroke={GREEN} strokeWidth="1.4" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <path d="M1 8l4-4 3 3 5-6" /><path d="M12 1h4v4" />
            </svg>
          </div>
          <h2 style={{ color: WHITE, fontWeight: 700, fontSize: 17, margin: '7px 0 8px' }}>{c.name}</h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: MUTED, fontSize: 11.5 }}>{c.handle}</span>
            <span style={{ color: '#3A4A5C' }}>·</span>
            <span style={{ ...tmono({ fontSize: 9.5 }), color: GREEN, lineHeight: 1.5 }}>+{c.growth}%<br />GROWTH</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10, borderTop: `1px solid ${T_LINE}`, marginTop: 16, paddingTop: 14 }}>
        <Stat k="DAILY VIEWS" v={c.views} />
        <Stat k="TRENDING" v={c.trending} sub="VIDEOS" />
        <Stat k="SENTIMENT" v={c.sentiment} />
      </div>

      <button onClick={onOpen} style={{
        ...tmono({ fontSize: 10 }), width: '100%', marginTop: 18,
        background: 'transparent', color: '#C6D3E8', border: `1px solid ${T_LINE}`,
        borderRadius: 4, padding: '13px 16px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>VIEW MORE <span style={{ color: GOLD }}>→</span></button>
    </article>
  );
}

function QuoteBoard() {
  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}`, padding: '15px 16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>MARKET STREAM</span>
        <svg width="13" height="11" viewBox="0 0 18 10" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round"><path d="M1 8l4-4 3 3 5-6" /><path d="M12 1h4v4" /></svg>
      </div>
      {YT_QUOTES.map((q) => (
        <div key={q.sym} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <span style={{ color: '#C6D3E8', fontSize: 12 }}>{q.sym} {q.label && <span style={{ color: MUTED }}>{q.label}</span>}</span>
          <span style={{ ...tmono({ fontSize: 10 }), color: q.chg < 0 ? SALMON : GREEN }}>
            {q.px} ({q.chg >= 0 ? '+' : ''}{q.chg.toFixed(1)}%)
          </span>
        </div>
      ))}
      <div style={tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED, margin: '18px 0 10px' })}>LIVE SIGNAL VOLATILITY</div>
      <span style={{ display: 'block', height: 5, background: '#0A1622', borderRadius: 3, overflow: 'hidden' }}>
        <span style={{ display: 'block', width: '62%', height: '100%', background: `linear-gradient(90deg, ${GREEN}, ${GOLD})`, borderRadius: 3 }} />
      </span>
    </div>
  );
}

function HypothesisCards() {
  return (
    <div style={{ padding: '15px 16px 8px' }}>
      <div style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED, marginBottom: 14 })}>AI HYPOTHESES</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {YT_HYPOTHESES.map((h) => (
          <div key={h.id} style={{ background: T_ANALYSIS, border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '12px 13px 13px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.9"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></svg>
              <span style={{ ...tmono({ fontSize: 8.5 }), color: GOLD }}>HYPOTHESIS {h.id}</span>
            </div>
            <p style={{ color: '#C6D3E8', fontSize: 11, lineHeight: 1.65, margin: '0 0 12px' }}>{h.body}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, borderTop: `1px solid ${T_LINE}`, paddingTop: 10 }}>
              <span style={tmono({ fontSize: 8, color: MUTED })}>Confidence: {h.conf}%</span>
              <span style={tmono({ fontSize: 8.5, color: h.bias === 'BULLISH' ? GREEN : MUTED })}>{h.bias}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogTrace() {
  return (
    <div style={{ padding: '16px 16px 18px' }}>
      <div style={tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED, marginBottom: 11 })}>INTERNAL LOG TRACE</div>
      {YT_LOG.map((l) => (
        <div key={l} style={{ ...tmono({ fontSize: 8.5, color: '#5C7391' }), marginBottom: 7 }}>
          <span style={{ color: GOLD }}>&gt;</span> {l}
        </div>
      ))}
    </div>
  );
}
