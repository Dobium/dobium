import { Link } from 'react-router-dom';

function formatPoints(value) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function LeagueCard({ league }) {
  const statusColor = league.status === 'completed'
    ? 'text-slate-400 bg-slate-700/40'
    : league.status === 'locked'
      ? 'text-orange-300 bg-orange-500/10'
      : 'text-green-300 bg-green-500/10';

  return (
    <Link to={`/leagues/${league.id}`} className="block rounded-xl border border-dobium-border bg-dobium-panel p-5 transition hover:border-dobium-accent/50 hover:bg-dobium-bg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{league.event?.icon || '🏆'}</span>
            <h3 className="truncate text-lg font-bold text-dobium-text">{league.name}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-dobium-accent/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-dobium-accent">
              {league.event?.name || 'Main Event'}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${statusColor}`}>
              {league.status}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">Members</p>
          <p className="text-xl font-bold text-white">{league.member_count || league.members?.length || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-4">
        <div>
          <p className="text-xs text-slate-500">Rank</p>
          <p className="text-sm font-semibold text-slate-200">{league.my_rank ? `#${league.my_rank}` : 'Unranked'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Points</p>
          <p className="text-sm font-semibold text-yellow-400">{formatPoints(league.my_points)}</p>
        </div>
      </div>
    </Link>
  );
}
