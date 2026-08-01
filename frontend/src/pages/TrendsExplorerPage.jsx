// ── DOBIUM Google Trends Explorer ──────────────────────────────────────────
// Reached from the Trends terminal's VIEW MORE. Built from Neel's second
// mock. All content is demo data; see data/trendsSignals.js.
import { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  T_PAGE, T_PANEL, T_TILE, T_LINE, T_ANALYSIS, T_MAP,
  GREEN, GOLD, MUTED, WHITE, tmono, ExchangeTopBar, SourceRail,
} from '../components/TerminalChrome';
import { TREND_SIGNALS, GEO_ROWS, VOLUME_BARS, DRAFT_QUEUE, CATEGORIES, findTrend } from '../data/trendsSignals';

export default function TrendsExplorerPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [source, setSource] = useState('Google Trends');
  const [cat, setCat] = useState('ALL');
  const [query, setQuery] = useState('');
  const active = findTrend(slug);

  if (!active) return <Navigate to="/trends" replace />;

  const rows = cat === 'ALL' ? TREND_SIGNALS : TREND_SIGNALS.filter((t) => t.category === cat);

  return (
    <div style={{ background: T_PAGE, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ExchangeTopBar onBrand={() => navigate('/')} />

      <div className="dbm-ge-shell" style={{ flex: 1, minHeight: 0 }}>
        <SourceRail source={source} setSource={setSource} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <ExplorerHead onBack={() => navigate('/trends')} />
          <QueryRow query={query} setQuery={setQuery} />
          <FilterRow cat={cat} setCat={setCat} />

          <div className="dbm-ge-body">
            <div style={{ minWidth: 0, padding: '16px 18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
                <span style={{ ...tmono({ fontSize: 12 }), color: WHITE, letterSpacing: '0.08em' }}>RISING SEARCHES</span>
                <span style={tmono({ fontSize: 8, letterSpacing: '0.13em', color: MUTED })}>SIGNALS DETECTED: {rows.length},429</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {rows.map((t) => (
                  <ExplorerRow key={t.slug} t={t} on={t.slug === active.slug} onOpen={() => navigate(`/trends/${t.slug}`)} />
                ))}
              </div>

              <button style={{
                ...tmono({ fontSize: 9 }), width: '100%', marginTop: 16,
                background: 'transparent', color: GOLD, border: `1px dashed ${GOLD}55`,
                borderRadius: 4, padding: '13px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                FETCH DIMENSION SIGNALS
              </button>
            </div>

            <div style={{ minWidth: 0, borderLeft: `1px solid ${T_LINE}`, display: 'flex', flexDirection: 'column' }}>
              <GeographicPulse />
              <VolumeChart />
              <DraftQueue />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dbm-ge-shell { display: flex; align-items: stretch; }
        .dbm-ge-body { display: grid; grid-template-columns: minmax(0,1fr); flex: 1; min-height: 0; }
        @media (min-width: 1100px) { .dbm-ge-body { grid-template-columns: minmax(0,1fr) 300px; } }
        @media (max-width: 899px) {
          .dbm-ge-shell { flex-direction: column; }
          .dbm-ge-shell > aside { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

function ExplorerHead({ onBack }) {
  return (
    <div style={{ padding: '16px 18px 14px', display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: GOLD }} />
          <span style={tmono({ fontSize: 8, letterSpacing: '0.16em', color: GOLD })}>INTELLIGENCE TERMINAL</span>
        </div>
        <h1 style={{ ...tmono({ fontSize: 'clamp(17px,2vw,21px)' }), color: WHITE, margin: 0, letterSpacing: '0.06em' }}>GOOGLE TRENDS EXPLORER</h1>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-start', gap: 22, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={tmono({ fontSize: 7.5, letterSpacing: '0.14em', color: MUTED, marginBottom: 7 })}>GLOBAL INDEX STATUS</div>
          <div style={{ ...tmono({ fontSize: 9 }), color: GREEN }}>SYNCHRONIZED (0.4ms)</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={tmono({ fontSize: 7.5, letterSpacing: '0.14em', color: MUTED, marginBottom: 7 })}>REPORT DATE</div>
          <div style={{ ...tmono({ fontSize: 9 }), color: WHITE }}>REAL-TIME</div>
        </div>
        <button onClick={onBack} style={{ ...tmono({ fontSize: 8.5, color: '#8FA3BC' }), background: 'transparent', border: 'none', cursor: 'pointer', paddingTop: 18 }}>‹ BACK</button>
      </div>
    </div>
  );
}

function QueryRow({ query, setQuery }) {
  return (
    <div style={{ padding: '0 18px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ width: 26, height: 26, borderRadius: 4, background: T_TILE, border: `1px solid ${T_LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
      </span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="EXECUTE SEARCH QUERY OR ENTER KEYWORD…"
        style={{
          ...tmono({ fontSize: 9 }), flex: 1, minWidth: 160,
          background: T_TILE, color: WHITE, border: `1px solid ${T_LINE}`,
          borderRadius: 4, padding: '11px 13px',
        }}
      />
      <span style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
        <span style={{ ...tmono({ fontSize: 8 }), background: T_TILE, border: `1px solid ${T_LINE}`, borderRadius: 3, padding: '8px 10px', color: MUTED }}>CTRL</span>
        <span style={{ ...tmono({ fontSize: 8 }), background: T_TILE, border: `1px solid ${T_LINE}`, borderRadius: 3, padding: '8px 11px', color: MUTED }}>K</span>
      </span>
    </div>
  );
}

function FilterRow({ cat, setCat }) {
  return (
    <div style={{ borderTop: `1px solid ${T_LINE}`, borderBottom: `1px solid ${T_LINE}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={tmono({ fontSize: 7.5, letterSpacing: '0.14em', color: MUTED })}>CATEGORY</span>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)} style={{
            ...tmono({ fontSize: 8 }),
            background: cat === c ? GOLD : 'transparent',
            color: cat === c ? '#0A1A33' : MUTED,
            border: `1px solid ${cat === c ? GOLD : T_LINE}`,
            borderRadius: 3, padding: '6px 10px', cursor: 'pointer',
          }}>{c}</button>
        ))}
      </span>

      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <span style={tmono({ fontSize: 7.5, letterSpacing: '0.14em', color: MUTED })}>REGION</span>
        <span style={{ ...tmono({ fontSize: 9 }), color: WHITE, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          UNITED STATES
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.4" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </span>

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, width: '100%' }}>
        <span style={tmono({ fontSize: 7.5, letterSpacing: '0.14em', color: MUTED })}>TIMELINE</span>
        <span style={{ ...tmono({ fontSize: 9 }), color: WHITE, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          PAST 24 HOURS
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.4" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </span>
    </div>
  );
}

function ExplorerRow({ t, on, onOpen }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      background: on ? T_ANALYSIS : T_PANEL,
      border: `1px solid ${on ? `${GOLD}44` : T_LINE}`,
      borderLeft: `2px solid ${on ? GOLD : 'transparent'}`,
      borderRadius: 4, padding: '12px 14px',
    }}>
      <span style={{ ...tmono({ fontSize: 9 }), color: MUTED, background: T_TILE, border: `1px solid ${T_LINE}`, borderRadius: 3, padding: '7px 9px', flexShrink: 0 }}>{t.rank}</span>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: WHITE, fontWeight: 700, fontSize: 14, marginBottom: 7 }}>{t.title}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ ...tmono({ fontSize: 8.5 }), color: GREEN }}>↗ +{t.detailGrowth}%</span>
          <span style={tmono({ fontSize: 8.5, color: MUTED })}>INTEREST: <span style={{ color: '#C6D3E8' }}>{t.detailInterest}</span></span>
        </div>
      </div>

      {on ? (
        <span style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={tmono({ fontSize: 7.5, letterSpacing: '0.13em', color: MUTED, marginBottom: 5 })}>REGION FOCUS</div>
          <div style={{ ...tmono({ fontSize: 9 }), color: WHITE }}>{t.region}</div>
        </span>
      ) : null}

      <button onClick={onOpen} style={{
        ...tmono({ fontSize: 8 }), flexShrink: 0,
        background: on ? GOLD : 'transparent',
        color: on ? '#0A1A33' : '#8FA3BC',
        border: `1px solid ${on ? GOLD : T_LINE}`,
        borderRadius: 3, padding: '9px 13px', cursor: 'pointer',
      }}>{on ? 'GENERATE MARKETS' : 'VIEW DETAILS'}</button>
    </div>
  );
}

function GeographicPulse() {
  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}`, padding: '15px 16px 17px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
        <span style={tmono({ fontSize: 8, letterSpacing: '0.15em', color: MUTED })}>GEOGRAPHIC PULSE</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.4 2.6 3.8 5.7 3.8 9s-1.4 6.4-3.8 9c-2.4-2.6-3.8-5.7-3.8-9S9.6 5.6 12 3z" /></svg>
      </div>

      <div style={{ position: 'relative', background: T_MAP, border: `1px solid ${T_LINE}`, borderRadius: 3, height: 96, overflow: 'hidden', marginBottom: 15 }}>
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {[14, 28, 42, 56, 70, 84].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="40" stroke={T_LINE} strokeWidth="0.3" />)}
          {[13, 26].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke={T_LINE} strokeWidth="0.3" />)}
          <circle cx="30" cy="19" r="2.6" fill={GOLD} opacity="0.9" />
          <circle cx="30" cy="19" r="6" fill={GOLD} opacity="0.16" />
          <circle cx="58" cy="14" r="1.8" fill={GREEN} opacity="0.8" />
          <circle cx="76" cy="24" r="1.5" fill={WHITE} opacity="0.55" />
        </svg>
        <span style={{ position: 'absolute', left: 8, bottom: 6, ...tmono({ fontSize: 7, color: MUTED }) }}>San Francisco</span>
      </div>

      {GEO_ROWS.map((g) => (
        <div key={g.label} style={{ marginBottom: 11 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
            <span style={{ color: '#C6D3E8', fontSize: 11 }}>{g.label}</span>
            <span style={{ ...tmono({ fontSize: 9 }), color: WHITE }}>{g.pct}%</span>
          </div>
          <span style={{ display: 'block', height: 3, background: '#0A1622', borderRadius: 2, overflow: 'hidden' }}>
            <span style={{ display: 'block', width: `${g.pct}%`, height: '100%', background: GOLD, borderRadius: 2 }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function VolumeChart() {
  const peak = Math.max(...VOLUME_BARS);
  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}`, padding: '15px 16px 17px' }}>
      <div style={tmono({ fontSize: 8, letterSpacing: '0.15em', color: MUTED, marginBottom: 15 })}>AGGREGATE SEARCH VOLUME (24H)</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 76, marginBottom: 14 }}>
        {VOLUME_BARS.map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '2px 2px 0 0', background: h === peak ? GOLD : `${GOLD}44` }} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span>
          <span style={{ ...tmono({ fontSize: 7.5, letterSpacing: '0.13em', color: MUTED }), display: 'block', marginBottom: 5 }}>PEAK</span>
          <span style={{ ...tmono({ fontSize: 10 }), color: WHITE }}>14.2M</span>
        </span>
        <span style={{ textAlign: 'right' }}>
          <span style={{ ...tmono({ fontSize: 7.5, letterSpacing: '0.13em', color: MUTED }), display: 'block', marginBottom: 5 }}>VELOCITY</span>
          <span style={{ ...tmono({ fontSize: 10 }), color: GREEN }}>+21.4/s</span>
        </span>
      </div>
    </div>
  );
}

function DraftQueue() {
  return (
    <div style={{ padding: '15px 16px 18px' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: GOLD }} />
        <span style={tmono({ fontSize: 8, letterSpacing: '0.15em', color: GOLD })}>MARKET DRAFT QUEUE</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DRAFT_QUEUE.map((d) => (
          <div key={d.title} style={{ display: 'flex', alignItems: 'center', gap: 11, background: T_ANALYSIS, border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '11px 12px' }}>
            <span style={{ width: 22, height: 22, borderRadius: 999, background: T_TILE, border: `1px solid ${T_LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round"><path d="M4 20V4M4 20h16M8 16l4-6 3 3 5-7" /></svg>
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', color: '#C6D3E8', fontSize: 11.5, marginBottom: 4 }}>{d.title}</span>
              <span style={tmono({ fontSize: 7.5, letterSpacing: '0.12em', color: MUTED })}>STATUS: {d.status}</span>
            </span>
          </div>
        ))}
      </div>

      <button style={{
        ...tmono({ fontSize: 8.5 }), width: '100%', marginTop: 14,
        background: T_TILE, color: '#C6D3E8', border: `1px solid ${T_LINE}`,
        borderRadius: 4, padding: '12px 14px', cursor: 'pointer',
      }}>VIEW FULL PIPELINE</button>
    </div>
  );
}
