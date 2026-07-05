import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

function cleanOutcomes(market) {
  // multi_single/multi_multiple store each candidate as a Yes/No pair internally.
  const hasPairs = (market.outcomes || []).some(o => o.id?.endsWith('_yes'));
  if (hasPairs) {
    return market.outcomes
      .filter(o => o.id?.endsWith('_yes'))
      .map(o => ({ id: o.id, title: o.title.replace(/\s*\(Yes\)$/i, '') }));
  }
  return (market.outcomes || []).map(o => ({ id: o.id, title: o.title }));
}

export default function ResolveQueue({ radarKey }) {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [msg, setMsg] = useState({});

  const load = useCallback(async () => {
    try {
      const data = await api.getPendingResolution(radarKey);
      setMarkets(Array.isArray(data) ? data : []);
    } catch { setMarkets([]); }
    setLoading(false);
  }, [radarKey]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (market, outcomeId) => {
    setBusy(prev => ({ ...prev, [market.id]: true }));
    try {
      await api.resolveMarket(market.id, [outcomeId], radarKey);
      setMarkets(prev => prev.filter(m => m.id !== market.id));
    } catch (e) {
      setMsg(prev => ({ ...prev, [market.id]: e.message }));
    }
    setBusy(prev => ({ ...prev, [market.id]: false }));
  };

  return (
    <div className="mb-8 rounded-2xl border border-slate-700/70 p-5" style={{ background: 'var(--panel)' }}>
      <h2 className="text-lg font-bold text-white mb-1">✅ Resolve Markets</h2>
      <p className="text-slate-400 text-xs mb-4 max-w-xl">
        Markets whose close date has passed but haven't been settled yet — pick the real-world
        winner for each so trades actually pay out and your win/loss record means something.
      </p>

      {loading ? (
        <p className="text-slate-500 text-sm py-2">Checking for markets awaiting resolution…</p>
      ) : markets.length === 0 ? (
        <p className="text-slate-500 text-sm py-2">Nothing waiting — every closed market is settled. 🎉</p>
      ) : (
        <div className="space-y-3">
          {markets.map(m => {
            const isMultiMultiple = m.market_type === 'multi_multiple';
            const outcomes = cleanOutcomes(m);
            return (
              <div key={m.id} className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-sm font-semibold text-white">{m.title}</span>
                  <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
                    closed {new Date(m.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {isMultiMultiple ? (
                  <p className="text-xs text-amber-400/90">
                    This market needs a Yes/No pick per option — resolve it from the full admin dashboard once that's set up.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {outcomes.map(o => (
                      <button
                        key={o.id}
                        onClick={() => resolve(m, o.id)}
                        disabled={busy[m.id]}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-600 text-slate-200 hover:border-amber-400 hover:text-amber-400 disabled:opacity-40 transition-colors"
                      >
                        {busy[m.id] ? '...' : `${o.title} wins`}
                      </button>
                    ))}
                  </div>
                )}
                {msg[m.id] && <p className="text-xs text-red-400 mt-2">{msg[m.id]}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
