import { quoteOf, quoteLine } from '../lib/quote';

// The one market card.
//
// Replaces MarketCard, TrendingMarketCard, HomeFeedCard, ExploreCard,
// MajorMarket, and the MusicCard / SectorGridCard defined inline in
// LandingPage.jsx. Those were six different renderers, which is why restyling
// any one of them never visibly changed the site.
//
// Styled to match the market-detail reference: one quote instead of a YES/NO
// pair, gold as the only accent, volume as a labelled stat, no coloured
// probability pills.

const BG = '#0E2038';
const BG_HOVER = '#12294A';
const LINE = '#1E3350';
const LINE_HOVER = '#39557E';
const GOLD = '#F5CE85';
const MUTED = '#8A9BB2';
const DIM = '#63768E';

const MONO =
  "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// Accepts either a raw market from the API or the flattened card shape the
// landing page builds with toCardShape().
function normalize(input) {
  if (!input) return null;
  if (input.__quote) return input;

  const isRaw = Array.isArray(input.outcomes);
  const q = isRaw
    ? quoteOf(input)
    : {
        side: 'YES',
        last: Math.min(99, Math.max(1, Math.round(Number(input.yes) || 50))),
        bid: null,
        ask: null,
        hasBook: false,
        volume: input.vol || '$0',
      };

  return {
    __quote: true,
    id: input.id,
    title: input.title,
    subtitle: input.subtitle || input.question || null,
    eyebrow: input.tag || input.sector || null,
    resolves: input.resolves || null,
    q,
  };
}

// A flat, low-amplitude trace. Deliberately not a dramatic up-and-to-the-right
// curve — the point is to read as a price history, not a win streak.
function Spark({ seed = 0, width = 96, height = 26 }) {
  const pts = [];
  let v = 0.5;
  for (let i = 0; i < 14; i += 1) {
    // Deterministic wobble so a card doesn't redraw differently on every render.
    const n = Math.sin((seed + 1) * 12.9898 + i * 78.233) * 43758.5453;
    v += ((n - Math.floor(n)) - 0.5) * 0.16;
    v = Math.min(0.92, Math.max(0.08, v));
    pts.push([(i / 13) * width, height - v * height]);
  }
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={d} fill="none" stroke={GOLD} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function QuoteCard({ market, onOpen, showSpark = true, compact = false }) {
  const m = normalize(market);
  if (!m) return null;

  const { q } = m;
  const clickable = Boolean(m.id && onOpen);

  return (
    <article
      onClick={() => clickable && onOpen(m.id)}
      onKeyDown={(e) => {
        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen(m.id);
        }
      }}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      style={{
        background: BG,
        border: `1px solid ${LINE}`,
        borderRadius: 10,
        padding: compact ? '13px 14px' : '15px 16px',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'border-color .15s ease, background .15s ease',
        outlineOffset: 2,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = LINE_HOVER;
        e.currentTarget.style.background = BG_HOVER;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = LINE;
        e.currentTarget.style.background = BG;
      }}
    >
      {/* Title block, with volume sitting opposite it as a labelled stat. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          {m.eyebrow && (
            <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.14em', color: DIM, marginBottom: 7 }}>
              {String(m.eyebrow).toUpperCase()}
            </div>
          )}
          <h3
            style={{
              color: '#FFFFFF',
              fontWeight: 650,
              fontSize: compact ? 14.5 : 15.5,
              lineHeight: 1.35,
              margin: 0,
              letterSpacing: '-.005em',
            }}
          >
            {m.title}
          </h3>
          {m.subtitle && (
            <div style={{ color: MUTED, fontSize: 12.5, marginTop: 4, lineHeight: 1.4 }}>{m.subtitle}</div>
          )}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.14em', color: DIM }}>VOLUME</div>
          <div style={{ fontFamily: MONO, fontSize: 13, color: '#FFFFFF', marginTop: 3 }}>{q.volume}</div>
        </div>
      </div>

      {/* The quote. One side, one price — no opposing pills to choose between. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: compact ? 12 : 14,
          paddingTop: 12,
          borderTop: `1px solid ${LINE}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0, flexWrap: 'wrap' }}>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: 999,
              background: GOLD,
              alignSelf: 'center',
              flexShrink: 0,
            }}
          />
          <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{q.side} Price</span>
          <span style={{ fontFamily: MONO, fontSize: 14, color: '#FFFFFF', fontWeight: 600 }}>{q.last}¢</span>
          {q.hasBook && (
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: DIM }}>
              Bid {q.bid}¢ · Ask {q.ask}¢
            </span>
          )}
        </div>

        {showSpark && !compact && <Spark seed={Number(m.id) || m.title?.length || 0} />}
      </div>

      {m.resolves && (
        <div style={{ fontFamily: MONO, fontSize: 9.5, color: DIM, marginTop: 10 }}>{m.resolves}</div>
      )}
    </article>
  );
}

export { quoteLine };
