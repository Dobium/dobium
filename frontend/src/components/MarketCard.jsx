import { useNavigate } from 'react-router-dom';

const CATEGORY_ICONS = {
  sports: 'trophy',
  music: 'music_note',
  entertainment: 'movie',
  awards: 'award_star',
  politics: 'account_balance',
  finance: 'trending_up',
  technology: 'computer',
};
const CATEGORY_LABELS = {
  sports: 'Sports',
  music: 'Music',
  entertainment: 'Movies & TV',
  awards: 'Awards',
  politics: 'Politics',
  finance: 'Finance',
  technology: 'Technology',
};
const DEFAULT_ICON = 'category';

function CategoryIcon({ name, size = 16 }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }}>{name}</span>;
}

const BINARY_COLORS = ['#2dd4a7', '#ff5c72'];
const MULTI_COLORS = ['#e0b53d', '#a855f7', '#06b6d4', '#ec4899'];

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

function Sparkline({ market, outcomes, isBinary }) {
  const width = 280;
  const height = 44;
  const palette = isBinary ? BINARY_COLORS : MULTI_COLORS;
  const history = market?.price_history || [];
  const count = isBinary ? 1 : Math.min(outcomes.length, 3);

  const paths = outcomes.slice(0, count).map((o, idx) => {
    let data;
    if (history.length >= 2) {
      data = history.map(s => s.prices?.[o.id] ?? o.probability ?? 50);
    } else {
      data = [o.probability ?? 50, o.probability ?? 50];
    }
    return (
      <path
        key={o.id}
        d={generateLinePath(data, width, height)}
        fill="none"
        stroke={palette[idx % palette.length]}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.9"
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
    body = (
      <div className="flex gap-2">
        {outcomes.slice(0, 2).map((o, idx) => (
          <button
            key={o.id}
            style={idx === 0
              ? { background: 'var(--yes-dim)', borderColor: 'rgba(45,212,167,0.35)', color: 'var(--yes)' }
              : { background: 'var(--no-dim)', borderColor: 'rgba(255,92,114,0.35)', color: 'var(--no)' }}
            className="flex-1 rounded-lg px-3 py-1.5 border text-sm font-medium transition-all active:scale-95"
            onClick={(e) => e.stopPropagation()}
          >
            {normalizeOutcomeTitle(o.title)} <span style={{ fontFamily: 'var(--mono)' }}>{Math.round(o.probability || 0)}¢</span>
          </button>
        ))}
      </div>
    );
  } else {
    const top = outcomes.slice(0, 3);
    body = (
      <div className="flex flex-col gap-1">
        {top.map((o, idx) => (
          <div key={o.id} className="flex items-center justify-between text-sm">
            <span className="text-slate-200 truncate pr-2">{normalizeOutcomeTitle(o.title)}</span>
            <span style={{ fontFamily: 'var(--mono)', color: MULTI_COLORS[idx % MULTI_COLORS.length], fontWeight: 600 }}>
              {Math.round(o.probability || 0)}¢
            </span>
          </div>
        ))}
        {outcomes.length > 3 && (
          <p className="text-[11px] text-slate-500 text-center mt-0.5">+{outcomes.length - 3} more options</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="market-card group border hover:border-yellow-500/50 transition-all duration-300 cursor-pointer rounded-xl p-4 flex flex-col gap-2.5"
      style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
      onClick={() => navigate(`/markets/${market.id}`)}
    >
      {/* Top row: category label on left, volume on right */}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          <CategoryIcon name={CATEGORY_ICONS[market.category] || DEFAULT_ICON} size={14} />
          {CATEGORY_LABELS[market.category] || 'General'}
        </span>
        <span className="text-[11px] font-medium flex-shrink-0" style={{ color: 'var(--muted)' }}>
          Vol: {volLabel}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-yellow-400 transition-colors">
        {market.title}
      </h3>

      <Sparkline market={market} outcomes={outcomes} isBinary={isBinary} />

      {body}
    </div>
  );
}
