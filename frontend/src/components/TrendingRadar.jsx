import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const CATEGORIES = ['trending', 'music', 'entertainment', 'sports', 'awards'];
const CATEGORY_LABEL = { trending: 'Trending', music: 'Music', sports: 'Sports', entertainment: 'Movies & TV', awards: 'Awards' };

function plusDays(n) {
  const d = new Date(Date.now() + n * 86400000);
  return d.toISOString().slice(0, 10);
}

const chipStyle = {
  fontFamily: 'var(--mono)', fontSize: 10.5, background: '#2D344C', color: '#D2C5AF',
  borderRadius: 5, padding: '3px 9px', border: 'none', letterSpacing: '0.02em',
};

// Trending Radar — banner with live stats + a single card feed (mockup layout).
export default function TrendingRadar({ radarKey, sidebar }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [stats, setStats] = useState(null); // { scanned, mirrored, fresh }
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState({});

  const load = useCallback(async () => {
    try {
      const data = await api.getSuggestions('pending', radarKey);
      setSuggestions(Array.isArray(data) ? data : []);
    } catch { setSuggestions([]); }
    setLoading(false);
  }, [radarKey]);

  useEffect(() => { load(); }, [load]);

  const scanNow = async () => {
    setScanning(true); setScanMsg('');
    try {
      const r = await api.runMarketScout(radarKey);
      setStats({ scanned: r.scanned || 0, mirrored: r.exchange_markets || 0, fresh: r.new_suggestions || 0 });
      setScanMsg(`${r.junk_purged || 0} old junk purged · ${(r.auto_published || []).length || 0} hot markets auto-published`);
      await load();
    } catch (e) {
      setScanMsg(`Scan failed: ${e.message}`);
    }
    setScanning(false);
  };

  const draftFor = (s) => drafts[s.id] || {
    title: s.headline,
    category: s.category,
    close: s.suggested_close_date ? s.suggested_close_date.slice(0, 10) : plusDays(14),
  };
  const setDraft = (id, patch) => setDrafts(prev => ({ ...prev, [id]: { ...draftFor(suggestions.find(x => x.id === id) || { id }), ...prev[id], ...patch } }));

  const publish = async (s) => {
    const d = draftFor(s);
    if (!d.title.trim()) return;
    setBusy(prev => ({ ...prev, [s.id]: true }));
    try {
      let outcomeTitles = null;
      try { outcomeTitles = s.outcomes_json ? JSON.parse(s.outcomes_json) : null; } catch { outcomeTitles = null; }
      const isMulti = Array.isArray(outcomeTitles) && outcomeTitles.length >= 2;
      const prob = isMulti ? Math.floor(100 / outcomeTitles.length) : 50;
      await api.createMarket({
        title: d.title.trim(),
        description: s.url ? `Source: ${s.url}` : '',
        category: d.category,
        market_type: isMulti ? 'multi_single' : 'binary',
        close_date: d.close ? new Date(d.close + 'T23:59:00').toISOString() : null,
        outcomes: isMulti
          ? outcomeTitles.map((t, i) => ({ title: t, probability: i === 0 ? 100 - prob * (outcomeTitles.length - 1) : prob }))
          : [{ title: 'Yes', probability: 50 }, { title: 'No', probability: 50 }],
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
    } catch { /* stay */ }
    setBusy(prev => ({ ...prev, [s.id]: false }));
  };

  const sections = [
    { key: 'trending', label: '🔥 Trending News', match: (s) => !['music', 'entertainment', 'awards'].includes(s.category) },
    { key: 'music', label: '🎵 Music', match: (s) => s.category === 'music' },
    { key: 'media', label: '🎬 Media', match: (s) => s.category === 'entertainment' || s.category === 'awards' },
  ];

  return (
    <div>
      {/* Banner: title + stat chips + Scan now */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', padding: '18px 20px', borderRadius: 14, border: '1px solid #33312E', background: '#181E36', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 20 }} aria-hidden="true">📡</span>
          <h2 style={{ color: '#DCE1FF', fontWeight: 800, fontSize: 18, margin: 0 }}>Trending Radar</h2>
          {stats && (
            <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={chipStyle}>Scanned {stats.scanned} items</span>
              <span style={chipStyle}>{stats.mirrored} live markets mirrored</span>
              <span style={{ ...chipStyle, background: '#12271F', color: '#4AE176' }}>{stats.fresh} new suggestions</span>
            </span>
          )}
        </div>
        <button onClick={scanNow} disabled={scanning}
          style={{ background: '#F0C04A', color: '#4A3600', fontWeight: 800, fontSize: 13.5, border: 'none', borderRadius: 9, padding: '10px 20px', cursor: 'pointer', opacity: scanning ? 0.6 : 1, fontFamily: 'var(--mono)' }}>
          {scanning ? 'Scanning…' : '⟳ Scan now'}
        </button>
      </div>
      {scanMsg && <p style={{ color: '#948D87', fontSize: 12, fontFamily: 'var(--mono)', margin: '-12px 0 16px' }}>{scanMsg}</p>}

      {/* Mock layout: suggestion feed left, admin stack right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 22 }} className="lg:!grid-cols-[minmax(0,1fr)_360px]">
      <div>
      {loading ? (
        <p style={{ color: '#948D87', fontSize: 13 }}>Loading suggestions…</p>
      ) : suggestions.length === 0 ? (
        <p style={{ color: '#948D87', fontSize: 13 }}>Queue is clear — Scan now to pull fresh trending questions.</p>
      ) : sections.map(section => {
        const items = suggestions.filter(section.match);
        if (items.length === 0) return null;
        return (
          <div key={section.key} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '0 0 10px' }}>
              <h3 style={{ color: '#DCE1FF', fontWeight: 700, fontSize: 14.5, margin: 0 }}>{section.label}</h3>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: '#948D87' }}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map(s => {
                const d = draftFor(s);
                let outs = null;
                try { outs = s.outcomes_json ? JSON.parse(s.outcomes_json) : null; } catch { outs = null; }
                return (
                  <div key={s.id} style={{ borderRadius: 12, border: '1px solid #33312E', background: '#181E36', padding: '14px 16px' }}>
                    {/* Meta row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                      <span style={chipStyle}>{s.source}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: '#4AE176' }}>▲ {s.score}</span>
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: '#F0C04A', textDecoration: 'none' }}>
                          source ↗
                        </a>
                      )}
                    </div>
                    {/* Question (editable, styled as plain text) */}
                    <input
                      value={d.title}
                      onChange={(e) => setDraft(s.id, { title: e.target.value })}
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#DCE1FF', fontWeight: 700, fontSize: 15, marginBottom: 10, padding: 0 }}
                    />
                    {/* Multi outcomes preview */}
                    {Array.isArray(outs) && outs.length >= 2 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                        {outs.map((o, i) => (
                          <span key={i} style={{ ...chipStyle, background: '#0B1229', border: '1px solid #33312E', color: '#8FC6FF' }}>{o}</span>
                        ))}
                      </div>
                    )}
                    {/* Controls row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <select value={d.category} onChange={(e) => setDraft(s.id, { category: e.target.value })}
                        style={{ ...chipStyle, cursor: 'pointer', appearance: 'auto', padding: '4px 8px' }}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                      </select>
                      <input type="date" value={d.close} onChange={(e) => setDraft(s.id, { close: e.target.value })}
                        style={{ ...chipStyle, padding: '3px 8px', colorScheme: 'dark' }} />
                      <span style={{ flex: 1 }} />
                      <button onClick={() => dismiss(s)} disabled={busy[s.id]}
                        style={{ background: '#2D344C', color: '#D2C5AF', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--mono)' }}>
                        Dismiss
                      </button>
                      <button onClick={() => publish(s)} disabled={busy[s.id]}
                        style={{ background: '#F0C04A', color: '#4A3600', fontWeight: 800, border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--mono)', opacity: busy[s.id] ? 0.6 : 1 }}>
                        Publish market
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>
      {sidebar && <aside style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{sidebar}</aside>}
      </div>
    </div>
  );
}
