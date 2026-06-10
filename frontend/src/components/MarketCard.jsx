import { useNavigate } from 'react-router-dom';

const CATEGORY_COLORS = {
  sports: 'from-blue-500 to-blue-600',
  entertainment: 'from-purple-500 to-purple-600',
  politics: 'from-red-500 to-red-600',
  finance: 'from-green-500 to-green-600',
  technology: 'from-cyan-500 to-cyan-600',
  science: 'from-indigo-500 to-indigo-600',
  international: 'from-blue-500 to-indigo-600',
  environment: 'from-green-500 to-teal-600',
  climate: 'from-green-500 to-emerald-600',
  health: 'from-red-500 to-pink-600',
};

const BINARY_COLORS = [
  { line: '#22c55e', fill: 'rgba(34, 197, 94, 0.2)' },
  { line: '#ef4444', fill: 'rgba(239, 68, 68, 0.2)' },
];

const MULTI_COLORS = [
  { line: '#3b82f6', fill: 'rgba(59, 130, 246, 0.2)' },
  { line: '#a855f7', fill: 'rgba(168, 85, 247, 0.2)' },
  { line: '#f59e0b', fill: 'rgba(245, 158, 11, 0.2)' },
  { line: '#06b6d4', fill: 'rgba(6, 182, 212, 0.2)' },
  { line: '#ec4899', fill: 'rgba(236, 72, 153, 0.2)' },
];

const MULTI_OPTION_COLORS = [
  { bg: 'bg-blue-500/10', border: 'border-blue-500/50', hover: 'hover:border-blue-500 hover:bg-blue-500/20', text: 'text-blue-400' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/50', hover: 'hover:border-purple-500 hover:bg-purple-500/20', text: 'text-purple-400' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/50', hover: 'hover:border-amber-500 hover:bg-amber-500/20', text: 'text-amber-400' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/50', hover: 'hover:border-cyan-500 hover:bg-cyan-500/20', text: 'text-cyan-400' },
];

function normalizeOutcomeTitle(title) {
  const lower = title.toLowerCase().trim();
  if (lower === 'yes' || lower.startsWith('yes,') || lower.startsWith('yes ')) {
    return 'Yes';
  }
  if (lower === 'no' || lower.startsWith('no,') || lower.startsWith('no ')) {
    return 'No';
  }
  return title;
}

function generateLinePath(data, width, height) {
  const padding = 4;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * graphWidth;
    const y = padding + graphHeight - (value / 100) * graphHeight;
    return { x, y };
  });

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cp1x = prev.x + (curr.x - prev.x) / 3;
    const cp2x = prev.x + 2 * (curr.x - prev.x) / 3;
    path += ` C ${cp1x} ${prev.y}, ${cp2x} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return path;
}

function MiniChart({ market, outcomes, isBinary }) {
  const width = 280;
  const height = 70;
  const colorPalette = isBinary ? BINARY_COLORS : MULTI_COLORS;
  const priceHistory = market?.price_history || [];
  const displayCount = isBinary ? 2 : Math.min(outcomes.length, 4);

  const histories = outcomes.slice(0, displayCount).map(outcome => {
    let data;
    if (priceHistory.length >= 2) {
      // Use real price history — same source as the detail page chart
      data = priceHistory.map(snap => snap.prices?.[outcome.id] ?? outcome.probability ?? 50);
    } else {
      // No history yet — flat line at current probability
      data = [outcome.probability ?? 50, outcome.probability ?? 50];
    }
    return data;
  });

  const paths = histories.map((history, idx) => {
    const color = colorPalette[idx % colorPalette.length];
    const path = generateLinePath(history, width, height);
    return (
      <path
        key={idx}
        d={path}
        fill="none"
        stroke={color.line}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.9"
      />
    );
  });

  const legends = outcomes.slice(0, displayCount).map((outcome, idx) => {
    const color = colorPalette[idx % colorPalette.length];
    return (
      <div key={outcome.id} className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full" style={{ background: color.line }}></span>
        <span className="text-xs" style={{ color: color.line }}>{normalizeOutcomeTitle(outcome.title)}</span>
        <span className="text-xs text-slate-300">{Math.round(outcome.probability || 0)}¢</span>
      </div>
    );
  });

  return (
    <div className="rounded-xl overflow-hidden bg-slate-800/30">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs text-slate-500">{priceHistory.length >= 2 ? 'Price History' : 'Current'}</span>
        <div className="flex flex-wrap gap-2 justify-end">
          {legends}
        </div>
      </div>
      <svg className="w-full" style={{ aspectRatio: `${width} / ${height}` }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#334155" strokeWidth="0.5" strokeDasharray="2,2" />
        {paths}
      </svg>
    </div>
  );
}

export default function MarketCard({ market }) {
  const navigate = useNavigate();
  const marketType = market.market_type || 'binary';
  const outcomes = market.outcomes || [];
  const isBinary = marketType === 'binary';
  const isMultiMultiple = marketType === 'multi_multiple';
  const typeLabel = isBinary ? 'Binary' : isMultiMultiple ? 'Multi-Independent' : 'Multi';

  let outcomeButtons;
  if (isBinary) {
    outcomeButtons = (
      <>
        {outcomes.slice(0, 2).map((outcome, idx) => (
          <button
            key={outcome.id}
            style={idx === 0
              ? { background: 'var(--yes-dim)', borderColor: 'rgba(45,212,167,0.3)' }
              : { background: 'var(--no-dim)', borderColor: 'rgba(255,92,114,0.3)' }
            }
            className="flex-1 relative overflow-hidden rounded-lg px-3 py-2 transition-all duration-200 border active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-white font-medium text-xs text-center">{normalizeOutcomeTitle(outcome.title)}</span>
              <span
                className="text-base font-semibold text-center"
                style={{ color: idx === 0 ? 'var(--yes)' : 'var(--no)', fontFamily: 'var(--mono)' }}
              >
                {Math.round(outcome.probability || 0)}¢
              </span>
            </div>
          </button>
        ))}
      </>
    );
  } else {
    const displayOutcomes = outcomes.slice(0, 4);
    const hasMore = outcomes.length > 4;
    outcomeButtons = (
      <div className="w-full flex flex-wrap gap-2">
        {displayOutcomes.map((outcome, idx) => {
          const colors = MULTI_OPTION_COLORS[idx % MULTI_OPTION_COLORS.length];
          return (
            <button
              key={outcome.id}
              className={`w-[calc(50%-4px)] relative overflow-hidden rounded-lg px-3 py-2 transition-all duration-200 border ${colors.bg} ${colors.border} ${colors.hover} active:scale-[0.98] flex flex-col items-center justify-center`}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <span className="text-white font-medium text-xs truncate text-center w-full">{normalizeOutcomeTitle(outcome.title)}</span>
              <span className={`text-base font-semibold ${colors.text}`}>
                {Math.round(outcome.probability || 0)}¢
              </span>
            </button>
          );
        })}
        {hasMore && <p className="w-full text-xs text-slate-500 text-center mt-1">+{outcomes.length - 4} more options</p>}
      </div>
    );
  }

  return (
    <div
      className="market-card group relative overflow-hidden bg-slate-900/50 backdrop-blur-xl border border-slate-800 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-500/10 cursor-pointer rounded-2xl grid"
      onClick={() => navigate(`/markets/${market.id}`)}
      style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}
    >
      <div className="[grid-area:1/1] bg-gradient-to-br from-yellow-500/0 to-yellow-600/0 group-hover:from-yellow-500/5 group-hover:to-yellow-600/5 transition-all duration-300"></div>
      <div className="[grid-area:1/1] p-4 flex flex-col gap-2 z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${CATEGORY_COLORS[market.category] || 'from-slate-500 to-slate-600'} text-white`}>
              {market.category}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeLabel.class}`}>
              <span>{typeLabel.text}</span>
            </span>
          </div>
          <div />
        </div>

        <MiniChart market={market} outcomes={outcomes} isBinary={isBinary} />

        <h3 className="text-base font-semibold text-white mb-4 line-clamp-2 group-hover:text-yellow-400 transition-colors">
          {market.title}
        </h3>

        <div className="flex gap-2">
          {outcomeButtons}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--gold)', fontSize: '12px', fontWeight: 700 }}>
            ${(market.total_volume || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            <span style={{ fontFamily: 'inherit', color: 'var(--muted)', fontWeight: 500, fontSize: '11px', marginLeft: 4 }}>vol</span>
          </span>
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--yes)' }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: 'var(--yes)' }}></span>
            Live
          </span>
        </div>
      </div>
    </div>
  );
}
