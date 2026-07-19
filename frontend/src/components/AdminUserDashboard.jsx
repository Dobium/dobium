import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import { formatCurrency } from '../store/storage';
import ActivityHistory from './ActivityHistory';

function EquityChart({ equityPoints, startingBalance, currentValue }) {
  const baseRef = useRef(null);
  const overlayRef = useRef(null);
  const hoverRef = useRef(null);
  const animRef = useRef(null);
  const scaleRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const isProfit = currentValue >= startingBalance;
  const lineColor = isProfit ? '#22c55e' : '#ef4444';
  const colorRgb = isProfit ? '34,197,94' : '239,68,68';
  const PAD = { t: 20, r: 8, b: 8, l: 8 };

  const computeScale = useCallback((w, h) => {
    if (!equityPoints || equityPoints.length < 2) return null;
    const gw = w - PAD.l - PAD.r;
    const gh = h - PAD.t - PAD.b;
    const vals = equityPoints.map(p => p.value);
    const allVals = [startingBalance, ...vals];
    const dataMin = Math.min(...allVals);
    const dataMax = Math.max(...allVals);
    const pad = Math.max((dataMax - dataMin) * 0.15, 50);
    const min = dataMin - pad;
    const max = dataMax + pad;
    const range = max - min || 1;
    const xs = equityPoints.map((_, i) => PAD.l + (i / (equityPoints.length - 1)) * gw);
    const ys = equityPoints.map(p => PAD.t + (1 - (p.value - min) / range) * gh);
    const baselineY = PAD.t + (1 - (startingBalance - min) / range) * gh;
    return { xs, ys, baselineY, w, h, gw, gh };
  }, [equityPoints, startingBalance, PAD.l, PAD.r, PAD.t, PAD.b]);

  useEffect(() => {
    const canvas = baseRef.current;
    if (!canvas || !equityPoints || equityPoints.length < 2) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const scale = computeScale(W, H);
    if (!scale) return;
    scaleRef.current = scale;

    const { xs, ys, baselineY } = scale;
    ctx.clearRect(0, 0, W, H);

    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.moveTo(0, baselineY);
    ctx.lineTo(W, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    const buildPath = (ctx) => {
      ctx.moveTo(xs[0], ys[0]);
      for (let i = 1; i < xs.length; i++) {
        const cpx = (xs[i - 1] + xs[i]) / 2;
        ctx.bezierCurveTo(cpx, ys[i - 1], cpx, ys[i], xs[i], ys[i]);
      }
    };

    const grad = ctx.createLinearGradient(0, PAD.t, 0, H - PAD.b);
    grad.addColorStop(0, `rgba(${colorRgb}, 0.22)`);
    grad.addColorStop(1, `rgba(${colorRgb}, 0)`);
    ctx.beginPath();
    buildPath(ctx);
    ctx.lineTo(xs[xs.length - 1], H - PAD.b);
    ctx.lineTo(xs[0], H - PAD.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    buildPath(ctx);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }, [equityPoints, startingBalance, lineColor, colorRgb, computeScale]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    let phase = 0;

    const frame = () => {
      const rect = overlay.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      overlay.width = rect.width * dpr;
      overlay.height = rect.height * dpr;
      const ctx = overlay.getContext('2d');
      ctx.scale(dpr, dpr);

      const W = rect.width;
      const H = rect.height;
      ctx.clearRect(0, 0, W, H);

      const scale = scaleRef.current || computeScale(W, H);
      if (!scale) { animRef.current = requestAnimationFrame(frame); return; }

      const { xs, ys } = scale;
      const lastX = xs[xs.length - 1];
      const lastY = ys[ys.length - 1];
      const hover = hoverRef.current;

      if (!hover) {
        phase += 0.04;
        const pulse = (Math.sin(phase) + 1) / 2;
        const ring = 7 + pulse * 9;
        const alpha = 0.45 * (1 - pulse);
        ctx.beginPath();
        ctx.arc(lastX, lastY, ring, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colorRgb}, ${alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
        ctx.fillStyle = lineColor;
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        ctx.moveTo(hover.x, PAD.t);
        ctx.lineTo(hover.x, H - PAD.b);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(hover.x, hover.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = lineColor;
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(frame);
    };

    animRef.current = requestAnimationFrame(frame);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [equityPoints, lineColor, colorRgb, computeScale]);

  const handleMouseMove = useCallback((e) => {
    const overlay = overlayRef.current;
    if (!overlay || !equityPoints || !scaleRef.current) return;
    const rect = overlay.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const { xs, ys } = scaleRef.current;
    const idx = Math.max(0, Math.min(Math.round(xRatio * (xs.length - 1)), xs.length - 1));
    const data = { x: xs[idx], y: ys[idx], value: equityPoints[idx].value, date: equityPoints[idx].date, pct: xs[idx] / rect.width };
    hoverRef.current = data;
    setTooltip(data);
  }, [equityPoints]);

  const handleMouseLeave = useCallback(() => {
    hoverRef.current = null;
    setTooltip(null);
  }, []);

  if (!equityPoints || equityPoints.length < 2) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-600 text-sm">No predictions yet to show equity chart.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" onMouseLeave={handleMouseLeave} style={{ position: 'relative' }}>
      <canvas ref={baseRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      <canvas ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair' }} onMouseMove={handleMouseMove} />
      {tooltip && (
        <div className="absolute top-2 pointer-events-none px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs z-10" style={{ left: `${Math.min(Math.max(tooltip.pct * 100, 5), 72)}%` }}>
          <p className="text-white font-semibold">${tooltip.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-slate-400">{new Date(tooltip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      )}
    </div>
  );
}

function calcPositionValue(stake, entryProbPct, currentProbPct) {
  const pEntry = entryProbPct / 100;
  const pCurrent = currentProbPct / 100;
  const rMin = stake * pEntry;
  const rMax = stake * (2 - pEntry);
  return rMin + (rMax - rMin) * pCurrent;
}

function getResolvedReturn(pred) {
  const S = pred.stake_amount || 0;
  const entryProbPct = pred.odds_at_prediction || 50;
  let returnAmount;

  if (pred.status === 'won') {
    returnAmount = (pred.actual_return && pred.actual_return > 0) ? pred.actual_return : calcPositionValue(S, entryProbPct, 100);
  } else if (pred.status === 'lost') {
    returnAmount = (pred.actual_return && pred.actual_return > 0) ? pred.actual_return : calcPositionValue(S, entryProbPct, 0);
  } else if (pred.status === 'sold') {
    const storedReturn = pred.actual_return || 0;
    const pEntry = entryProbPct / 100;
    const maxNewReturn = S * (2 - pEntry);

    if (storedReturn > maxNewReturn) {
      let pCurrent = S > 0 ? (storedReturn * pEntry) / S : 0;
      pCurrent = Math.min(1.0, Math.max(0, pCurrent));
      returnAmount = calcPositionValue(S, entryProbPct, pCurrent * 100);
    } else {
      returnAmount = storedReturn;
    }
  } else {
    returnAmount = 0;
  }
  return returnAmount;
}

export default function AdminUserDashboard({ user, onBack }) {
  const navigate = useNavigate();
  const { markets } = useMarkets();

  const [wallet, setWallet] = useState({});
  const [buyingPower, setBuyingPower] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);

  const [selectedRange, setSelectedRange] = useState('1D');
  const [predictions, setPredictions] = useState([]);
  const [allPredictions, setAllPredictions] = useState([]);
  const [showAllActivity, setShowAllActivity] = useState(false);

  const [resetLoading, setResetLoading] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [repairMsg, setRepairMsg] = useState('');

  const fetchWallet = useCallback(() => {
    setWalletLoading(true);
    fetch(`/api/users/${user.id}/balance`)
      .then(res => res.json())
      .then(data => {
        setWallet(data);
        setBuyingPower(data.balance || data.buying_power || 0);
      })
      .catch(console.error)
      .finally(() => setWalletLoading(false));
  }, [user.id]);

  const fetchPredictions = useCallback(() => {
    fetch(`/api/predictions`)
      .then(res => res.json())
      .then(data => {
        const allPreds = Array.isArray(data) ? data : [];
        const userPredictions = allPreds.filter(p => p.user_id === user.id);
        const activePredictions = userPredictions.filter(p => p.status === 'active');
        setAllPredictions(userPredictions);
        setPredictions(activePredictions);
      })
      .catch(() => {
        setPredictions([]);
        setAllPredictions([]);
      });
    fetchWallet();
  }, [user.id, fetchWallet]);

  useEffect(() => {
    fetchPredictions();
    const interval = setInterval(fetchPredictions, 60_000);
    return () => clearInterval(interval);
  }, [fetchPredictions]);

  const handleResetWallet = async () => {
    if (!window.confirm("Are you sure you want to delete all manual deposits and withdrawals for this user?")) return;
    setResetLoading(true);
    setRepairMsg('');
    try {
      const res = await fetch(`/api/users/${user.id}/reset-deposits`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setRepairMsg('Wallet deposits successfully reset.');
        fetchWallet();
      } else {
        setRepairMsg(`Error: ${data.error}`);
      }
    } catch (err) {
      setRepairMsg('Failed to connect to server.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleFixBalance = async () => {
    if (!window.confirm("Auto-cancel active trades to fix negative buying power for this user?")) return;
    setFixLoading(true);
    setRepairMsg('');
    try {
      const res = await fetch(`/api/users/${user.id}/fix-balance`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setRepairMsg(data.message || 'Buying power repaired.');
        fetchPredictions(); // Will also fetch wallet
      } else {
        setRepairMsg(`Error: ${data.error}`);
      }
    } catch (err) {
      setRepairMsg('Failed to connect to server.');
    } finally {
      setFixLoading(false);
    }
  };

  const startingBalance = wallet?.paper_starting_balance || wallet?.paperStartingBalance || 100000;
  const totalStaked = predictions.reduce((sum, p) => sum + (p.stake_amount || 0), 0);
  const settledPredictions = allPredictions.filter(p => p.status === 'won' || p.status === 'lost');
  const availableBalance = buyingPower;

  const activeMtmValue = predictions.reduce((sum, p) => {
    const market = markets.find(m => m.id === p.market_id);
    const outcome = market?.outcomes?.find(o => o.id === p.outcome_id);
    const pCurrent = outcome?.probability ?? p.odds_at_prediction ?? 50;
    return sum + calcPositionValue(p.stake_amount || 0, p.odds_at_prediction || 50, pCurrent);
  }, 0);

  const portfolioValue = availableBalance + activeMtmValue;
  const todayChange = portfolioValue - startingBalance;
  const todayChangePercent = startingBalance > 0 ? (todayChange / startingBalance) * 100 : 0;

  const totalPredictionCount = allPredictions.length;
  const wonCount = allPredictions.filter(p => p.status === 'won').length;
  const settledCount = settledPredictions.length;
  const accuracyPercent = settledCount > 0 ? Math.round((wonCount / settledCount) * 100) : 0;

  const buildEquityPoints = (preds) => {
    if (!preds.length) return [];

    const now = Date.now();

    const getMtm = (p) => {
      const market = markets.find(m => m.id === p.market_id);
      const outcome = market?.outcomes?.find(o => o.id === p.outcome_id);
      const pCurrent = outcome?.probability ?? p.odds_at_prediction ?? 50;
      return calcPositionValue(p.stake_amount || 0, p.odds_at_prediction || 50, pCurrent);
    };

    const startOfDay = new Date(Math.min(...preds.map(p => new Date(p.created_at || p.createdAt).getTime())));
    startOfDay.setHours(0, 0, 0, 0);

    // Generate chronological events for both opening and resolving trades
    const historyEvents = [];

    preds.forEach(p => {
      historyEvents.push({
        date: new Date(p.created_at || p.createdAt).getTime(),
        type: 'open',
        pred: p
      });

      if (['won', 'lost', 'sold', 'refunded'].includes(p.status)) {
        historyEvents.push({
          date: new Date(p.resolved_at || p.sold_at || p.updated_at || p.created_at || p.createdAt).getTime(),
          type: 'resolve',
          pred: p
        });
      }
    });

    historyEvents.sort((a, b) => a.date - b.date);

    const rawPoints = [{ date: startOfDay.getTime(), value: startingBalance }];
    let realizedPnl = 0;
    const activeSet = new Set();

    historyEvents.forEach(ev => {
      if (ev.type === 'open') {
        activeSet.add(ev.pred.id);
      } else if (ev.type === 'resolve') {
        activeSet.delete(ev.pred.id);
        const actualReturn = getResolvedReturn(ev.pred);
        realizedPnl += actualReturn - (ev.pred.stake_amount || 0);
      }

      let activeMtmPnL = 0;
      activeSet.forEach(id => {
        const p = preds.find(x => x.id === id);
        if (p.status === 'active') {
          // Smoothly scale active MTM from the date opened to now, so the chart doesn't retroactively spike
          const openTime = new Date(p.created_at || p.createdAt).getTime();
          const totalDuration = now - openTime;
          const elapsed = ev.date - openTime;
          const progress = totalDuration > 0 ? Math.max(0, Math.min(1, elapsed / totalDuration)) : 1;

          const currentMtm = getMtm(p);
          const finalPnl = currentMtm - (p.stake_amount || 0);
          activeMtmPnL += finalPnl * progress;
        }
      });

      rawPoints.push({
        date: ev.date,
        value: startingBalance + realizedPnl + activeMtmPnL
      });
    });

    const points = rawPoints.map(pt => ({
      date: new Date(pt.date).toISOString(),
      value: pt.value
    }));

    // The final point maps precisely to the current moment
    let currentActiveMtmPnL = 0;
    activeSet.forEach(id => {
      const p = preds.find(x => x.id === id);
      if (p.status === 'active') currentActiveMtmPnL += getMtm(p) - (p.stake_amount || 0);
    });
    points.push({ date: new Date(now).toISOString(), value: startingBalance + realizedPnl + currentActiveMtmPnL });

    return points;
  };

  const equityPoints = buildEquityPoints(allPredictions);

  const groupedPredictions = predictions.reduce((acc, pred) => {
    if (!acc[pred.market_id]) acc[pred.market_id] = [];
    acc[pred.market_id].push(pred);
    return acc;
  }, {});

  const recentActivities = allPredictions
    .filter(pred => pred.status !== 'active')
    .map(pred => {
      const market = markets.find(m => m.id === pred.market_id);
      const outcome = market?.outcomes?.find(o => o.id === pred.outcome_id);
      const isSettled = ['won', 'lost'].includes(pred.status);
      const isSold = pred.status === 'sold';
      const actualReturn = getResolvedReturn(pred);
      return {
        id: pred.id,
        type: isSettled || isSold ? 'resolution' : 'trade',
        label: isSettled ? (pred.status === 'won' ? 'Resolved Won' : 'Resolved Lost') : isSold ? 'Sold' : 'Bought',
        marketId: pred.market_id,
        marketTitle: market?.title || 'Unknown Market',
        outcomeTitle: outcome?.title || 'Unknown',
        probability: pred.odds_at_prediction || 50,
        amount: isSettled || isSold ? actualReturn : (pred.stake_amount || 0),
        stakeAmount: pred.stake_amount || 0,
        pnl: isSettled || isSold ? actualReturn - (pred.stake_amount || 0) : null,
        status: pred.status,
        date: pred.resolved_at || pred.sold_at || pred.updated_at || pred.created_at || new Date().toISOString()
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (showAllActivity) {
    return <ActivityHistory predictions={allPredictions} markets={markets} onBack={() => setShowAllActivity(false)} />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <span>←</span>
        <span>Back to Admin</span>
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="mb-2">
            <h2 className="text-2xl font-semibold text-white">Viewing: {user.username}</h2>
            <p className="text-slate-400">{user.email}</p>
          </div>
          <div className="mb-1 mt-6">
            <h1 className="text-5xl font-bold text-white">${portfolioValue.toFixed(2)}</h1>
          </div>
          <div className="flex items-center gap-2 mb-8">
            <span className={`font-medium ${todayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {todayChange >= 0 ? '+' : ''}${todayChange.toFixed(2)} ({todayChange >= 0 ? '+' : ''}{todayChangePercent.toFixed(2)}%)
            </span>
            <span className="text-slate-400">All Time</span>
          </div>

          <div className="mb-6">
            <div className="h-64 relative">
              <EquityChart equityPoints={equityPoints} startingBalance={startingBalance} currentValue={portfolioValue} />
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">Paper Trading Balance</span>
              <span className="text-2xl font-bold text-yellow-400">{walletLoading ? '...' : `$${availableBalance.toFixed(2)}`}</span>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-white font-medium">Forecasting Stats</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{totalPredictionCount}</p>
                <p className="text-slate-500 text-xs">Predictions</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{accuracyPercent}%</p>
                <p className="text-slate-500 text-xs">Accuracy</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">0%</p>
                <p className="text-slate-500 text-xs">Calibration</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-white font-medium">Data &amp; Equity Repairs</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-slate-800">
                <div>
                  <div className="text-sm font-semibold text-white">Reset Wallet Deposits</div>
                  <div className="text-xs text-slate-500 mt-0.5">Clears manual funding to strictly track trading P&amp;L</div>
                </div>
                <button onClick={handleResetWallet} disabled={resetLoading} className="px-4 py-2 text-sm font-semibold bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-lg transition-all disabled:opacity-50">
                  {resetLoading ? 'Resetting...' : 'Reset Deposits'}
                </button>
              </div>
              <div className="flex justify-between items-center py-3">
                <div>
                  <div className="text-sm font-semibold text-white">Repair Buying Power Deficit</div>
                  <div className="text-xs text-slate-500 mt-0.5">Auto-cancels active trades to resolve negative buying power</div>
                </div>
                <button onClick={handleFixBalance} disabled={fixLoading} className="px-4 py-2 text-sm font-semibold bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all disabled:opacity-50">
                  {fixLoading ? 'Repairing...' : 'Repair Deficit'}
                </button>
              </div>
            </div>
            {repairMsg && (
              <p className={`mt-3 text-sm ${repairMsg.startsWith('Error') || repairMsg.startsWith('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                {repairMsg}
              </p>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {recentActivities.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-8"><p>No activity yet</p></div>
              ) : recentActivities.map(activity => (
                <button key={activity.id} onClick={() => navigate(`/markets/${activity.marketId}`)} className="w-full rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-left transition-colors hover:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{activity.marketTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-500">{activity.outcomeTitle}</p>
                        <span className="text-xs text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded">Entry: {activity.probability.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {activity.type === 'resolution' ? (
                        <>
                          <p className="text-xs text-slate-400 mb-1">Invested: {formatCurrency(activity.stakeAmount)}</p>
                          <p className={`text-sm font-semibold ${activity.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{activity.pnl >= 0 ? '+' : ''}{formatCurrency(activity.pnl)}</p>
                        </>
                      ) : (
                        <p className="text-sm font-semibold text-white">{formatCurrency(activity.amount)}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowAllActivity(true)} className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">View all activity →</button>
          </div>
        </div>

        <div className="w-full lg:w-80 space-y-4">
          <div className="bg-slate-900/50  border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-white font-semibold">Positions</h3>
                <span className="text-slate-500 text-xs">{Object.keys(groupedPredictions).length} active</span>
              </div>
              {Object.keys(groupedPredictions).length === 0 ? (
                <p className="text-slate-500 text-sm">No open positions</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedPredictions).map(([marketId, marketPredictions]) => {
                    const market = markets.find(m => m.id === marketId);
                    const outcomeMap = {};
                    marketPredictions.forEach(pred => {
                      const oid = pred.outcome_id;
                      if (!outcomeMap[oid]) outcomeMap[oid] = { totalStake: 0, weightedOdds: 0 };
                      const s = pred.stake_amount || 0;
                      outcomeMap[oid].totalStake += s;
                      outcomeMap[oid].weightedOdds += (pred.odds_at_prediction || 50) * s;
                    });
                    return (
                      <div key={marketId} className="bg-slate-800/30 rounded-lg p-3">
                        <p className="text-white text-sm font-medium mb-2 line-clamp-2 cursor-pointer hover:text-yellow-400 transition-colors" onClick={() => navigate(`/markets/${marketId}`)}>
                          {market?.title || 'Unknown Market'}
                        </p>
                        <div className="space-y-2">
                          {Object.entries(outcomeMap).map(([outcomeId, data]) => {
                            const outcome = market?.outcomes?.find(o => o.id === outcomeId);
                            const currentProb = outcome?.probability ?? 50;
                            const avgEntry = data.totalStake > 0 ? data.weightedOdds / data.totalStake : 50;
                            const mtmValue = calcPositionValue(data.totalStake, avgEntry, currentProb);
                            return (
                              <div key={outcomeId} className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">{outcome?.title || 'Unknown'}</span>
                                <span className={`font-semibold ${mtmValue < data.totalStake ? 'text-red-400' : mtmValue > data.totalStake ? 'text-green-400' : 'text-slate-300'}`}>${mtmValue.toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}