import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useMarkets } from '../hooks/useMarkets';
import LeagueLeaderboard from '../components/LeagueLeaderboard';
import MarketCard from '../components/MarketCard';

function money(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function points(value) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function LeagueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session, openAuthModal } = useAuth();
  const { markets } = useMarkets();
  const user = session?.user;
  const [detail, setDetail] = useState(null);
  const [leaderboard, setLeaderboard] = useState({ rows: [], open_markets: 0 });
  const [tab, setTab] = useState('leaderboard');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [exitInputs, setExitInputs] = useState({});

  const league = detail?.league;
  const predictions = detail?.predictions || [];

  const activeMarkets = useMemo(() => {
    return markets.filter(m => {
      if (m.status !== 'active') return false;
      if (!league?.event?.event_markets) return true; // fallback if no event
      return league.event.event_markets.some(em => em.market_id === m.id);
    });
  }, [markets, league]);

  const isAdmin = user?.id && league?.admin_user_id === user.id;
  const isLocked = league ? ['completed'].includes(league.status) : false;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leagueDetail, board] = await Promise.all([
        api.getLeague(id, user?.id || null),
        api.getLeagueLeaderboard(id)
      ]);
      setDetail(leagueDetail);
      setLeaderboard(board);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExit = async (prediction) => {
    const input = exitInputs[prediction.id] || {};
    const market = markets.find(m => m.id === prediction.market_id);
    const outcome = market?.outcomes?.find(o => o.id === prediction.outcome_id);
    const pCurrent = input.pCurrent || outcome?.probability || Number(prediction.p_entry || 0.5) * 100;
    setMessage('');
    try {
      await api.exitLeaguePosition(id, {
        predictionId: prediction.id,
        soldPct: Number(input.soldPct || 50),
        pCurrent,
        user_id: user.id
      });
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };





  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!league) return <div className="empty-state"><p>League not found.</p></div>;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <button onClick={() => navigate('/leagues')} className="mb-6 text-sm font-semibold text-slate-400 hover:text-white">
        Back to leagues
      </button>

      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-dobium-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-dobium-accent">
                {league.event?.icon || '🏆'} {league.event?.name || 'Main Event'}
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-300">{league.status}</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold text-white">{league.name}</h1>
            <p className="mt-2 text-sm text-slate-500">Invite code: <span className="font-mono text-yellow-400">{league.invite_code}</span></p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-950/60 px-4 py-3">
              <p className="text-xs text-slate-500">Members</p>
              <p className="text-xl font-bold text-white">{league.members?.length || 0}</p>
            </div>
            <div className="rounded-xl bg-slate-950/60 px-4 py-3">
              <p className="text-xs text-slate-500">Ends</p>
              <p className="text-sm font-semibold text-white">{league.season_end ? new Date(league.season_end).toLocaleDateString() : 'TBD'}</p>
            </div>
            <div className="rounded-xl bg-slate-950/60 px-4 py-3">
              <p className="text-xs text-slate-500">Open</p>
              <p className="text-xl font-bold text-white">{leaderboard.open_markets || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {message}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {[
          ['leaderboard', 'Leaderboard'],
          ['predictions', 'My Predictions'],
          ['markets', 'Markets']
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === key ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' && (
        <LeagueLeaderboard rows={leaderboard.rows || []} predictions={predictions} openMarkets={leaderboard.open_markets || 0} />
      )}

      {tab === 'predictions' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {predictions.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-500">No league predictions yet.</div>
          ) : predictions.map(prediction => {
            const exitInput = exitInputs[prediction.id] || {};
            const sold = (prediction.exits || []).reduce((sum, exit) => sum + Number(exit.stake_amount_sold || 0), 0);
            const remaining = Math.max(0, Number(prediction.stake_amount || 0) - sold);
            return (
              <div key={prediction.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-white">{prediction.market?.title || prediction.market_id}</p>
                    <p className="mt-1 text-sm text-slate-400">{prediction.predicted_outcome} at {(Number(prediction.p_entry || 0) * 100).toFixed(1)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Points</p>
                    <p className="text-lg font-bold text-yellow-400">{points(prediction.final_points)}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-950/60 p-3">
                    <p className="text-xs text-slate-500">Stake</p>
                    <p className="font-semibold text-white">{money(prediction.stake_amount)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-950/60 p-3">
                    <p className="text-xs text-slate-500">Remaining</p>
                    <p className="font-semibold text-white">{money(remaining)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-950/60 p-3">
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="font-semibold text-white">{prediction.position_status?.replace('_', ' ')}</p>
                  </div>
                </div>

                {!prediction.resolved && remaining > 0.01 && (
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" min="1" max="100" step="1" value={exitInput.soldPct || ''} onChange={e => setExitInputs({ ...exitInputs, [prediction.id]: { ...exitInput, soldPct: e.target.value } })} placeholder="Sell %" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-red-500" />
                      <input type="number" min="1" max="99" step="0.1" value={exitInput.pCurrent || ''} onChange={e => setExitInputs({ ...exitInputs, [prediction.id]: { ...exitInput, pCurrent: e.target.value } })} placeholder="Current %" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-red-500" />
                    </div>
                    <button onClick={() => handleExit(prediction)} className="mt-3 w-full rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300">
                      Exit Position
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'markets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
          {activeMarkets.length > 0 ? (
            activeMarkets.map(m => <MarketCard key={m.id} market={m} />)
          ) : (
            <div className="col-span-full rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-500">
              No active markets found for this league.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
