/**
 * backend/jobs/daily-digest.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Registers a node-cron job that fires every day at 12:00 PM CST/CDT.
 *
 * Stats mirror the user dashboard exactly:
 *   portfolioValue = buyingPower (cash) + MTM of all active positions
 *   totalPnl       = portfolioValue − startingBalance
 *   accuracy       = wonCount / settledCount
 *
 * Exports: registerDailyDigestJob(models, sendEmail)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const { buildDigestHtml } = require('../lib/digest-email');
const { sequelize, Market } = require('../lib/database/models');
const { Op } = sequelize.constructor;

const ADMIN_EMAIL  = process.env.EMAIL_USER || 'donotreply.dobium@gmail.com';
const PLATFORM_URL = process.env.PLATFORM_URL || 'https://dobium.com';

// Paper trading starting balance — must match server.js
const PAPER_STARTING_BALANCE = Number(process.env.PAPER_TRADING_STARTING_BALANCE || 10000);

// Emails that should never receive digests
const SKIP_EMAILS = new Set([
  ADMIN_EMAIL,
  'peepeeeepooopoo@gmail.com',
  'hebdhdbdbsbhbbbhhdhdhsh@gmail.com',
]);

// ── Valuation helpers (identical to DashboardPage.jsx formulas) ──────────────

/**
 * Mark-to-market value of one position.
 *   R_min     = S × p_entry
 *   R_max     = S × (2 − p_entry)
 *   R_current = R_min + (R_max − R_min) × p_current
 *
 * Matches calcPositionValue() in DashboardPage.jsx.
 */
function calcMtm(stake, entryProbPct, currentProbPct) {
  const pE = entryProbPct / 100;
  const pC = currentProbPct / 100;
  const rMin = stake * pE;
  const rMax = stake * (2 - pE);
  return rMin + (rMax - rMin) * pC;
}

/**
 * Sanitised resolved return — matches getResolvedReturn() in DashboardPage.jsx.
 * Falls back to formula-derived values when actual_return is missing/corrupt.
 */
function getResolvedReturn(pred) {
  const S = parseFloat(pred.stake_amount || 0);
  const entryProbPct = parseFloat(pred.odds_at_prediction || 50);

  if (pred.status === 'won') {
    const r = parseFloat(pred.actual_return || 0);
    return (r > 0) ? r : calcMtm(S, entryProbPct, 100);
  }
  if (pred.status === 'lost') {
    const r = parseFloat(pred.actual_return || 0);
    return (r > 0) ? r : calcMtm(S, entryProbPct, 0);
  }
  if (pred.status === 'sold') {
    const r = parseFloat(pred.actual_return || 0);
    const pE = entryProbPct / 100;
    const maxNewReturn = S * (2 - pE);
    if (r > maxNewReturn) {
      // Legacy formula: back-calculate pCurrent and re-derive with new formula
      let pCurrent = S > 0 ? (r * pE) / S : 0;
      pCurrent = Math.min(1.0, Math.max(0, pCurrent));
      return calcMtm(S, entryProbPct, pCurrent * 100);
    }
    return r;
  }
  return 0;
}

// ── Main stats calculator ────────────────────────────────────────────────────

/**
 * Compute all stats for one user using the same logic as the dashboard.
 *
 * @param {string} userId
 * @param {Object} models  - { Transaction, Prediction, Outcome, User }
 * @returns {Object} stats
 */
async function getUserStats(userId, { Transaction, Prediction, Outcome, User }) {
  // Resolve all aliases for this user (id + email) — mirrors server.js
  let userAliases = [userId];
  try {
    const user = await User.findOne({ where: { id: userId } });
    if (user) {
      userAliases.push(user.id);
      if (user.email && user.email !== `${user.id}@placeholder.com`) {
        userAliases.push(user.email);
      }
    }
  } catch { /* user row may not exist yet */ }
  userAliases = [...new Set(userAliases)];

  const [txns, allPredictions] = await Promise.all([
    Transaction.findAll({ where: { user_id: { [Op.in]: userAliases } } }),
    Prediction.findAll({ where: { user_id: { [Op.in]: userAliases } } }),
  ]);

  // ── Cash ledger (matches calculateBalanceFromTransactions in server.js) ────
  const totalDeposits = txns
    .filter(t => t.type === 'deposit' && t.status === 'completed' && t.payment_method !== 'sell_return')
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);

  const totalWithdrawals = txns
    .filter(t => t.type === 'withdrawal' && t.status === 'completed')
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);

  const activePredictions = allPredictions.filter(p => p.status === 'active');
  const activePredictionStakes = activePredictions.reduce((s, p) => s + parseFloat(p.stake_amount || 0), 0);

  const realizedPredictions = allPredictions.filter(p => ['won', 'lost', 'sold', 'refunded'].includes(p.status));

  // Use sanitised return amounts — same as dashboard's getResolvedReturn()
  const realizedStake  = realizedPredictions.reduce((s, p) => s + parseFloat(p.stake_amount || 0), 0);
  const realizedReturn = realizedPredictions.reduce((s, p) => s + getResolvedReturn(p), 0);
  const realizedPnl    = realizedReturn - realizedStake;

  const cashBalance = PAPER_STARTING_BALANCE + totalDeposits - totalWithdrawals + realizedPnl;
  const rawBalance  = cashBalance - activePredictionStakes;
  const buyingPower = Math.max(0, rawBalance);

  const marketIds = [...new Set(allPredictions.map(p => p.market_id))];
  const markets = await Market.findAll({
    where: { id: { [Op.in]: marketIds } },
    include: [{ model: Outcome, as: 'outcomes' }]
  });

  // ── MTM of active positions (matches activeMtmValue in DashboardPage.jsx) ─
  let activeMtmValue = 0;
  for (const p of activePredictions) {
    try {
      const market     = markets.find(m => m.id === p.market_id);
      const outcome    = market?.outcomes?.find(o => o.id === p.outcome_id);
      const stake      = parseFloat(p.stake_amount || 0);
      const entryProb  = parseFloat(p.odds_at_prediction || 50);   // correct field name
      const currentProb = outcome ? parseFloat(outcome.probability || 50) : entryProb;
      activeMtmValue  += calcMtm(stake, entryProb, currentProb);
    } catch { /* skip malformed position */ }
  }

  function buildBackendEquityPoints(preds, markets, startingBalance) {
    if (!preds || !preds.length) return [];
    const now = Date.now();

    const getMtm = (p) => {
      const market = markets.find(m => m.id === p.market_id);
      const outcome = market?.outcomes?.find(o => o.id === p.outcome_id);
      const pCurrent = outcome ? parseFloat(outcome.probability || 50) : parseFloat(p.odds_at_prediction || 50);
      return calcMtm(parseFloat(p.stake_amount || 0), parseFloat(p.odds_at_prediction || 50), pCurrent);
    };

    const startOfDay = new Date(Math.min(...preds.map(p => new Date(p.created_at || p.createdAt).getTime())));
    startOfDay.setHours(0, 0, 0, 0);

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
        realizedPnl += actualReturn - parseFloat(ev.pred.stake_amount || 0);
      }

      let activeMtmPnL = 0;
      activeSet.forEach(id => {
        const p = preds.find(x => x.id === id);
        if (p && p.status === 'active') {
          const openTime = new Date(p.created_at || p.createdAt).getTime();
          const totalDuration = now - openTime;
          const elapsed = ev.date - openTime;
          const progress = totalDuration > 0 ? Math.max(0, Math.min(1, elapsed / totalDuration)) : 1;

          const currentMtm = getMtm(p);
          const finalPnl = currentMtm - parseFloat(p.stake_amount || 0);
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

    let currentActiveMtmPnL = 0;
    activeSet.forEach(id => {
      const p = preds.find(x => x.id === id);
      if (p && p.status === 'active') {
        currentActiveMtmPnL += getMtm(p) - parseFloat(p.stake_amount || 0);
      }
    });
    points.push({ date: new Date(now).toISOString(), value: startingBalance + realizedPnl + currentActiveMtmPnL });

    return points;
  }

  const equityPoints = buildBackendEquityPoints(allPredictions, markets, PAPER_STARTING_BALANCE);

  // ── Portfolio value — mirrors the dashboard hero number ───────────────────
  const portfolioValue = buyingPower + activeMtmValue;
  const totalPnl       = portfolioValue - PAPER_STARTING_BALANCE;

  // ── Forecasting stats ─────────────────────────────────────────────────────
  const totalPredictions = allPredictions.length;
  const settledCount     = allPredictions.filter(p => ['won', 'lost'].includes(p.status)).length;
  const wonCount         = allPredictions.filter(p => p.status === 'won').length;
  const hasEverTraded    = totalPredictions > 0;

  return {
    startingBalance: PAPER_STARTING_BALANCE,
    portfolioValue,
    buyingPower,
    totalPnl,
    totalPredictions,
    wonCount,
    settledCount,
    hasEverTraded,
    equityPoints,
  };
}

// ── Job registration ─────────────────────────────────────────────────────────

/**
 * @param {Object}   models    - { User, Transaction, Prediction, Outcome, Market }
 * @param {Function} sendEmail - sendEmail({ to, subject, text, html })
 */
function registerDailyDigestJob(models, sendEmail) {
  const { User, Transaction, Prediction, Outcome } = models;

  // node-cron schedule: "0 12 * * *" in America/Chicago timezone = 12:00 PM CST/CDT.
  // IMPORTANT: because we pass timezone:'America/Chicago', node-cron interprets
  // the hour field in Chicago local time — so 12 = noon Chicago, not UTC.
  const schedule = process.env.DIGEST_CRON || '0 12 * * *';

  cron.schedule(schedule, async () => {
    console.log('[Daily Digest] Job triggered at', new Date().toISOString());

    // Fetch recipients from Supabase Auth (authoritative email list)
    let recipients = [];
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
        process.en