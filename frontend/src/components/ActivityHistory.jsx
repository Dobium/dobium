import { formatCurrency } from '../store/storage';

export default function ActivityHistory({ predictions, markets, onBack }) {
  // Explicitly filter out active positions so only past history/resolutions are shown
  const activities = predictions
    .filter(pred => pred.status !== 'active')
    .map(pred => {
      const market = markets.find(m => m.id === pred.market_id);
      const outcome = market?.outcomes?.find(o => o.id === pred.outcome_id);
      const isSettled = ['won', 'lost'].includes(pred.status);
      const isSold = pred.status === 'sold';

      let action = 'Bought';
      if (isSettled) action = 'Resolved';
      if (isSold) action = 'Sold';

      return {
        id: pred.id,
        date: pred.resolved_at || pred.sold_at || pred.updated_at || pred.created_at || new Date().toISOString(),
        marketTitle: market?.title || 'Unknown Market',
        outcomeTitle: outcome?.title || 'Unknown Outcome',
        action,
        status: pred.status,
        probability: pred.odds_at_prediction || 50,
        amount: pred.stake_amount || 0,
        returnAmount: (isSettled || isSold) ? (pred.actual_return || 0) : null
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

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

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Activity History</h1>
        <p className="text-slate-400">View your past trades and market resolutions.</p>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[900px]">
            <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Date</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Market</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Action</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Contract</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px] text-right">Price</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px] text-right">Amount</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px] text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-12 h-12 text-slate-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-base font-medium text-slate-400">No past activity found</p>
                      <p className="text-sm mt-1">Your trades and resolutions will appear here</p>
                    </div>
                  </td>
                </tr>
              ) : activities.map(act => (
                <tr key={act.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-white font-medium">{new Date(act.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div className="text-slate-500 text-xs mt-1">{new Date(act.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-[280px] truncate text-white font-medium group-hover:text-yellow-400 transition-colors" title={act.marketTitle}>
                      {act.marketTitle}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${act.action === 'Bought' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        act.action === 'Sold' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                          'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>{act.action}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-800/80 px-2.5 py-1 rounded text-slate-300 font-medium border border-slate-700">{act.outcomeTitle}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-300">{Math.round(act.probability)}¢</td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-white font-semibold">{formatCurrency(act.amount)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {act.status === 'won' ? (
                      <div className="inline-flex flex-col items-end">
                        <span className="text-green-400 font-bold">Won</span>
                        <span className="text-green-500/80 text-xs font-medium mt-0.5">+{formatCurrency(act.returnAmount - act.amount)}</span>
                      </div>
                    ) : act.status === 'lost' ? (
                      <div className="inline-flex flex-col items-end">
                        <span className="text-red-400 font-bold">Lost</span>
                        <span className="text-red-500/80 text-xs font-medium mt-0.5">-{formatCurrency(act.amount)}</span>
                      </div>
                    ) : act.status === 'sold' ? (
                      <div className="inline-flex flex-col items-end">
                        <span className="text-slate-300 font-bold">Sold</span>
                        <span className="text-slate-500 text-xs font-medium mt-0.5">{formatCurrency(act.returnAmount)} returned</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 font-medium capitalize">{act.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}