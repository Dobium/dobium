import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function GlobalLeaderboardPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const user = session?.user;
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch top 100 for the dedicated page
      const globalScores = await api.getGlobalLeaderboard(100);
      setLeaderboard(globalScores || []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <button onClick={() => navigate('/leagues')} className="mb-6 text-sm font-semibold text-dobium-text-secondary hover:text-white transition-colors">
        &larr; Back to Leagues
      </button>

      <div className="mb-8 border-b border-dobium-border pb-6">
        <h1 className="text-3xl font-serif font-bold text-dobium-text flex items-center gap-3">
          <span className="text-yellow-500 text-4xl">🏆</span> Global Leaderboard
        </h1>
        <p className="mt-2 text-dobium-text-secondary">
          The top 100 traders globally based on overall portfolio performance.
        </p>
      </div>

      {message && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-dobium-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
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
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-500">
                    No ranked entries yet.
                  </td>
                </tr>
              ) : (
                leaderboard.map(row => {
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

                  const isCurrentUser = row.user_id === user?.id;

                  return (
                    <tr 
                      key={row.user_id} 
                      className={`text-slate-200 transition-colors ${isCurrentUser ? 'bg-slate-800/60' : 'hover:bg-slate-900/40'}`}
                    >
                      <td className="px-4 py-3 font-bold text-white">#{row.league_rank || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={isCurrentUser ? 'text-dobium-accent font-semibold' : ''}>
                            {row.username}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-dobium-accent/20 text-dobium-accent px-1.5 py-0.5 rounded">You</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-yellow-400">{Number(row.total_points || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{row.total_predictions_count || 0}</td>
                      <td className="px-4 py-3 text-right">{Number(row.avg_entry_price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{Number(row.calibration_score || 0).toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${marginColor}`}>{marginDisplay}</td>
                      <td className={`px-4 py-3 text-center font-bold ${movementColor}`}>{movementDisplay}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
