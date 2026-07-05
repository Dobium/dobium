import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../store/storage';

function calcPositionValue(stake, entryProbPct, currentProbPct) {
  const pEntry = entryProbPct / 100;
  const pCurrent = currentProbPct / 100;

  const rMin = stake * pEntry;
  const rMax = stake * (2 - pEntry);

  return rMin + (rMax - rMin) * pCurrent;
}

export default function ActivityHistory({ predictions, markets, onBack }) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Explicitly filter out active positions so only past history/resolutions are shown
  // Group predictions by market, outcome, and action to show "overall entry price" based on total invested
  const grouped = new Map();

  predictions
    .filter(pred => pred.status !== 'active')
    .forEach(pred => {
      const isSettled = ['won', 'lost'].includes(pred.status);
      const isSold = pred.status === 'sold';

      let action = 'Other';
      if (isSettled) action = 'Resolved';
      else if (isSold) action = 'Sold';
      else if (pred.status === 'cancelled') action = 'Cancelled';
      else if (pred.status === 'refunded') action = 'Refunded';

      const S = pred.stake_amount || 0;
      const entryProbPct = pred.odds_at_prediction || 50;

      let returnAmount;
      let pCurrent = 0;

      if (pred.status === 'won') {
        returnAmount = (pred.actual_return && pred.actual_return > 0)
          ? pred.actual_return
          : calcPositionValue(S, entryProbPct, 100);
      } else if (pred.status === 'lost') {
        returnAmount = (pred.actual_return && pred.actual_return > 0)
          ? pred.actual_return
          : calcPositionValue(S, entryProbPct, 0);
      } else if (isSold) {
        const storedReturn = pred.actual_return || 0;
        const pEntry = entryProbPct / 100;
        const maxNewReturn = S * (2 - pEntry);

        if (storedReturn > maxNewReturn) {
          // Legacy traditional formula detection (reverse-engineer probability and clamp)
          pCurrent = S > 0 ? (storedReturn * pEntry) / S : 0;
          pCurrent = Math.min(1.0, Math.max(0, pCurrent));
          returnAmount = calcPositionValue(S, entryProbPct, pCurrent * 100);
        } else {
          // New linear interpolation model
          const rMin = S * pEntry;
          const diff = maxNewReturn - rMin;
          pCurrent = diff > 0 ? (storedReturn - rMin) / diff : 0;
          pCurrent = Math.min(1.0, Math.max(0, pCurrent));
          returnAmount = storedReturn;
        }
      } else {
        returnAmount = 0;
      }

      const key = `${pred.market_id}_${pred.outcome_id}_${action}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: pred.id,
          marketId: pred.market_id,
          outcomeId: pred.outcome_id,
          date: pred.resolved_at || pred.sold_at || pred.updated_at || pred.created_at || new Date().toISOString(),
          action,
          status: pred.status,
          totalStake: 0,
          weightedOdds: 0,
          returnAmount: 0,
          weightedPCurrent: 0
        });
      }

      const g = grouped.get(key);
      g.totalStake += S;
      g.weightedOdds += entryProbPct * S;
      g.returnAmount += returnAmount;
      if (isSold) {
        g.weightedPCurrent += pCurrent * 100 * S;
      }

      const predDate = new Date(pred.resolved_at || pred.sold_at || pred.updated_at || pred.created_at || new Date().toISOString());
      if (predDate > new Date(g.date)) {
        g.date = predDate.toISOString();
      }
    });

  const activities = Array.from(grouped.values())
    .map(g => {
      const market = markets.find(m => m.id === g.marketId);
      const outcome = market?.outcomes?.find(o => o.id === g.outcomeId);

      // Weighted-average entry probability (¢)
      const entryPrice = g.totalStake > 0 ? g.weightedOdds / g.totalStake : 50;

      let endPrice = 0;
      if (g.status === 'won') {
        endPrice = 100;
      } else if (g.status === 'lost') {
        endPrice = 0;
      } else if (g.status === 'sold') {
        endPrice = g.totalStake > 0 ? g.weightedPCurrent / g.totalStake : 0;
      }

      return {
        id: g.id,
        marketId: g.marketId,
        date: g.date,
        marketTitle: market?.title || 'Unknown Market',
        outcomeTitle: outcome?.title || 'Unknown Outcome',
        action: g.action,
        status: g.status,
        entryPrice,
        endPrice,
        amount: g.totalStake,
        returnAmount: g.returnAmount
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredActivities = activities.filter(act => {
    if (activeFilter === 'trades') return act.action === 'Sold' || act.action === 'Bought';
    if (activeFilter === 'resolutions') return act.action === 'Resolved' || act.action === 'Refunded';
    return true;
  });

  // Group activities by market after filtering
  const marketGroupsMap = new Map();
  filteredActivities.forEach(act => {
    if (!marketGroupsMap.has(act.marketId)) {
      marketGroupsMap.set(act.marketId, {
        marketId: act.marketId,
        marketTitle: act.marketTitle,
        latestDate: act.date,
        activities: []
      });
    }
    const group = marketGroupsMap.get(act.marketId);
    group.activities.push(act);
    if (new Date(act.date) > new Date(group.latestDate)) {
      group.latestDate = act.date;
    }
  });

  const groupedActivities = Array.from(marketGroupsMap.values())
    .sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate));

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(groupedActivities.length / ITEMS_PER_PAGE);
  const paginatedGroups = groupedActivities.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8 animate-fadeIn">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white font-medium transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to Dashboard</span>
      </button>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Activity History</h1>
          <p className="text-slate-400">View your past trades and market resolutions.</p>
        </div>

        <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          {['all', 'trades', 'resolutions'].map(filter => (
            <button
              key={filter}
              onClick={() => {
                setActiveFilter(filter);
                setCurrentPage(1);
              }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeFilter === filter
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {groupedActivities.length === 0 ? (
          <div className="bg-slate-900/60  border border-slate-800 rounded-2xl shadow-2xl p-16 text-center text-slate-500">
            <div className="flex flex-col items-center justify-center">
              <svg className="w-12 h-12 text-slate-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-base font-medium text-slate-400">No past activity found</p>
              <p className="text-sm mt-1">Your trades and resolutions will appear here</p>
            </div>
          </div>
        ) : (
          paginatedGroups.map(group => (
            <div key={group.marketId} className="bg-slate-900/60  border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
              <div
                className="px-6 py-4 bg-slate-800/40 border-b border-slate-700 cursor-pointer hover:bg-slate-800/60 transition-colors flex items-center justify-between group/header"
                onClick={() => navigate(`/markets/${group.marketId}`)}
              >
                <h2 className="text-lg font-semibold text-white group-hover/header:text-yellow-400 transition-colors">
                  {group.marketTitle}
                </h2>
                <div className="flex items-center gap-2 text-slate-500 group-hover/header:text-yellow-400 transition-colors">
                  <span className="text-sm font-medium">View Market</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead className="bg-slate-800/20 text-slate-400 border-b border-slate-700/50">
                    <tr>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[11px]">Date</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[11px]">Contract</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Cost</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Return</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {group.activities.map(act => {
                      const diff = (act.returnAmount || 0) - (act.amount || 0);
                      const isPositive = diff > 0;
                      const isNegative = diff < 0;

                      return (
                        <tr key={act.id} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-white font-medium">{new Date(act.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            <div className="text-slate-500 text-xs mt-1">{new Date(act.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-800/80 px-2.5 py-1 rounded text-slate-300 font-medium border border-slate-700">{act.outcomeTitle}</span>
                              {act.status === 'won' && act.entryPrice < 35 && (
                                <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm">Called It 🔥</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-white font-semibold">{formatCurrency(act.amount)}</div>
                            <div className="text-slate-500 text-xs mt-0.5">@ {Math.round(act.entryPrice)}¢</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-white font-semibold">{formatCurrency(act.returnAmount || 0)}</div>
                            <div className="text-slate-500 text-xs mt-0.5">@ {Math.round(act.endPrice)}¢</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className={`font-bold ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-slate-400'}`}>
                              {isPositive ? '+' : isNegative ? '-' : ''}{formatCurrency(Math.abs(diff))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-800/30 border-t border-slate-700/50">
                    {(() => {
                      const totalCost = group.activities.reduce((sum, act) => sum + (act.amount || 0), 0);
                      const totalReturn = group.activities.reduce((sum, act) => sum + (act.returnAmount || 0), 0);
                      const totalDiff = totalReturn - totalCost;
                      const isPositive = totalDiff > 0;
                      const isNegative = totalDiff < 0;
                      return (
                        <tr>
                          <td colSpan="2" className="px-6 py-4 text-right font-semibold text-slate-400 uppercase tracking-wider text-[11px]">Total</td>
                          <td className="px-6 py-4 text-right font-semibold text-white">
                            {formatCurrency(totalCost)}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-white">
                            {formatCurrency(totalReturn)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className={`font-bold ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-slate-400'}`}>
                              {isPositive ? '+' : isNegative ? '-' : ''}{formatCurrency(Math.abs(totalDiff))}
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>
            </div>
          ))
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8 pt-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 disabled:hover:text-slate-400 transition-colors font-medium text-sm"
            >
              Previous
            </button>
            <span className="text-slate-400 text-sm font-medium">
              Page <span className="text-white">{currentPage}</span> of <span className="text-white">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 disabled:hover:text-slate-400 transition-colors font-medium text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}