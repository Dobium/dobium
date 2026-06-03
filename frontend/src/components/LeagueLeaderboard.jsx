function formatPoints(value) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function StatusDot({ status }) {
  const color = status === 'exited'
    ? 'bg-red-400'
    : status === 'partial_exit'
      ? 'bg-yellow-400'
      : status === 'resolved'
        ? 'bg-slate-500'
        : 'bg-green-400';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

export default function LeagueLeaderboard({ rows = [], predictions = [], openMarkets = 0 }) {
  return (
    <div className="space-y-5">
      {openMarkets > 0 && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          {openMarkets} market{openMarkets === 1 ? '' : 's'} still open. Standings can change.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3 text-right">Forecast pts</th>
              <th className="px-4 py-3 text-right">Predictions</th>
              <th className="px-4 py-3 text-right">Avg price</th>
              <th className="px-4 py-3 text-right">Calibration</th>
              <th className="px-4 py-3 text-right">Conv. margin</th>
              <th className="px-4 py-3 text-center">Movement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {rows.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-10 text-center text-slate-500">
                  No ranked entries yet.
                </td>
              </tr>
            ) : rows.map(row => {
              const rankChange = row.previous_rank ? row.previous_rank - row.league_rank : 0;
              let movementDisplay = '—';
              let movementColor = 'text-slate-500';
              if (rankChange > 0) {
                movementDisplay = `↑ ${rankChange}`;
                movementColor = 'text-green-400';
              } else if (rankChange < 0) {
                movementDisplay = `↓ ${Math.abs(rankChange)}`;
                movementColor = 'text-red-400';
              }
              const margin = parseFloat(row.conviction_margin || 0);
              const marginDisplay = margin > 0 ? `+$${margin.toFixed(0)}` : margin < 0 ? `−$${Math.abs(margin).toFixed(0)}` : '$0';
              const marginColor = margin > 0 ? 'text-green-400' : margin < 0 ? 'text-red-400' : 'text-slate-400';

              return (
                <tr key={`${row.league_id}-${row.user_id}`} className="text-slate-200">
                  <td className="px-4 py-3 font-bold text-white">#{row.league_rank || '-'}</td>
                  <td className="px-4 py-3">{row.username || row.user_id?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-right font-bold text-yellow-400">{Number(row.total_points || 0).toFixed(1)}</td>
                  <td className="px-4 py-3 text-right">{row.total_predictions_count || 0}</td>
                  <td className="px-4 py-3 text-right">{Number(row.avg_entry_price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{Number(row.calibration_score || 0).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${marginColor}`}>{marginDisplay}</td>
                  <td className={`px-4 py-3 text-center font-bold ${movementColor}`}>{movementDisplay}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {predictions.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Pending Predictions</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {predictions.filter(p => !p.resolved).map(prediction => (
              <div key={prediction.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/60 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{prediction.market?.title || prediction.market_id}</p>
                  <p className="text-xs text-slate-500">{prediction.predicted_outcome} at {(Number(prediction.p_entry || 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <StatusDot status={prediction.position_status} />
                  <span>{prediction.position_status?.replace('_', ' ') || 'open'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
