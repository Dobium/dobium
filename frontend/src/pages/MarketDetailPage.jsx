import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarket, useMarkets } from '../hooks/useMarkets';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { api } from '../api/client';
import CommentsSection from '../components/CommentsSection';
import { CATEGORY_COLORS, formatCurrency, formatDate } from '../store/storage';

export function getOutcomeColor(o, outcomes) {
  if (!outcomes || outcomes.length === 0) return '#3b82f6';
  if (outcomes.length === 2) {
    const t = o && o.title ? o.title.toLowerCase() : '';
    if (t === 'yes') return '#22c55e';
    if (t === 'no') return '#ef4444';
  }
  const idx = outcomes.findIndex(function (x) { return x.id === o.id; });
  const colors = [
    '#3b82f6',
    '#f59e0b',
    '#8b5cf6',
    '#06b6d4',
    '#ec4899',
    '#10b981',
    '#f43f5e',
    '#84cc16',
    '#a855f7',
    '#6366f1'
  ];
  return colors[idx % colors.length] || '#3b82f6';
}

function PriceChart({ outcomes, priceHistory, totalVolume, selectedIds }) {
  const width = 800;
  const height = 300;
  const padding = 20;
  const rightGutter = 34; // room for the 0/25/50/75/100% axis labels

  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);






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
      color: getOutcomeColor(o, outcomes)
    };
  });

  const allValues = histories.flatMap(h => h.data);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue || 1;

  const getY = (value) => padding + ((maxValue - value) / range) * (height - 2 * padding);
  const getX = (index, total) => padding + (index / (total - 1)) * (width - 2 * padding - rightGutter);

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
            x2={width - padding - rightGutter}
            y2={padding + ratio * (height - 2 * padding)}
            stroke="#334155"
            strokeWidth="0.5"
            strokeDasharray="4,4"
            opacity="0.3"
          />
        ))}

        {/* Y-axis percentage labels (right side) */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const value = Math.round(maxValue - ratio * range);
          return (
            <text
              key={ratio}
              x={width - padding - rightGutter + 6}
              y={padding + ratio * (height - 2 * padding)}
              dominantBaseline="middle"
              fontSize="10"
              fill="#64748b"
              fontFamily="var(--mono, monospace)"
            >
              {value}%
            </text>
          );
        })}

        {/* X-axis date labels (bottom) */}
        {priceHistory && priceHistory.length >= 2 && (() => {
          const tickCount = Math.min(5, priceHistory.length);
          const step = (priceHistory.length - 1) / (tickCount - 1);
          return Array.from({ length: tickCount }, (_, i) => {
            const idx = Math.round(i * step);
            const snap = priceHistory[idx];
            if (!snap) return null;
            const x = getX(idx, dataLength);
            const label = new Date(snap.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <text
                key={i}
                x={x}
                y={height - 4}
                textAnchor={i === 0 ? 'start' : i === tickCount - 1 ? 'end' : 'middle'}
                fontSize="10"
                fill="#64748b"
              >
                {label}
              </text>
            );
          });
        })()}

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

      {/* Legend Keys */}
      {selectedIds.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-5">
          {outcomes.filter(o => selectedIds.includes(o.id)).map(o => {
            const color = getOutcomeColor(o, outcomes);
            return (
              <div key={o.id} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm border border-slate-700" style={{ backgroundColor: color }}></span>
                <span className="text-xs text-slate-300 font-medium">{o.title}</span>
                <span className="text-xs font-bold" style={{ color }}>{Math.round(o.probability || 0)}%</span>
              </div>
            );
          })}
        </div>
      )}

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

  const isOutcomeResolved = (outcomeId) => {
    if (winningOutcomeSet.has(outcomeId)) return true;
    if (outcomeId.endsWith('_yes') && winningOutcomeSet.has(outcomeId.replace('_yes', '_no'))) return true;
    if (outcomeId.endsWith('_no') && winningOutcomeSet.has(outcomeId.replace('_no', '_yes'))) return true;
    return false;
  };
  const isPartiallyResolved = market?.status === 'active' && winningOutcomeIds.length > 0;
  const [stake, setStake] = useState('');
  const [panelTab, setPanelTab] = useState('buy');
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

  const [selectedIds, setSelectedIds] = useState([]);
  const [isChartDropdownOpen, setIsChartDropdownOpen] = useState(false);
  const [positionSlideIdx, setPositionSlideIdx] = useState(0);
  const chartDropdownRef = useRef(null);

  // Recent Activity — the latest trades on this market, newest first.
  const [recentTrades, setRecentTrades] = useState([]);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.getPredictions(id)
      .then(data => {
        if (cancelled) return;
        const preds = Array.isArray(data) ? data : (data?.predictions || []);
        const rows = [...preds]
          .sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0))
          .slice(0, 8);
        setRecentTrades(rows);
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [id, market?.total_volume]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chartDropdownRef.current && !chartDropdownRef.current.contains(event.target)) {
        setIsChartDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const localOutcomes = market?.outcomes
      ? [...market.outcomes].sort((a, b) => (b.probability || 0) - (a.probability || 0))
      : [];

    if (localOutcomes && localOutcomes.length > 0 && selectedIds.length === 0) {
      const marketType = market?.market_type || 'binary';
      const isMultiMultiple = marketType === 'multi_multiple' || marketType === 'multi_single';
      const hasYesNoPairs = localOutcomes.some(o => o.id?.endsWith('_yes'));
      const chartOutcomes = (isMultiMultiple && hasYesNoPairs) ? localOutcomes.filter(o => o.id?.endsWith('_yes')) : localOutcomes;
      // Binary Yes/No markets: default to just the leading side (one clean line, not a mirrored pair).
      // Multi-candidate markets: show up to 3 leaders.
      const defaultCount = chartOutcomes.length <= 2 ? 1 : 3;
      const top2 = [...chartOutcomes].sort((a, b) => (b.probability || 0) - (a.probability || 0)).slice(0, defaultCount).map(o => o.id);
      setSelectedIds(top2);
    }
  }, [market, selectedIds.length]);

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
  const chartOutcomes = (isMultiMultiple && hasYesNoPairs) ? outcomes.filter(o => o.id.endsWith('_yes')).map(o => ({ ...o, title: o.title.replace(/\s*\(Yes\)$/i, '') })) : outcomes;
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 lg:h-[100dvh] flex flex-col lg:overflow-hidden">
      {/* Header: back button + category badges + market title */}
      <div className="shrink-0 pb-4 pt-1 mb-2">
        <button
          onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-2 transition-colors"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
        >
          <span>←</span>
          <span>Back</span>
        </button>
        {market && (
          <div className="flex items-center gap-2 mb-3">
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6,
              textTransform: 'capitalize', color: 'var(--text)',
              background: 'var(--card-hover)', border: '1px solid var(--line)',
              borderRadius: 4, padding: '3px 9px',
            }}>
              {market.category}
            </span>
            {market.category !== 'entertainment' && ['awards', 'music', 'streaming'].includes(market.category) && (
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6,
                textTransform: 'capitalize', color: 'var(--muted)',
                background: 'var(--panel)', border: '1px solid var(--line)',
                borderRadius: 4, padding: '3px 9px',
              }}>
                Entertainment
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {market && (
            <h1 style={{
              fontFamily: 'var(--wordmark)', fontWeight: 400,
              fontSize: 'clamp(22px,3vw,30px)', lineHeight: 1.25,
              color: 'var(--text)', margin: 0,
            }}>
              {market.title}
            </h1>
          )}
          {market && (
            <div className="hidden sm:flex items-center gap-3 shrink-0">
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
                <span className={`flex items-center gap-1.5 text-xs font-medium ${market.status === 'resolved' ? 'text-yellow-400' : 'text-green-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${market.status === 'resolved' ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                  {market.status === 'resolved' ? 'Resolved' : 'Open'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:items-start relative flex-1 min-h-0">
        {/* Left Column: Info, Price Chart & Controls */}
        <div className="flex-1 min-w-0 space-y-6 z-10 lg:h-full lg:overflow-y-auto lg:pr-2 custom-scrollbar">
          {homeLogo && awayLogo && (
            <div className="flex items-center justify-center gap-6 py-6 px-8 bg-slate-900/50  border border-slate-800 rounded-2xl max-w-xl shadow-2xl">
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
            <div className="w-full h-48 sm:h-64 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative">
              <img src={eventImage} className="w-full h-full object-cover" alt="Banner" />
            </div>
          )}

          {sportsMeta && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
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

          {/* Header Section – description */}
          <div>
            {market && (
              <div className="flex sm:hidden items-center gap-3 mb-3">
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6,
                  textTransform: 'capitalize', color: 'var(--text)',
                  background: 'var(--card-hover)', border: '1px solid var(--line)',
                  borderRadius: 4, padding: '3px 9px',
                }}>
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
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${market.status === 'resolved' ? 'text-yellow-400' : 'text-green-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${market.status === 'resolved' ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                    {market.status === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                )}
              </div>
            )}
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, maxWidth: 640 }}>{displayDescription}</p>
          </div>

          {market.status === 'resolved' && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
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
          <div className="dbm-panel p-6 mb-6" style={{ background: 'var(--panel)' }}>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              {(() => {
                const lead = sortedOutcomes[0];
                const leadPct = Math.round(lead?.probability || 0);
                const leadTitle = (lead?.title || '').replace(/\s*\(Yes\)$/i, '');
                const vol = market.total_volume || 0;
                const volLabel = vol >= 1000000 ? `$${(vol / 1000000).toFixed(1)}M`
                  : vol >= 1000 ? `$${(vol / 1000).toFixed(1)}K`
                    : `$${vol.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
                return (
                  <div className="flex items-baseline gap-3">
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 17, color: 'var(--yes)' }}>
                      {leadPct}% {leadTitle}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)' }}>
                      Vol: {volLabel}
                    </span>
                  </div>
                );
              })()}
              <div className="flex gap-1" style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, padding: 3 }}>
                {['1D', '1W', '1M', 'ALL'].map(range => (
                  <button key={range} className={`dbm-range-tab ${range === '1M' ? 'active' : ''}`}>
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <PriceChart selectedIds={selectedIds}
              outcomes={chartOutcomes}
              priceHistory={market.price_history}
              totalVolume={market.total_volume}
            />
            <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-5 border-t border-slate-800/60 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Volume: ${(market.total_volume || 0).toLocaleString()}
              </span>
              {market.close_date && (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Closes: {formatDate(market.close_date)}
                </span>
              )}
            </div>
          </div>
          {/* Controls: Dropdown & Timeline */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 ">
            <div className="relative" ref={chartDropdownRef}>
              <button
                onClick={() => setIsChartDropdownOpen(!isChartDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-200 font-medium transition-colors"
              >
                <span>Select Outcomes</span>
                <svg className={`w-4 h-4 transition-transform ${isChartDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>

              {isChartDropdownOpen && (
                <div className="absolute bottom-full mb-2 left-0 w-72 max-h-[16rem] overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 p-2 custom-scrollbar">
                  {chartOutcomes.map((o) => {
                    const isSelected = selectedIds.includes(o.id);
                    const canSelect = selectedIds.length < 4;
                    const disabled = !isSelected && !canSelect;
                    const color = getOutcomeColor(o, chartOutcomes);

                    return (
                      <div
                        key={o.id}
                        onClick={() => !disabled && handleToggle(o.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-700/70'}`}
                      >
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${isSelected ? 'border-transparent' : 'border-slate-500'}`} style={{ backgroundColor: isSelected ? color : 'transparent' }}>
                          {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                        </div>
                        <span className={`flex-1 truncate text-sm ${isSelected ? 'text-white font-medium' : 'text-slate-300'}`}>{o.title}</span>
                        <span className="text-xs font-bold" style={{ color: isSelected ? color : '#64748b' }}>{Math.round(o.probability || 0)}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="dbm-panel p-6" style={{ background: 'var(--panel)' }}>
            <h2 style={{ fontWeight: 700, fontSize: 15.5, color: 'var(--text)', margin: '0 0 16px' }}>Recent Activity</h2>
            {recentTrades.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>No trades yet — be the first to take a position.</p>
            ) : (
              <div>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
                  fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: 0.8,
                  textTransform: 'uppercase', color: 'var(--muted)',
                  paddingBottom: 10, borderBottom: '1px solid var(--line)',
                }}>
                  <span>Action</span><span>Contracts</span><span>Price</span><span style={{ textAlign: 'right' }}>Time</span>
                </div>
                {recentTrades.map((t, i) => {
                  const o = (market.outcomes || []).find(x => x.id === t.outcome_id);
                  const rawTitle = (o?.title || '').replace(/\s*\((Yes|No)\)$/i, '');
                  const isNoSide = /(^|_)no$/i.test(t.outcome_id || '') || (o?.title || '').toLowerCase() === 'no';
                  const sideLabel = (o?.title || '').toLowerCase() === 'yes' || /_yes$/i.test(t.outcome_id || '') ? 'Yes'
                    : isNoSide ? 'No' : rawTitle || '—';
                  const price = Math.round(t.odds_at_prediction || 0);
                  const contracts = price > 0 ? Math.round((t.stake_amount || 0) / (price / 100)) : 0;
                  const ts = new Date(t.created_at || t.createdAt || Date.now());
                  const mins = Math.max(0, Math.round((Date.now() - ts.getTime()) / 60000));
                  const timeLabel = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago`
                    : mins < 1440 ? `${Math.round(mins / 60)}h ago` : `${Math.round(mins / 1440)}d ago`;
                  return (
                    <div key={t.id || i} style={{
                      display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
                      alignItems: 'center', padding: '11px 0',
                      borderBottom: i < recentTrades.length - 1 ? '1px solid rgba(37,44,68,.5)' : 'none',
                      fontSize: 13,
                    }}>
                      <span style={{ fontWeight: 600, color: isNoSide ? 'var(--no)' : 'var(--yes)' }}>
                        Buy {sideLabel}
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{contracts.toLocaleString('en-US')}</span>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{price}¢</span>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', textAlign: 'right' }}>{timeLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* User Positions Carousel */}
          {(() => {
            const activePos = Object.keys(userPositions)
              .filter(oid => userPositions[oid] > 0)
              .map(oid => {
                const o = outcomes.find(x => x.id === oid);
                return o ? { ...o, stake: userPositions[oid], avgEntry: userAvgEntry[oid] } : null;
              })
              .filter(Boolean);

            if (activePos.length === 0) return null;

            const maxIdx = Math.max(0, activePos.length - 3);
            const currentIdx = Math.min(positionSlideIdx, maxIdx);
            const visibleCards = activePos.slice(currentIdx, currentIdx + 3);

            return (
              <div className="mt-6 border border-slate-800/80 bg-slate-900/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                    Your Positions ({activePos.length})
                  </h3>
                  {activePos.length > 3 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPositionSlideIdx(Math.max(0, currentIdx - 1))}
                        disabled={currentIdx === 0}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                      </button>
                      <button
                        onClick={() => setPositionSlideIdx(Math.min(maxIdx, currentIdx + 1))}
                        disabled={currentIdx === maxIdx}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 overflow-hidden">
                  {activePos.map(o => (
                    <div 
                      key={o.id} 
                      className="shrink-0 bg-slate-800/60 border border-slate-700/60 p-3 rounded-lg flex flex-col justify-between transition-transform duration-300 ease-in-out" 
                      style={{ 
                        width: activePos.length >= 3 ? 'calc(33.3333% - 8px)' : 'auto',
                        transform: `translateX(calc(-${currentIdx * 100}% - ${currentIdx * 12}px))`
                      }}
                    >
                      <div className="text-xs text-slate-300 font-medium truncate mb-2" title={o.title}>{o.title}</div>
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-[9px] text-slate-500 uppercase font-bold">Pos</div>
                          <div className="text-sm text-white font-bold">${o.stake.toFixed(2)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] text-slate-500 uppercase font-bold">Avg Entry</div>
                          <div className="text-sm text-yellow-500 font-bold">{Math.round(o.avgEntry)}&cent;</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {market && <CommentsSection marketId={market.id} />}
        </div>

        {/* Right Column: Outcomes — scrolls independently */}
        <div className="w-full lg:w-[450px] lg:h-full lg:overflow-y-auto lg:pr-1 custom-scrollbar">
          {market && (() => {
            const panelBinary = outcomes.length === 2;
            const sel = selectedOutcome;
            const marketClosed = market.status !== 'active' || (market.close_date && new Date(market.close_date) < new Date());
            const selPos = sel ? (userPositions[sel.id] || 0) : 0;
            const priceOf = (o) => Math.round(o?.probability || 0);
            return (
              <div className="mb-5 dbm-panel p-4" style={{ background: 'var(--panel)' }}>
                {/* Buy / Sell segmented tabs */}
                <div className="flex mb-4" style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, padding: 3 }}>
                  {['buy', 'sell'].map(t => (
                    <button key={t} onClick={() => setPanelTab(t)}
                      className="flex-1 py-2 text-sm font-bold capitalize transition-all"
                      style={{
                        borderRadius: 4, border: 'none', cursor: 'pointer',
                        background: panelTab === t ? 'var(--card-hover)' : 'transparent',
                        color: panelTab === t ? 'var(--text)' : 'var(--muted)',
                      }}>
                      {t}
                    </button>
                  ))}
                </div>

                {marketClosed && (
                  <div className="mb-3 rounded-md px-3 py-2 text-xs" style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--muted)' }}>
                    This market has closed and is awaiting resolution — trading is disabled.
                  </div>
                )}

                {/* Pick side */}
                {panelBinary ? (
                  <div className="flex gap-2 mb-4">
                    {outcomes.map((o) => {
                      const yes = (o.title || '').toLowerCase().startsWith('yes');
                      const active = sel?.id === o.id;
                      return (
                        <button key={o.id} disabled={marketClosed}
                          onClick={() => setSelectedOutcome(active ? null : o)}
                          className="flex-1 py-3 px-3 rounded-md text-left transition-all disabled:opacity-40"
                          style={yes
                            ? { border: `1.5px solid ${active ? 'var(--yes)' : 'var(--line)'}`, background: active ? 'var(--yes-dim)' : 'transparent' }
                            : { border: `1.5px solid ${active ? 'var(--no)' : 'var(--line)'}`, background: active ? 'var(--no-dim)' : 'transparent' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: yes ? 'var(--yes)' : 'var(--no)' }}>{o.title}</div>
                          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 19, color: yes ? 'var(--yes)' : 'var(--no)', marginTop: 2 }}>{priceOf(o)}¢</div>
                        </button>
                      );
                    })}
                  </div>
                ) : sel ? (
                  <div className="mb-4 flex items-center justify-between rounded-md px-3 py-2.5" style={{ border: '1px solid var(--gold)', background: 'var(--gold-dim)' }}>
                    <span className="text-sm font-semibold truncate pr-2" style={{ color: 'var(--text)' }}>{sel.title}</span>
                    <span className="text-sm font-bold shrink-0" style={{ fontFamily: 'var(--mono)', color: 'var(--gold)' }}>{priceOf(sel)}¢</span>
                  </div>
                ) : (
                  <div className="mb-4 rounded-md px-3 py-2.5 text-xs" style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--muted)' }}>
                    Tap an outcome below to pick a side.
                  </div>
                )}

                {panelTab === 'buy' ? (
                  <form onSubmit={handleTrade} className="space-y-3">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Investment Amount</label>
                      {safeBuyingPower !== null && session?.user?.id && session.user.id !== 'demo_user' && (
                        <span className="text-xs" style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                          Balance: <button type="button" onClick={() => setStake(safeBuyingPower.toFixed(2))} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--mono)', color: 'var(--text)' }}>${safeBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</button>
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>$</span>
                        <input type="number" min="0.01" step="0.01" value={stake} disabled={marketClosed}
                          onChange={e => setStake(e.target.value)} placeholder="100" required
                          className="w-full rounded-md pl-7 pr-3 py-2.5 text-sm focus:outline-none disabled:opacity-40"
                          style={{ fontFamily: 'var(--mono)', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)' }} />
                      </div>
                    </div>
                    {sel && parseFloat(stake) > 0 && (() => {
                      const b = calculatePayoutBounds(parseFloat(stake), sel.probability || 50);
                      const S = parseFloat(stake) || 0;
                      const estShares = (sel.probability || 50) > 0 ? S / ((sel.probability || 50) / 100) : 0;
                      const maxProfit = b.winReturn - S;
                      const maxProfitPct = S > 0 ? (maxProfit / S) * 100 : 0;
                      return (
                        <div className="rounded-md p-3" style={{ background: 'var(--bg)', border: '1px solid var(--line)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                          <div className="flex justify-between py-0.5"><span style={{ color: 'var(--muted)' }}>Est. Shares</span><span style={{ color: 'var(--text)', fontWeight: 600 }}>{estShares.toFixed(1)}</span></div>
                          <div className="flex justify-between py-0.5"><span style={{ color: 'var(--muted)' }}>Potential Payout</span><span style={{ color: 'var(--text)', fontWeight: 600 }}>${b.winReturn.toFixed(2)}</span></div>
                          <div className="flex justify-between py-0.5"><span style={{ color: 'var(--muted)' }}>Max Profit</span><span style={{ color: 'var(--yes)', fontWeight: 600 }}>+${maxProfit.toFixed(2)} ({maxProfitPct.toFixed(1)}%)</span></div>
                          <div className="flex justify-between pt-2 mt-1.5" style={{ borderTop: '1px solid var(--line)' }}><span style={{ color: 'var(--muted)' }}>Total Cost</span><span style={{ color: 'var(--text)', fontWeight: 600 }}>${S.toFixed(2)}</span></div>
                        </div>
                      );
                    })()}
                    {tradeMsg && <p className="text-xs" style={{ color: tradeMsg.startsWith('✅') ? 'var(--yes)' : 'var(--no)' }}>{tradeMsg}</p>}
                    <button type="submit" disabled={marketClosed || tradeLoading || !sel || !parseFloat(stake)}
                      className="w-full py-3 rounded-md text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: 'var(--gold)', color: '#1a1405', border: 'none', boxShadow: '0 4px 16px rgba(232,196,104,.2)' }}>
                      {tradeLoading ? 'Placing...' : 'Place Trade'}
                    </button>
                    <p className="text-center" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                      By trading, you agree to the Terms of Service.
                    </p>
                  </form>
                ) : (
                  <div className="space-y-3">
                    {!sel ? (
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>Pick the side you hold to sell it.</p>
                    ) : selPos <= 0 ? (
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>You have no position on {sel.title} to sell.</p>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>$</span>
                            <input type="number" min="0.01" max={selPos} step="0.01" value={sellAmount}
                              onChange={e => setSellAmount(e.target.value)} placeholder={`Max $${selPos.toFixed(2)}`}
                              className="w-full rounded-md pl-7 pr-3 py-2.5 text-sm focus:outline-none"
                              style={{ fontFamily: 'var(--mono)', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)' }} />
                          </div>
                          <button type="button" onClick={() => setSellAmount(selPos.toFixed(2))}
                            className="px-3 rounded-md text-xs font-semibold transition-colors"
                            style={{ background: 'var(--card-hover)', border: '1px solid var(--line)', color: 'var(--text)' }}>Max</button>
                        </div>
                        {parseFloat(sellAmount) > 0 && (
                          <div className="rounded-md p-3 text-xs" style={{ background: 'var(--bg)', border: '1px solid var(--line)', fontFamily: 'var(--mono)' }}>
                            <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>You receive</span><span style={{ color: 'var(--text)', fontWeight: 600 }}>${calcPositionValue(parseFloat(sellAmount), userAvgEntry[sel.id] || 50, sel.probability || 50).toFixed(2)}</span></div>
                          </div>
                        )}
                        {sellMsg && <p className="text-xs" style={{ color: sellMsg.startsWith('✅') ? 'var(--yes)' : 'var(--no)' }}>{sellMsg}</p>}
                        <button onClick={(e) => handleSell(e, sel.id)} disabled={sellLoading || !parseFloat(sellAmount) || parseFloat(sellAmount) > selPos}
                          className="w-full py-3 rounded-md text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: 'var(--no-dim)', border: '1px solid var(--no)', color: 'var(--no)' }}>
                          {sellLoading ? 'Selling...' : 'Confirm Sell'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontFamily: 'var(--wordmark)', fontWeight: 400, fontSize: 21, color: 'var(--text)', margin: 0 }}>Outcomes</h2>
            {outcomes.length >= 10 && (
              <div className="relative w-48 sm:w-64">
                <span className="material-symbols-outlined absolute inset-y-0 left-3 flex items-center pointer-events-none" style={{ fontSize: 16, color: 'var(--muted)', top: '50%', transform: 'translateY(-50%)' }}>search</span>
                <input
                  type="text"
                  placeholder="Search outcomes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-md text-sm focus:outline-none"
                  style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text)' }}
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
              const isResolvedOutcome = isOutcomeResolved(o.id) || market.status === 'resolved';

              const userResolvedPreds = resolvedPositions.filter(p => p.outcome_id === o.id);
              let userWinStatus = null;
              if (userResolvedPreds.length > 0) {
                userWinStatus = userResolvedPreds.some(p => p.status === 'won') ? 'won' : 'lost';
              }

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
              if (isResolvedOutcome) {
                colorClasses = isWinner ? 'border-green-500 bg-green-500/10' : 'border-slate-800 opacity-70';
                textColorClass = isWinner ? 'text-green-400' : 'text-slate-500';
                barColorClass = isWinner ? 'bg-green-500' : 'bg-slate-700';
              }

              let imageUrl = o.image_url;
              if (!imageUrl && sportsMeta) {
                if (sportsMeta.home_team && displayTitle.includes(sportsMeta.home_team)) imageUrl = sportsMeta.home_logo;
                else if (sportsMeta.away_team && displayTitle.includes(sportsMeta.away_team)) imageUrl = sportsMeta.away_logo;
              }

              return (
                <div key={o.id}>
                  {/* Outcome row – Polymarket-style */}
                  <div
                    className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border transition-all cursor-pointer
                      ${isResolvedOutcome
                        ? isWinner ? 'border-green-500/40 bg-green-500/5' : 'border-slate-800 opacity-60'
                        : 'border-slate-700/60 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-800/40'}`}
                    onClick={() => market.status === 'active' && !isResolvedOutcome && setSelectedOutcome(isSelected ? null : o)}
                  >
                    {/* Left: title + badges */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {imageUrl && (
                        <img src={imageUrl} alt={displayTitle} className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-700/50 bg-slate-900" />
                      )}
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="font-medium text-white truncate">{displayTitle}</span>
                        {isResolvedOutcome && isWinner && <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-green-300 shrink-0">Won</span>}
                        {isResolvedOutcome && !isWinner && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500 shrink-0">Lost</span>}
                        {userWinStatus === 'won' && <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-green-300 shrink-0">You Won</span>}
                        {userWinStatus === 'lost' && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-red-300 shrink-0">You Lost</span>}
                      </div>
                    </div>

                    {/* Middle: probability + change */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-white font-bold text-base">{Math.round(o.probability || 0)}%</span>
                    </div>

                    {/* Right: Yes / No pill buttons */}
                    {!isResolvedOutcome && market.status === 'active' && (
                      <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        {isYes || (!isYes && !isNo) ? (
                          <button
                            className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all
                              ${isSelected
                                ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20'
                                : 'border-green-500/60 text-green-400 hover:bg-green-500/10'}`}
                            onClick={() => setSelectedOutcome(isSelected ? null : o)}
                          >
                            Yes {Math.round(o.probability || 0)}¢
                          </button>
                        ) : null}
                        {isNo && (
                          <button
                            className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all
                              ${isSelected
                                ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20'
                                : 'border-red-500/60 text-red-400 hover:bg-red-500/10'}`}
                            onClick={() => setSelectedOutcome(isSelected ? null : o)}
                          >
                            No {Math.round(o.probability || 0)}¢
                          </button>
                        )}
                      </div>
                    )}

                    {/* Sell button for positions */}
                    {userPositions[o.id] > 0 && market.status === 'active' && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (sellingOutcomeId === o.id) {
                            setSellingOutcomeId(null); setSellAmount(''); setSellMsg('');
                          } else {
                            setSellingOutcomeId(o.id); setSellAmount(''); setSellMsg('');
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-xs font-semibold transition-all shrink-0 ${sellingOutcomeId === o.id
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                          }`}
                      >
                        {sellingOutcomeId === o.id ? 'Cancel' : 'Sell'}
                      </button>
                    )}
                  </div>

                  {/* Position info */}
                  {userPositions[o.id] > 0 && (() => {
                    const S = userPositions[o.id];
                    const mtmValue = calcPositionValue(S, userAvgEntry[o.id] || 50, o.probability || 50);
                    const unrealizedPnl = mtmValue - S;
                    return (
                      <div className="px-4 py-2 text-xs flex items-center gap-3 text-slate-400">
                        <span>Cost: <span className="text-slate-300">${S.toFixed(2)}</span>{userAvgEntry[o.id] && <span className="text-slate-500 ml-1">@ {userAvgEntry[o.id].toFixed(1)}%</span>}</span>
                        <span>·</span>
                        <span>Value: <span className={`font-semibold ${mtmValue < S ? 'text-red-400' : mtmValue > S ? 'text-green-400' : 'text-slate-300'}`}>${mtmValue.toFixed(2)}</span></span>
                        <span className={`text-[10px] ${unrealizedPnl < 0 ? 'text-red-500' : unrealizedPnl > 0 ? 'text-green-500' : 'text-slate-500'}`}>({unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)})</span>
                      </div>
                    );
                  })()}

                  {/* Sell form */}
                  {sellingOutcomeId === o.id && (
                    <form
                      onSubmit={e => handleSell(e, o.id)}
                      className="mx-4 mb-3 mt-1 pt-3 border-t border-slate-700/50 space-y-2"
                    >
                      <p className="text-slate-500 text-xs">
                        Sell at current price ({(o.probability || 50).toFixed(1)}%)
                        {userAvgEntry[o.id] && (
                          <span className={`ml-1 ${(o.probability || 50) >= userAvgEntry[o.id] ? 'text-green-400' : 'text-red-400'}`}>
                            {(o.probability || 50) >= userAvgEntry[o.id] ? '↑' : '↓'} vs entry
                          </span>
                        )}
                      </p>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                          <input
                            type="number" min="0.01" max={userPositions[o.id]} step="0.01"
                            value={sellAmount} onChange={e => setSellAmount(e.target.value)}
                            placeholder={`Max $${userPositions[o.id].toFixed(2)}`}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-7 pr-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500"
                          />
                        </div>
                        <button type="button" onClick={() => setSellAmount(userPositions[o.id].toFixed(2))}
                          className="px-3 py-2 text-xs bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-colors">Max</button>
                      </div>
                      {parseFloat(sellAmount) > 0 && (
                        <div className="bg-slate-800/60 rounded-lg p-2.5 space-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-slate-400">You receive:</span><span className="text-white font-semibold">${calcPositionValue(parseFloat(sellAmount), userAvgEntry[o.id] || 50, o.probability || 50).toFixed(2)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Net P&L:</span><span className={`font-semibold ${(o.probability || 50) >= (userAvgEntry[o.id] || 50) ? 'text-green-400' : 'text-red-400'}`}>{(() => { const r = calcPositionValue(parseFloat(sellAmount), userAvgEntry[o.id] || 50, o.probability || 50); const p = r - parseFloat(sellAmount); return `${p >= 0 ? '+' : ''}$${p.toFixed(2)}`; })()}</span></div>
                        </div>
                      )}
                      {sellMsg && <p className={`text-xs ${sellMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{sellMsg}</p>}
                      <button type="submit" disabled={sellLoading || !parseFloat(sellAmount) || parseFloat(sellAmount) > userPositions[o.id]}
                        className="w-full py-2 rounded-lg text-sm font-semibold bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                        {sellLoading ? 'Selling...' : `Confirm Sell $${parseFloat(sellAmount) > 0 ? parseFloat(sellAmount).toFixed(2) : '0.00'}`}
                      </button>
                    </form>
                  )}

                  {/* Inline Place Prediction */}
                  {false && isSelected && market.status === 'active' && !isResolvedOutcome && (
                    <div className="mx-4 mb-3 mt-2 pt-3 border-t border-slate-700/50" onClick={e => e.stopPropagation()}>
                      <h3 className="text-sm font-bold text-white mb-3">Place Prediction</h3>
                      <form onSubmit={handleTrade} className="space-y-4">
                        {session?.user?.id && session.user.id !== 'demo_user' && (
                          <div className={`flex items-center justify-between rounded-lg px-3 py-2 border ${safeBuyingPower !== null && parseFloat(stake) > safeBuyingPower ? 'bg-red-500/10 border-red-500/40' : 'bg-slate-800/50 border-slate-700'}`}>
                            <span className="text-slate-400 text-xs font-medium">💰 Buying Power</span>
                            <span className={`text-sm font-bold ${buyingPowerLoading ? 'text-slate-500' : buyingPower === null ? 'text-slate-500' : parseFloat(stake) > safeBuyingPower ? 'text-red-400' : 'text-green-400'}`}>
                              {buyingPowerLoading ? '...' : safeBuyingPower !== null ? `$${safeBuyingPower.toFixed(2)}` : 'N/A'}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-slate-300 text-xs font-medium">Stake Amount</label>
                            {safeBuyingPower !== null && session?.user?.id && session.user.id !== 'demo_user' && (
                              <button type="button" onClick={() => setStake(safeBuyingPower.toFixed(2))} className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors">Max</button>
                            )}
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                            <input type="number" min="0.01" max={safeBuyingPower !== null && session?.user?.id !== 'demo_user' ? safeBuyingPower : undefined}
                              step="0.01" value={stake} onChange={e => setStake(e.target.value)} placeholder="10.00" required
                              className={`w-full bg-slate-900 border rounded-lg px-4 pl-7 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 ${safeBuyingPower !== null && parseFloat(stake) > safeBuyingPower ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-600 focus:ring-yellow-500/50 focus:border-yellow-500'}`}
                            />
                          </div>
                          {safeBuyingPower !== null && session?.user?.id && session.user.id !== 'demo_user' && parseFloat(stake) > safeBuyingPower && (
                            <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span><span>Exceeds buying power</span></p>
                          )}
                        </div>
                        {payout && (
                          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between items-center"><span className="text-green-400/80 text-xs">Expected Win:</span><span className="text-green-400 text-sm font-bold">${payout.winReturn.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-red-400/80 text-xs">Expected Loss (Refund):</span><span className="text-red-400 text-sm font-bold">${payout.loseRefund.toFixed(2)}</span></div>
                          </div>
                        )}
                        {tradeMsg && (
                          <div className={`rounded-lg p-2 text-xs ${tradeMsg.startsWith('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{tradeMsg}</div>
                        )}
                        {!session ? (
                          <button type="button" onClick={openAuthModal} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-sm font-bold py-2 rounded-lg transition-all">Sign in to trade</button>
                        ) : (
                          <button type="submit" disabled={tradeLoading || (safeBuyingPower !== null && session?.user?.id && session.user.id !== 'demo_user' && parseFloat(stake) > safeBuyingPower)}
                            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-slate-700 disabled:to-slate-700 text-slate-950 disabled:text-slate-500 text-sm font-bold py-2 rounded-lg transition-all">
                            {tradeLoading ? 'Placing...' : 'Confirm Prediction'}
                          </button>
                        )}
                      </form>
                    </div>
                  )}
                </div>
              );
            };

            // Helper to render the trade form inline
            const renderTradeForm = (o) => (
              <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--line)' }} onClick={e => e.stopPropagation()}>
                <form onSubmit={handleTrade} className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-medium" style={{ color: 'var(--muted)' }}>Investment Amount</label>
                      <span className="text-xs" style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                        Balance: {buyingPowerLoading ? '...' : safeBuyingPower !== null
                          ? <button type="button" onClick={() => session?.user?.id !== 'demo_user' && setStake(safeBuyingPower.toFixed(2))} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--mono)', color: safeBuyingPower !== null && parseFloat(stake) > safeBuyingPower ? 'var(--no)' : 'var(--text)' }}>${safeBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</button>
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>$</span>
                      <input type="number" min="0.01" max={safeBuyingPower !== null && session && session.user && session.user.id !== 'demo_user' ? safeBuyingPower : undefined}
                        step="0.01" value={stake} onChange={e => setStake(e.target.value)} placeholder="100" required
                        className="w-full rounded-md px-4 pl-7 py-2.5 text-sm focus:outline-none"
                        style={{
                          fontFamily: 'var(--mono)', background: 'var(--bg)', color: 'var(--text)',
                          border: `1px solid ${safeBuyingPower !== null && parseFloat(stake) > safeBuyingPower ? 'var(--no)' : 'var(--line)'}`,
                        }}
                      />
                    </div>
                    {safeBuyingPower !== null && session && session.user && session.user.id && session.user.id !== 'demo_user' && parseFloat(stake) > safeBuyingPower && (
                      <p className="text-xs mt-1.5" style={{ color: 'var(--no)' }}>Exceeds available balance</p>
                    )}
                  </div>
                  {payout && (() => {
                    const S = parseFloat(stake) || 0;
                    const price = o.probability || 50;
                    const estShares = price > 0 ? S / (price / 100) : 0;
                    const maxProfit = payout.winReturn - S;
                    const maxProfitPct = S > 0 ? (maxProfit / S) * 100 : 0;
                    return (
                      <div className="rounded-md p-3" style={{ background: 'var(--bg)', border: '1px solid var(--line)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                        <div className="flex justify-between items-center py-0.5"><span style={{ color: 'var(--muted)' }}>Est. Shares</span><span style={{ color: 'var(--text)', fontWeight: 600 }}>{estShares.toFixed(1)}</span></div>
                        <div className="flex justify-between items-center py-0.5"><span style={{ color: 'var(--muted)' }}>Potential Payout</span><span style={{ color: 'var(--text)', fontWeight: 600 }}>${payout.winReturn.toFixed(2)}</span></div>
                        <div className="flex justify-between items-center py-0.5"><span style={{ color: 'var(--muted)' }}>Max Profit</span><span style={{ color: 'var(--yes)', fontWeight: 600 }}>+${maxProfit.toFixed(2)} ({maxProfitPct.toFixed(1)}%)</span></div>
                        <div className="flex justify-between items-center pt-2 mt-1.5" style={{ borderTop: '1px solid var(--line)' }}><span style={{ color: 'var(--muted)' }}>Total Cost</span><span style={{ color: 'var(--text)', fontWeight: 600 }}>${S.toFixed(2)}</span></div>
                      </div>
                    );
                  })()}
                  {tradeMsg && <div className="rounded-md p-2 text-xs" style={tradeMsg.startsWith('✅') ? { background: 'var(--yes-dim)', color: 'var(--yes)' } : { background: 'var(--no-dim)', color: 'var(--no)' }}>{tradeMsg}</div>}
                  {!session ? (
                    <button type="button" onClick={openAuthModal} className="w-full text-sm font-bold py-2.5 rounded-md transition-all" style={{ background: 'var(--card-hover)', border: '1px solid var(--line)', color: 'var(--text)' }}>Sign in to trade</button>
                  ) : (
                    <button type="submit" disabled={tradeLoading || (safeBuyingPower !== null && session.user && session.user.id && session.user.id !== 'demo_user' && parseFloat(stake) > safeBuyingPower)}
                      className="w-full text-sm font-bold py-3 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'var(--gold)', color: '#1a1405', border: 'none', boxShadow: '0 4px 16px rgba(232,196,104,.2)' }}>
                      {tradeLoading ? 'Placing...' : 'Place Trade'}
                    </button>
                  )}
                  <p className="text-center" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                    By trading, you agree to the Terms of Service.
                  </p>
                </form>
              </div>
            );

            // Render yes + no as a single horizontal row
            const renderPairRow = (yes, no, rowTitle) => {
              const yesSelected = selectedOutcome && selectedOutcome.id === yes.id;
              const noSelected = selectedOutcome && selectedOutcome.id === no.id;
              const isResolvedYes = isOutcomeResolved(yes.id) || market.status === 'resolved';
              const isWinnerYes = winningOutcomeSet.has(yes.id);
              const isWinnerNo = winningOutcomeSet.has(no.id);
              const activeOutcome = yesSelected ? yes : noSelected ? no : null;
              const imageUrl = yes.image_url || no.image_url || (() => {
                if (!sportsMeta) return null;
                if (sportsMeta.home_team && rowTitle.includes(sportsMeta.home_team)) return sportsMeta.home_logo;
                if (sportsMeta.away_team && rowTitle.includes(sportsMeta.away_team)) return sportsMeta.away_logo;
                return null;
              })();
              return (
                <div key={yes.id} className="rounded-xl border border-slate-700/60 bg-slate-900/40 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    {imageUrl && (
                      <img src={imageUrl} alt={rowTitle} className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-700/50 bg-slate-900" />
                    )}
                    <span className="flex-1 font-medium text-white truncate min-w-0">{rowTitle}</span>
                    {!isResolvedYes ? (
                      <span className="text-white font-bold text-sm shrink-0 w-12 text-right">{Math.round(yes.probability || 0)}%</span>
                    ) : (
                      <span className="shrink-0">
                        {isWinnerYes && <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-green-300">Yes Won</span>}
                        {isWinnerNo && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-red-300">No Won</span>}
                      </span>
                    )}
                    {market.status === 'active' && (
                      <div className="flex items-center gap-2 shrink-0">
                        {!isResolvedYes && (
                          <button
                            className="rounded-md text-sm font-bold transition-all"
                            style={{
                              padding: '8px 16px', textAlign: 'center', lineHeight: 1.3,
                              border: `1.5px solid ${yesSelected ? 'var(--yes)' : 'rgba(110,231,154,0.35)'}`,
                              background: yesSelected ? 'var(--yes-dim)' : 'transparent',
                              color: 'var(--yes)',
                            }}
                            onClick={() => setSelectedOutcome(yesSelected ? null : yes)}>
                            Yes <span style={{ fontFamily: 'var(--mono)' }}>{Math.round(yes.probability || 0)}&cent;</span>
                          </button>
                        )}
                        {!isResolvedYes && (
                          <button
                            className="rounded-md text-sm font-bold transition-all"
                            style={{
                              padding: '8px 16px', textAlign: 'center', lineHeight: 1.3,
                              border: `1.5px solid ${noSelected ? 'var(--no)' : 'var(--line)'}`,
                              background: noSelected ? 'var(--no-dim)' : 'transparent',
                              color: noSelected ? 'var(--no)' : 'var(--muted)',
                            }}
                            onClick={() => setSelectedOutcome(noSelected ? null : no)}>
                            No <span style={{ fontFamily: 'var(--mono)', color: 'var(--no)' }}>{Math.round(no.probability || 0)}&cent;</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {activeOutcome && market.status === 'active' && renderTradeForm(activeOutcome)}
                </div>
              );
            };

            const renderOutcomesBlock = (outcomesToRender) => {
              // Multi-binary: each question has a _yes / _no pair
              if (isMultiMultiple && hasYesNoPairs) {
                return (
                  <div className="space-y-2">
                    {outcomesToRender.filter(o => o.id.endsWith('_yes')).filter(yes => {
                      const baseTitle = yes.title.replace(/\s*\(Yes\)$/i, '');
                      return baseTitle.toLowerCase().includes(searchQuery.toLowerCase());
                    }).map(yes => {
                      const no = outcomesToRender.find(o => o.id === yes.id.replace('_yes', '_no'));
                      if (!yes || !no) return null;
                      const baseTitle = yes.title.replace(/\s*\(Yes\)$/i, '');
                      return renderPairRow(yes, no, baseTitle);
                    })}
                  </div>
                );
              }
              // Simple binary (just Yes + No)
              const yesO = outcomesToRender.find(o => o.title && o.title.toLowerCase() === 'yes');
              const noO = outcomesToRender.find(o => o.title && o.title.toLowerCase() === 'no');
              if (yesO && noO && outcomesToRender.length === 2) {
                return <div className="space-y-2">{renderPairRow(yesO, noO, market.title)}</div>;
              }
              // Multi-outcome without pairs
              const filteredOutcomes = outcomesToRender.filter(o => o.title.toLowerCase().includes(searchQuery.toLowerCase()));
              return <div className="space-y-2">{filteredOutcomes.map(o => renderOutcome(o))}</div>;
            };

            const unresolvedOutcomesList = outcomes.filter(o => !isOutcomeResolved(o.id));
            const resolvedOutcomesList = outcomes.filter(o => isOutcomeResolved(o.id));

            return (
              <div className="space-y-8">
                {unresolvedOutcomesList.length > 0 && (
                  <div>
                    {isPartiallyResolved && <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Open Options</h3>}
                    {renderOutcomesBlock(unresolvedOutcomesList)}
                  </div>
                )}
                {resolvedOutcomesList.length > 0 && (
                  <div className={unresolvedOutcomesList.length > 0 ? 'pt-6 border-t border-slate-800' : ''}>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Resolved Options</h3>
                    {renderOutcomesBlock(resolvedOutcomesList)}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div >
  );
}
