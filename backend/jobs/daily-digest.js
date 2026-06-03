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
const { Op } = require('sequelize');
const { getUserLeagueDigest } = require('../lib/leagueService');

const ADMIN_EMAIL = process.env.EMAIL_USER || 'donotreply.dobium@gmail.com';
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
  const S = Number(stake || 0);
  const pEntry = Math.max(0, Math.min(100, Number(entryProbPct || 0))) / 100;
  const pCurrent = Math.max(0, Math.min(100, Number(currentProbPct || 0))) / 100;
  const rMin = S * pEntry;
  const rMax = S * (2 - pEntry);

  if (pEntry === 0) return pCurrent > 0 ? rMax : rMin;
  if (pEntry === 1) return pCurrent < 1 ? rMin : rMax;

  if (pCurrent <= pEntry) {
    return rMin + (S - rMin) * (pCurrent / pEntry);
  } else {
    return S + (rMax - S) * ((pCurrent - pEntry) / (1 - pEntry));
  }
}

/**
 * Sanitised resolved return — matches getResolvedReturn() in DashboardPage.jsx.
 * Directly mirrors calculateBalanceFromTransactions in server.js to ensure 1:1 match.
 */
function getResolvedReturn(p) {
  const S = parseFloat(p.stake_amount || 0);
  const pEntry = parseFloat(p.odds_at_prediction || 50) / 100;
  let ret = parseFloat(p.actual_return || 0);

  if (p.status === 'won') {
    const maxReturn = S * (2 - pEntry);
    if (ret <= 0 || ret > maxReturn) ret = maxReturn;
  } else if (p.status === 'lost') {
    const minReturn = S * pEntry;
    if (ret <= 0 || ret > minReturn) ret = minReturn;
  } else if (p.status === 'sold') {
    const maxNewReturn = S * (2 - pEntry);
    if (ret > maxNewReturn) {
      // Legacy formula: back-calculate pCurrent and re-derive with new formula
      let pCurrent = S > 0 ? (ret * pEntry) / S : 0;
      pCurrent = Math.min(1.0, Math.max(0, pCurrent));
      const rMin = S * pEntry;
      if (pEntry === 0) {
        ret = pCurrent > 0 ? maxNewReturn : rMin;
      } else if (pEntry === 1) {
        ret = pCurrent < 1 ? rMin : maxNewReturn;
      } else if (pCurrent <= pEntry) {
        ret = rMin + (S - rMin) * (pCurrent / pEntry);
      } else {
        ret = S + (maxNewReturn - S) * ((pCurrent - pEntry) / (1 - pEntry));
      }
    }
  }
  return ret;
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
    let user = null;
    if (userId.includes('@')) {
      user = await User.findOne({ where: { email: userId } });
    } else {
      user = await User.findOne({ where: { id: userId } });
    }
    if (user) {
      userAliases.push(user.id);
      if (user.email && user.email !== `${user.id}@placeholder.com`) {
        userAliases.push(user.email);
      }
    }
  } catch { /* user row may not exist yet */ }
  userAliases = [...new Set(userAliases)];

  // If user_id is a UUID column, passing emails will violently crash Postgres.
  const safeAliases = userAliases.filter(id => !id.includes('@'));
  if (safeAliases.length === 0) safeAliases.push('00000000-0000-0000-0000-000000000000');

  const [txns, allPredictions] = await Promise.all([
    Transaction.findAll({ where: { user_id: { [Op.in]: safeAliases } } }),
    Prediction.findAll({ where: { user_id: { [Op.in]: safeAliases } } }),
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
  const realizedStake = realizedPredictions.reduce((s, p) => s + parseFloat(p.stake_amount || 0), 0);
  const realizedReturn = realizedPredictions.reduce((s, p) => s + getResolvedReturn(p), 0);
  const realizedPnl = realizedReturn - realizedStake;

  const cashBalance = PAPER_STARTING_BALANCE + totalDeposits - totalWithdrawals + realizedPnl;
  const rawBalance = cashBalance - activePredictionStakes;
  const buyingPower = Math.max(0, rawBalance);

  const marketIds = [...new Set(allPredictions.map(p => p.market_id))];
  const markets = await Market.findAll({
    where: { id: { [Op.in]: marketIds } },
    include: [{ model: Outcome, as: 'outcomes' }]
  });

  // ── MTM of active positions (matches activeMtmValue in DashboardPage.jsx) ─
  let activeMtmValue = 0;
  const activePositions = [];
  for (const p of activePredictions) {
    try {
      const market = markets.find(m => m.id === p.market_id);
      const outcome = market?.outcomes?.find(o => o.id === p.outcome_id);
      const stake = parseFloat(p.stake_amount || 0);
      const entryProb = parseFloat(p.odds_at_prediction || 50);   // correct field name
      const currentProb = outcome ? parseFloat(outcome.probability || 50) : entryProb;
      const mtm = calcMtm(stake, entryProb, currentProb);
      activeMtmValue += mtm;

      activePositions.push({
        id: p.id,
        marketTitle: market?.title || 'Unknown Market',
        outcomeTitle: outcome?.title || 'Unknown Outcome',
        stake,
        mtm,
        unrealizedPnl: mtm - stake,
        entryProb,
        currentProb
      });
    } catch { /* skip malformed position */ }
  }
  activePositions.sort((a, b) => b.mtm - a.mtm);

  function buildBackendEquityPoints(preds, txnsList, markets, startingBalance) {
    const now = Date.now();

    const getMtm = (p) => {
      const market = markets.find(m => m.id === p.market_id);
      const outcome = market?.outcomes?.find(o => o.id === p.outcome_id);
      const pCurrent = outcome ? parseFloat(outcome.probability || 50) : parseFloat(p.odds_at_prediction || 50);
      return calcMtm(parseFloat(p.stake_amount || 0), parseFloat(p.odds_at_prediction || 50), pCurrent);
    };

    const startOfDay = preds.length > 0 || txnsList.length > 0
      ? new Date(Math.min(...[...preds.map(p => new Date(p.created_at || p.createdAt).getTime()), ...txnsList.map(t => new Date(t.completed_at || t.created_at || t.createdAt).getTime())]))
      : new Date(now - 86400000);

    // Ensure we start a bit before the very first event to capture baseline
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

    txnsList.forEach(t => {
      if (t.status === 'completed' && t.payment_method !== 'sell_return') {
        historyEvents.push({
          date: new Date(t.completed_at || t.created_at || t.createdAt).getTime(),
          type: t.type,
          amount: parseFloat(t.amount || 0)
        });
      }
    });

    historyEvents.sort((a, b) => a.date - b.date);

    const rawPoints = [{ date: startOfDay.getTime(), value: startingBalance }];
    let realizedPnl = 0;
    let netTransfers = 0;
    const activeSet = new Set();

    historyEvents.forEach(ev => {
      if (ev.type === 'deposit') {
        netTransfers += ev.amount;
      } else if (ev.type === 'withdrawal') {
        netTransfers -= ev.amount;
      } else if (ev.type === 'open') {
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
        value: startingBalance + netTransfers + realizedPnl + activeMtmPnL
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
    points.push({ date: new Date(now).toISOString(), value: startingBalance + netTransfers + realizedPnl + currentActiveMtmPnL });

    return points;
  }

  const equityPoints = buildBackendEquityPoints(allPredictions, txns, markets, PAPER_STARTING_BALANCE);

  // ── Portfolio value — mirrors the dashboard hero number ───────────────────
  const portfolioValue = buyingPower + activeMtmValue;
  const totalPnl = portfolioValue - PAPER_STARTING_BALANCE;

  // ── Forecasting stats ─────────────────────────────────────────────────────
  const totalPredictions = allPredictions.length;
  const settledCount = allPredictions.filter(p => ['won', 'lost'].includes(p.status)).length;
  const wonCount = allPredictions.filter(p => p.status === 'won').length;
  const hasEverTraded = totalPredictions > 0;

  const accuracy = settledCount > 0 ? (wonCount / settledCount) * 100 : 0;

  // Calculate Accuracy Trend (vs 7 days ago)
  const nowMs = Date.now();
  const oneWeekAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  const pastSettledCount = allPredictions.filter(p => {
    if (!['won', 'lost'].includes(p.status)) return false;
    const d = new Date(p.resolved_at || p.updated_at || p.created_at).getTime();
    return d < oneWeekAgoMs;
  }).length;
  const pastWonCount = allPredictions.filter(p => {
    if (p.status !== 'won') return false;
    const d = new Date(p.resolved_at || p.updated_at || p.created_at).getTime();
    return d < oneWeekAgoMs;
  }).length;

  const pastAccuracy = pastSettledCount > 0 ? (pastWonCount / pastSettledCount) * 100 : 0;
  const accuracyTrend = (settledCount > 0 && pastSettledCount > 0) ? (accuracy - pastAccuracy) : 0;

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
    accuracy,
    accuracyTrend,
    activePositions,
  };
}

// ── Job registration ─────────────────────────────────────────────────────────

/**
 * Execute the digest immediately.
 * @param {Object}   models    - { User, Transaction, Prediction, Outcome, Market }
 * @param {Function} sendEmail - sendEmail({ to, subject, text, html })
 */
async function executeDailyDigest(models, sendEmail) {
  console.log('[Daily Digest] Job triggered at', new Date().toISOString());

  // Fetch recipients from Supabase Auth (authoritative email list)
  let recipients = [];
  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
      console.error('[Daily Digest] Supabase admin listUsers error:', error);
      return;
    }
    recipients = data.users;
  } catch (err) {
    console.error('[Daily Digest] Failed to fetch users:', err);
    return;
  }

  let sentCount = 0;
  for (const u of recipients) {
    if (!u.email || SKIP_EMAILS.has(u.email)) continue;

    try {
      const stats = await getUserStats(u.id, models);
      const leagueDigest = await getUserLeagueDigest(u.id);

      const username = u.user_metadata?.name || u.user_metadata?.full_name || u.user_metadata?.username || u.email.split('@')[0];

      const html = buildDigestHtml({
        username,
        ...stats,
        leagueStanding: leagueDigest.standing,
        lastLeagueResolution: leagueDigest.last_resolution
      });

      await sendEmail({
        to: u.email,
        subject: 'Your Dobium Daily Digest 📊',
        text: `Your daily digest is here! Portfolio: $${stats.portfolioValue.toFixed(2)} | Buying Power: $${stats.buyingPower.toFixed(2)}`,
        html
      });

      sentCount++;
      await new Promise(r => setTimeout(r, 1000)); // Rate limit 1 per second
    } catch (err) {
      console.error(`[Daily Digest] Failed for ${u.email}:`, err.message);
    }
  }
  console.log(`[Daily Digest] Completed. Sent ${sentCount} digests.`);
}

/**
 * Registers a node-cron job that fires every day.
 */
function registerDailyDigestJob(models, sendEmail) {
  // node-cron schedule: "0 12 * * *" in America/Chicago timezone = 12:00 PM CST/CDT.
  const schedule = process.env.DIGEST_CRON || '0 12 * * *';

  cron.schedule(schedule, () => executeDailyDigest(models, sendEmail), {
    scheduled: true,
    timezone: 'America/Chicago'
  });
}

module.exports = { registerDailyDigestJob, getUserStats, executeDailyDigest };
