import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!targetDate) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const distance = target - now;

      if (distance <= 0) {
        setTimeLeft('Resolving soon...');
        setIsUrgent(true);
        return false;
      }

      setIsUrgent(distance < 1000 * 60 * 60); // Turns red when less than 1 hour remains

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h left`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s left`);
      }
      return true;
    };

    if (calculateTimeLeft()) {
      const interval = setInterval(calculateTimeLeft, 1000);
      return () => clearInterval(interval);
    }
  }, [targetDate]);

  if (!targetDate || !timeLeft) return null;

  return (
    <span className={`flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[11px] font-medium bg-slate-800/80 px-1.5 sm:px-2 py-0.5 rounded border border-slate-700 shadow-sm ${isUrgent ? 'text-red-400' : 'text-slate-400'}`}>
      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {timeLeft}
    </span>
  );
}

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

  // Sort by probability desc, take top 4 (or 2 for binary)
  const sortedOutcomes = [...outcomes].sort((a, b) => (b.probability || 0) - (a.probability || 0));
  const displayCount = isBinary ? 2 : Math.min(sortedOutcomes.length, 4);

  const histories = sortedOutcomes.slice(0, displayCount).map(outcome => {
    let data;
    if (priceHistory.length >= 2 && (market?.total_volume || 0) > 0) {
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

  const legends = sortedOutcomes.slice(0, displayCount).map((outcome, idx) => {
    const color = colorPalette[idx % colorPalette.length];
    return (
      <div key={outcome.id} className="flex items-center gap-0.5 sm:gap-1">
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style={{ background: color.line }}></span>
        <span className="text-[9px] sm:text-xs truncate max-w-[40px] sm:max-w-[60px]" style={{ color: color.line }}>{normalizeOutcomeTitle(outcome.title.replace(/\s*\(Yes\)$/i, ''))}</span>
        <span className="text-[9px] sm:text-xs text-slate-300">{Math.round(outcome.probability || 0)}¢</span>
      </div>
    );
  });

  return (
    <div className="rounded-xl overflow-hidden bg-slate-800/30">
      <div className="flex items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2">
        <span className="text-[9px] sm:text-xs text-slate-500">{priceHistory.length >= 2 ? 'Price History' : 'Current'}</span>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-end">
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
  const isBinary = marketType === 'binary';
  const isMultiMultiple = marketType === 'multi_multiple' || marketType === 'multi_single';

  const rawOutcomes = market.outcomes || [];
  const hasYesNoPairs = rawOutcomes.some(o => o.id.endsWith('_yes'));
  const displaySourceOutcomes = (isMultiMultiple && hasYesNoPairs) ? rawOutcomes.filter(o => o.id.endsWith('_yes')) : rawOutcomes;

  // Sort outcomes highest → lowest probability, or Yes/No for binary
  const outcomes = [...displaySourceOutcomes];
  if (isBinary && outcomes.length === 2) {
    outcomes.sort((a, b) => {
      const aTitle = a.title?.toLowerCase();
      const bTitle = b.title?.toLowerCase();
      if (aTitle === 'yes' || aTitle?.startsWith('over')) return -1;
      if (bTitle === 'yes' || bTitle?.startsWith('over')) return 1;
      if (aTitle === 'no' || aTitle?.startsWith('under')) return 1;
      if (bTitle === 'no' || bTitle?.startsWith('under')) return -1;
      return (b.probability || 0) - (a.probability || 0);
    });
  } else {
    outcomes.sort((a, b) => (b.probability || 0) - (a.probability || 0));
  }
  const typeLabel = isBinary ? 'Binary' : isMultiMultiple ? 'Multi-Independent' : 'Multi';
  const isResolved = market.status === 'resolved';
  const winningOutcomeIds = (() => {
    if (Array.isArray(market.winning_outcome_ids)) return market.winning_outcome_ids;
    if (!market.winning_outcome_id) return [];
    try {
      const parsed = JSON.parse(market.winning_outcome_id);
      return Array.isArray(parsed) ? parsed : [market.winning_outcome_id];
    } catch {
      return [market.winning_outcome_id];
    }
  })();
  const winningOutcomeSet = new Set(winningOutcomeIds);

  const sportsMeta = (() => {
    if (market.category === 'sports' && market.description) {
      try {
        const parsed = JSON.parse(market.description);
        if (parsed.is_sports) return parsed;
      } catch (e) {
        // Not JSON
      }
    }
    return null;
  })();

  const homeLogo = sportsMeta?.home_logo;
  const awayLogo = sportsMeta?.away_logo;
  const eventImage = sportsMeta?.event_image || (!sportsMeta && market.image_url);

  let outcomeButtons;
  if (isBinary) {
    outcomeButtons = (
      <>
        {outcomes.slice(0, 2).map((outcome, idx) => (
          <button
            key={outcome.id}
            className={`flex-1 relative overflow-hidden rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 transition-all duration-200 border ${isResolved && winningOutcomeSet.has(outcome.id)
              ? 'bg-green-500/15 border-green-500'
              : isResolved
                ? 'bg-slate-800/40 border-slate-700 opacity-70'
                : idx === 0
                  ? 'bg-green-500/10 border-green-500/50 hover:border-green-500 hover:bg-green-500/20'
                  : 'bg-red-500/10 border-red-500/50 hover:border-red-500 hover:bg-red-500/20'
              } active:scale-95`}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/markets/${market.id}`);
            }}
          >
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <span className="text-white font-medium text-[10px] sm:text-xs text-center truncate w-full">{normalizeOutcomeTitle(outcome.title)}</span>
              <span className={`text-sm sm:text-base font-semibold text-center ${idx === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {Math.round(outcome.probability || 0)}¢
              </span>
              {isResolved && winningOutcomeSet.has(outcome.id) && (
                <span className="text-[8px] sm:text-[10px] font-bold uppercase text-green-300">Won</span>
              )}
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
          const isWinner = winningOutcomeSet.has(outcome.id);
          return (
            <button
              key={outcome.id}
              className={`w-[calc(50%-4px)] relative overflow-hidden rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 transition-all duration-200 border ${isResolved && isWinner
                ? 'bg-green-500/15 border-green-500'
                : isResolved
                  ? 'bg-slate-800/40 border-slate-700 opacity-70'
                  : `${colors.bg} ${colors.border} ${colors.hover}`
                } active:scale-[0.98] flex flex-col items-center justify-center`}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/markets/${market.id}`);
              }}
            >
              <span className="text-white font-medium text-[10px] sm:text-xs truncate text-center w-full">{isMultiMultiple ? outcome.title.replace(/\s*\(Yes\)$/i, '') : normalizeOutcomeTitle(outcome.title)}</span>
              <span className={`text-sm sm:text-base font-semibold ${colors.text}`}>
                {Math.round(outcome.probability || 0)}¢
              </span>
              {isResolved && isWinner && (
                <span className="text-[8px] sm:text-[10px] font-bold uppercase text-green-300">Won</span>
              )}
            </button>
          );
        })}
        {hasMore && <p className="w-full text-[10px] sm:text-xs text-slate-500 text-center mt-0.5 sm:mt-1">+{outcomes.length - 4} more options</p>}
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
      <div className="[grid-area:1/1] p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 z-10 h-full">
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-xs font-semibold bg-gradient-to-r ${CATEGORY_COLORS[market.category] || 'from-slate-500 to-slate-600'} text-white`}>
              {market.category}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 rounded-full text-[8px] sm:text-[10px] font-medium border border-slate-700 text-slate-400">
              <span>{typeLabel}</span>
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {sportsMeta && sportsMeta.match_state ? (
              <span className={`text-[10px] sm:text-xs font-bold flex items-center gap-1.5 px-2 py-0.5 rounded border ${sportsMeta.match_state === 'final' || sportsMeta.match_state === 'full-time' ? 'bg-slate-800 text-slate-300 border-slate-700' :
                sportsMeta.match_state === 'overtime' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                  sportsMeta.match_state === 'halftime' || sportsMeta.match_state === 'half-time' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                    sportsMeta.match_state === 'in_progress' || sportsMeta.match_state === 'live' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                      'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                {(sportsMeta.match_state === 'in_progress' || sportsMeta.match_state === 'live' || sportsMeta.match_state === 'overtime') && (
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full inline-block bg-current animate-pulse"></span>
                )}
                {sportsMeta.match_state === 'in_progress' && `Period ${sportsMeta.current_period || 1}`}
                {sportsMeta.match_state === 'live' && 'Live'}
                {(sportsMeta.match_state === 'halftime' || sportsMeta.match_state === 'half-time') && 'Half Time'}
                {sportsMeta.match_state === 'overtime' && 'OVERTIME'}
                {(sportsMeta.match_state === 'final' || sportsMeta.match_state === 'full-time') && 'Final'}
                {(sportsMeta.match_state === 'upcoming' || sportsMeta.match_state === 'pre-match') && 'Upcoming'}

                {sportsMeta.clock_running && <span className="ml-1 opacity-70">⏱</span>}
              </span>
            ) : (
              <span className={`text-[10px] sm:text-xs font-medium flex items-center gap-1 ${isResolved ? 'text-yellow-400' : 'text-green-400'}`}>
                <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full inline-block ${isResolved ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                {isResolved ? 'Resolved' : 'Open'}
              </span>
            )}
            {!isResolved && market.close_date && (!sportsMeta || sportsMeta.match_state === 'upcoming' || !sportsMeta.match_state) && (
              <CountdownTimer targetDate={market.close_date} />
            )}
          </div>
        </div>

        {homeLogo && awayLogo && (
          <div className="flex items-center justify-center gap-3 py-2 px-3 bg-slate-800/30 border border-slate-700/30 rounded-xl mb-1 mt-1">
            <div className="flex items-center gap-2">
              <img src={homeLogo} className="w-7 h-7 rounded-full object-cover border border-slate-650 bg-slate-950 shadow-sm" alt="Home" />
              <span className="text-[10px] text-slate-300 font-bold max-w-[70px] truncate">{sportsMeta.home_team}</span>
            </div>
            <span className="text-[9px] text-yellow-500 font-black bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded">VS</span>
            <div className="flex items-center gap-2">
              <img src={awayLogo} className="w-7 h-7 rounded-full object-cover border border-slate-650 bg-slate-950 shadow-sm" alt="Away" />
              <span className="text-[10px] text-slate-300 font-bold max-w-[70px] truncate">{sportsMeta.away_team}</span>
            </div>
          </div>
        )}

        {!homeLogo && eventImage && (
          <div className="w-full h-24 rounded-xl overflow-hidden mt-1 mb-1 border border-slate-800 relative">
            <img src={eventImage} className="w-full h-full object-cover" alt="Banner" />
          </div>
        )}

        <MiniChart market={market} outcomes={outcomes} isBinary={isBinary} />

        <h3 className="text-sm sm:text-base font-semibold text-white mb-1 sm:mb-2 line-clamp-2 group-hover:text-yellow-400 transition-colors leading-snug">
          {market.title}
        </h3>

        {sportsMeta && (
          <div className="flex flex-col gap-1 text-[10px] text-slate-400 mt-1 mb-2 bg-slate-950/20 p-2 rounded-lg border border-slate-800/50">
            <div className="flex justify-between items-center">
              <span>📅 Start:</span>
              <span className="text-slate-300 font-semibold">
                {sportsMeta.event_date ? new Date(sportsMeta.event_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-1.5 sm:gap-2 mt-auto">
          {outcomeButtons}
        </div>
      </div>
    </div>
  );
}
