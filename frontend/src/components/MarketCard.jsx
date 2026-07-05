import { useNavigate } from 'react-router-dom';

const CATEGORY_ICONS = {
  sports: '🏆',
  music: '🎵',
  entertainment: '🎬',
  awards: '🏅',
  politics: '🏛️',
  finance: '📈',
  technology: '💻',
};

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
  const outcomes = market.outcomes || [];
  const isBinary = (market.market_type || 'binary') === 'binary';

  const leader = [...outcomes].sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];
  const leaderPct = Math.round(leader?.probability || 0);
  const leaderLabel = isBinary ? 'CHANCE' : (normalizeOutcomeTitle(leader?.title || '') || '').split(' ')[0].toUpperCase();

  // Close date → fuse label (field name may vary by schema)
  const closeRaw = market.close_time || market.closes_at || market.end_time || market.close_date || null;
  let fuseRow = null;
  if (closeRaw) {
    const close = new Date(closeRaw);
    const daysLeft = Math.ceil((close - Date.now()) / 86400000);
    if (daysLeft > 0) {
      const isShort = daysLeft <= 7;
      const dateStr = close.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      fuseRow = (
        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="font-semibold uppercase tracking-wide" style={{ color: isShort ? 'var(--no)' : 'var(--gold)' }}>
            {isShort ? '⚡ Short resolution' : '📈 Long resolution'}
          </span>
          <span style={{ color: 'var(--muted)' }}>🕐 {dateStr} · {daysLeft}d left</span>
        </div>
      );
    }
  }

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
      className="market-card group bg-slate-900/50 backdrop-blur-xl border border-slate-800 hover:border-yellow-500/50 transition-all duration-300 cursor-pointer rounded-xl p-4 flex flex-col gap-2.5"
      onClick={() => navigate(`/markets/${market.id}`)}
    >
      {/* Header: icon + title, leader % on right */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center text-base flex-shrink-0">
            {CATEGORY_ICONS[market.category] || '🎯'}
          </span>
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-yellow-400 transition-colors">
            {market.title}
          </h3>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="block text-xl font-bold" style={{ color: isBinary ? (leaderPct >= 50 ? 'var(--yes)' : 'var(--no)') : 'var(--gold)', fontFamily: 'var(--mono)' }}>
            {leaderPct}%
          </span>
          <span className="block text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            {leaderLabel}
          </span>
        </div>
      </div>

      <Sparkline market={market} outcomes={outcomes} isBinary={isBinary} />

      {body}

      {fuseRow}

      <div className="flex items-center justify-between pt-0.5">
        <span style={{ fontFamily: 'var(--mono)', color: 'var(--gold)', fontSize: 12, fontWeight: 700 }}>
          ${(market.total_volume || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 11, marginLeft: 4 }}>vol</span>
        </span>
        {(() => {
          const cRaw = market.close_time || market.closes_at || market.end_time || market.close_date || null;
          const closed = market.status === 'resolved' || market.status === 'closed' || (cRaw && new Date(cRaw) < new Date());
          return closed ? (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--muted)' }}></span>
              Closed
            </span>
          ) : (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--yes)' }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: 'var(--yes)' }}></span>
              Live
            </span>
          );
        })()}
      </div>
    </div>
  );
}
