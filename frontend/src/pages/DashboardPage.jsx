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
  const { session, openAuthModal } = useAuth();
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

  // Signed-out visitors used to be silently bounced to /explore, which made
  // the Charts nav link feel broken. Show a proper sign-in gate instead.
  if (!session) {
    const guestLabel = { display: 'block', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#948D87', marginBottom: 8 };
    return (
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Mockup layout, guest defaults — so the Charts tab always shows the real page */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 relative overflow-hidden rounded-md p-6" style={{ background: '#181E36', border: '1px solid #33312E' }}>
            <span style={guestLabel}>Total Portfolio Value</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 34, fontWeight: 600, color: '#DCE1FF', lineHeight: 1 }}>$100.00</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#948D87' }}>starting paper balance</span>
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 46, background: 'linear-gradient(180deg, transparent, rgba(11,18,41,.65))', pointerEvents: 'none' }} />
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-md p-5 flex-1" style={{ background: '#181E36', border: '1px solid #33312E' }}>
              <span style={guestLabel}>Available Cash</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 19, fontWeight: 600, color: '#DCE1FF' }}>$100.00</span>
            </div>
            <div className="rounded-md p-5 flex-1" style={{ background: '#181E36', border: '1px solid #33312E' }}>
              <span style={guestLabel}>Win Rate</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 19, fontWeight: 600, color: '#FFDF9B' }}>—</span>
            </div>
          </div>
        </div>

        <div className="rounded-md p-6 mb-6" style={{ background: '#181E36', border: '1px solid #33312E' }}>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <h2 className="text-base font-bold" style={{ color: '#DCE1FF' }}>Performance History</h2>
            <div className="flex gap-1 p-1 rounded" style={{ background: '#0B1229', border: '1px solid #33312E' }}>
              {['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'].map(range => (
                <span key={range} style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '5px 10px', borderRadius: 3, background: range === '1M' ? '#F0C04A' : 'transparent', color: range === '1M' ? '#4A3600' : '#8E94AF', fontWeight: 600 }}>{range}</span>
              ))}
            </div>
          </div>
          <div className="h-64 flex items-center justify-center" style={{ border: '1px dashed rgba(45,52,76,.7)', borderRadius: 6 }}>
            <p style={{ color: '#948D87', fontSize: 13 }}>Your equity curve appears here once you start trading.</p>
          </div>
        </div>

        <div className="rounded-md p-8 mb-8 text-center" style={{ background: '#181E36', border: '1px solid #33312E' }}>
          <h2 className="text-base font-bold mb-2" style={{ color: '#DCE1FF' }}>Active Positions</h2>
          <p style={{ color: '#948D87', fontSize: 13, marginBottom: 18 }}>
            Sign in to track your paper trading balance, performance history, and open positions — every new account starts with $100 in paper money.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            style={{ background: '#F0C04A', color: '#4A3600', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13.5, border: 'none', borderRadius: 6, padding: '12px 28px', cursor: 'pointer' }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

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
            <div className="rounded-md p-4 mb-6" style={{ background: '#181E36', border: '1px solid #33312E' }}>
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
            <div className="rounded-md p-5 mb-8" style={{ background: '#181E36', border: '1px solid #33312E' }}>
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
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content (Left Side) */}
        <div className="flex-1">
          {/* ── Top stats row (mockup): big portfolio card + stacked cash/win-rate ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 relative overflow-hidden rounded-md p-6" style={{ background: '#181E36', border: '1px solid #33312E' }}>
              <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#948D87', marginBottom: 10 }}>
                Total Portfolio Value
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 34, fontWeight: 600, color: '#DCE1FF', lineHeight: 1 }}>
                  ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: todayChange >= 0 ? '#48D773' : '#FFB4AB' }}>
                  {todayChange >= 0 ? '↗+$' : '↘-$'}{Math.abs(todayChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({todayChange >= 0 ? '' : '-'}{Math.abs(todayChangePercent).toFixed(1)}%)
                </span>
              </div>
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 46, background: 'linear-gradient(180deg, transparent, rgba(11,18,41,.65))', pointerEvents: 'none' }} />
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-md p-5 flex-1" style={{ background: '#181E36', border: '1px solid #33312E' }}>
                <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#948D87', marginBottom: 8 }}>
                  Available Cash
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 19, fontWeight: 600, color: '#DCE1FF' }}>
                  {walletLoading ? '…' : `$${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="rounded-md p-5 flex-1" style={{ background: '#181E36', border: '1px solid #33312E' }}>
                <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#948D87', marginBottom: 8 }}>
                  Win Rate
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 19, fontWeight: 600, color: '#FFDF9B' }}>
                  {accuracyPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* ── Performance History (mockup) ── */}
          <div className="rounded-md p-6 mb-6" style={{ background: '#181E36', border: '1px solid #33312E' }}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <h2 className="text-base font-bold" style={{ color: '#DCE1FF' }}>Performance History</h2>
              <div className="flex gap-1 p-1 rounded" style={{ background: '#0B1229', border: '1px solid #33312E' }}>
                {['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'].map(range => (
                  <button
                    key={range}
                    onClick={() => setSelectedRange(range)}
                    style={{
                      fontFamily: 'var(--mono)', fontSize: 11, padding: '5px 10px', borderRadius: 3,
                      background: selectedRange === range ? '#F0C04A' : 'transparent',
                      color: selectedRange === range ? '#4A3600' : '#8E94AF',
                      border: 'none', cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64 relative">
              <EquityChart
                equityPoints={equityPoints}
                startingBalance={startingBalance}
                currentValue={portfolioValue}
              />
            </div>
          </div>

          {/* ── Active Positions table (mockup) ── */}
          <div className="rounded-md p-6 mb-8" style={{ background: '#181E36', border: '1px solid #33312E' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: '#DCE1FF' }}>Active Positions</h2>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#D2C5AF' }}>
                {Object.keys(groupedPredictions).length} active
              </span>
            </div>
            {(() => {
              const rows = [];
              Object.entries(groupedPredictions).forEach(([marketId, marketPredictions]) => {
                const market = markets.find(m => m.id === marketId);
                const outcomeMap = {};
                marketPredictions.forEach(pred => {
                  const oid = pred.outcome_id;
                  if (!outcomeMap[oid]) outcomeMap[oid] = { totalStake: 0, weightedOdds: 0 };
                  const st = pred.stake_amount || 0;
                  outcomeMap[oid].totalStake += st;
                  outcomeMap[oid].weightedOdds += (pred.odds_at_prediction || 50) * st;
                });
                Object.entries(outcomeMap).forEach(([outcomeId, data]) => {
                  const outcome = market?.outcomes?.find(o => o.id === outcomeId);
                  const currentProb = outcome?.probability ?? 50;
                  const avgEntry = data.totalStake > 0 ? data.weightedOdds / data.totalStake : 50;
                  const mtmValue = calcPositionValue(data.totalStake, avgEntry, currentProb);
                  rows.push({
                    marketId,
                    title: market?.title || 'Unknown Market',
                    side: outcome?.title || '—',
                    amount: data.totalStake,
                    avgEntry,
                    mtmValue,
                    pnl: mtmValue - data.totalStake,
                  });
                });
              });

              if (rows.length === 0) {
                return <p style={{ color: '#948D87', fontSize: 13 }}>No open positions — pick a market on the Explore page to get started.</p>;
              }

              const sidePill = (side) => {
                const t = (side || '').toLowerCase();
                const isYes = t.startsWith('yes');
                const isNo = t.startsWith('no');
                return (
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    padding: '3px 8px', borderRadius: 3,
                    background: isYes ? '#1D323D' : isNo ? '#2A1620' : '#2D344C',
                    color: isYes ? '#48D773' : isNo ? '#FFB4AB' : '#D2C5AF',
                    whiteSpace: 'nowrap',
                  }}>
                    {isYes ? 'Yes' : isNo ? 'No' : side}
                  </span>
                );
              };

              return (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, minWidth: 620 }}>
                    <div style={{ display: 'flex', color: '#948D87', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', paddingBottom: 10, borderBottom: '1px solid rgba(45,52,76,.7)' }}>
                      <span style={{ flex: 3 }}>Market</span>
                      <span style={{ flex: 1 }}>Side</span>
                      <span style={{ flex: 1.2, textAlign: 'right' }}>Amount</span>
                      <span style={{ flex: 1.2, textAlign: 'right' }}>Avg Price</span>
                      <span style={{ flex: 1.4, textAlign: 'right' }}>Current Value</span>
                      <span style={{ flex: 1.2, textAlign: 'right' }}>P/L</span>
                    </div>
                    {rows.map((r, i) => (
                      <div
                        key={`${r.marketId}-${i}`}
                        onClick={() => navigate(`/markets/${r.marketId}`)}
                        style={{ display: 'flex', alignItems: 'center', padding: '12px 0', cursor: 'pointer', borderBottom: i < rows.length - 1 ? '1px solid rgba(45,52,76,.4)' : 'none' }}
                      >
                        <span style={{ flex: 3, color: '#DCE1FF', fontFamily: 'var(--wordmark)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, paddingRight: 10, overflow: 'hidden' }}>
                          <span style={{ width: 5, height: 5, borderRadius: 999, background: '#FFDF9B', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                        </span>
                        <span style={{ flex: 1 }}>{sidePill(r.side)}</span>
                        <span style={{ flex: 1.2, textAlign: 'right', color: '#DCE1FF' }}>${r.amount.toFixed(2)}</span>
                        <span style={{ flex: 1.2, textAlign: 'right', color: '#DCE1FF' }}>{r.avgEntry.toFixed(1)}¢</span>
                        <span style={{ flex: 1.4, textAlign: 'right', color: '#DCE1FF' }}>${r.mtmValue.toFixed(2)}</span>
                        <span style={{ flex: 1.2, textAlign: 'right', color: r.pnl >= 0 ? '#48D773' : '#FFB4AB' }}>
                          {r.pnl >= 0 ? '+' : '-'}${Math.abs(r.pnl).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <p style={{ color: '#948D87', fontSize: 11, marginTop: 12, fontFamily: 'var(--wordmark)' }}>
                      Click a position to open its market — you can sell from the trade panel there.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Paper Trading Balance */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span style={{ color: 'rgb(212, 175, 55)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                  </svg>
                </span>
                <span className="text-white font-medium">Paper Trading Balance</span>
                <span className="text-slate-500 cursor-help text-sm" title="Virtual money for practice trading">ⓘ</span>
              </div>
              <span className="text-2xl font-bold text-yellow-400">
                {walletLoading ? '...' : `$${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">This buying power is virtual money for practice. No real funds are involved.</p>
          </div>

          {/* Forecasting Statistics */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span style={{ color: 'rgb(212, 175, 55)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </span>
              <span className="text-white font-bold text-lg">Your Forecasting Stats</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-sans font-medium text-yellow-400">{totalPredictionCount}</p>
                <p className="text-slate-500 text-xs">Predictions</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-sans font-medium text-green-400">{accuracyPercent}%</p>
                <p className="text-slate-500 text-xs">Accuracy</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-sans font-medium text-blue-400">0%</p>
                <p className="text-slate-500 text-xs">Calibration</p>
              </div>
            </div>
            <p className="text-slate-600 text-xs text-center mt-3">
              Accuracy = correct predictions • Calibration = confidence matches outcomes
            </p>
          </div>

          {/* Recent Activity with Filters */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
            </div>
            <div className="space-y-3">
              {recentActivities.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-8">
                  <p>No activity yet</p>
                  <p className="text-xs mt-1">Your trades and resolutions will appear here</p>
                </div>
              ) : recentActivities.map(activity => (
                <button
                  key={activity.id}
                  onClick={() => navigate(`/markets/${activity.marketId}`)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-left transition-colors hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{activity.marketTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-500">{activity.outcomeTitle}</p>
                        <span className="text-xs text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded">Entry: {activity.probability.toFixed(0)}%</span>
                        {activity.status === 'won' && activity.probability < 35 && (
                          <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded text-[9px] font-bold uppercase tracking-wider">Called It 🔥</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {activity.type === 'resolution' ? (
                        <>
                          <p className="text-xs text-slate-400 mb-1">Invested: {formatCurrency(activity.stakeAmount)}</p>
                          <p className={`text-sm font-semibold ${activity.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {activity.pnl >= 0 ? '+' : ''}{formatCurrency(activity.pnl)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-semibold text-white">{formatCurrency(activity.amount)}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowAllActivity(true)} className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
              View all activity →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
