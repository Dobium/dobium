import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { api } from '../api/client';

// ── Homepage rebuilt as a sector-based market dashboard, matched to Neel's
// reference mocks (palette sampled from the screenshots): #00132D page,
// #081C36 sidebar, #001F43 / #182A45 cards, warm #CFC5B5 mono labels,
// #4BE176 green, #FFB4AB salmon, #FFDF9B gold.

const PAGE_BG = '#00132D';
const SIDEBAR_BG = '#081C36';
const CARD_BG = '#001F43';
const CARD_LINE = '#22314A';
const WARM = '#CFC5B5';
const GREEN = '#4BE176';
const SALMON = '#FFB4AB';
const GOLD = '#FFDF9B';
const GOLD_DIM = '#E1C382';

const mono = (extra = {}) => ({ fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.1em', ...extra });

function leaderOf(m) {
  return [...(m.outcomes || [])].sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];
}
function yesOf(m) {
  return (m.outcomes || []).find((o) => (o.title || '').toLowerCase().startsWith('yes'));
}
function deltaFor(m, outcome) {
  const h = m?.price_history || [];
  if (h.length >= 2 && outcome) {
    const last = h[h.length - 1]?.prices?.[outcome.id];
    const prev = h[h.length - 2]?.prices?.[outcome.id];
    if (typeof last === 'number' && typeof prev === 'number') return Math.round(last - prev);
  }
  return 0;
}
function shortTitle(t) {
  return (t || '').replace(/^will\s+/i, '').replace(/\?+\s*$/, '');
}
function compactVol(v) {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return `$${Math.round(v || 0)}`;
}

// ── Sector classification ────────────────────────────────────────────────
const SECTORS = [
  { id: 'music', label: 'Music', icon: 'note',
    re: /kendrick|drake|sza|beyonc|taylor swift|billboard|album|tour(?!nament)|stream(ing)?|spotify|chart|single|mixtape|rapper|grammy nom/i },
  { id: 'movies', label: 'Movies & TV', icon: 'film',
    re: /movie|film|box office|netflix|hbo|disney|marvel|oscar|premiere|sequel|\bseries\b|renewal|episode|season \d|trailer|rotten tomatoes/i },
  { id: 'celebrities', label: 'Celebrities', icon: 'star',
    re: /breakup|engaged|married|dating|divorce|pregnan|scandal|lawsuit|arrest|feud/i },
  { id: 'festivals', label: 'Festivals', icon: 'stage',
    re: /coachella|festival|tour dates|stadium|concert|headlin|glastonbury|lollapalooza|rolling loud|bonnaroo/i },
  { id: 'gaming', label: 'Gaming', icon: 'gamepad',
    re: /\bgame\b|\bgta\b|esports|twitch|streamer|valorant|fortnite|minecraft|playstation|xbox|nintendo|steam|worlds \d|league of legends|call of duty|overwatch/i },
  { id: 'streaming', label: 'Streaming', icon: 'play',
    re: /netflix|hulu|hbo max|disney\+|paramount\+|peacock|apple tv|prime video|renewal|viewership|weekly views/i },
];

function classify(title) {
  for (const s of SECTORS) if (s.re.test(title || '')) return s.id;
  return null;
}

function sectorMarkets(markets, id) {
  return [...(markets || [])]
    .filter((m) => m.status === 'active' && classify(m.title) === id)
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}

// Demo banks matched to the reference mock's exact card content — used to
// fill out a sector when there aren't enough live markets classified into it.
const MUSIC_DEMO = [
  { title: 'Kendrick Lamar to drop "Surprise Project" before Dec 31?', vol: '$4.2M', yes: 88, no: 12, tag: 'SPOTIFY 50' },
  { title: 'Taylor Swift "The Tortured Poets" returns to #1 this week?', vol: '$1.8M', yes: 31, no: 69, tag: 'BILLBOARD' },
  { title: 'SZA "SOS" to win Album of the Year (AOTY)?', vol: '$920K', yes: 45, no: 55, tag: 'GRAMMYS' },
  { title: 'Drake "It\'s All A Blur" to gross over $300M total?', vol: '$2.4M', yes: 91, no: 9, tag: 'TOUR DATA' },
];
const MOVIES_DEMO_FEATURED = {
  title: 'Dune: Part 3 to officially greenlit by WB before March 2025?',
  desc: 'Recent box office projections for Part 2 exceeding $700M globally has triggered massive volume on a Part 3 confirmation.',
  yes: 82, no: 18, image: null,
};
const MOVIES_DEMO_SIDE = [
  { title: '"Gladiator II" Critics Score above 85%?', vol: '$412K', yes: 64, no: 36, tag: 'ROTTEN TOMATOES' },
  { title: '"The Bear" Season 4 release date set for 2024?', vol: '$288K', yes: 12, no: 88, tag: 'STREAMING WARS' },
];
const GAMING_DEMO = { title: 'GTA VI to be delayed to 2026?', desc: 'Institutional prediction pool based on Rockstar developer sentiment analysis.', prob: 24 };
const FESTIVALS_DEMO = { title: 'Coachella 2025 Headliners include Rihanna?', desc: 'Rumors intensified after Fenty sponsorship discussions surfaced.', prob: 52 };

function SectorIcon({ kind, color, size = 15 }) {
  const c = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', style: { flexShrink: 0 } };
  switch (kind) {
    case 'note': return <svg {...c}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
    case 'film': return <svg {...c}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" /></svg>;
    case 'star': return <svg {...c}><path d="M12 2l3 7 7 .6-5.5 4.6 1.8 7-6.3-4-6.3 4 1.8-7L2 9.6 9 9z" /></svg>;
    case 'stage': return <svg {...c}><path d="M3 21h18M4 18h16M6 18v-7M10 18v-7M14 18v-7M18 18v-7M3 9l9-6 9 6z" /></svg>;
    case 'gamepad': return <svg {...c}><rect x="2" y="8" width="20" height="9" rx="4" /><path d="M7 11v3M5.5 12.5h3M15.5 12.5h.01M18.5 11h.01" /></svg>;
    case 'play': return <svg {...c}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 9l5 3-5 3z" fill={color} stroke="none" /></svg>;
    case 'bolt': return <svg {...c}><path d="M13 2L3 14h9l-1 8 10-12h-9z" /></svg>;
    case 'life': return <svg {...c}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="M5.5 5.5l3.2 3.2M18.5 5.5l-3.2 3.2M5.5 18.5l3.2-3.2M18.5 18.5l-3.2-3.2" /></svg>;
    case 'api': return <svg {...c}><path d="M4 4l16 16M20 4L4 20" /></svg>;
    case 'bars': return <svg {...c} strokeWidth="2.4"><path d="M5 20V12M12 20V6M19 20v-9" /></svg>;
    default: return null;
  }
}

function MiniSpark({ up, seed = 0 }) {
  const shapes = [
    '0,20 8,18 16,19 24,12 32,14 40,7 48,4',
    '0,20 8,15 16,17 24,10 32,12 40,6 48,3',
    '0,4 8,9 16,7 24,13 32,12 40,17 48,20',
    '0,6 8,10 16,8 24,14 32,11 40,16 48,20',
  ];
  const pts = shapes[seed % shapes.length];
  const color = up ? GREEN : SALMON;
  return (
    <svg viewBox="0 0 48 24" style={{ width: '100%', height: 34, display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MusicCard({ m, onOpen }) {
  return (
    <div onClick={() => m.id && onOpen(m.id)}
      style={{ background: CARD_BG, border: `1px solid ${CARD_LINE}`, borderRadius: 8, padding: '13px 14px 14px', cursor: m.id ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', transition: 'border-color .15s ease' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = CARD_LINE)}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ ...mono({ fontSize: 8.5, color: WARM, background: '#0C2745', border: `1px solid ${CARD_LINE}`, borderRadius: 2, padding: '3px 7px' }) }}>{m.tag}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...mono({ fontSize: 9, color: WARM }) }}>
          <SectorIcon kind="bars" color={WARM} size={11} />{m.vol} Vol
        </span>
      </div>
      <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13, lineHeight: 1.4, margin: '11px 0 10px', minHeight: 54 }}>{m.title}</div>
      <MiniSpark up={m.yes >= 50} seed={m._seed || 0} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <div style={{ flex: 1, textAlign: 'center', background: '#0C2745', borderRadius: 4, padding: '9px 4px' }}>
          <div style={{ ...mono({ fontSize: 8.5, color: GREEN }) }}>YES</div>
          <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13, marginTop: 3 }}>{m.yes}¢</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', background: '#0C2745', borderRadius: 4, padding: '9px 4px' }}>
          <div style={{ ...mono({ fontSize: 8.5, color: SALMON }) }}>NO</div>
          <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13, marginTop: 3 }}>{m.no}¢</div>
        </div>
      </div>
    </div>
  );
}

function DuneArt() {
  return (
    <svg viewBox="0 0 600 320" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="dune-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A1730" />
          <stop offset="55%" stopColor="#3A2E3E" />
          <stop offset="78%" stopColor="#6B4A3F" />
          <stop offset="100%" stopColor="#8A5A3E" />
        </linearGradient>
        <radialGradient id="dune-moon" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF3D6" />
          <stop offset="70%" stopColor="#F3D9A0" />
          <stop offset="100%" stopColor="#D8B679" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dune-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A5642" />
          <stop offset="100%" stopColor="#4A3428" />
        </linearGradient>
        <linearGradient id="dune-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A2A22" />
          <stop offset="100%" stopColor="#1A120E" />
        </linearGradient>
      </defs>
      <rect width="600" height="320" fill="url(#dune-sky)" />
      <circle cx="430" cy="95" r="90" fill="url(#dune-moon)" />
      <circle cx="430" cy="95" r="46" fill="#F6E4BC" />
      <path d="M0,190 Q150,150 300,185 T600,170 V320 H0 Z" fill="url(#dune-far)" opacity="0.9" />
      <path d="M0,235 Q180,195 320,230 T600,210 V320 H0 Z" fill="url(#dune-near)" />
      <path d="M300,320 L280,235 Q300,225 320,235 L300,320 Z" fill="#120C09" opacity="0.85" />
      <path d="M292,320 L282,240 L318,240 L308,320 Z" fill="#0C0806" opacity="0.6" />
    </svg>
  );
}

function toCardShape(m, tag, seed) {
  const yes = yesOf(m);
  const lead = yes || leaderOf(m);
  const yesP = yes ? Math.round(yes.probability || 0) : Math.round(lead?.probability || 50);
  return { id: m.id, title: m.title, vol: compactVol(m.total_volume || 0), yes: yesP, no: 100 - yesP, tag, _seed: seed };
}

function SectionHeader({ icon, label, onViewAll }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
        <SectorIcon kind={icon} color={GOLD_DIM} size={17} />
        <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 19 }}>{label}</span>
      </span>
      <button onClick={onViewAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, color: WARM, fontSize: 12.5, fontWeight: 600 }}>
        View All <span style={{ fontSize: 14 }}>→</span>
      </button>
    </div>
  );
}

function MusicSection({ markets, onOpen, onViewAll, forwardRef }) {
  const real = sectorMarkets(markets, 'music').slice(0, 4).map((m, i) => toCardShape(m, MUSIC_DEMO[i]?.tag || 'MUSIC', i));
  const rows = real.length >= 3 ? real : MUSIC_DEMO.map((d, i) => ({ ...d, id: null, _seed: i }));
  return (
    <div ref={forwardRef} style={{ marginBottom: 34, scrollMarginTop: 90 }}>
      <SectionHeader icon="note" label="Music" onViewAll={onViewAll} />
      <div className="dbm-home-music-grid">
        {rows.map((m, i) => <MusicCard key={m.id || `music-${i}`} m={m} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

function MoviesSection({ markets, onOpen, onViewAll, forwardRef }) {
  const real = sectorMarkets(markets, 'movies');
  const featuredM = real[0];
  const sideMs = real.slice(1, 3);

  const featured = featuredM
    ? { id: featuredM.id, title: featuredM.title, desc: featuredM.description || MOVIES_DEMO_FEATURED.desc, ...(() => { const y = yesOf(featuredM) || leaderOf(featuredM); const yp = Math.round((yesOf(featuredM) ? y.probability : y?.probability) || 50); return { yes: yp, no: 100 - yp }; })(), image: featuredM.image || featuredM.event_image }
    : MOVIES_DEMO_FEATURED;

  const side = sideMs.length > 0
    ? sideMs.map((m, i) => toCardShape(m, i === 0 ? 'ROTTEN TOMATOES' : 'STREAMING WARS', i))
    : MOVIES_DEMO_SIDE.map((d, i) => ({ ...d, id: null, _seed: i }));

  return (
    <div ref={forwardRef} style={{ marginBottom: 34, scrollMarginTop: 90 }}>
      <SectionHeader icon="film" label="Movies & TV" onViewAll={onViewAll} />
      <div className="dbm-home-movies-grid">
        <div
          onClick={() => featured.id && onOpen(featured.id)}
          style={{ position: 'relative', minHeight: 260, borderRadius: 8, overflow: 'hidden', cursor: featured.id ? 'pointer' : 'default', border: `1px solid ${CARD_LINE}`, background: featured.image && /^https?:/.test(featured.image) ? `center/cover no-repeat url(${featured.image})` : '#0A1730', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 20 }}
        >
          {!(featured.image && /^https?:/.test(featured.image)) && <DuneArt />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,10,26,.05) 0%, rgba(0,10,26,.85) 78%)' }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ ...mono({ fontSize: 8.5, color: WARM, background: 'rgba(0,19,45,.85)', border: `1px solid ${CARD_LINE}`, borderRadius: 2, padding: '4px 9px' }) }}>FEATURED BOX OFFICE</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...mono({ fontSize: 8.5, color: GREEN }) }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: GREEN }} />LIVE MARKET
            </span>
          </div>
          <div style={{ position: 'relative', marginTop: 'auto' }}>
            <h3 style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 'clamp(17px,1.9vw,21px)', lineHeight: 1.3, margin: '14px 0 0' }}>{featured.title}</h3>
            <p style={{ color: '#B9C7DC', fontSize: 11.5, lineHeight: 1.6, margin: '9px 0 0', maxWidth: 460 }}>{featured.desc}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <span style={{ flex: 1, maxWidth: 150, textAlign: 'center', background: 'rgba(0,19,45,.75)', border: `1px solid ${CARD_LINE}`, borderRadius: 4, padding: '9px 4px' }}>
                <div style={{ ...mono({ fontSize: 8, color: WARM }) }}>BET YES</div>
                <div style={{ color: GREEN, fontWeight: 800, fontSize: 14, marginTop: 3 }}>{featured.yes}¢</div>
              </span>
              <span style={{ flex: 1, maxWidth: 150, textAlign: 'center', background: 'rgba(0,19,45,.75)', border: `1px solid ${CARD_LINE}`, borderRadius: 4, padding: '9px 4px' }}>
                <div style={{ ...mono({ fontSize: 8, color: WARM }) }}>BET NO</div>
                <div style={{ color: SALMON, fontWeight: 800, fontSize: 14, marginTop: 3 }}>{featured.no}¢</div>
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {side.map((m, i) => (
            <div key={m.id || `side-${i}`} onClick={() => m.id && onOpen(m.id)}
              style={{ flex: 1, background: CARD_BG, border: `1px solid ${CARD_LINE}`, borderRadius: 8, padding: '14px 15px', cursor: m.id ? 'pointer' : 'default' }}>
              <span style={{ ...mono({ fontSize: 8, color: WARM }) }}>{m.tag}</span>
              <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13, lineHeight: 1.4, margin: '8px 0 10px' }}>{m.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ ...mono({ fontSize: 9.5, color: WARM }) }}>Vol: {m.vol}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <span style={{ background: '#0C2745', color: GREEN, ...mono({ fontSize: 9.5, letterSpacing: '0.02em' }), borderRadius: 3, padding: '4px 8px' }}>{m.yes}¢</span>
                  <span style={{ background: '#0C2745', color: SALMON, ...mono({ fontSize: 9.5, letterSpacing: '0.02em' }), borderRadius: 3, padding: '4px 8px' }}>{m.no}¢</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProbabilityCard({ sector, m, onOpen }) {
  const barColor = m.prob >= 50 ? GREEN : SALMON;
  return (
    <div onClick={() => m.id && onOpen(m.id)}
      style={{ flex: 1, background: CARD_BG, border: `1px solid ${CARD_LINE}`, borderRadius: 8, padding: '16px 18px', cursor: m.id ? 'pointer' : 'default', minWidth: 0 }}>
      <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 14.5 }}>{m.title}</div>
      <p style={{ color: '#8E9AB0', fontSize: 11.5, lineHeight: 1.6, margin: '7px 0 0' }}>{m.desc}</p>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ ...mono({ fontSize: 8.5, color: WARM }) }}>PROBABILITY</span>
          <span style={{ color: barColor, fontWeight: 800, fontSize: 13 }}>{m.prob}%</span>
        </div>
        <div style={{ height: 4, background: '#0C2745', borderRadius: 2, marginTop: 7 }}>
          <div style={{ width: `${m.prob}%`, height: '100%', background: barColor, borderRadius: 2 }} />
        </div>
      </div>
      <button style={{ width: '100%', marginTop: 16, background: '#182A45', border: `1px solid ${CARD_LINE}`, borderRadius: 4, padding: '10px 0', cursor: 'pointer', color: '#D5E3FF', fontWeight: 700, fontSize: 12 }}>
        Trade Pool
      </button>
    </div>
  );
}

function GamingFestivalsRow({ markets, onOpen, gamingRef, festivalsRef }) {
  const gm = sectorMarkets(markets, 'gaming')[0];
  const fm = sectorMarkets(markets, 'festivals')[0];
  const gaming = gm ? { id: gm.id, title: gm.title, desc: gm.description || GAMING_DEMO.desc, prob: Math.round((leaderOf(gm)?.probability) || GAMING_DEMO.prob) } : GAMING_DEMO;
  const fest = fm ? { id: fm.id, title: fm.title, desc: fm.description || FESTIVALS_DEMO.desc, prob: Math.round((leaderOf(fm)?.probability) || FESTIVALS_DEMO.prob) } : FESTIVALS_DEMO;
  return (
    <>
      <div ref={gamingRef} style={{ scrollMarginTop: 90 }}>
        <SectionHeader icon="gamepad" label="Gaming Sector" onViewAll={() => {}} />
      </div>
      <div ref={festivalsRef} style={{ scrollMarginTop: 90 }} className="dbm-home-probability-row">
        <ProbabilityCard sector="gaming" m={gaming} onOpen={onOpen} />
        <ProbabilityCard sector="festivals" m={fest} onOpen={onOpen} />
      </div>
    </>
  );
}

function HomeTape({ markets }) {
  const real = [...markets]
    .filter((m) => m.status === 'active')
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 6)
    .map((m) => {
      const yes = yesOf(m) || leaderOf(m);
      const p = Math.round(yes?.probability || 50);
      return { label: shortTitle(m.title).slice(0, 20).toUpperCase(), price: p, delta: deltaFor(m, yes) };
    });
  const demo = [
    { label: 'DUNE 3 ANNOUNCE', price: 76, delta: 12 },
    { label: 'NETFLIX CHURN', price: 44, delta: -3 },
    { label: 'GRAMMYS AOTY', price: 62, delta: 1 },
    { label: 'K. LAMAR ALBUM', price: 88, delta: 4 },
    { label: "SZA TOUR '25", price: 91, delta: 2 },
  ];
  const items = real.length >= 4 ? real : demo;
  const loop = [...items, ...items, ...items];
  return (
    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
      <div className="dbm-home-tape" style={{ display: 'inline-flex', alignItems: 'center' }}>
        {loop.map((it, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, marginRight: 34, ...mono({ fontSize: 10.5, letterSpacing: '0.04em' }) }}>
            <span style={{ color: WARM }}>{it.label}:</span>
            <span style={{ color: '#DCE6F5' }}>{it.price}¢</span>
            <span style={{ color: it.delta >= 0 ? GREEN : SALMON }}>{it.delta >= 0 ? '▲' : '▼'} {Math.abs(it.delta)}%</span>
          </span>
        ))}
      </div>
      <style>{`
        .dbm-home-tape { animation: dbm-home-tape 42s linear infinite; }
        .dbm-home-tape:hover { animation-play-state: paused; }
        @keyframes dbm-home-tape { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        @media (prefers-reduced-motion: reduce) { .dbm-home-tape { animation: none; } }
      `}</style>
    </div>
  );
}

export default function LandingPage() {
  const { markets } = useMarkets();
  const navigate = useNavigate();
  const [pulse, setPulse] = useState(null);
  const [activeSector, setActiveSector] = useState('music');

  const fetchPulse = useCallback(() => { api.getPulse().then((r) => setPulse(r)).catch(() => {}); }, []);
  useEffect(() => { fetchPulse(); const t = setInterval(fetchPulse, 20000); return () => clearInterval(t); }, [fetchPulse]);

  const refs = {
    music: useRef(null), movies: useRef(null), celebrities: useRef(null),
    festivals: useRef(null), gaming: useRef(null), streaming: useRef(null),
  };

  const goTo = (id) => {
    setActiveSector(id);
    refs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const active = markets.filter((m) => m.status === 'active');
  const globalVol = pulse ? pulse.paper_volume_traded : active.reduce((s, m) => s + (m.total_volume || 0), 0);
  const activeTraders = pulse?.users != null ? pulse.users.toLocaleString('en-US') : '12,492';

  return (
    <div style={{ background: PAGE_BG, minHeight: '100%' }}>
      <div className="dbm-home-shell-wrap">
      <div className="dbm-home-shell">
        <aside style={{ background: SIDEBAR_BG, flexShrink: 0, padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN }} />
            <span style={{ ...mono({ fontSize: 9, letterSpacing: '0.16em', color: WARM }) }}>LIVE FEED</span>
          </div>
          <div style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 15, letterSpacing: '0.02em', marginTop: 8, marginBottom: 20 }}>MARKETS</div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTORS.map((s) => {
              const isActive = activeSector === s.id;
              return (
                <button key={s.id} onClick={() => goTo(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, background: isActive ? '#394666' : 'transparent',
                    border: 'none', borderRadius: 6, padding: '10px 11px', cursor: 'pointer', textAlign: 'left',
                    color: isActive ? '#DCE6F5' : WARM, fontSize: 13, fontWeight: isActive ? 700 : 500,
                  }}>
                  <SectorIcon kind={s.icon} color={isActive ? '#DCE6F5' : WARM} />
                  {s.label}
                </button>
              );
            })}
          </nav>

          <button onClick={() => navigate('/explore')}
            style={{ marginTop: 24, background: GOLD, color: '#00132D', border: 'none', borderRadius: 6, padding: '11px 0', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>
            Trade Now
          </button>

          <div style={{ marginTop: 'auto', paddingTop: 30, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', color: '#5C7391', fontSize: 12 }}>
              <SectorIcon kind="life" color="#5C7391" size={13} /> Support
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', color: '#5C7391', fontSize: 12 }}>
              <SectorIcon kind="api" color="#5C7391" size={13} /> API
            </span>
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0, padding: '16px 22px 60px' }}>
          <div className="dbm-home-statrow" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
            <HomeTape markets={markets} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: CARD_BG, border: `1px solid ${CARD_LINE}`, borderRadius: 4, padding: '7px 12px', flexShrink: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN }} />
              <span style={{ ...mono({ fontSize: 9, letterSpacing: '0.08em', color: GREEN }) }}>RADAR NODE: ALL SYSTEMS GO</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap', marginBottom: 28, paddingBottom: 16, borderBottom: `1px solid ${CARD_LINE}` }}>
            <div>
              <div style={{ ...mono({ fontSize: 9, letterSpacing: '0.1em', color: WARM }) }}>GLOBAL VOLUME</div>
              <div style={{ ...mono({ fontSize: 19, color: '#FFFFFF', letterSpacing: '0.01em' }), marginTop: 6 }}>
                ${globalVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div style={{ ...mono({ fontSize: 9, letterSpacing: '0.1em', color: WARM }) }}>ACTIVE TRADERS</div>
              <div style={{ ...mono({ fontSize: 19, color: GREEN, letterSpacing: '0.01em' }), marginTop: 6 }}>{activeTraders}</div>
            </div>
          </div>

          <MusicSection markets={markets} onOpen={(id) => navigate(`/markets/${id}`)} onViewAll={() => navigate('/explore')} forwardRef={refs.music} />
          <MoviesSection markets={markets} onOpen={(id) => navigate(`/markets/${id}`)} onViewAll={() => navigate('/explore')} forwardRef={refs.movies} />

          <div ref={refs.celebrities} style={{ scrollMarginTop: 90 }} />
          <div ref={refs.streaming} style={{ scrollMarginTop: 90 }} />

          <GamingFestivalsRow markets={markets} onOpen={(id) => navigate(`/markets/${id}`)} gamingRef={refs.gaming} festivalsRef={refs.festivals} />
        </main>
      </div>
      </div>

      <button onClick={() => navigate('/explore')}
        style={{
          position: 'fixed', right: 26, bottom: 26, width: 52, height: 52, borderRadius: 999,
          background: GOLD, border: 'none', cursor: 'pointer', zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 26px rgba(0,5,15,.5)',
        }}
        title="Quick trade"
      >
        <SectorIcon kind="bolt" color="#00132D" size={20} />
      </button>

      <style>{`
        .dbm-home-shell-wrap { max-width: 1400px; margin: 0 auto; }
        .dbm-home-shell { display: flex; align-items: flex-start; min-height: 100%; }
        .dbm-home-music-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .dbm-home-movies-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .dbm-home-probability-row { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 640px) { .dbm-home-music-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1024px) {
          .dbm-home-music-grid { grid-template-columns: repeat(4, 1fr); }
          .dbm-home-movies-grid { grid-template-columns: 1.6fr 1fr; }
          .dbm-home-probability-row { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 768px) { .dbm-home-shell > aside { width: 220px; } }
        @media (max-width: 767px) {
          .dbm-home-shell { flex-direction: column; }
          .dbm-home-shell > aside { width: 100% !important; flex-direction: row !important; flex-wrap: wrap; align-items: center; }
          .dbm-home-shell > aside nav { flex-direction: row !important; flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}
