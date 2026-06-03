import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

function formatPoints(value) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function UserProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [calledIt, setCalledIt] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getUserProfile(id), api.getCalledIt(id)])
      .then(([profileData, calledItData]) => {
        setProfile(profileData);
        setCalledIt(Array.isArray(calledItData) ? calledItData : []);
      })
      .catch(err => setMessage(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!profile) return <div className="empty-state"><p>Profile not found.</p></div>;

  const stats = [
    ['Rating', formatPoints(profile.rating)],
    ['Record', profile.record],
    ['Calibration', profile.calibration_tier],
    ['Accuracy', `${Number(profile.accuracy_pct || 0).toFixed(0)}%`],
    ['Called It', profile.called_it_count || 0],
    ['Timing', profile.timing_tier],
    ['Conviction', profile.conviction_tier]
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      {message && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {message}
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-yellow-500">League Profile</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{profile.user?.username || id.slice(0, 8)}</h1>
            <p className="mt-2 inline-flex rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-sm font-bold text-yellow-300">
              {profile.archetype}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-4 text-xl font-bold text-white">Highlight Reel</h2>
        {calledIt.length === 0 ? (
          <p className="text-slate-500">No Called It entries yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {calledIt.slice(0, 6).map(entry => (
              <div key={entry.id} className="rounded-lg bg-slate-950/60 p-4">
                <p className="font-semibold text-white">{entry.market?.title || entry.description || entry.market_id}</p>
                <p className="mt-1 text-sm text-slate-500">{entry.league?.name} at {(Number(entry.p_entry || 0) * 100).toFixed(1)}%</p>
                <p className="mt-2 text-sm font-bold text-yellow-400">{formatPoints(entry.points_earned)} pts</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">League</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Rank</th>
              <th className="px-4 py-3 text-right">Points</th>
              <th className="px-4 py-3 text-right">Archetype</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {(profile.league_history || []).map(row => (
              <tr key={row.league_id}>
                <td className="px-4 py-3 font-semibold text-white">{row.league_name || row.league_id}</td>
                <td className="px-4 py-3 text-slate-400">{row.status}</td>
                <td className="px-4 py-3 text-right text-slate-200">{row.final_rank ? `#${row.final_rank}` : '-'}</td>
                <td className="px-4 py-3 text-right font-bold text-yellow-400">{formatPoints(row.final_score)}</td>
                <td className="px-4 py-3 text-right text-slate-300">{row.archetype}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
