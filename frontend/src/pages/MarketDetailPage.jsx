import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarket, useMarkets } from '../hooks/useMarkets';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { api } from '../api/client';
import { CATEGORY_COLORS, formatCurrency, formatDate } from '../store/storage';

function PriceChart({ outcomes, priceHistory, totalVolume }) {
  const width = 800;
  const height = 200;
  const padding = 20;

  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Initialize selectedIds when outcomes list changes (e.g. new market loaded or refreshed)
  useEffect(() => {
    if (outcomes && outcomes.length > 0) {
      const outcomesIds = outcomes.map(o => o.id);
      // Check if current selectedIds are all valid in the new outcomes list
      const hasValidSelection = selectedIds.length > 0 && selectedIds.every(id => outcomesIds.includes(id));

      if (!hasValidSelection) {
        const initialSelected = [...outcomes]
          .sort((a, b) => (b.probability || 0) - (a.probability || 0))
          .slice(0, 4)
          .map(o => o.id);
        setSelectedIds(initialSelected);
      }
    }
  }, [outcomes, selectedIds]);

  // Helper to get a stable, distinct color for each outcome
  const getOutcomeColor = (o) => {
    if (outcomes.length === 2) {
      if (o.title?.toLowerCase() === 'yes') return '#22c55e';
      if (o.title?.toLowerCase() === 'no') return '#ef4444';
    }
    const idx = outcomes.findIndex(x => x.id === o.id);
    const colors = [
      '#3b82f6', // blue
      '#f59e0b', // amber
      '#8b5cf6', // purple
      '#06b6d4', // cyan
      '#ec4899', // pink
      '#10b981', // emerald
      '#f43f5e', // rose
      '#84cc16', // lime
      '#a855f7', // purple-bright
      '#6366f1'  // indigo
    ];
    return colors[idx % colors.length] || '#3b82f6';
  };

  // Toggle selection state with max 4 outcomes, maintaining at least 1 outcome displayed
  const handleToggle = (id) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter(x => x !== id));
      }
    } else {
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  // Only chart selected outcomes
  const chartOutcomes = outcomes.filter(o => selectedIds.includes(o.id));

  const dataLength = (priceHistory && priceHistory.length >= 2 && totalVolume > 0)
    ? Math.max(2, priceHistory.length + 1)
    : 2;

  // Use real price history or generate initial flat line if no history exists
  const histories = chartOutcomes.map((o) => {
    let data;

    if (priceHistory && priceHistory.length >= 2 && totalVolume > 0) {
      // Extract price data for this outcome from history
      data = priceHistory.map(snapshot => snapshot.prices[o.id] ?? o.probability ?? 20);

      // Always pin the final point to the current live probability so the
      // chart line ends exactly where the outcome probability badge shows.
      const currentProb = o.probability ?? 20;
      data.push(currentProb);

      // Ensure we have at least 2 points for the chart
      if (data.length < 2) {
        data = [currentProb, currentProb];
      }
    } else {
      // No history yet - show flat line at current price
      const currentProb = o.probability ?? 20;
      data = [currentProb, currentProb];
    }

    return {
      id: o.id,
      title: o.title,
      data: data,
      color: getOutcomeColor(o)
    };
  });

  const allValues = histories.flatMap(h => h.data);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue || 1;

  const getY = (value) => padding + ((maxValue - value) / range) * (height - 2 * padding);
  const getX = (index, total) => padding + (index / (total - 1)) * (width - 2 * padding);

  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    let idx = Math.round(((svgX - padding) / (width - 2 * padding)) * (dataLength - 1));
    idx = Math.max(0, Math.min(idx, dataLength - 1));
    setHoverIdx(idx);
  };

  const handleMouseLeave = () => setHoverIdx(null);

  const hoverX = hoverIdx !== null ? getX(hoverIdx, dataLength) : null;
  const hoverPct = hoverX !== null ? (hoverX / width) * 100 : 0;

  let hoverDate = null;
  if (hoverIdx !== null && priceHistory && priceHistory.length > 0) {
    if (hoverIdx < priceHistory.length) {
      hoverDate = new Date(priceHistory[hoverIdx].timestamp);
    } else {
      hoverDate = new Date();
    }
  }

  return (
    <div className="relative w-full" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <svg ref={svgRef} className="w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          {histories.map((h, idx) => (
            <linearGradient key={h.id} id={`gradient-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: h.color, stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: h.color, stopOpacity: 0 }} />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(ratio => (
          <line
            key={ratio}
            x1={padding}
            y1={padding + ratio * (height - 2 * padding)}
            x2={width - padding}
            y2={padding + ratio * (height - 2 * padding)}
            stroke="#334155"
            strokeWidth="0.5"
            strokeDasharray="4,4"
            opacity="0.3"
          />
        ))}

        {/* Lines for each outcome */}
        {histories.map((h, idx) => {
          const points = h.data.map((value, i) => ({
            x: getX(i, h.data.length),
            y: getY(value)
          }));

          const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          const areaPath = `${linePath} L${points[points.length - 1].x},${height - padding} L${points[0].x},${height - padding} Z`;

          return (
            <g key={h.id}>
              <path d={areaPath} fill={`url(#gradient-${idx})`} />
              <path d={linePath} fill="none" stroke={h.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={h.color} />
              {hoverIdx !== null && (
                <circle cx={points[hoverIdx].x} cy={points[hoverIdx].y} r="5" fill={h.color} stroke="#0f172a" strokeWidth="2" />
              )}
            </g>
          );
        })}

        {hoverX !== null && (
          <line
            x1={hoverX}
            y1={padding}
            x2={hoverX}
            y2={height - padding}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity="0.6"
          />
        )}
      </svg>

      {hoverIdx !== null && (
        <div
          className="absolute pointer-events-none px-3 py-2 bg-slate-800/95 border border-slate-700 rounded-lg text-xs z-10 shadow-xl min-w-[120px]"
          style={{ left: `${Math.min(Math.max(hoverPct, 5), 85)}%`, top: '10%' }}
        >
          {hoverDate && (
            <div className="text-slate-400 mb-1 pb-1 border-b border-slate-700">
              {hoverDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {histories.map(h => (
            <div key={h.id} className="flex justify-between items-center gap-3 my-0.5">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: h.color }}></span><span className="text-slate-300 truncate max-w-[80px]">{h.title}</span></span>
              <span className="text-white font-semibold">{Math.round(h.data[hoverIdx])}¢</span>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Selectors / Legend */}
      <div className="flex flex-wrap gap-2 mt-6 justify-center">
        {outcomes.map((o) => {
          const isSelected = selectedIds.includes(o.id);
          const canSelect = selectedIds.length < 4;
          const disabled = !isSelected && !canSelect;
          const color = getOutcomeColor(o);

          return (
            <button
              key={o.id}
              disabled={disabled}
              onClick={() => handleToggle(o.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${isSelected
                ? 'text-white border-transparent'
                : 'text-slate-400 hover:text-white border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/80'
                } ${disabled
                  ? 'opacity-30 cursor-not-allowed border-slate-800 bg-transparent text-slate-500 hover:text-slate-500'
                  : ''
                }`}
              style={{
                borderColor: isSelected ? color : undefined,
                backgroundColor: isSelected ? `${color}20` : undefined,
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full transition-colors duration-200"
                style={{
                  backgroundColor: isSelected ? color : '#475569',
                }}
              />
              <span className="truncate max-w-[120px]">{o.title}</span>
              <span className={isSelected ? 'text-slate-300 font-medium' : 'text-slate-500 font-normal'}>
                {Math.round(o.probability || 0)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function calcPositionValue(stake, entryProbPct, currentProbPct) {
  const pEntry = entryProbPct / 100;
  const pCurrent = currentProbPct / 100;
  const rMin = stake * pEntry;
  const rMax = stake * (2 - pEntry);

  if (pEntry === 0) return pCurrent > 0 ? rMax : rMin;
  if (pEntry === 1) return pCurrent < 1 ? rMin : rMax;

  if (pCurrent <= pEntry) {
    return rMin + (stake - rMin) * (pCurrent / pEntry);
  } else {
    return stake + (rMax - stake) * ((pCurrent - pEntry) / (1 - pEntry));
  }
}

export default function MarketDetailPage() {
  const { id } = useParams();
  const { market, loading, error } = useMarket(id);
  const { markets } = useMarkets();
  const { session, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [selectedOutcome, setSelectedOutcome] = useState(null);

  const sportsMeta = useMemo(() => {
    if (market?.category === 'sports' && market?.description) {
      try {
        const parsed = JSON.parse(market.description);
        if (parsed.is_sports) return parsed;
      } catch (e) { }
    }
    return null;
  }, [market]);

  // Sort outcomes highest → lowest probability so top picks are always first
  const sortedOutcomes = market?.outcomes
    ? [...market.outcomes].sort((a, b) => (b.probability || 0) - (a.probability || 0))
    : [];
  const winningOutcomeIds = (() => {
    if (!market) return [];
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
  const winningOutcomes = sortedOutcomes.filter(o => winningOutcomeSet.has(o.id));
  const [stake, setStake] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeMsg, setTradeMsg] = useState('');
  const [userPositions, setUserPositions] = useState({});
  const [userAvgEntry, setUserAvgEntry] = useState({}); // weighted avg entry prob per outcome
  const [resolvedPositions, setResolvedPositions] = useState([]);
  const [sellingOutcomeId, setSellingOutcomeId] = useState(null);
  const [sellAmount, setSellAmount] = useState('');
  const [sellLoading, setSellLoading] = useState(false);
  const [sellMsg, setSellMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { balance: buyingPower, loading: buyingPowerLoading, refetch: refetchWallet } = useWallet();

  // Fetch user's positions for this market
  useEffect(() => {
    if (!market?.id) return;

    api.getPredictions(market.id)
      .then(data => {
        const allPredictions = Array.isArray(data) ? data : [];
        const userId = session?.user?.id || 'demo_user';
        const userPredsAll = allPredictions.filter(p => p.user_id === userId);
        const userPreds = userPredsAll.filter(p => p.status === 'active');
        const resolved = userPredsAll.filter(p => ['won', 'lost'].includes(p.status));

        // Group by outcome: sum stakes and track weighted avg entry
        const positions = {};
        const avgEntry = {};
        const weightedSum = {};
        userPreds.forEach(pred => {
          const oid = pred.outcome_id;
          const s = pred.stake_amount || 0;
          positions[oid] = (positions[oid] || 0) + s;
          weightedSum[oid] = (weightedSum[oid] || 0) + (pred.odds_at_prediction || 50) * s;
        });
        Object.keys(positions).forEach(oid => {
          avgEntry[oid] = positions[oid] > 0 ? weightedSum[oid] / positions[oid] : 50;
        });

        setUserPositions(positions);
        setUserAvgEntry(avgEntry);
        setResolvedPositions(resolved);
      })
      .catch(() => { setUserPositions({}); setUserAvgEntry({}); setResolvedPositions([]); });
  }, [market?.id, session]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (error || !market) return <div className="empty-state"><p>Market not found.</p></div>;

  const accentColor = CATEGORY_COLORS[market.category] || '#6366f1';
  const outcomes = sortedOutcomes;   // sorted highest → lowest probability
  const marketType = market.market_type || 'binary';
  const isMultiMultiple = marketType === 'multi_multiple' || marketType === 'multi_single';
  const hasYesNoPairs = outcomes.some(o => o.id.endsWith('_yes'));
  const yesOutcome = outcomes.find(o => o.title?.toLowerCase() === 'yes') || outcomes[0];

  const relatedMarkets = markets?.filter(m => m.id !== market?.id && m.status === 'active' && m.category === market?.category).slice(0, 3) || [];

  // Use a floored value for buying power to avoid floating-point precision mismatch with the input's max attribute
  const safeBuyingPower = buyingPower !== null ? Math.floor(buyingPower * 100) / 100 : null;

  const handleTrade = async (e) => {
    e.preventDefault();
    if (!selectedOutcome || !stake) return;

    const stakeNum = parseFloat(stake);

    // Client-side buying power guard
    if (session?.user?.id && session.user.id !== 'demo_user' && safeBuyingPower !== null && stakeNum > safeBuyingPower) {
      setTradeMsg(`❌ Insufficient buying power. Available: $${safeBuyingPower.toFixed(2)}, Required: $${stakeNum.toFixed(2)}`);
      return;
    }

    setTradeLoading(true); setTradeMsg('');
    try {
      const userId = session?.user?.id || 'demo_user';
      await api.createPrediction({
        market_id: market.id,
        outcome_id: selectedOutcome.id,
        stake_amount: stakeNum,
        odds_at_prediction: selectedOutcome.probability || 50,
        user_id: userId,
      });
      setTradeMsg('✅ Position placed successfully!');
      setStake('');
      // Refresh buying power then reload market data
      if (userId !== 'demo_user') {
        await refetchWallet();
      }
      window.location.reload();
    } catch (err) {
      setTradeMsg(`❌ ${err.message}`);
    } finally {
      setTradeLoading(false);
    }
  };

  const handleSell = async (e, outcomeId) => {
    e.preventDefault();
    e.stopPropagation();
    const sellAmt = parseFloat(sellAmount);
    if (!sellAmt || sellAmt <= 0) return;
    setSellLoading(true); setSellMsg('');
    try {
      const userId = session?.user?.id || 'demo_user';
      const result = await api.sellPosition({
        market_id: market.id,
        outcome_id: outcomeId,
        user_id: userId,
        sell_amount: sellAmt,
      });
      setSellMsg(`✅ Sold $${sellAmt.toFixed(2)} → received $${result.sell_return.toFixed(2)}`);
      await refetchWallet();
      // Refresh positions
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setSellMsg(`❌ ${err.message}`);
    } finally {
      setSellLoading(false);
    }
  };

  // Payout bounds using the Dobium S(1−p) model:
  //   R_max (win)  = S + S×(1−p) = S×(2−p)   ← upper bound
  //   R_min (loss) = S×p              ← lower bound
  const calculatePayoutBounds = (stake, probability) => {
    const p = probability / 100;
    const R_max = stake * (2 - p);    // win upper bound
    const R_min = stake * p;           // loss lower bound
    const winProfit = R_max - stake;   // = S×(1−p)
    return { winProfit, winReturn: R_max, loseRefund: R_min };
  };

  const payout = selectedOutcome && stake
    ? calculatePayoutBounds(parseFloat(stake), selectedOutcome.probability || 50)
    : null;

  const displayDescription = (() => {
    if (!market?.description) return '';
    try {
      const parsed = JSON.parse(market.description);
      if (parsed.is_sports) {
        const dateStr = parsed.event_date ? new Date(parsed.event_date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        const isGame = (parsed.is_sports && (parsed.event_type || 'game') === 'game');
        if (isGame) {
          return `Sports Match: ${parsed.home_team || 'Home'} vs ${parsed.away_team || 'Away'} (${parsed.league || 'General'}). Scheduled for ${dateStr}.`;
        } else {
          const typeLabel = parsed.event_type === 'future' ? 'Future' : 'Award';
          return `Sports ${typeLabel}: ${parsed.event_name || 'Event'} (${parsed.league || 'General'}). Scheduled for ${dateStr}.`;
        }
      }
    } catch (e) {
      // Not JSON
    }
    return market.description;
  })();



  const homeLogo = sportsMeta?.home_logo;
  const awayLogo = sportsMeta?.away_logo;
  const eventImage = sportsMeta?.event_image || (!sportsMeta && market?.image_url);

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <span>←</span>
        <span>Back</span>
      </button>

      {homeLogo && awayLogo && (
        <div className="flex items-center justify-center gap-6 py-6 px-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl mb-6 max-w-xl shadow-2xl">
          <div className="flex flex-col items-center gap-2">
            <img src={homeLogo} className="w-16 h-16 rounded-full object-cover border-2 border-slate-700 bg-slate-950 shadow-lg" alt="Home" />
            <span className="text-sm text-white font-bold">{sportsMeta.home_team}</span>
          </div>
          <span className="text-xs text-yellow-500 font-extrabold bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-lg">VS</span>
          <div className="flex flex-col items-center gap-2">
            <img src={awayLogo} className="w-16 h-16 rounded-full object-cover border-2 border-slate-700 bg-slate-950 shadow-lg" alt="Away" />
            <span className="text-sm text-white font-bold">{sportsMeta.away_team}</span>
          </div>
        </div>
      )}

      {!homeLogo && eventImage && (
        <div className="w-full h-48 sm:h-64 rounded-2xl overflow-hidden mb-6 border border-slate-800 shadow-xl relative">
          <img src={eventImage} className="w-full h-full object-cover" alt="Banner" />
        </div>
      )}

      {sportsMeta && (
        <div className="mb-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl" style={{ textShadow: '0 0 10px rgba(212,175,55,0.3)' }}>
              {sportsMeta.sport === 'basketball' ? '🏀' : sportsMeta.sport === 'soccer' ? '⚽' : sportsMeta.sport === 'football' ? '🏈' : sportsMeta.sport === 'baseball' ? '⚾' : sportsMeta.sport === 'tennis' ? '🎾' : '🏅'}
            </span>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Tournament / League</div>
              <div className="text-sm sm:text-base text-white font-black">{sportsMeta.league || 'General'}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-8 border-t sm:border-t-0 border-slate-800/50 pt-3 sm:pt-0">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">📅 Event Start (Locks Betting)</div>
              <div className="text-xs sm:text-sm text-slate-200 font-semibold mt-0.5">
                {sportsMeta.event_date ? new Date(sportsMeta.event_date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${CATEGORY_COLORS[market.category] || 'from-slate-500 to-slate-600'} text-white`}>
            {market.category}
          </span>
          {sportsMeta && sportsMeta.match_state ? (
            <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded border ${sportsMeta.match_state === 'final' || sportsMeta.match_state === 'full-time' ? 'bg-slate-800 text-slate-300 border-slate-700' :
              sportsMeta.match_state === 'overtime' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                sportsMeta.match_state === 'halftime' || sportsMeta.match_state === 'half-time' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                  sportsMeta.match_state === 'in_progress' || sportsMeta.match_state === 'live' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                    'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
              {(sportsMeta.match_state === 'in_progress' || sportsMeta.match_state === 'live' || sportsMeta.match_state === 'overtime') && (
                <span className="w-1.5 h-1.5 rounded-full inline-block bg-current animate-pulse"></span>
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
            <span className={`flex items-center gap-1.5 text-xs font-medium ${market.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
              <span className={`w-2 h-2 rounded-full ${market.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
              {market.status === 'active' ? 'Open' : 'Resolved'}
            </span>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{market.title}</h1>
        <p className="text-slate-400 text-sm md:text-base">{displayDescription}</p>
        <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
          <span>Volume: ${(market.total_volume || 0).toLocaleString()}</span>
          {!sportsMeta && market.close_date && <span>Closes: {formatDate(market.close_date)}</span>}
          {!sportsMeta && market.resolution_date && <span>Resolved: {formatDate(market.resolution_date)}</span>}
        </div>
      </div>

      {market.status === 'resolved' && (
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow-400 mb-2">Final Resolution</p>
          <div className="flex flex-wrap gap-2">
            {winningOutcomes.length > 0 ? winningOutcomes.map(outcome => (
              <span key={outcome.id} className="inline-flex items-center rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-1 text-sm font-semibold text-green-300">
                {outcome.title}
              </span>
            )) : (
              <span className="text-sm text-slate-300">No winning outcome recorded.</span>
            )}
          </div>
        </div>
      )}

      {/* Price Chart */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Price History</h2>
          <div className="flex gap-2">
            {['1D', '1W', '1M', 'ALL'].map(range => (
              <button
                key={range}
                className="px-3 py-1 text-xs font-medium rounded-lg transition-colors bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <PriceChart
          outcomes={(isMultiMultiple && hasYesNoPairs) ? outcomes.filter(o => o.id.endsWith('_yes')).map(o => ({ ...o, title: o.title.replace(/\s*\(Yes\)$/i, '') })) : outcomes}
          priceHistory={market.price_history}
          totalVolume={market.total_volume}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Outcomes */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Outcomes</h2>
            {outcomes.length >= 10 && (
              <div className="relative w-48 sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input
                  type="text"
                  placeholder="Search outcomes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>
            )}
          </div>
          {(() => {
            const renderOutcome = (o, displayTitleOverride = null) => {
              const displayTitle = displayTitleOverride || o.title;
              const isYes = displayTitle?.toLowerCase() === 'yes' || o.title?.toLowerCase().endsWith('(yes)');
              const isNo = displayTitle?.toLowerCase() === 'no' || o.title?.toLowerCase().endsWith('(no)');
              const isSelected = selectedOutcome?.id === o.id;
              const isWinner = winningOutcomeSet.has(o.id);

              let colorClasses = 'border-slate-700 hover:border-slate-600';
              let textColorClass = 'text-slate-300';
              let barColorClass = 'bg-blue-500';

              if (isYes) {
                colorClasses = isSelected ? 'border-green-500 bg-green-500/5' : 'border-green-500/50 hover:border-green-500';
                textColorClass = 'text-green-400';
                barColorClass = 'bg-green-500';
              } else if (isNo) {
                colorClasses = isSelected ? 'border-red-500 bg-red-500/5' : 'border-red-500/50 hover:border-red-500';
                textColorClass = 'text-red-400';
                barColorClass = 'bg-red-500';
              } else if (isSelected) {
                colorClasses = 'border-yellow-500 bg-yellow-500/5';
                textColorClass = 'text-yellow-400';
                barColorClass = 'bg-yellow-500';
              }
              if (market.status === 'resolved') {
                colorClasses = isWinner ? 'border-green-500 bg-green-500/10' : 'border-slate-800 opacity-70';
                textColorClass = isWinner ? 'text-green-400' : 'text-slate-500';
                barColorClass = isWinner ? 'bg-green-500' : 'bg-slate-700';
              }

              return (
                <div
                  key={o.id}
                  className={`bg-slate-900/50 border ${colorClasses} rounded-xl p-4 transition-all cursor-pointer ${isSelected ? 'ring-2 ring-yellow-500' : ''
                    }`}
                  onClick={() => market.status === 'active' && setSelectedOutcome(o)}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="flex items-center gap-2 text-white font-medium">
                      {displayTitle}
                      {market.status === 'resolved' && isWinner && (
                        <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-green-300">Won</span>
                      )}
                    </span>
                    <span className={`text-2xl font-bold ${textColorClass}`}>
                      {(o.probability || 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full ${barColorClass} transition-all duration-500 ease-out`}
                      style={{ width: `${(o.probability || 0).toFixed(2)}%` }}
                    />
                  </div>
                  {userPositions[o.id] > 0 && (() => {
                    const S = userPositions[o.id];
                    const mtmValue = calcPositionValue(S, userAvgEntry[o.id] || 50, o.probability || 50);
                    const unrealizedPnl = mtmValue - S;
                    return (
                      <div onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-xs font-medium">
                            <span className="text-slate-400">Cost: </span>
                            <span className="text-slate-300">${S.toFixed(2)}</span>
                            {userAvgEntry[o.id] && (
                              <span className="text-slate-500 ml-1">@ {userAvgEntry[o.id].toFixed(1)}%</span>
                            )}
                            <span className="mx-1 text-slate-600">·</span>
                            <span className="text-slate-400">Value: </span>
                            <span className={`font-semibold ${mtmValue < S ? 'text-red-400' : mtmValue > S ? 'text-green-400' : 'text-slate-300'
                              }`}>${mtmValue.toFixed(2)}</span>
                            <span className={`ml-1 text-[10px] ${unrealizedPnl < 0 ? 'text-red-500' : unrealizedPnl > 0 ? 'text-green-500' : 'text-slate-500'
                              }`}>
                              ({unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)})
                            </span>
                          </div>
                          {market.status === 'active' && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (sellingOutcomeId === o.id) {
                                  setSellingOutcomeId(null); setSellAmount(''); setSellMsg('');
                                } else {
                                  setSellingOutcomeId(o.id); setSellAmount(''); setSellMsg('');
                                }
                              }}
                              className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${sellingOutcomeId === o.id
                                ? 'bg-slate-700 text-slate-300'
                                : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                                }`}
                            >
                              {sellingOutcomeId === o.id ? 'Cancel' : 'Sell'}
                            </button>
                          )}
                        </div>

                        {sellingOutcomeId === o.id && (
                          <form
                            onSubmit={e => handleSell(e, o.id)}
                            className="mt-3 pt-3 border-t border-slate-700/50 space-y-2"
                          >
                            <p className="text-slate-500 text-xs">
                              Sell at current price ({(o.probability || 50).toFixed(1)}%)
                              {userAvgEntry[o.id] && (
                                <span className={`ml-1 ${(o.probability || 50) >= userAvgEntry[o.id] ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                  {(o.probability || 50) >= userAvgEntry[o.id] ? '↑' : '↓'} vs entry
                                </span>
                              )}
                            </p>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                                <input
                                  type="number"
                                  min="0.01"
                                  max={userPositions[o.id]}
                                  step="0.01"
                                  value={sellAmount}
                                  onChange={e => setSellAmount(e.target.value)}
                                  placeholder={`Max $${userPositions[o.id].toFixed(2)}`}
                                  className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-7 pr-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setSellAmount(userPositions[o.id].toFixed(2))}
                                className="px-3 py-2 text-xs bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                              >
                                Max
                              </button>
                            </div>

                            {parseFloat(sellAmount) > 0 && (
                              <div className="bg-slate-800/60 rounded-lg p-2.5 space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">You receive:</span>
                                  <span className="text-white font-semibold">
                                    ${(() => {
                                      const sellAmt = parseFloat(sellAmount);
                                      return calcPositionValue(sellAmt, userAvgEntry[o.id] || 50, o.probability || 50).toFixed(2);
                                    })()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Net P&L:</span>
                                  <span className={`font-semibold ${(o.probability || 50) >= (userAvgEntry[o.id] || 50) ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                    {(() => {
                                      const sellAmt = parseFloat(sellAmount);
                                      const returnAmt = calcPositionValue(sellAmt, userAvgEntry[o.id] || 50, o.probability || 50);
                                      const pnl = returnAmt - sellAmt;
                                      return `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
                                    })()}
                                  </span>
                                </div>
                              </div>
                            )}

                            {sellMsg && (
                              <p className={`text-xs ${sellMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                                {sellMsg}
                              </p>
                            )}

                            <button
                              type="submit"
                              disabled={sellLoading || !parseFloat(sellAmount) || parseFloat(sellAmount) > userPositions[o.id]}
                              className="w-full py-2 rounded-lg text-sm font-semibold bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              {sellLoading ? 'Selling...' : `Confirm Sell $${parseFloat(sellAmount) > 0 ? parseFloat(sellAmount).toFixed(2) : '0.00'}`}
                            </button>
                          </form>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            };

            if (isMultiMultiple && hasYesNoPairs) {
              return (
                <div className="space-y-6">
                  {outcomes.filter(o => o.id.endsWith('_yes')).filter(yes => {
                    const baseTitle = yes.title.replace(/\s*\(Yes\)$/i, '');
                    return baseTitle.toLowerCase().includes(searchQuery.toLowerCase());
                  }).map(yes => {
                    const no = outcomes.find(o => o.id === yes.id.replace('_yes', '_no'));
                    if (!yes || !no) return null;
                    const baseTitle = yes.title.replace(/\s*\(Yes\)$/i, '');
                    return (
                      <div key={yes.id} className="bg-slate-900/40 rounded-xl p-4 border border-slate-700/50">
                        <h3 className="text-lg font-semibold text-white mb-3 pl-1">{baseTitle}</h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">{renderOutcome(yes, 'Yes')}</div>
                          <div className="flex-1">{renderOutcome(no, 'No')}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            const filteredOutcomes = outcomes.filter(o => o.title.toLowerCase().includes(searchQuery.toLowerCase()));
            return <div className="space-y-3">{filteredOutcomes.map(o => renderOutcome(o))}</div>;
          })()}
        </div>

        {/* Right Column: Trade Form */}
        {market.status === 'active' && (
          <div className="w-full lg:w-96">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-white mb-4">Place Prediction</h2>

              {!selectedOutcome ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                    </svg>
                  </div>
                  <p className="text-slate-400 text-sm">Select an outcome to place your prediction</p>
                </div>
              ) : (
                <form onSubmit={handleTrade} className="space-y-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-slate-400 text-xs mb-1">Betting on</p>
                    <p className="text-white font-semibold">{selectedOutcome.title}</p>
                    <p className="text-yellow-400 text-sm mt-1">
                      {selectedOutcome.probability ?? 50}% probability
                    </p>
                  </div>

                  {/* Buying Power Display */}
                  {session?.user?.id && session.user.id !== 'demo_user' && (
                    <div className={`flex items-center justify-between rounded-lg px-4 py-3 border ${safeBuyingPower !== null && parseFloat(stake) > safeBuyingPower
                      ? 'bg-red-500/10 border-red-500/40'
                      : 'bg-slate-800/50 border-slate-700'
                      }`}>
                      <span className="text-slate-400 text-xs font-medium">💰 Buying Power</span>
                      <span className={`text-sm font-bold ${buyingPowerLoading ? 'text-slate-500' :
                        buyingPower === null ? 'text-slate-500' :
                          parseFloat(stake) > safeBuyingPower ? 'text-red-400' :
                            'text-green-400'
                        }`}>
                        {buyingPowerLoading ? '...' : safeBuyingPower !== null ? `$${safeBuyingPower.toFixed(2)}` : 'N/A'}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Stake Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        min="0.01"
                        max={safeBuyingPower !== null && session?.user?.id !== 'demo_user' ? safeBuyingPower : undefined}
                        step="0.01"
                        value={stake}
                        onChange={e => setStake(e.target.value)}
                        placeholder="10.00"
                        required
                        className={`w-full bg-slate-800 border rounded-lg px-4 pl-8 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 ${safeBuyingPower !== null && parseFloat(stake) > safeBuyingPower
                          ? 'border-red-500 focus:ring-red-500/50'
                          : 'border-slate-700 focus:ring-yellow-500/50 focus:border-yellow-500'
                          }`}
                      />
                    </div>
                    {safeBuyingPower !== null && session?.user?.id && session.user.id !== 'demo_user' && parseFloat(stake) > safeBuyingPower && (
                      <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                        <span>⚠</span>
                        <span>Exceeds your buying power by ${(parseFloat(stake) - safeBuyingPower).toFixed(2)}</span>
                      </p>
                    )}
                    {safeBuyingPower !== null && session?.user?.id && session.user.id !== 'demo_user' && (
                      <button
                        type="button"
                        onClick={() => setStake(safeBuyingPower.toFixed(2))}
                        className="mt-1.5 text-xs text-yellow-500 hover:text-yellow-400 transition-colors"
                      >
                        Use max (${safeBuyingPower.toFixed(2)})
                      </button>
                    )}
                  </div>

                  {payout && (
                    <div className="space-y-3">
                      {/* Payout Bounds Explanation */}
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                        <p className="text-slate-400 text-xs mb-2 font-semibold">Payout Bounds <span className="text-slate-600 font-normal">(S×(1−p) model)</span></p>
                        <div className="text-xs text-slate-500 space-y-0.5">
                          <p>S = Stake (${parseFloat(stake).toFixed(2)})</p>
                          <p>p = Entry probability ({((selectedOutcome.probability || 50) / 100).toFixed(2)})</p>
                          <p className="mt-1 text-slate-600 font-mono text-[10px]">
                            R<sub>max</sub> = S×(2−p) &nbsp;|  R<sub>min</sub> = S×p
                          </p>
                        </div>
                      </div>

                      {/* Expected Returns */}
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <p className="text-slate-400 text-xs mb-3">Expected Returns</p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-green-400 text-sm">Upper Bound:</span>
                            <span className="text-green-400 text-xl font-bold">${payout.winReturn.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-red-400 text-sm">Lower Bound:</span>
                            <span className="text-red-400 text-xl font-bold">${payout.loseRefund.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {tradeMsg && (
                    <div className={`rounded-lg p-3 text-sm ${tradeMsg.startsWith('✅') ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                      {tradeMsg}
                    </div>
                  )}

                  {!session ? (
                    <button
                      type="button"
                      onClick={openAuthModal}
                      className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-950 font-bold py-3 rounded-xl transition-all"
                    >
                      Sign in to trade
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={tradeLoading || (safeBuyingPower !== null && session?.user?.id && session.user.id !== 'demo_user' && parseFloat(stake) > safeBuyingPower)}
                      className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-slate-700 disabled:to-slate-700 text-slate-950 disabled:text-slate-500 font-bold py-3 rounded-xl transition-all"
                    >
                      {tradeLoading ? 'Placing Prediction...' : 'Place Prediction'}
                    </button>
                  )}

                  {!session && (
                    <p className="text-slate-500 text-xs text-center">You'll be asked to log in</p>
                  )}
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div >
  );
}
