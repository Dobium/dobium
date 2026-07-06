import { useNavigate } from 'react-router-dom';

const CATEGORY_ICONS = {
  sports: 'trophy',
  music: 'music_note',
  entertainment: 'movie',
  awards: 'award_star',
  politics: 'account_balance',
  finance: 'trending_up',
  technology: 'computer',
  esports: 'stadia_controller',
  streaming: 'live_tv',
};
const CATEGORY_LABELS = {
  sports: 'Sports',
  music: 'Music',
  entertainment: 'Movies & TV',
  awards: 'Awards',
  politics: 'Politics',
  finance: 'Finance',
  technology: 'Technology',
  esports: 'Esports',
  streaming: 'Streaming',
};
const DEFAULT_ICON = 'category';

function CategoryIcon({ name, size = 14 }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }}>{name}</span>;
}

const MULTI_COLORS = ['#E8C468', '#a855f7', '#06b6d4', '#ec4899'];

function normalizeOutcomeTitle(title) {
  const lower = (title || '').toLowerCase().trim();
  if (lower === 'yes' || lower.startsWith('yes,') || lower.startsWith('yes ')) return 'Yes';
  if (lower === 'no' || lower.startsWith('no,') || lower.startsWith('no ')) return 'No';
  return title;
}

function generateLinePath(data, width, height) {
  const padding = 3;
  const gw = width - padding * 2;
  const gh = height - padding * 2;
  const pts = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * gw,
    y: padding + gh - (v / 100) * gh,
  }));
  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const cp1 = p.x + (c.x - p.x) / 3;
    const cp2 = p.x + (2 * (c.x - p.x)) / 3;
    path += ` C ${cp1} ${p.y}, ${cp2} ${c.y}, ${c.x} ${c.y}`;
  }
  return path;
}

// Leader outcome's series decides the sparkline color: green trending up, red trending down.
function Sparkline({ market, outcomes, isBinary }) {
  const width = 280;
  const height = 44;
  const history = market?.price_history || [];
  const count = isBinary ? 1 : Math.min(outcomes.length, 3);

  const paths = outcomes.slice(0, count).map((o, idx) => {
    let data;
    if (history.length >= 2) {
      data = history.map(s => s.prices?.[o.id] ?? o.probability ?? 50);
    } else {
      data = [o.probability ?? 50, o.probability ?? 50];
    }
    const trendUp = data[data.length - 1] >= data[0];
    const stroke = isBinary
      ? (trendUp ? 'var(--yes)' : 'var(--no)')
      : MULTI_COLORS[idx % MULTI_COLORS.length];
    return (
      <path
        key={o.id}
        d={generateLinePath(data, width, height)}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.95"
      />
    );
  });

  return (
    <svg className="w-full" style={{ height: 44 }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {paths}
    </svg>
  );
}

export default function MarketCard({ market }) {
  const navigate = useNavigate();
  const marketType = market.market_type || 'binary';
  const isMultiType = marketType === 'multi_single' || marketType === 'multi_multiple';
  // Multi markets store each candidate as an internal Yes/No pair (e.g. "Spain (Yes)").
  // Only the "Yes" side is a real candidate row, with the "(Yes)" suffix stripped for display.
  const hasYesNoPairs = (market.outcomes || []).some(o => o.id?.endsWith('_yes'));
  const outcomes = (isMultiType && hasYesNoPairs)
    ? (market.outcomes || []).filter(o => o.id?.endsWith('_yes')).map(o => ({ ...o, title: o.title.replace(/\s*\(Yes\)$/i, '') }))
    : (market.outcomes || []);
  const isBinary = !isMultiType;

  const volLabel = (market.total_volume || 0) >= 1000
    ? `$${(market.total_volume / 1000).toFixed(market.total_volume >= 100000 ? 0 : 1)}K`
    : `$${(market.total_volume || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  let body;
  if (isBinary) {
    const yes = outcomes.find(o => normalizeOutcomeTitle(o.title) === 'Yes') || outcomes[0];
    const no = outcomes.find(o => normalizeOutcomeTitle(o.title) === 'No') || outcomes[1];
    body = (
      <div className="flex gap-2">
        {yes && (
          <button
            className="flex-1 flex items-center justify-between rounded-md px-3 py-2 border text-sm transition-all active:scale-95"
            style={{ background: 'var(--yes-dim)', borderColor: 'rgba(110,231,154,0.3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ color: 'var(--yes)', fontWeight: 600 }}>Yes</span>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--yes)', fontWeight: 600 }}>{Math.round(yes.probability || 0)}¢</span>
          </button>
        )}
        {no && (
          <button
            className="flex-1 flex items-center justify-between rounded-md px-3 py-2 border text-sm transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>No</span>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--no)', fontWeight: 600 }}>{Math.round(no.probability || 0)}¢</span>
          </button>
        )}
      </div>
    );
  } else {
    const top = outcomes.slice(0, 3);
    body = (
      <div className="flex flex-col gap-1">
        {top.map((o, idx) => (
          <div key={o.id} className="flex items-center justify-between text-sm">
            <span className="truncate pr-2" style={{ color: 'var(--text)' }}>{normalizeOutcomeTitle(o.title)}</span>
            <span style={{ fontFamily: 'var(--mono)', color: MULTI_COLORS[idx % MULTI_COLORS.length], fontWeight: 600 }}>
              {Math.round(o.probability || 0)}¢
            </span>
          </div>
        ))}
        {outcomes.length > 3 && (
          <p className="text-[11px] text-center mt-0.5" style={{ color: 'var(--muted)' }}>+{outcomes.length - 3} more options</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="market-card group border transition-all duration-300 cursor-pointer rounded-lg p-4 flex flex-col gap-3"
      style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,196,104,0.4)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; }}
      onClick={() => navigate(`/markets/${market.id}`)}
    >
      {/* Top row: icon + CATEGORY left, Vol right — mono, like the screenshot */}
      <div className="flex items-center justify-between gap-3">
        <span
          className="flex items-center gap-1.5"
          style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)' }}
        >
          <CategoryIcon name={CATEGORY_ICONS[market.category] || DEFAULT_ICON} size={14} />
          {CATEGORY_LABELS[market.category] || 'General'}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--muted)', flexShrink: 0 }}>
          Vol: {volLabel}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-bold leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>
        {market.title}
      </h3>

      <Sparkline market={market} outcomes={outcomes} isBinary={isBinary} />

      {body}
    </div>
  );
}
