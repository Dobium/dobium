import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { resizeImageFile } from '../lib/imageResizer';
import { useAuth } from '../hooks/useAuth';
import GameClockManager from './GameClockManager';

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_LEAGUES = 'dobium_sports_leagues_v2';

const loadLS = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } };
const saveLS = (key, val) => localStorage.setItem(key, JSON.stringify(val));

const SPORTS = [
  { id: 'basketball', label: 'Basketball', icon: '🏀', hasDraw: false },
  { id: 'soccer', label: 'Soccer', icon: '⚽', hasDraw: true },
  { id: 'football', label: 'Football', icon: '🏈', hasDraw: false },
  { id: 'tennis', label: 'Tennis', icon: '🎾', hasDraw: false },
  { id: 'baseball', label: 'Baseball', icon: '⚾', hasDraw: false },
];

const RAW_API = () => { const u = import.meta.env.VITE_API_URL || ''; return u.endsWith('/') ? u.slice(0, -1) : u; };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseMeta = (market) => { try { return JSON.parse(market.description || '{}'); } catch { return {}; } };

const getEventStatus = (submarkets) => {
  if (!submarkets.length) return 'upcoming';
  const now = Date.now();
  const resolved = submarkets.every(sm => sm.status === 'resolved');
  if (resolved) return 'resolved';
  const meta = parseMeta(submarkets[0]);
  const start = meta.event_date ? new Date(meta.event_date).getTime() : null;
  if (start && now >= start) return 'live';
  return 'upcoming';
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const statusMeta = {
  upcoming: { label: 'Upcoming', color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
  live: { label: 'Live', color: '#4ade80', bg: 'rgba(34,197,94,0.12)' },
  resolved: { label: 'Resolved', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

// ─── Shared UI Atoms ──────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const s = statusMeta[status] || statusMeta.upcoming;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.color}40`,
    }}>
      {status === 'live' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s infinite' }} />}
      {s.label}
    </span>
  );
}

function TypeBadge({ type }) {
  const map = {
    binary: { label: '◈ Binary', color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
    gradient: { label: '〰 Gradient', color: '#a78bfa', bg: 'rgba(139,92,246,0.12)' },
    multi_single: { label: '⚄ Multi (Single)', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    multi_multiple: { label: '⚃ Multi (Multi)', color: '#f472b6', bg: 'rgba(236,72,153,0.12)' },
    match_winner: { label: '🏆 Match Winner', color: '#d4af37', bg: 'rgba(212,175,55,0.12)' },
    future: { label: '🔮 Future', color: '#818cf8', bg: 'rgba(99,102,241,0.12)' },
    award: { label: '🏅 Award', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  };
  const s = map[type] || map.binary;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

// ─── Add League Modal ─────────────────────────────────────────────────────────

function AddLeagueModal({ sportLabel, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), startDate, endDate, description: description.trim() });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0d1829', border: '1px solid rgba(71,85,105,0.5)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
              {sportLabel}
            </div>
            <h3 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, margin: 0 }}>Add League / Tournament</h3>
          </div>
          <button onClick={onClose} className="sports-icon-btn">✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="sports-label">League / Tournament Name *</label>
            <input className="sports-input" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. NBA Finals 2026, World Cup 2026…" autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="sports-label">Start Date</label>
              <input type="date" className="sports-input" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="sports-label">End Date</label>
              <input type="date" className="sports-input" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>
          </div>
          <div>
            <label className="sports-label">Brief Description (optional)</label>
            <input className="sports-input" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Eastern Conference Finals…" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} className="sports-btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleAdd} disabled={!name.trim()} className="sports-btn-primary" style={{ flex: 2 }}>✅ Create League</button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Match Form ────────────────────────────────────────────────────────

function CreateMatchForm({ sport, leagueName, onClose, onCreate }) {
  const hasDraw = sport.hasDraw;
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [homeLogo, setHomeLogo] = useState('');
  const [awayLogo, setAwayLogo] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogo = async (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    try { setter(await resizeImageFile(file, 128, 128)); } catch (err) { alert(err.message); }
  };

  const handleCreate = async () => {
    if (!homeTeam.trim() || !awayTeam.trim() || !eventDate) {
      setMessage('Please fill in both teams and the start date.'); return;
    }
    setLoading(true); setMessage('');
    const API = RAW_API();

    const sharedMeta = {
      sport: sport.id, league: leagueName,
      event_type: 'game', is_sports: true,
      home_team: homeTeam.trim(), away_team: awayTeam.trim(),
      event_date: eventDate,
      ...(homeLogo && { home_logo: homeLogo }),
      ...(awayLogo && { away_logo: awayLogo }),
    };

    const toCreate = [];

    // Main match winner market
    const winnerOutcomes = hasDraw
      ? [{ title: `${homeTeam.trim()} Win`, probability: 33 }, { title: 'Draw', probability: 34 }, { title: `${awayTeam.trim()} Win`, probability: 33 }]
      : [{ title: `${homeTeam.trim()} Win`, probability: 50 }, { title: `${awayTeam.trim()} Win`, probability: 50 }];
    toCreate.push({
      title: `${homeTeam.trim()} vs ${awayTeam.trim()} — Match Winner`,
      description: JSON.stringify({ ...sharedMeta, submarket_type: 'match_winner' }),
      category: 'sports', market_type: 'multi_single',
      close_date: new Date(eventDate).toISOString(),
      resolution_date: null,
      outcomes: winnerOutcomes, is_trending: false,
    });

    let ok = 0, errs = [];
    for (const payload of toCreate) {
      try {
        const res = await fetch(`${API}/api/markets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) ok++; else { const d = await res.json().catch(() => ({})); errs.push(`"${payload.title}": ${d.error || `HTTP ${res.status}`}`); }
      } catch { errs.push(`"${payload.title}": Network error`); }
    }

    setLoading(false);
    if (ok > 0 && !errs.length) { setMessage(`✅ Created ${ok} market(s)!`); setTimeout(() => { onCreate(); onClose(); }, 1200); }
    else if (ok > 0) { setMessage(`✅ ${ok} created. ⚠️ Some failed: ${errs.join(' | ')}`); setTimeout(() => { onCreate(); onClose(); }, 2500); }
    else setMessage(`❌ Failed: ${errs.join(' | ')}`);
  };

  return (
    <div style={{ background: '#0d1829', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 14, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
            {sport.icon} {sport.label} · {leagueName}
          </div>
          <h3 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, margin: 0 }}>🏟️ New Match</h3>
        </div>
        <button onClick={onClose} className="sports-icon-btn">✕</button>
      </div>

      {/* Teams */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
        <div>
          <label className="sports-label">Home Team *</label>
          <input className="sports-input" value={homeTeam} onChange={e => setHomeTeam(e.target.value)} placeholder="e.g. Boston Celtics" />
        </div>
        <div>
          <label className="sports-label">Away Team *</label>
          <input className="sports-input" value={awayTeam} onChange={e => setAwayTeam(e.target.value)} placeholder="e.g. OKC Thunder" />
        </div>

        {/* Logos */}
        {[['Home Logo', homeLogo, setHomeLogo, e => handleLogo(e, setHomeLogo)],
        ['Away Logo', awayLogo, setAwayLogo, e => handleLogo(e, setAwayLogo)]].map(([lbl, logo, setter, handler]) => (
          <div key={lbl}>
            <label className="sports-label">{lbl}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(71,85,105,0.5)', borderRadius: 8, padding: '7px 12px', fontSize: 11, color: '#94a3b8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                📁 Choose
                <input type="file" accept="image/*" onChange={handler} style={{ display: 'none' }} />
              </label>
              {logo && (
                <div style={{ position: 'relative' }}>
                  <img src={logo} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(71,85,105,0.5)' }} />
                  <button type="button" onClick={() => setter('')} style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 14, height: 14, fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Dates */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="sports-label">Match Start Date & Time *</label>
          <input type="datetime-local" className="sports-input" value={eventDate} onChange={e => setEventDate(e.target.value)} style={{ colorScheme: 'dark' }} />
        </div>
      </div>

      {/* Main market preview */}
      <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          🏆 Match Winner (auto-created)
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[homeTeam || 'Home', ...(hasDraw ? ['Draw'] : []), awayTeam || 'Away'].map(o => (
            <span key={o} style={{ background: 'rgba(212,175,55,0.12)', color: '#f1f5f9', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{o}</span>
          ))}
        </div>
      </div>

      {message && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, background: message.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${message.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: message.startsWith('✅') ? '#86efac' : '#fca5a5' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} className="sports-btn-secondary" style={{ flex: 1 }}>Cancel</button>
        <button onClick={handleCreate} disabled={loading} className="sports-btn-primary" style={{ flex: 2 }}>
          {loading ? 'Creating…' : '🚀 Publish Match'}
        </button>
      </div>
    </div>
  );
}

// ─── Create Future / Award Form ───────────────────────────────────────────────

function CreateNonMatchForm({ type, sport, leagueName, onClose, onCreate }) {
  const isFuture = type === 'future';
  const [name, setName] = useState('');
  const [outcomesText, setOutcomes] = useState('');
  const [multiWinner, setMultiWinner] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [banner, setBanner] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleBanner = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { setBanner(await resizeImageFile(file, 256, 256)); } catch (err) { alert(err.message); }
  };

  const handleCreate = async () => {
    if (!name.trim() || !eventDate) { setMessage('Please fill in name and start date.'); return; }
    const titles = outcomesText.split(',').map(t => t.trim()).filter(Boolean);
    if (titles.length < 2) { setMessage('Please enter at least 2 outcomes separated by commas.'); return; }

    setLoading(true); setMessage('');
    const API = RAW_API();
    const prob = Math.round(100 / titles.length);
    const outcomes = titles.map(title => ({ title, probability: prob }));
    const market_type = multiWinner ? 'multi_multiple' : 'multi_single';
    const payload = {
      title: name.trim(),
      description: JSON.stringify({
        sport: sport.id, league: leagueName, event_type: type,
        is_sports: true, event_name: name.trim(),
        event_date: eventDate,
        submarket_type: market_type,
        ...(banner && { event_image: banner }),
      }),
      category: 'sports', market_type,
      close_date: new Date(eventDate).toISOString(),
      resolution_date: null,
      outcomes, is_trending: false,
    };

    try {
      const res = await fetch(`${API}/api/markets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setMessage('✅ Created successfully!'); setTimeout(() => { onCreate(); onClose(); }, 1200); }
      else { const d = await res.json().catch(() => ({})); setMessage(`❌ ${d.error || `HTTP ${res.status}`}`); }
    } catch { setMessage('❌ Network error'); }
    setLoading(false);
  };

  return (
    <div style={{ background: '#0d1829', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 14, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: isFuture ? '#818cf8' : '#fb923c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
            {sport.icon} {sport.label} · {leagueName}
          </div>
          <h3 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, margin: 0 }}>{isFuture ? '🔮 New Future' : '🏅 New Award'}</h3>
        </div>
        <button onClick={onClose} className="sports-icon-btn">✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="sports-label">Market Question *</label>
          <input className="sports-input" value={name} onChange={e => setName(e.target.value)}
            placeholder={isFuture ? 'e.g. Who will win the NBA Championship?' : 'e.g. Who will win Regular Season MVP?'} />
        </div>

        <div>
          <label className="sports-label">Outcomes * <span style={{ color: '#64748b', fontWeight: 400 }}>(comma-separated)</span></label>
          <textarea className="sports-input" value={outcomesText} onChange={e => setOutcomes(e.target.value)}
            placeholder="e.g. Celtics, Thunder, Lakers, Heat" rows={3}
            style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          {outcomesText && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {outcomesText.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                <span key={t} style={{ background: 'rgba(129,140,248,0.12)', color: '#a5b4fc', padding: '2px 10px', borderRadius: 6, fontSize: 12 }}>{t}</span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="sports-label">Start Date & Time *</label>
          <input type="datetime-local" className="sports-input" value={eventDate} onChange={e => setEventDate(e.target.value)} style={{ colorScheme: 'dark' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(71,85,105,0.3)', borderRadius: 9 }}>
          <input type="checkbox" id="multiWin" checked={multiWinner} onChange={e => setMultiWinner(e.target.checked)} style={{ accentColor: '#d4af37', width: 15, height: 15 }} />
          <label htmlFor="multiWin" style={{ color: '#cbd5e1', fontSize: 13, cursor: 'pointer' }}>
            Allow multiple winners <span style={{ color: '#64748b', fontSize: 12 }}>(users can select more than one outcome)</span>
          </label>
        </div>

        <div>
          <label className="sports-label">Banner Image (optional)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(71,85,105,0.5)', borderRadius: 8, padding: '7px 12px', fontSize: 11, color: '#94a3b8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              📁 Choose Banner
              <input type="file" accept="image/*" onChange={handleBanner} style={{ display: 'none' }} />
            </label>
            {banner && (
              <div style={{ position: 'relative' }}>
                <img src={banner} style={{ width: 50, height: 34, borderRadius: 6, objectFit: 'cover', border: '1px solid rgba(71,85,105,0.5)' }} />
                <button type="button" onClick={() => setBanner('')} style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 14, height: 14, fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginTop: 14, fontSize: 13, background: message.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${message.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: message.startsWith('✅') ? '#86efac' : '#fca5a5' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button onClick={onClose} className="sports-btn-secondary" style={{ flex: 1 }}>Cancel</button>
        <button onClick={handleCreate} disabled={loading} className="sports-btn-primary" style={{ flex: 2 }}>
          {loading ? 'Creating…' : `🚀 Publish ${isFuture ? 'Future' : 'Award'}`}
        </button>
      </div>
    </div>
  );
}

// ─── Resolution Modals ────────────────────────────────────────────────────────

function BinaryResolutionModal({ market, onClose, onResolve, loading }) {
  const [winner, setWinner] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const outcomes = market.outcomes || [];

  const handleSubmit = () => {
    if (!winner) return;
    if (!confirmed) { setConfirmed(true); return; }
    onResolve(market, [winner]);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="sports-modal-card" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>◈ Resolve Market</div>
            <h3 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{market.title}</h3>
          </div>
          <button onClick={onClose} className="sports-icon-btn">✕</button>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>Select the winning outcome.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {outcomes.map(o => (
            <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: winner === o.id ? 'rgba(212,175,55,0.1)' : 'rgba(15,23,42,0.5)', border: `1px solid ${winner === o.id ? 'rgba(212,175,55,0.4)' : 'rgba(71,85,105,0.3)'}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
              <input type="radio" name="winner" value={o.id} checked={winner === o.id} onChange={() => { setWinner(o.id); setConfirmed(false); }} style={{ display: 'none' }} />
              <span style={{ fontSize: 16 }}>{o.title === 'Yes' ? '✅' : o.title === 'No' ? '❌' : '🏆'}</span>
              <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{o.title}</span>
              <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 12 }}>{o.probability}%</span>
            </label>
          ))}
        </div>
        {confirmed && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#fbbf24', fontSize: 13 }}>
            ⚠️ Resolving as <strong>{outcomes.find(o => o.id === winner)?.title}</strong>. Cannot be undone.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="sports-btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!winner || loading} className="sports-btn-primary"
            style={{ flex: 2, background: confirmed ? 'linear-gradient(135deg,#d97706,#d4af37)' : undefined }}>
            {loading ? 'Resolving…' : confirmed ? '✅ Confirm Resolution' : 'Review →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GradientResolutionModal({ market, onClose, onResolve, loading }) {
  const [val, setVal] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = () => {
    if (!val) return;
    if (!confirmed) { setConfirmed(true); return; }
    const outcome = (market.outcomes || [])[0];
    if (outcome) onResolve(market, val);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="sports-modal-card" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>〰 Gradient Resolution</div>
            <h3 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{market.title}</h3>
          </div>
          <button onClick={onClose} className="sports-icon-btn">✕</button>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="sports-label">Actual Stat Value</label>
          <input type="number" className="sports-input" value={val} onChange={e => { setVal(e.target.value); setConfirmed(false); }} placeholder="e.g. 28.5" autoFocus />
        </div>
        {confirmed && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#fbbf24', fontSize: 13 }}>
            ⚠️ Resolving with actual value: <strong>{val}</strong>. Cannot be undone.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="sports-btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!val || loading} className="sports-btn-primary"
            style={{ flex: 2, background: confirmed ? 'linear-gradient(135deg,#d97706,#d4af37)' : undefined }}>
            {loading ? 'Resolving…' : confirmed ? '✅ Confirm' : 'Review →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ submarkets, onClick }) {
  const meta = parseMeta(submarkets[0]);
  const status = getEventStatus(submarkets);
  const totalPreds = submarkets.reduce((s, sm) => s + (sm._predCount || 0), 0);
  const totalVol = submarkets.reduce((s, sm) => s + (sm.total_volume || 0), 0);
  const isMatch = (meta.event_type || 'game') === 'game';
  const isFuture = meta.event_type === 'future';

  return (
    <div className="sports-event-card" onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <StatusPill status={status} />
        <span style={{ color: '#d4af37', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
          {isMatch ? '🏟️ Match' : isFuture ? '🔮 Future' : '🏅 Award'}
        </span>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 14, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isMatch ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%' }}>
            <div style={{ textAlign: 'right', flex: 1 }}>
              {meta.home_logo && <img src={meta.home_logo} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginBottom: 3, display: 'block', marginLeft: 'auto' }} />}
              <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>{meta.home_team || 'Home'}</div>
            </div>
            <div style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, padding: '4px 10px', color: '#d4af37', fontWeight: 800, fontSize: 11 }}>VS</div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              {meta.away_logo && <img src={meta.away_logo} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginBottom: 3, display: 'block' }} />}
              <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>{meta.away_team || 'Away'}</div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', width: '100%' }}>
            {meta.event_image && <img src={meta.event_image} style={{ width: 40, height: 28, borderRadius: 4, objectFit: 'cover', marginBottom: 6 }} />}
            <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 14, lineHeight: 1.3 }}>{meta.event_name || submarkets[0]?.title}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderTop: '1px solid rgba(71,85,105,0.2)', paddingTop: 10, paddingBottom: 8 }}>
        {[['Predictions', totalPreds], ['Volume', `$${totalVol.toLocaleString(undefined, { maximumFractionDigits: 0 })}`]].map(([l, v]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>{v}</div>
            <div style={{ color: '#64748b', fontSize: 10 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(71,85,105,0.2)', paddingTop: 8, fontSize: 11, color: '#94a3b8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>📅 Starts:</span>
          <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{fmtDate(meta.event_date || submarkets[0]?.close_date)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Event Detail View ────────────────────────────────────────────────────────

function EventDetailView({ submarkets, predictions, onBack, onResolveSuccess }) {
  const mainMarket = submarkets[0];
  const meta = parseMeta(mainMarket);
  const status = getEventStatus(submarkets);
  const isMatch = (meta.event_type || 'game') === 'game';
  const { session } = useAuth();
  const isAdmin = session?.user?.email === 'donotreply.dobium@gmail.com';
  const API = RAW_API();

  const [resolvingMarket, setResolvingMarket] = useState(null);
  const [resolveType, setResolveType] = useState(null);
  const [resolveLoading, setResolveLoading] = useState(false);

  const totalPreds = submarkets.reduce((s, sm) => s + (sm._predCount || 0), 0);
  const totalVol = submarkets.reduce((s, sm) => s + (sm.total_volume || 0), 0);

  const handleUpdateMatchState = async (updates) => {
    const marketIds = submarkets.map(sm => sm.id);
    try {
      const res = await fetch(`${API}/api/admin/sports/match-state`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketIds, matchState: updates, adminEmail: session?.user?.email }),
      });
      if (res.ok) onResolveSuccess();
      else { const d = await res.json(); alert(`Error: ${d.error}`); }
    } catch { alert('Network error.'); }
  };

  const handleBinaryResolve = async (market, winnerIds) => {
    setResolveLoading(true);
    try {
      const res = await fetch(`${API}/api/markets/${market.id}/resolve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winning_outcome_ids: winnerIds }),
      });
      if (res.ok) { setResolvingMarket(null); onResolveSuccess(); }
      else { const d = await res.json(); alert(`Error: ${d.error}`); }
    } catch { alert('Network error.'); }
    finally { setResolveLoading(false); }
  };

  const handleGradientResolve = async (market, statValue) => {
    setResolveLoading(true);
    try {
      const outcome = (market.outcomes || [])[0];
      if (!outcome) { alert('No outcome found.'); setResolveLoading(false); return; }
      const res = await fetch(`${API}/api/markets/${market.id}/resolve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winning_outcome_ids: [outcome.id], actual_stat: parseFloat(statValue) }),
      });
      if (res.ok) { setResolvingMarket(null); onResolveSuccess(); }
      else { const d = await res.json(); alert(`Error: ${d.error}`); }
    } catch { alert('Network error.'); }
    finally { setResolveLoading(false); }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm(`Delete this event? This cannot be undone.`)) return;
    try {
      for (const sm of submarkets) {
        await fetch(`${API}/api/markets/${sm.id}`, { method: 'DELETE' });
      }
      onBack();
      onResolveSuccess();
    } catch { alert('Network error.'); }
  };

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 16 }}>
        ← Back to events
      </button>

      {/* Game Clock — only for matches and admins */}
      {isAdmin && isMatch && (
        <GameClockManager
          submarkets={submarkets}
          sportId={meta.sport || 'basketball'}
          homeTeam={meta.home_team || 'Home'}
          awayTeam={meta.away_team || 'Away'}
          onUpdateMatchState={handleUpdateMatchState}
        />
      )}

      {/* Event header */}
      <div style={{ background: 'linear-gradient(135deg,rgba(13,24,41,0.9),rgba(7,16,32,0.9))', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 14, padding: 20, position: 'relative', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ position: 'absolute', right: 20, top: 10, fontSize: 64, opacity: 0.05 }}>🏟️</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ marginBottom: 8 }}><StatusPill status={status} /></div>
            {isMatch ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {meta.home_logo && <img src={meta.home_logo} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />}
                <span style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800 }}>{meta.home_team}</span>
                <span style={{ color: '#d4af37', fontSize: 14, fontWeight: 700 }}>vs</span>
                <span style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800 }}>{meta.away_team}</span>
                {meta.away_logo && <img src={meta.away_logo} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800 }}>{meta.event_name || mainMarket?.title}</span>
                <span style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  {meta.event_type === 'future' ? '🔮 Future' : '🏅 Award'}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, color: '#94a3b8', fontSize: 12, marginTop: 8, flexWrap: 'wrap' }}>
              <div>📅 <strong>Start:</strong> {fmtDate(meta.event_date)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['Predictions', totalPreds], ['Volume', `$${totalVol.toLocaleString(undefined, { maximumFractionDigits: 0 })}`]].map(([l, v]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ color: '#d4af37', fontSize: 20, fontWeight: 800 }}>{v}</div>
                <div style={{ color: '#64748b', fontSize: 11 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Match Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
        {mainMarket.status !== 'resolved' ? (
          <button onClick={() => { setResolvingMarket(mainMarket); setResolveType(meta.submarket_type || mainMarket.market_type || 'binary'); }} className="sports-btn-primary" style={{ padding: '10px 24px', fontSize: 14 }}>
            ✅ Resolve Event
          </button>
        ) : (
          <span style={{ color: '#22c55e', fontSize: 14, fontWeight: 700, padding: '10px 24px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', borderRadius: 8 }}>
            ✓ Event Resolved
          </span>
        )}
        {isAdmin && (
          <button onClick={handleDeleteEvent} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            🗑️ Delete Event
          </button>
        )}
      </div>

      {resolvingMarket && resolveType !== 'gradient' && (
        <BinaryResolutionModal market={resolvingMarket} onClose={() => setResolvingMarket(null)} onResolve={handleBinaryResolve} loading={resolveLoading} />
      )}
      {resolvingMarket && resolveType === 'gradient' && (
        <GradientResolutionModal market={resolvingMarket} predictions={predictions} onClose={() => setResolvingMarket(null)} onResolve={handleGradientResolve} loading={resolveLoading} />
      )}
    </div>
  );
}

// ─── Main SportsDashboard ─────────────────────────────────────────────────────

export default function SportsDashboard() {
  const API = RAW_API();

  // ── State ──────────────────────────────────────────────────────────────────
  const [leagues, setLeagues] = useState(() => loadLS(LS_LEAGUES, {}));
  // leagues shape: { [sportId]: [{ name, startDate, endDate, description }] }

  const [sportsMarkets, setSportsMarkets] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [selectedSportId, setSelectedSportId] = useState('basketball');
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedEventKey, setSelectedEventKey] = useState(null);

  // panelMode: 'league' | 'event' | 'create-match' | 'create-future' | 'create-award'
  const [panelMode, setPanelMode] = useState('league');
  const [eventGroupFilter, setGroupFilter] = useState('game');
  const [showAddLeague, setShowAddLeague] = useState(false);
  const [expandedSports, setExpandedSports] = useState({ basketball: true });

  const saveLeagues = (val) => { setLeagues(val); saveLS(LS_LEAGUES, val); };

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [mRes, pRes] = await Promise.all([fetch(`${API}/api/markets`), fetch(`${API}/api/predictions`)]);
      const markets = await mRes.json();
      const preds = await pRes.json();
      const sports = Array.isArray(markets) ? markets.filter(m => m.category === 'sports') : [];
      const predList = Array.isArray(preds) ? preds : [];
      setSportsMarkets(sports.map(m => ({ ...m, _predCount: predList.filter(p => p.market_id === m.id && p.status === 'active').length })));
      setPredictions(predList);
    } catch (err) { console.error(err); }
    finally { setDataLoading(false); }
  }, [API]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived data ───────────────────────────────────────────────────────────
  // sport → league → markets map from server data
  const sportLeagueMap = useMemo(() => {
    const map = {};
    SPORTS.forEach(s => { map[s.id] = {}; });
    sportsMarkets.forEach(m => {
      const meta = parseMeta(m);
      const sid = meta.sport || 'other';
      const lname = meta.league || 'General';
      if (!map[sid]) map[sid] = {};
      if (!map[sid][lname]) map[sid][lname] = [];
      map[sid][lname].push(m);
    });
    return map;
  }, [sportsMarkets]);

  // All leagues for a sport: from localStorage (admin-created) ∪ inferred from markets
  const getLeaguesForSport = useCallback((sportId) => {
    const fromCustom = (leagues[sportId] || []).map(l => l.name);
    const fromMarkets = Object.keys(sportLeagueMap[sportId] || {});
    return [...new Set([...fromCustom, ...fromMarkets])];
  }, [leagues, sportLeagueMap]);

  const getLeagueObj = (sportId, name) => (leagues[sportId] || []).find(l => l.name === name) || { name };

  // Events grouped by match key / future-award key
  const leagueEvents = useMemo(() => {
    if (!selectedLeague || !selectedSportId) return {};
    const leagueMarkets = (sportLeagueMap[selectedSportId] || {})[selectedLeague] || [];
    const events = {};
    leagueMarkets.forEach(m => {
      const meta = parseMeta(m);
      const isMatch = (meta.event_type || 'game') === 'game';
      const key = isMatch
        ? `game__${meta.home_team || '?'}__${meta.away_team || '?'}__${meta.event_date || ''}`
        : `${meta.event_type}__${meta.event_name || m.title}__${meta.event_date || ''}`;
      if (!events[key]) events[key] = { key, meta, submarkets: [] };
      events[key].submarkets.push(m);
    });
    return events;
  }, [sportLeagueMap, selectedSportId, selectedLeague]);

  const allEvents = Object.values(leagueEvents);
  const currentEvent = selectedEventKey ? leagueEvents[selectedEventKey] : null;
  const selectedSport = SPORTS.find(s => s.id === selectedSportId) || SPORTS[0];

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddLeague = (sportId, leagueObj) => {
    const prev = leagues[sportId] || [];
    if (prev.find(l => l.name === leagueObj.name)) return;
    saveLeagues({ ...leagues, [sportId]: [...prev, leagueObj] });
    setSelectedLeague(leagueObj.name);
    setPanelMode('league');
  };

  const handleDeleteLeague = (sportId, name) => {
    if (!window.confirm(`Remove "${name}" from the sidebar? Existing markets are NOT deleted.`)) return;
    saveLeagues({ ...leagues, [sportId]: (leagues[sportId] || []).filter(l => l.name !== name) });
    if (selectedLeague === name) setSelectedLeague(null);
  };

  const selectLeague = (sportId, name) => {
    setSelectedSportId(sportId); setSelectedLeague(name);
    setSelectedEventKey(null); setPanelMode('league');
  };

  const selectEvent = (key) => { setSelectedEventKey(key); setPanelMode('event'); };

  const toggleSport = (sportId) => {
    setExpandedSports(p => ({ ...p, [sportId]: !p[sportId] }));
    setSelectedSportId(sportId);
    setSelectedLeague(null); setSelectedEventKey(null); setPanelMode('league');
  };

  const goCreate = (mode) => setPanelMode(mode);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 620, background: '#070f1e', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(71,85,105,0.3)' }}>

      {/* ── Sidebar ── */}
      <div className="sports-sidebar">
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(71,85,105,0.2)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 1.5 }}>Sports Markets</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }} className="custom-scrollbar">
          {SPORTS.map(sport => {
            const leagueNames = getLeaguesForSport(sport.id);
            const isExpanded = expandedSports[sport.id];
            const isActive = selectedSportId === sport.id;

            return (
              <div key={sport.id}>
                <button onClick={() => toggleSport(sport.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 14px', background: 'none', border: 'none',
                  color: isActive ? '#f1f5f9' : '#94a3b8', cursor: 'pointer',
                  fontSize: 13, fontWeight: isActive ? 700 : 500, textAlign: 'left', transition: 'color 0.15s',
                }}>
                  <span style={{ fontSize: 15 }}>{sport.icon}</span>
                  <span style={{ flex: 1 }}>{sport.label}</span>
                  {leagueNames.length > 0 && (
                    <span style={{ fontSize: 9, color: '#64748b', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
                  )}
                </button>

                {isExpanded && (
                  <div style={{ paddingLeft: 8 }}>
                    {leagueNames.map(name => {
                      const isActiveLeague = selectedLeague === name && selectedSportId === sport.id;
                      const isCustom = (leagues[sport.id] || []).some(l => l.name === name);
                      return (
                        <div key={name} style={{ display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => { const d = e.currentTarget.querySelector('.ldel'); if (d) d.style.opacity = '1'; }}
                          onMouseLeave={e => { const d = e.currentTarget.querySelector('.ldel'); if (d) d.style.opacity = '0'; }}>
                          <button onClick={() => selectLeague(sport.id, name)} style={{
                            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                            padding: '7px 14px 7px 24px', background: 'none', border: 'none',
                            color: isActiveLeague ? '#d4af37' : '#64748b',
                            borderLeft: `2px solid ${isActiveLeague ? '#d4af37' : 'transparent'}`,
                            cursor: 'pointer', fontSize: 12, fontWeight: 500, textAlign: 'left', transition: 'all 0.15s',
                          }}>
                            <span style={{ fontSize: 11 }}>📋</span>
                            <span style={{ lineHeight: 1.2, flex: 1 }}>{name}</span>
                          </button>
                          {isCustom && (
                            <button className="ldel" onClick={() => handleDeleteLeague(sport.id, name)}
                              title="Remove league" style={{ opacity: 0, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, padding: '4px 6px', transition: 'opacity 0.15s' }}>✕</button>
                          )}
                        </div>
                      );
                    })}
                    <button onClick={() => { setSelectedSportId(sport.id); setShowAddLeague(true); }} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                      padding: '6px 14px 6px 24px', background: 'none', border: 'none',
                      color: '#475569', cursor: 'pointer', fontSize: 11, textAlign: 'left', transition: 'color 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = '#22c55e'}
                      onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                      <span style={{ fontSize: 13 }}>＋</span> <span>Add League</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Panel ── */}
      <div style={{ flex: 1, padding: 24, overflowY: 'auto', minWidth: 0 }} className="custom-scrollbar">
        {dataLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#475569', fontSize: 14 }}>Loading sports markets…</div>

        ) : panelMode === 'event' && currentEvent ? (
          <EventDetailView
            submarkets={currentEvent.submarkets}
            predictions={predictions}
            onBack={() => { setSelectedEventKey(null); setPanelMode('league'); }}
            onResolveSuccess={fetchData}
          />

        ) : panelMode === 'create-match' ? (
          <CreateMatchForm sport={selectedSport} leagueName={selectedLeague} onClose={() => setPanelMode('league')} onCreate={fetchData} />

        ) : panelMode === 'create-future' ? (
          <CreateNonMatchForm type="future" sport={selectedSport} leagueName={selectedLeague} onClose={() => setPanelMode('league')} onCreate={fetchData} />

        ) : panelMode === 'create-award' ? (
          <CreateNonMatchForm type="award" sport={selectedSport} leagueName={selectedLeague} onClose={() => setPanelMode('league')} onCreate={fetchData} />

        ) : selectedLeague ? (
          /* ── League view ── */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{selectedSport.icon} {selectedSport.label}</div>
                <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800, margin: 0 }}>{selectedLeague}</h2>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                  {allEvents.length} event{allEvents.length !== 1 ? 's' : ''} · {(sportLeagueMap[selectedSportId] || {})[selectedLeague]?.length || 0} markets
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => goCreate('create-match')} className="sports-btn-primary" style={{ fontSize: 12 }}>🏟️ New Match</button>
                <button onClick={() => goCreate('create-future')} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(129,140,248,0.4)', background: 'rgba(99,102,241,0.1)', color: '#818cf8', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🔮 New Future</button>
                <button onClick={() => goCreate('create-award')} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(251,146,60,0.4)', background: 'rgba(251,146,60,0.1)', color: '#fb923c', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🏅 New Award</button>
              </div>
            </div>

            {/* Group filter tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(71,85,105,0.2)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
              {[{ id: 'game', label: '🏟️ Matches' }, { id: 'future', label: '🔮 Futures' }, { id: 'award', label: '🏅 Awards' }].map(tab => {
                const count = allEvents.filter(ev => (ev.meta.event_type || 'game') === tab.id).length;
                return (
                  <button key={tab.id} onClick={() => setGroupFilter(tab.id)} style={{
                    padding: '6px 12px', borderRadius: 7, border: 'none',
                    background: eventGroupFilter === tab.id ? 'rgba(212,175,55,0.12)' : 'none',
                    color: eventGroupFilter === tab.id ? '#d4af37' : '#64748b',
                    fontWeight: eventGroupFilter === tab.id ? 700 : 500,
                    fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                  }}>
                    <span>{tab.label}</span>
                    <span style={{ fontSize: 10, background: eventGroupFilter === tab.id ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)', color: eventGroupFilter === tab.id ? '#d4af37' : '#475569', padding: '1px 5px', borderRadius: 6 }}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Events grid */}
            {(() => {
              const filtered = allEvents.filter(ev => (ev.meta.event_type || 'game') === eventGroupFilter);
              if (filtered.length === 0) return (
                <div style={{ textAlign: 'center', padding: '60px 24px', border: '2px dashed rgba(71,85,105,0.3)', borderRadius: 16, color: '#475569' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>{selectedSport.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                    No {eventGroupFilter === 'game' ? 'matches' : eventGroupFilter + 's'} in {selectedLeague} yet
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 20 }}>
                    {eventGroupFilter === 'game' ? 'Create a match to get started.' : `Create a ${eventGroupFilter} market to get started.`}
                  </div>
                  <button onClick={() => goCreate(`create-${eventGroupFilter === 'game' ? 'match' : eventGroupFilter}`)} className="sports-btn-primary">
                    {eventGroupFilter === 'game' ? '🏟️ Create Match' : eventGroupFilter === 'future' ? '🔮 Create Future' : '🏅 Create Award'}
                  </button>
                </div>
              );
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
                  {filtered.map(ev => <EventCard key={ev.key} submarkets={ev.submarkets} onClick={() => selectEvent(ev.key)} />)}
                </div>
              );
            })()}
          </div>

        ) : (
          /* ── Sport overview ── */
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800, margin: 0 }}>{selectedSport.icon} {selectedSport.label}</h2>
              <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Select a league from the sidebar, or create one.</p>
            </div>
            {getLeaguesForSport(selectedSportId).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', border: '2px dashed rgba(71,85,105,0.3)', borderRadius: 16 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>{selectedSport.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>No leagues for {selectedSport.label} yet</div>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>Add a league first, then create events within it.</div>
                <button onClick={() => setShowAddLeague(true)} className="sports-btn-primary">📋 Add First League</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
                {getLeaguesForSport(selectedSportId).map(name => {
                  const count = ((sportLeagueMap[selectedSportId] || {})[name] || []).length;
                  const obj = getLeagueObj(selectedSportId, name);
                  return (
                    <button key={name} onClick={() => selectLeague(selectedSportId, name)} className="sports-event-card" style={{ textAlign: 'left', cursor: 'pointer' }}>
                      <div style={{ fontSize: 24, marginBottom: 10 }}>📋</div>
                      <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{name}</div>
                      <div style={{ color: '#64748b', fontSize: 12 }}>{count} market{count !== 1 ? 's' : ''}</div>
                      {obj.startDate && (
                        <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>
                          {new Date(obj.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {obj.endDate && ` – ${new Date(obj.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                        </div>
                      )}
                      {obj.description && <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>{obj.description}</div>}
                    </button>
                  );
                })}
                <button onClick={() => setShowAddLeague(true)} style={{ textAlign: 'center', padding: 24, background: 'none', border: '2px dashed rgba(71,85,105,0.3)', borderRadius: 14, color: '#475569', cursor: 'pointer', fontSize: 13, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.color = '#d4af37'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(71,85,105,0.3)'; e.currentTarget.style.color = '#475569'; }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>Add League
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showAddLeague && (
        <AddLeagueModal
          sportLabel={`${selectedSport.icon} ${selectedSport.label}`}
          onClose={() => setShowAddLeague(false)}
          onAdd={(obj) => handleAddLeague(selectedSportId, obj)}
        />
      )}
    </div>
  );
}
