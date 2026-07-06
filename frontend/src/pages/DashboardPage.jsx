import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import { useMarkets } from '../hooks/useMarkets';
import { useWallet } from '../hooks/useWallet';
import { formatCurrency } from '../store/storage';
import ActivityHistory from '../components/ActivityHistory';

// ============================================================================
// Robinhood-style dual-canvas equity chart
// Base canvas:    bezier curve + gradient fill  (redraws only when data changes)
// Overlay canvas: pulsing live dot + crosshair  (requestAnimationFrame, 60fps)
// ============================================================================
function EquityChart({ equityPoints, startingBalance, currentValue }) {
  const baseRef = useRef(null);
  const overlayRef = useRef(null);
  const hoverRef = useRef(null);   // shared between RAF loop and mouse handler
  const animRef = useRef(null);
  const scaleRef = useRef(null);   // cached scale data so RAF doesn't recompute
  const [tooltip, setTooltip] = useState(null);

  const isProfit = currentValue >= startingBalance;
  const lineColor = isProfit ? '#22c55e' : '#ef4444';
  const colorRgb = isProfit ? '34,197,94' : '239,68,68';
  const PAD = { t: 20, r: 8, b: 8, l: 8 };

  // ── Compute pixel coordinates from data ──────────────────────────────────
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

  // ── Draw bezier line + gradient fill on base canvas ──────────────────────
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
    scaleRef.current = scale;   // cache for RAF loop

    const { xs, ys, baselineY } = scale;
    ctx.clearRect(0, 0, W, H);

    // Dashed baseline at starting balance
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

    // ── Bezier path (Robinhood S-curve) ─────────────────────────────────────
    // Both control points share the midpoint x — one anchored to prev y,
    // one to next y. Produces the characteristic smooth but data-faithful curve.
    const buildPath = (ctx) => {
      ctx.moveTo(xs[0], ys[0]);
      for (let i = 1; i < xs.length; i++) {
        const cpx = (xs[i - 1] + xs[i]) / 2;
        ctx.bezierCurveTo(cpx, ys[i - 1], cpx, ys[i], xs[i], ys[i]);
      }
    };

    // Gradient fill below the curve
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

    // Stroke the curve on top
    ctx.beginPath();
    buildPath(ctx);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }, [equityPoints, startingBalance, lineColor, colorRgb, computeScale]);

  // ── Overlay: pulsing dot + crosshair at 60fps ─────────────────────────────
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

      // Re-compute scale if not cached yet
      const scale = scaleRef.current || computeScale(W, H);
      if (!scale) { animRef.current = requestAnimationFrame(frame); return; }

      const { xs, ys } = scale;
      const lastX = xs[xs.length - 1];
      const lastY = ys[ys.length - 1];
      const hover = hoverRef.current;

      if (!hover) {
        // ── Pulsing live dot ──────────────────────────────────────────────
        phase += 0.04;
        const pulse = (Math.sin(phase) + 1) / 2;          // 0 → 1
        const ring = 7 + pulse * 9;                       // 7px → 16px
        const alpha = 0.45 * (1 - pulse);                  // fades as ring grows
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
        // ── Crosshair ─────────────────────────────────────────────────────
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

        // Dot on the line
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

  // ── Mouse interaction ─────────────────────────────────────────────────────
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

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!equityPoints || equityPoints.length < 2) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-600 text-sm">Make your first prediction to see your equity chart</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full"
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative' }}
    >
      {/* Base canvas — chart line drawn once per data change */}
      <canvas
        ref={baseRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      {/* Overlay canvas — crosshair + pulsing dot at 60fps */}
      <canvas
        ref={overlayRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
      />
      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="absolute top-2 pointer-events-none px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs z-10"
          style={{ left: `${Math.min(Math.max(tooltip.pct * 100, 5), 72)}%` }}
        >
          <p className="text-white font-semibold">
            ${tooltip.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-slate-400">
            {new Date(tooltip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
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

  if (pEntry === 0) return pCurrent > 0 ? rMax : rMin;
  if (pEntry === 1) return pCurrent < 1 ? rMin : rMax;

  if (pCurrent <= pEntry) {
    return rMin + (stake - rMin) * (pCurrent / pEntry);
  } else {
    return stake + (rMax - stake) * ((pCurrent - pEntry) / (1 - pEntry));
  }
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { markets, loading: marketsLoading } = useMarkets();
  const { balance: buyingPower, wallet, loading: walletLoading, refetch: refetchWallet } = useWallet();
  const [selectedRange, setSelectedRange] = useState('1D');
  const [predictions, setPredictions] = useState([]);
  const [allPredictions, setAllPredictions] = useState([]);
  const [sellingKey, setSellingKey] = useState(null); // 'marketId__outcomeId'
  const [sellAmount, setSellAmount] = useState('');
  const [sellLoading, setSellLoading] = useState(false);
  const [sellMsg, setSellMsg] = useState('');
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [hasLoadedWallet, setHasLoadedWallet] = useState(false);
  const [hasLoadedMarkets, setHasLoadedMarkets] = useState(false);

  const fetchPredictions = useCallback(() => {
    api.getPredictions()
      .then(data => {
        const allPreds = Array.isArray(data) ? data : [];
        const userId = session?.user?.id || 'demo_user';
        const userEmail = session?.user?.email;
        const userPredictions = allPreds.filter(p => p.user_id === userId || (userEmail && p.user_id === userEmail));
        const activePredictions = userPredictions.filter(p => p.status === 'active');
        setAllPredictions(userPredictions);
        setPredictions(activePredictions);
        setInitialDataLoaded(true);
      })
      .catch(() => {
        setPredictions([]);
        setAllPredictions([]);
        setInitialDataLoaded(true);
      });
    refetchWallet();
  }, [session, refetchWallet]);

  useEffect(() => {
    if (!walletLoading) {
      setHasLoadedWallet(true);
    }
  }, [walletLoading]);

  useEffect(() => {
    if (!marketsLoading) {
      setHasLoadedMarkets(true);
    }
  }, [marketsLoading]);

  useEffect(() => {
    fetchPredictions();
    // Auto-refresh every 60 seconds so the chart and portfolio value stay live
    const interval = setInterval(fetchPredictions, 60_000);
    return () => clearInterval(interval);
  }, [fetchPredictions]);

  // Show a skeleton dashboard exoskeleton during the initial data fetch
  if (!initialDataLoaded || !hasLoadedWallet || !hasLoadedMarkets) {
    return (
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content (Left Side) Skeleton */}
          <div className="flex-1">
            <div className="mb-2">
              <button className="flex items-center gap-2 text-white hover:bg-slate-800/50 px-3 py-2 rounded-lg transition-colors -ml-3">
                <span className="text-2xl font-semibold">Portfolio</span>
                <span className="text-slate-400">▾</span>
              </button>
            </div>

            {/* Blank Portfolio Value */}
            <div className="mb-1 flex items-center h-12">
              <div className="h-12 w-64 bg-slate-800/80 rounded-lg animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2 mb-8 h-6">
              <div className="h-5 w-32 bg-slate-800/80 rounded animate-pulse"></div>
              <span className="text-slate-400">All Time</span>
            </div>

            {/* Chart Skeleton */}
            <div className="mb-6">
              <div className="h-64 relative bg-slate-800/20 rounded-xl border border-slate-800/50 animate-pulse flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4 opacity-50">
              <div className="flex gap-1">
                {['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'].map(range => (
                  <button key={range} className="px-4 py-2 text-sm font-medium text-slate-500">
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Paper Trading Balance Skeleton */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ color: 'rgb(212, 175, 55)' }}><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg></span>
                  <span className="text-white font-medium">Paper Trading Balance</span>
                </div>
                <div className="h-8 w-32 bg-slate-800/80 rounded animate-pulse"></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">This buying power is virtual money for practice. No real funds are involved.</p>
            </div>

            {/* Forecasting Stats Skeleton */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-8">
              <div className="flex items-center gap-2 mb-4 opacity-50">
                <span style={{ color: 'rgb(212, 175, 55)' }}><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg></span>
                <span className="text-white font-bold">Your Forecasting Stats</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-slate-800/30 rounded-lg p-3 text-center flex flex-col items-center justify-center">
                    <div className="h-8 w-16 bg-slate-800 rounded animate-pulse mb-1"></div>
                    <div className="h-4 w-16 bg-slate-800/50 rounded animate-pulse mt-1"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar Skeleton */}
          <div className="w-full lg:w-80 space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4 opacity-50">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                  <h3 className="text-white font-semibold">Positions</h3>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-slate-800/30 rounded-lg p-3 animate-pulse">
                      <div className="h-4 w-3/4 bg-slate-800 rounded mb-3"></div>
                      <div className="flex justify-between items-end">
                        <div className="h-3 w-1/3 bg-slate-800 rounded"></div>
                        <div className="h-6 w-1/4 bg-slate-800 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate portfolio metrics
  const startingBalance = wallet.paperStartingBalance || 10000;
  const totalStaked = predictions.reduce((sum, p) => sum + (p.stake_amount || 0), 0);
  const settledPredictions = allPredictions.filter(p => p.status === 'won' || p.status === 'lost');
  const availableBalance = buyingPower;

  // Mark-to-market (MTM) valuation for all active positions:
  //   R_max     = S + S×(1−p_entry)   = S×(2−p_entry)  ← win upper bound
  //   R_min     = S×p_entry                             ← loss lower bound
  //   R_current = R_min + (R_max − R_min)×p_current     ← midpoint valuation
  //             = S×(p_entry + 2×p_current×(1−p_entry)) ← simplified
  const activeMtmValue = predictions.reduce((sum, p) => {
    const market = markets.find(m => m.id === p.market_id);
    const outcome = market?.outcomes?.find(o => o.id === p.outcome_id);
    const pCurrent = outcome?.probability ?? p.odds_at_prediction ?? 50;
    return sum + calcPositionValue(p.stake_amount || 0, p.odds_at_prediction || 50, pCurrent);
  }, 0);

  const portfolioValue = availableBalance + activeMtmValue;
  const unrealizedPnl = activeMtmValue - totalStaked;
  const todayChange = portfolioValue - startingBalance;
  const todayChangePercent = startingBalance > 0 ? (todayChange / startingBalance) * 100 : 0;

  // Forecasting stats
  const totalPredictionCount = allPredictions.length;
  const wonCount = allPredictions.filter(p => p.status === 'won').length;
  const settledCount = settledPredictions.length;
  const accuracyPercent = settledCount > 0 ? Math.round((wonCount / settledCount) * 100) : 0;

  // Build equity curve — one data point per trade placed throughout the day.
  // For each trade (sorted by time), we compute the full portfolio value AT
  // that moment: settled P&L + MTM of all active positions up to that point.
  // MTM uses current market probabilities (best available — no historical prices stored).
  // This gives a proper N-point line graph instead of a flat 2-point line.
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

  // Group predictions by market
  const groupedPredictions = predictions.reduce((acc, pred) => {
    if (!acc[pred.market_id]) {
      acc[pred.market_id] = [];
    }
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
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
      {/* Top stat row: Portfolio value (wide) + Available cash + Win rate */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-4 mb-5">
        <div className="dbm-panel p-6" style={{ background: 'var(--panel)' }}>
          <span className="dbm-stat-label">Total Portfolio Value</span>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 34, color: 'var(--text)', marginTop: 8 }}>
            ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13.5, marginTop: 8,
            color: todayChange >= 0 ? 'var(--yes)' : 'var(--no)',
          }}>
            {todayChange >= 0 ? '↑ +$' : '↓ -$'}{Math.abs(todayChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({todayChange >= 0 ? '+' : ''}{todayChangePercent.toFixed(1)}%)
          </div>
        </div>
        <div className="dbm-panel p-6" style={{ background: 'var(--panel)' }}>
          <span className="dbm-stat-label">Available Cash</span>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 26, color: 'var(--text)', marginTop: 10 }}>
            {walletLoading ? '...' : `$${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
        </div>
        <div className="dbm-panel p-6" style={{ background: 'var(--panel)' }}>
          <span className="dbm-stat-label">Win Rate</span>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 26, color: 'var(--gold)', marginTop: 10 }}>
            {accuracyPercent}%
          </div>
        </div>
      </div>

      {/* Performance History */}
      <div className="dbm-panel p-6 mb-5" style={{ background: 'var(--panel)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <h2 style={{ fontWeight: 700, fontSize: 15.5, color: 'var(--text)', margin: 0 }}>Performance History</h2>
          <div className="flex gap-1" style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, padding: 3 }}>
            {['1D', '1W', '1M', '3M', 'YTD', 'ALL'].map(range => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`dbm-range-tab ${selectedRange === range ? 'active' : ''}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <div className="h-56 relative mt-3">
          <EquityChart
            equityPoints={equityPoints}
            startingBalance={startingBalance}
            currentValue={portfolioValue}
          />
        </div>
      </div>

      {/* Active Positions */}
      <div className="dbm-panel p-6" style={{ background: 'var(--panel)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontWeight: 700, fontSize: 15.5, color: 'var(--text)', margin: 0 }}>Active Positions</h2>
          {allPredictions.length > 0 && (
            <button
              onClick={() => setShowAllActivity(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
            >
              View All →
            </button>
          )}
        </div>

        {Object.keys(groupedPredictions).length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13.5, textAlign: 'center', padding: '32px 0' }}>
            No open positions yet — head to Explore to place your first prediction.
          </p>
        ) : (
          <div>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.8fr 0.9fr 1fr 1fr',
              fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase',
              color: 'var(--muted)', paddingBottom: 12, borderBottom: '1px solid var(--line)',
            }}>
              <span>Market</span><span>Side</span><span>Shares</span><span>Avg Price</span><span>Current Value</span><span style={{ textAlign: 'right' }}>P/L</span>
            </div>
            {Object.entries(groupedPredictions).map(([marketId, marketPredictions], rowIdx, arr) => {
              const market = markets.find(m => m.id === marketId);

              // Aggregate all stakes on this market into one row per outcome
              const outcomeMap = {};
              marketPredictions.forEach(pred => {
                const oid = pred.outcome_id;
                if (!outcomeMap[oid]) outcomeMap[oid] = { totalStake: 0, weightedOdds: 0 };
                const s = pred.stake_amount || 0;
                outcomeMap[oid].totalStake += s;
                outcomeMap[oid].weightedOdds += (pred.odds_at_prediction || 50) * s;
              });

              return Object.entries(outcomeMap).map(([outcomeId, data], idx) => {
                const outcome = market?.outcomes?.find(o => o.id === outcomeId);
                const currentProb = outcome?.probability ?? 50;
                const avgEntry = data.totalStake > 0 ? data.weightedOdds / data.totalStake : 50;
                const mtmValue = calcPositionValue(data.totalStake, avgEntry, currentProb);
                const unrealizedPnl = mtmValue - data.totalStake;
                const sellKey = `${marketId}__${outcomeId}`;
                const isSelling = sellingKey === sellKey;
                const sellAmt = parseFloat(sellAmount) || 0;
                const rawTitle = (outcome?.title || 'Unknown').replace(/\s*\((Yes|No)\)$/i, '');
                const isNoSide = (outcome?.title || '').toLowerCase() === 'no' || /_no$/i.test(outcomeId);
                const isYesSide = (outcome?.title || '').toLowerCase() === 'yes' || /_yes$/i.test(outcomeId);
                const sideLabel = isYesSide ? 'YES' : isNoSide ? 'NO' : rawTitle.toUpperCase();
                const estShares = avgEntry > 0 ? data.totalStake / (avgEntry / 100) : 0;
                const isLast = rowIdx === arr.length - 1 && idx === Object.entries(outcomeMap).length - 1;

                const handleSell = async (e) => {
                  e.preventDefault();
                  if (!sellAmt || sellAmt <= 0) return;
                  setSellLoading(true); setSellMsg('');
                  try {
                    const userId = session?.user?.id || 'demo_user';
                    await api.sellPosition({ market_id: marketId, outcome_id: outcomeId, user_id: userId, sell_amount: sellAmt });
                    setSellMsg(`✅ Sold $${sellAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
                    setTimeout(() => window.location.reload(), 1000);
                  } catch (err) {
                    setSellMsg(`❌ ${err.message}`);
                  } finally {
                    setSellLoading(false);
                  }
                };

                return (
                  <div key={sellKey}>
                    <div
                      onClick={() => navigate(`/markets/${marketId}`)}
                      style={{
                        display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.8fr 0.9fr 1fr 1fr',
                        alignItems: 'center', padding: '13px 0', fontSize: 13.5, cursor: 'pointer',
                        borderBottom: (isLast && !isSelling) ? 'none' : '1px solid rgba(37,44,68,.5)',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 999, flexShrink: 0, background: 'var(--gold)' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{market?.title || 'Unknown Market'}</span>
                      </span>
                      <span>
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                          background: isNoSide ? 'var(--no-dim)' : 'var(--yes-dim)',
                          color: isNoSide ? 'var(--no)' : 'var(--yes)',
                        }}>
                          {sideLabel}
                        </span>
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{estShares.toFixed(0)}</span>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{avgEntry.toFixed(1)}¢</span>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>${mtmValue.toFixed(2)}</span>
                      <span style={{
                        fontFamily: 'var(--mono)', fontWeight: 600, textAlign: 'right',
                        color: unrealizedPnl >= 0 ? 'var(--yes)' : 'var(--no)',
                      }}>
                        {unrealizedPnl >= 0 ? '+' : '-'}${Math.abs(unrealizedPnl).toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6, marginBottom: isSelling ? 0 : 8 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelling) { setSellingKey(null); setSellAmount(''); setSellMsg(''); }
                          else { setSellingKey(sellKey); setSellAmount(''); setSellMsg(''); }
                        }}
                        style={{
                          fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 4,
                          border: `1px solid ${isSelling ? 'var(--line)' : 'var(--no)'}`,
                          background: isSelling ? 'var(--card-hover)' : 'var(--no-dim)',
                          color: isSelling ? 'var(--muted)' : 'var(--no)',
                          cursor: 'pointer', marginBottom: 10,
                        }}
                      >
                        {isSelling ? 'Cancel' : 'Sell'}
                      </button>
                    </div>

                    {isSelling && (
                      <form
                        onSubmit={handleSell}
                        onClick={e => e.stopPropagation()}
                        style={{ paddingBottom: 16, borderBottom: isLast ? 'none' : '1px solid rgba(37,44,68,.5)' }}
                        className="space-y-2"
                      >
                        <p style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)' }}>
                          Current: {currentProb.toFixed(1)}¢ · Entry: {avgEntry.toFixed(1)}¢
                        </p>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>$</span>
                            <input
                              type="number" min="0.01" max={data.totalStake} step="0.01"
                              value={sellAmount} onChange={e => setSellAmount(e.target.value)}
                              placeholder={`Max $${data.totalStake.toFixed(2)}`}
                              className="w-full rounded-md pl-6 pr-3 py-2 text-xs focus:outline-none"
                              style={{ fontFamily: 'var(--mono)', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)' }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setSellAmount(data.totalStake.toFixed(2))}
                            className="px-3 text-xs rounded-md"
                            style={{ background: 'var(--card-hover)', border: '1px solid var(--line)', color: 'var(--text)' }}
                          >
                            Max
                          </button>
                        </div>
                        {parseFloat(sellAmount) > 0 && (() => {
                          const receive = calcPositionValue(parseFloat(sellAmount), avgEntry, currentProb);
                          const pnl = receive - parseFloat(sellAmount);
                          return (
                            <div className="rounded-md p-2.5" style={{ background: 'var(--bg)', border: '1px solid var(--line)', fontFamily: 'var(--mono)', fontSize: 11.5 }}>
                              <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Receive:</span><span style={{ color: 'var(--text)', fontWeight: 600 }}>${receive.toFixed(2)}</span></div>
                              <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Net P&L:</span><span style={{ color: pnl >= 0 ? 'var(--yes)' : 'var(--no)', fontWeight: 600 }}>{pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(2)}</span></div>
                            </div>
                          );
                        })()}
                        {sellMsg && <p style={{ fontSize: 11.5, color: sellMsg.startsWith('✅') ? 'var(--yes)' : 'var(--no)' }}>{sellMsg}</p>}
                        <button
                          type="submit"
                          disabled={sellLoading || !parseFloat(sellAmount) || parseFloat(sellAmount) > data.totalStake}
                          className="w-full py-2 rounded-md text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: 'var(--no-dim)', border: '1px solid var(--no)', color: 'var(--no)' }}
                        >
                          {sellLoading ? 'Selling...' : 'Confirm Sell'}
                        </button>
                      </form>
                    )}
                  </div>
                );
              });
            })}
          </div>
        )}
      </div>
    </div>
  );
}
