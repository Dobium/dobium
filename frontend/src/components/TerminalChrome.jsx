// ── Shared DOBIUM Market Exchange terminal chrome ──────────────────────────
// Palette, top bar and source rail, pulled out of RadarPage so the Market
// Maker page reuses the same chrome instead of a drifting copy.
import { useNavigate, useLocation } from 'react-router-dom';

export const T_PAGE = '#162536';      // field behind panels
export const T_RAIL = '#010F1F';      // sidebar / deepest insets
export const T_BAR = '#051424';       // top chrome band
export const T_PANEL = '#122131';     // panel surface
export const T_TILE = '#1C2B3C';      // inactive tile / input
export const T_TILE_ON = '#2A343C';   // active tile
export const T_ROW_ON = '#273647';    // active sidebar row
export const T_LINE = '#1D2A3A';      // hairlines
export const T_ASK = '#0E1726';       // order-book ask row
export const T_BID = '#051A24';       // order-book bid row
export const T_ANALYSIS = '#18232C';  // analysis panel
export const T_MAP = '#080E15';       // sentiment map well
export const GREEN = '#4ADE80';
export const SALMON = '#FFB4AB';
export const GOLD = '#FFDF9B';
export const MUTED = '#989081';       // warm gray label text
export const WHITE = '#FFFFFF';

export const tmono = (extra = {}) => ({ fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.1em', ...extra });

export const PIPELINE = ['SOURCES', 'SIGNAL QUEUE', 'AI ANALYSIS', 'MARKET DRAFT', 'PUBLISH'];

export function ExchangeTopBar({ onBrand }) {
  return (
    <div style={{ background: T_BAR, borderBottom: `1px solid ${T_LINE}`, display: 'flex', alignItems: 'stretch', flexWrap: 'wrap' }}>
      <div onClick={onBrand}
        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 16px', cursor: 'pointer', minWidth: 250, borderRight: `1px solid ${T_LINE}` }}>
        <span style={{ width: 34, height: 34, borderRadius: 7, background: T_RAIL, border: `1px solid ${GOLD}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round">
            <path d="M4 14v-4M8.5 18V6M13 15.5v-7M17.5 12.5v-1M21 16V8" />
          </svg>
        </span>
        <span style={{ lineHeight: 1.15 }}>
          <span style={{ display: 'block', fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 15, color: WHITE }}>DOBIUM Market</span>
          <span style={{ display: 'block', fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 15, color: WHITE }}>Exchange</span>
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px', flexWrap: 'wrap' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {PIPELINE.map((step, i) => (
            <span key={step} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={tmono({ fontSize: 9.5, color: i === 0 ? GOLD : MUTED })}>{step}</span>
              {i < PIPELINE.length - 1 && <span style={{ color: '#3A4A5C', fontSize: 10 }}>›</span>}
            </span>
          ))}
        </nav>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#0D1C2D', border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '6px 11px' }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN }} />
          <span style={tmono({ fontSize: 9, color: GREEN })}>PIPELINE ACTIVE</span>
        </span>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: T_TILE, border: `1px solid ${T_LINE}`, borderRadius: 5, padding: '8px 13px', minWidth: 190, marginLeft: 'auto' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <span style={tmono({ fontSize: 9.5, color: MUTED })}>CMD+K TO SEARCH</span>
        </span>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.9" strokeLinecap="round">
            <path d="M4 6v12M9 4v16M14 8v8M19 5v14" />
          </svg>
          <span style={{ width: 30, height: 30, borderRadius: 5, background: T_TILE, border: `1px solid ${T_LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C6D3E8" strokeWidth="1.9" strokeLinecap="round">
              <circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.6 3.8-5.2 7-5.2s5.8 1.6 7 5.2" />
            </svg>
          </span>
        </span>
      </div>
    </div>
  );
}

// Items with a `to` are routes; the rest are source filters held in page state.
export const SOURCE_GROUPS = [
  {
    title: 'SOURCES',
    items: [
      { label: 'Home', icon: 'home', to: '/radar' },
      { label: 'Market Maker', icon: 'maker', to: '/market-maker' },
      { label: 'News', icon: 'news', to: '/news' },
      { label: 'X (Twitter)', icon: 'at', to: '/x' },
      { label: 'Reddit', icon: 'chat', to: '/reddit' },
      { label: 'YouTube', icon: 'play' },
      { label: 'Google Trends', icon: 'trend' },
    ],
  },
  {
    title: 'SECONDARY',
    items: [
      { label: 'GitHub', icon: 'code' },
      { label: 'Product Hunt', icon: 'cat' },
      { label: 'Hacker News', icon: 'news' },
    ],
  },
  {
    title: 'PLATFORMS',
    items: [
      { label: 'Steam', icon: 'gamepad' },
      { label: 'Spotify', icon: 'disc' },
      { label: 'App Store', icon: 'phone' },
    ],
  },
];

export function RailIcon({ kind, color }) {
  const c = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', style: { flexShrink: 0 } };
  switch (kind) {
    case 'home': return <svg {...c}><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /></svg>;
    case 'maker': return <svg {...c}><path d="M4 20V4M4 20h16" /><path d="M8 16l4-6 3 3 5-7" /></svg>;
    case 'news': return <svg {...c}><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M7 9h7M7 13h7M7 17h4M17 9v8" /></svg>;
    case 'at': return <svg {...c}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.4" /><path d="M15.4 12v2a2.4 2.4 0 004.1 1.4" /></svg>;
    case 'chat': return <svg {...c}><path d="M4 5h16v11H9l-5 4z" /><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" /></svg>;
    case 'play': return <svg {...c}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M11 9.5l4 2.5-4 2.5z" fill={color} stroke="none" /></svg>;
    case 'trend': return <svg {...c}><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>;
    case 'code': return <svg {...c}><path d="M9 8l-4 4 4 4M15 8l4 4-4 4" /></svg>;
    case 'cat': return <svg {...c}><path d="M12 4c4.4 0 8 3.2 8 7.2 0 4.3-3.6 7.8-8 7.8s-8-3.5-8-7.8C4 7.2 7.6 4 12 4z" /><path d="M9.5 11h3a1.8 1.8 0 000-3.6h-3V15" /></svg>;
    case 'gamepad': return <svg {...c}><rect x="2" y="8" width="20" height="9" rx="4" /><path d="M7 11v3M5.5 12.5h3M15.5 12.5h.01M18.5 11h.01" /></svg>;
    case 'disc': return <svg {...c}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.6" /><path d="M8 8.5c2.6-1.4 5.4-1.4 8 0" /></svg>;
    case 'phone': return <svg {...c}><rect x="6" y="3" width="12" height="18" rx="2.5" /><path d="M11 18h2" /></svg>;
    default: return null;
  }
}

export function SourceRail({ source, setSource, active }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <aside style={{ width: 250, flexShrink: 0, background: T_RAIL, borderRight: `1px solid ${T_LINE}`, display: 'flex', flexDirection: 'column', padding: '16px 0 0' }}>
      {SOURCE_GROUPS.map((g) => (
        <div key={g.title} style={{ marginBottom: 22 }}>
          <div style={{ ...tmono({ fontSize: 8.5, letterSpacing: '0.18em', color: '#5C7391' }), padding: '0 18px 10px' }}>{g.title}</div>
          {g.items.map((it) => {
            // Exactly one row is ever selected: the page's own source state.
            const on = active ? active === it.label : source === it.label;
            const click = () => {
              if (setSource) setSource(it.label);
              if (it.to && it.to !== pathname) navigate(it.to);
            };
            return (
              <button key={it.label} onClick={click}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
                  background: on ? T_ROW_ON : 'transparent', border: 'none',
                  borderLeft: on ? `2px solid ${GOLD}` : '2px solid transparent',
                  padding: '10px 18px', cursor: 'pointer',
                  color: on ? WHITE : '#8FA3BC', fontSize: 12.5, fontWeight: on ? 700 : 500,
                }}>
                <RailIcon kind={it.icon} color={on ? WHITE : '#8FA3BC'} />
                {it.label}
              </button>
            );
          })}
        </div>
      ))}

      <div style={{ marginTop: 'auto', borderTop: `1px solid ${T_LINE}`, padding: '14px 18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
          <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: '#5C7391' })}>ARCHITECTURE</span>
          <span style={tmono({ fontSize: 9, color: GOLD })}>V3.4.1</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN }} />
          <span style={tmono({ fontSize: 9, color: GREEN })}>SYSTEM NOMINAL</span>
        </div>
        <div style={{ height: 3, background: '#0A1622', borderRadius: 2, marginTop: 10 }}>
          <div style={{ width: '72%', height: '100%', background: GREEN, borderRadius: 2, opacity: 0.75 }} />
        </div>
      </div>
    </aside>
  );
}

// Single place deciding which routes are full-screen terminals. Layout and
// Footer both read this, so adding a terminal no longer means remembering to
// update two unrelated files.
export const TERMINAL_PATHS = ['/radar', '/terminal', '/market-maker', '/news', '/x', '/reddit'];

export function isTerminalPath(pathname) {
  return TERMINAL_PATHS.includes(pathname) || pathname.startsWith('/x/') || pathname.startsWith('/reddit/');
}
