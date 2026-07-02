import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Sport config ─────────────────────────────────────────────────────────────

const SPORT_CONFIG = {
  basketball: {
    periods: 4, periodName: 'Quarter', periodShort: 'Q',
    periodMinutes: 12, otMinutes: 5, clockDown: true,
    scoreUnit: 'pts',
  },
  soccer: {
    periods: 2, periodName: 'Half', periodShort: 'H',
    periodMinutes: 45, otMinutes: 15, clockDown: false,
    scoreUnit: 'gls',
  },
  football: {
    periods: 4, periodName: 'Quarter', periodShort: 'Q',
    periodMinutes: 15, otMinutes: 10, clockDown: true,
    scoreUnit: 'pts',
  },
  tennis: {
    periods: 5, periodName: 'Set', periodShort: 'Set',
    periodMinutes: null, otMinutes: null, clockDown: false,
    scoreUnit: 'sets',
  },
  baseball: {
    periods: 9, periodName: 'Inning', periodShort: 'Inn',
    periodMinutes: null, otMinutes: null, clockDown: false,
    scoreUnit: 'runs',
  },
};

const DEFAULT_CONFIG = {
  periods: 2, periodName: 'Period', periodShort: 'P',
  periodMinutes: 20, otMinutes: 10, clockDown: true, scoreUnit: 'pts',
};

const getConfig = (sportId) => SPORT_CONFIG[sportId] || DEFAULT_CONFIG;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toSecs = (minutes) => (minutes || 0) * 60;

const formatClock = (secs) => {
  const s = Math.max(0, secs);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

const getPeriodLabel = (sportId, period, isOT) => {
  if (isOT) return sportId === 'soccer' ? 'Extra Time' : 'OT';
  const cfg = getConfig(sportId);
  switch (sportId) {
    case 'basketball': return `Q${period}`;
    case 'soccer':     return period === 1 ? '1st Half' : '2nd Half';
    case 'football':   return `Q${period}`;
    case 'tennis':     return `Set ${period}`;
    case 'baseball':   return `${period}${['st','nd','rd'][period - 1] || 'th'} Inning`;
    default:           return `${cfg.periodShort}${period}`;
  }
};

const getMatchPhaseLabel = (sportId, period, isOT, clockSecs, clockDown) => {
  const cfg = getConfig(sportId);
  const pd  = getPeriodLabel(sportId, period, isOT);
  if (cfg.clockDown && clockSecs !== null) return `${pd} · ${formatClock(clockSecs)}`;
  if (!cfg.clockDown && clockSecs !== null) return `${pd} · ${clockSecs}'`;
  return pd;
};

// ─── Score Adjuster ───────────────────────────────────────────────────────────

function ScoreAdjuster({ label, logo, score, onIncrement, onDecrement, color = '#f1f5f9' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {logo && <img src={logo} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />}
        <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>{label}</span>
      </div>
      <button onClick={onIncrement} style={{
        width: 34, height: 34, borderRadius: '50%', background: 'rgba(34,197,94,0.15)',
        border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', fontSize: 20,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        transition: 'all 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.15)'}>
        +
      </button>
      <div style={{ fontSize: 40, fontWeight: 800, color, minWidth: 56, textAlign: 'center', lineHeight: 1 }}>
        {score}
      </div>
      <button onClick={onDecrement} disabled={score <= 0} style={{
        width: 34, height: 34, borderRadius: '50%', background: score > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(71,85,105,0.1)',
        border: `1px solid ${score > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(71,85,105,0.2)'}`,
        color: score > 0 ? '#f87171' : '#475569', fontSize: 20,
        cursor: score > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        transition: 'all 0.15s',
      }}
        onMouseEnter={e => { if (score > 0) e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; }}
        onMouseLeave={e => { if (score > 0) e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}>
        −
      </button>
    </div>
  );
}

// ─── GameClockManager ─────────────────────────────────────────────────────────

export default function GameClockManager({ submarkets, sportId, homeTeam, awayTeam, onUpdateMatchState }) {
  const cfg = getConfig(sportId);

  // Score
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  // Period / OT
  const [period, setPeriod]   = useState(1);
  const [isOT, setIsOT]       = useState(false);

  // Clock
  const initClockSecs = cfg.clockDown ? toSecs(cfg.periodMinutes) : 0;
  const [clockSecs, setClockSecs] = useState(initClockSecs);
  const [clockRunning, setClockRunning] = useState(false);

  // Status
  const [matchStatus, setMatchStatus] = useState('pre-match'); // 'pre-match' | 'live' | 'half-time' | 'full-time'

  // Save feedback
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  // Extract logos from first market's meta
  const firstMeta = (() => {
    try { return JSON.parse(submarkets[0]?.description || '{}'); } catch { return {}; }
  })();
  const homeLogo = firstMeta.home_logo;
  const awayLogo = firstMeta.away_logo;

  // ── Clock tick ──────────────────────────────────────────────────────────────
  const tickRef = useRef(null);

  const stopClock = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    setClockRunning(false);
  }, []);

  const startClock = useCallback(() => {
    if (tickRef.current) return;
    setClockRunning(true);
    tickRef.current = setInterval(() => {
      setClockSecs(prev => {
        if (cfg.clockDown) {
          if (prev <= 0) { stopClock(); return 0; }
          return prev - 1;
        } else {
          return prev + 1;
        }
      });
    }, 1000);
  }, [cfg.clockDown, stopClock]);

  useEffect(() => () => stopClock(), [stopClock]);

  // ── Period nav ──────────────────────────────────────────────────────────────
  const nextPeriod = () => {
    stopClock();
    if (period >= cfg.periods) {
      setIsOT(true);
      setClockSecs(cfg.clockDown ? toSecs(cfg.otMinutes || cfg.periodMinutes) : 0);
    } else {
      setPeriod(p => p + 1);
      setClockSecs(cfg.clockDown ? toSecs(cfg.periodMinutes) : 0);
    }
    setMatchStatus('live');
  };

  const prevPeriod = () => {
    stopClock();
    if (isOT) { setIsOT(false); setClockSecs(cfg.clockDown ? toSecs(cfg.periodMinutes) : 0); }
    else if (period > 1) { setPeriod(p => p - 1); setClockSecs(cfg.clockDown ? toSecs(cfg.periodMinutes) : 0); }
  };

  const resetClock = () => {
    stopClock();
    setClockSecs(cfg.clockDown ? toSecs(cfg.periodMinutes) : 0);
  };

  // ── Status helpers ──────────────────────────────────────────────────────────
  const statusOptions = [
    { id: 'pre-match', label: '⏳ Pre-Match' },
    { id: 'live',      label: '🟢 Live'      },
    { id: 'half-time', label: '⏸ Half-Time'  },
    { id: 'full-time', label: '🏁 Full-Time'  },
  ];

  // ── Save to backend ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setSaved(false);
    const matchState = {
      home_score: homeScore,
      away_score: awayScore,
      period,
      is_ot: isOT,
      clock_secs: clockSecs,
      match_status: matchStatus,
      phase_label: getMatchPhaseLabel(sportId, period, isOT, clockSecs, cfg.clockDown),
    };
    try {
      await onUpdateMatchState(matchState);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  // ── Score display string ────────────────────────────────────────────────────
  const phaseLabel = getMatchPhaseLabel(sportId, period, isOT, clockSecs, cfg.clockDown);

  return (
    <div style={{
      background: 'linear-gradient(135deg,rgba(7,16,32,0.95),rgba(13,24,41,0.95))',
      border: '1px solid rgba(71,85,105,0.4)', borderRadius: 14, padding: 20, marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          Live Match Control
        </div>
        <select value={matchStatus} onChange={e => setMatchStatus(e.target.value)}
          style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 8, color: '#f1f5f9', padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
          {statusOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {/* Score board */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, marginBottom: 20 }}>
        <ScoreAdjuster
          label={homeTeam}
          logo={homeLogo}
          score={homeScore}
          onIncrement={() => setHomeScore(s => s + 1)}
          onDecrement={() => setHomeScore(s => Math.max(0, s - 1))}
          color="#60a5fa"
        />

        {/* Center: period + clock */}
        <div style={{ textAlign: 'center', minWidth: 100 }}>
          <div style={{ color: '#d4af37', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            {getPeriodLabel(sportId, period, isOT)}
          </div>
          {cfg.periodMinutes !== null && (
            <div style={{ color: '#f1f5f9', fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: 2 }}>
              {cfg.clockDown ? formatClock(clockSecs) : `${clockSecs}'`}
            </div>
          )}
          <div style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>{cfg.scoreUnit.toUpperCase()}</div>
        </div>

        <ScoreAdjuster
          label={awayTeam}
          logo={awayLogo}
          score={awayScore}
          onIncrement={() => setAwayScore(s => s + 1)}
          onDecrement={() => setAwayScore(s => Math.max(0, s - 1))}
          color="#f472b6"
        />
      </div>

      {/* Clock controls (only for timed sports) */}
      {cfg.periodMinutes !== null && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={clockRunning ? stopClock : startClock} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
            background: clockRunning ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
            color: clockRunning ? '#f87171' : '#4ade80',
            border: `1px solid ${clockRunning ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
            transition: 'all 0.15s',
          }}>
            {clockRunning ? '⏸ Pause' : '▶ Start'}
          </button>
          <button onClick={resetClock} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(71,85,105,0.4)', background: 'rgba(71,85,105,0.1)', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            ↺ Reset
          </button>
        </div>
      )}

      {/* Period controls */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={prevPeriod} disabled={period <= 1 && !isOT} style={{
          padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(71,85,105,0.4)',
          background: 'rgba(71,85,105,0.1)', color: period > 1 || isOT ? '#94a3b8' : '#475569',
          cursor: period > 1 || isOT ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600,
        }}>← Prev {cfg.periodName}</button>

        <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', minWidth: 80 }}>
          {isOT ? 'Overtime' : `${getPeriodLabel(sportId, period, false)} of ${cfg.periods}`}
        </div>

        <button onClick={nextPeriod} style={{
          padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(71,85,105,0.3)',
          background: 'rgba(212,175,55,0.08)', color: '#d4af37', cursor: 'pointer', fontSize: 12, fontWeight: 600,
        }}>Next {isOT ? 'OT' : cfg.periodName} →</button>
      </div>

      {/* Phase summary + save */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(71,85,105,0.3)', borderRadius: 9 }}>
        <div style={{ color: '#94a3b8', fontSize: 12 }}>
          <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{homeTeam} {homeScore}</span>
          <span style={{ margin: '0 8px', color: '#475569' }}>—</span>
          <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{awayScore} {awayTeam}</span>
          <span style={{ marginLeft: 12, color: '#64748b' }}>{phaseLabel}</span>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '7px 18px', borderRadius: 8, border: 'none',
          background: saved ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg,#1e3a5f,#1a3050)',
          color: saved ? '#4ade80' : '#d4af37', cursor: saving ? 'wait' : 'pointer',
          fontWeight: 700, fontSize: 13, border: `1px solid ${saved ? 'rgba(34,197,94,0.4)' : 'rgba(212,175,55,0.3)'}`,
          transition: 'all 0.2s',
        }}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : '💾 Push Update'}
        </button>
      </div>
    </div>
  );
}
