import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const CATEGORIES = ['music', 'sports', 'entertainment', 'awards'];
const CATEGORY_LABEL = { music: 'Music', sports: 'Sports', entertainment: 'Movies & TV', awards: 'Awards' };

function plusDays(n) {
  const d = new Date(Date.now() + n * 86400000);
  return d.toISOString().slice(0, 10);
}

export default function TrendingRadar({ radarKey }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [drafts, setDrafts] = useState({}); // id -> { title, category, close }
  const [busy, setBusy] = useState({});

  const load = useCallback(async () => {
    try {
      const data = await api.getSuggestions('pending', radarKey);
      setSuggestions(Array.isArray(data) ? data : []);
    } catch { setSuggestions([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const scanNow = async () => {
    setScanning(true); setScanMsg('');
    try {
      const r = await api.runMarketScout(radarKey);
      setScanMsg(`Scanned ${r.scanned} trending items · ${r.filtered_out} removed by harm filter · ${r.new_suggestions} new`);
      await load();
    } catch (e) {
      setScanMsg(`Scan failed: ${e.message}`);
    }
    setScanning(false);
  };

  const draftFor = (s) => drafts[s.id] || { title: s.headline, category: s.category, close: plusDays(14) };
  const setDraft = (id, patch) => setDrafts(prev => ({ ...prev, [id]: { ...draftFor(suggestions.find(x => x.id === id) || { id }), ...prev[id], ...patch } }));

  const publish = async (s) => {
    const d = draftFor(s);
    if (!d.title.trim()) return;
    setBusy(prev => ({ ...prev, [s.id]: true }));
    try {
      await api.createMarket({
        title: d.title.trim(),
        description: s.url ? `Source: ${s.url}` : '',
        category: d.category,
        market_type: 'binary',
        close_date: d.close ? new Date(d.close + 'T23:59:00').toISOString() : null,
        outcomes: [
          { title: 'Yes', probability: 50 },
          { title: 'No', probability: 50 },
        ],
        is_trending: true,
      });
      await api.setSuggestionStatus(s.id, 'published', radarKey);
      setSuggestions(prev => prev.filter(x => x.id !== s.id));
    } catch (e) {
      setScanMsg(`Publish failed: ${e.message}`);
    }
    setBusy(prev => ({ ...prev, [s.id]: false }));
  };

  const dismiss = async (s) => {
    setBusy(prev => ({ ...prev, [s.id]: true }));
    try {
      await api.setSuggestionStatus(s.id, 'dismissed', radarKey);
      setSuggestions(prev => prev.filter(x => x.id !== s.id));
    } catch { /* leave in list */ }
    setBusy(prev => ({ ...prev, [s.id]: false }));
  };

  return (
    <div className="mb-8 rounded-2xl border border-slate-700/70 bg-slate-900/50 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <div>
          <h2 className="text-lg font-bold text-white">📡 Trending Radar</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Scans Reddit + Variety, Billboard, Hollywood Reporter & ESPN daily. Harm-filtered automatically — edit the wording into a clear question, then publish in one tap.
          </p>
        </div>
        <button onClick={scanNow} disabled={scanning}
          className="shrink-0 px-4 py-2 rounded-lg text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-50 transition-colors">
          {scanning ? 'Scanning…' : 'Scan now'}
        </button>
      </div>
      {scanMsg && <p className="text-xs text-slate-300 mb-2">{scanMsg}</p>}

      {loading ? (
        <p className="text-slate-500 text-sm py-4">Loading suggestions…</p>
      ) : suggestions.length === 0 ? (
        <p className="text-slate-500 text-sm py-4">No pending suggestions — hit "Scan now" to pull today's trending topics.</p>
      ) : (
        <div className="space-y-3 mt-3 max-h-[520px] overflow-y-auto pr-1">
          {suggestions.map(s => {
            const d = draftFor(s);
            return (
              <div key={s.id} className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-slate-700/70 text-slate-300 font-semibold">{s.source}</span>
                  <span>▲ {s.score.toLocaleString()}</span>
                  {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">source ↗</a>}
                </div>
                <input value={d.title} onChange={e => setDraft(s.id, { title: e.target.value })}
                  className="w-full bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm mb-2 focus:outline-none focus:border-amber-400"
                  placeholder='Rewrite as a clear question, e.g. "Will X happen by July 31?"' />
                <div className="flex flex-wrap items-center gap-2">
                  <select value={d.category} onChange={e => setDraft(s.id, { category: e.target.value })}
                    className="bg-slate-900/70 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                  </select>
                  <input type="date" value={d.close} onChange={e => setDraft(s.id, { close: e.target.value })}
                    className="bg-slate-900/70 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" />
                  <div className="flex-1" />
                  <button onClick={() => dismiss(s)} disabled={busy[s.id]}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-600 text-slate-300 hover:text-white disabled:opacity-40 transition-colors">
                    Dismiss
                  </button>
                  <button onClick={() => publish(s)} disabled={busy[s.id] || !d.title.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-40 transition-colors">
                    {busy[s.id] ? '...' : 'Publish market'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
