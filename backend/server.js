require('dotenv').config();
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { Op, DataTypes, Sequelize } = require('sequelize');

// Force Vercel's bundler to include the PostgreSQL driver since Sequelize loads it dynamically
require('pg');

const nanoid = (size = 12) => crypto.randomBytes(Math.ceil(size / 2)).toString('hex').slice(0, size);

// Import database models
const {
  sequelize,
  User,
  Transaction,
  Market,
  Outcome,
  Prediction,
  PriceHistory,
  LeaguePrediction,
  PositionExit,
  LeagueScore,
  CalledItEntry,
  MainEvent,
  MainEventMarket,
  ForecastLeague,
  LeagueMember,
  LeagueTimingWindow,
  Comment,
  MarketSuggestion,
  Waitlist,
  initializeDatabase
} = require('./lib/database/models');
const { sendEmail } = require('./lib/email');
const { buildResolutionHtml } = require('./lib/resolution-email');
const { registerDailyDigestJob, getUserStats } = require('./jobs/daily-digest');
const leagueService = require('./lib/leagueService');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.STRING(12),
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  link: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  tableName: 'notifications',
  timestamps: false,
  underscored: true
});

const app = express();
const PORT = process.env.PORT || 3001;
const Stripe = require('stripe');
const stripeSecret = (process.env.STRIPE_SECRET_KEY || '').trim();
const stripe = stripeSecret ? Stripe(stripeSecret) : null;
// Admin accounts allowed to use /admin and admin endpoints
const ADMIN_EMAILS = ['donotreply.dobium@gmail.com', 'neel.bolaram@gmail.com'];

// Passphrase gate for /radar (the market-suggestion review queue).
// NOTE: since this repo is public, this is a light lock, not real secrecy —
// it stops anyone stumbling onto the page/API, not a determined reader of the source.
// Move this to a private env var once Vercel/hosting access is sorted.
const RADAR_KEY = 'dobium-radar-9247';
function requireRadarKey(req, res, next) {
  const key = req.headers['x-radar-key'] || req.query.key;
  if (key !== RADAR_KEY) {
    return res.status(403).json({ error: 'Invalid or missing radar key' });
  }
  next();
}

// Hard-coded: every user starts with $100 paper money (env override intentionally disabled)
const PAPER_TRADING_STARTING_BALANCE = 100;

// CORS — allow dobium.com (Vercel frontend), Render preview URLs, and local dev
const ALLOWED_ORIGINS = [
  'https://dobium.com',
  'https://www.dobium.com',
  /\.vercel\.app$/,
  /\.onrender\.com$/,
  /\.railway\.app$/,
  /\.netlify\.app$/,
  'http://localhost:5173',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow non-browser requests (curl, Postman, server-to-server)
    if (!origin) return cb(null, true);
    const allowed = ALLOWED_ORIGINS.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    cb(allowed ? null : new Error(`CORS: ${origin} not allowed`), allowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));

// --- SSE Setup for Real-time Notifications ---
let clients = [];

function broadcastNotification(notification) {
  const eventData = JSON.stringify(notification);
  clients.forEach(client => client.res.write(`data: ${eventData}\n\n`));
}

app.get('/api/notifications/stream', (req, res) => {
  // Vercel serverless functions cannot hold persistent SSE connections.
  // Return 503 immediately so the frontend knows to fall back to polling.
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'SSE not available in serverless mode. Use polling.' });
  }

  // Railway / local dev — full SSE support
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);
  console.log(`[SSE] Client connected: ${clientId}. Total clients: ${clients.length}`);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients = clients.filter(client => client.id !== clientId);
    console.log(`[SSE] Client disconnected: ${clientId}. Total clients: ${clients.length}`);
  });
});

// Serve the React frontend from ../frontend/dist/
const REACT_BUILD = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(REACT_BUILD));

app.get('/config/supabase.js', (req, res) => {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';
  res.type('application/javascript').send(`window.SUPABASE_CONFIG = { url: ${JSON.stringify(url)}, anonKey: ${JSON.stringify(anonKey)} };`);
});
app.get('/config/stripe.js', (req, res) => {
  const publishableKey =
    process.env.STRIPE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    '';
  const defaultPriceId =
    process.env.STRIPE_DEFAULT_PRICE_ID ||
    process.env.NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID ||
    process.env.VITE_STRIPE_DEFAULT_PRICE_ID ||
    '';
  res
    .type('application/javascript')
    .send(`window.STRIPE_CONFIG = { publishableKey: ${JSON.stringify(publishableKey)}, defaultPriceId: ${JSON.stringify(defaultPriceId)} };`);
});
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate user balance from transactions
 */
async function calculateBalanceFromTransactions(userId, transaction = null) {
  let userAliases = [userId];
  let user = null;
  try {
    if (userId.includes('@')) {
      user = await User.findOne({ where: { email: userId }, ...(transaction ? { transaction } : {}) });
    } else {
      user = await User.findOne({ where: { id: userId }, ...(transaction ? { transaction } : {}) });
    }
  } catch (err) { }

  if (user) {
    userAliases.push(user.id);
    if (user.email && user.email !== `${user.id}@placeholder.com`) userAliases.push(user.email);
  }
  userAliases = [...new Set(userAliases)];

  const safeAliases = userAliases.filter(id => !id.includes('@'));
  if (safeAliases.length === 0) safeAliases.push('00000000-0000-0000-0000-000000000000');

  const transactions = await Transaction.findAll({
    where: { user_id: { [Op.in]: safeAliases } },
    ...(transaction ? { transaction } : {})
  });

  const activePredictions = await Prediction.findAll({
    where: { user_id: { [Op.in]: safeAliases } },
    ...(transaction ? { transaction } : {})
  });

  // Deposits/withdrawals are external paper-wallet adjustments.
  // Trade P&L is derived from prediction records so dashboard, market page,
  // and server-side buying-power checks all share one ledger.
  const totalDeposits = transactions
    .filter(t => t.type === 'deposit' && t.status === 'completed' && t.payment_method !== 'sell_return')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  // Sum withdrawals (completed only)
  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdrawal' && t.status === 'completed')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const activePredictionStakes = activePredictions
    .filter(p => p.status === 'active')
    .reduce((sum, p) => sum + parseFloat(p.stake_amount || 0), 0);

  const realizedPredictions = activePredictions
    .filter(p => ['won', 'lost', 'sold', 'refunded'].includes(p.status));
  const realizedStake = realizedPredictions
    .reduce((sum, p) => sum + parseFloat(p.stake_amount || 0), 0);
  const realizedReturn = realizedPredictions
    .reduce((sum, p) => {
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
          // Legacy traditional formula detection
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
      return sum + ret;
    }, 0);
  const realizedPnl = realizedReturn - realizedStake;

  const cashBalance = PAPER_TRADING_STARTING_BALANCE + totalDeposits - totalWithdrawals + realizedPnl;
  const rawBalance = cashBalance - activePredictionStakes;
  const buyingPower = Math.max(0, rawBalance);

  return {
    balance: buyingPower,
    buyingPower,
    rawBalance,
    cashBalance,
    paperStartingBalance: PAPER_TRADING_STARTING_BALANCE,
    totalDeposits,
    totalWithdrawals,
    activePredictionStakes,
    realizedStake,
    realizedReturn,
    realizedPnl
  };
}

async function refreshMarketPricing(marketId, transaction) {
  const market = await Market.findByPk(marketId, { transaction });
  if (!market) return null;

  const outcomes = await Outcome.findAll({ where: { market_id: marketId }, transaction });
  const outcomesData = outcomes.map(o => o.toJSON());
  const totalVolume = outcomesData.reduce((sum, o) => sum + parseFloat(o.total_stake || 0), 0);

  await market.update({ total_volume: totalVolume }, { transaction });

  const pricedOutcomes = recomputeProbabilities(outcomesData, totalVolume, market.market_type);
  for (const po of pricedOutcomes) {
    await Outcome.update({ probability: po.probability }, { where: { id: po.id }, transaction });
  }

  const prices = Object.fromEntries(pricedOutcomes.map(o => [o.id, o.probability]));
  await PriceHistory.create({ market_id: marketId, timestamp: new Date(), prices }, { transaction });

  return { marketId, totalVolume, prices };
}

async function removeTradesCausingNegativeBuyingPower(userId, transaction) {
  const balanceBefore = await calculateBalanceFromTransactions(userId, transaction);
  if (balanceBefore.rawBalance >= 0) {
    return {
      balance_before: balanceBefore.balance,
      raw_balance_before: balanceBefore.rawBalance,
      balance_after: balanceBefore.balance,
      raw_balance_after: balanceBefore.rawBalance,
      removed_predictions: 0,
      removed_prediction_ids: []
    };
  }

  let deficit = Math.abs(balanceBefore.rawBalance);
  const affectedMarketIds = new Set();
  const removedPredictionIds = [];

  let userAliases = [userId];
  let user = null;
  try {
    if (userId.includes('@')) {
      user = await User.findOne({ where: { email: userId }, transaction });
    } else {
      user = await User.findOne({ where: { id: userId }, transaction });
    }
  } catch (err) { }

  if (user) {
    userAliases.push(user.id);
    if (user.email && user.email !== `${user.id}@placeholder.com`) userAliases.push(user.email);
  }
  userAliases = [...new Set(userAliases)];

  const safeAliases = userAliases.filter(id => !id.includes('@'));
  if (safeAliases.length === 0) safeAliases.push('00000000-0000-0000-0000-000000000000');

  const activePredictions = await Prediction.findAll({
    where: { user_id: { [Op.in]: safeAliases }, status: 'active' },
    order: [['created_at', 'DESC']],
    transaction
  });

  for (const prediction of activePredictions) {
    if (deficit <= 0) break;

    const stake = parseFloat(prediction.stake_amount || 0);
    const outcome = await Outcome.findByPk(prediction.outcome_id, { transaction });
    if (outcome) {
      const nextStake = Math.max(0, parseFloat(outcome.total_stake || 0) - stake);
      await outcome.update({ total_stake: nextStake }, { transaction });
    }

    affectedMarketIds.add(prediction.market_id);
    removedPredictionIds.push(prediction.id);
    await prediction.destroy({ transaction });
    deficit -= stake;
  }

  for (const marketId of affectedMarketIds) {
    await refreshMarketPricing(marketId, transaction);
  }

  const balanceAfter = await calculateBalanceFromTransactions(userId, transaction);

  return {
    balance_before: balanceBefore.balance,
    raw_balance_before: balanceBefore.rawBalance,
    balance_after: balanceAfter.balance,
    raw_balance_after: balanceAfter.rawBalance,
    removed_predictions: removedPredictionIds.length,
    removed_prediction_ids: removedPredictionIds
  };
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'dobium-api', database: 'postgresql' });
});

// ============================================================================
// MARKET HELPERS
// ============================================================================

// Virtual liquidity added to every outcome to prevent extreme 0%/100% prices.
const BASE_LIQUIDITY = 200;

/**
 * Recompute outcome probabilities.
 *
 * - binary / multi_single: liquidity-smoothed proportional formula, sums to 100%
 * - multi_multiple: each outcome is independent, anchored at 50%
 */
function recomputeProbabilities(outcomes, totalVolume, marketType) {
  if (marketType === 'multi_multiple') {
    const priced = [];
    const yesOutcomes = outcomes.filter(o => o.id.endsWith('_yes'));
    yesOutcomes.forEach(yes => {
      const no = outcomes.find(o => o.id === yes.id.replace('_yes', '_no'));
      if (!no) {
        priced.push(yes);
        return;
      }
      const total = parseFloat(yes.total_stake || 0) + parseFloat(no.total_stake || 0);
      const denom = 2 * BASE_LIQUIDITY + total;
      const pYes = (BASE_LIQUIDITY + parseFloat(yes.total_stake || 0)) / denom * 100;
      const pNo = 100 - pYes;

      priced.push({ ...yes, probability: parseFloat(pYes.toFixed(2)) });
      priced.push({ ...no, probability: parseFloat(pNo.toFixed(2)) });
    });
    return priced;
  } else if (marketType === 'multi_single') {
    const priced = [];
    const numBaseOptions = outcomes.length / 2;
    
    const yesOutcomes = outcomes.filter(o => o.id.endsWith('_yes'));
    const pairs = [];
    let totalNoStake = 0;
    yesOutcomes.forEach(yes => {
      const no = outcomes.find(o => o.id === yes.id.replace('_yes', '_no'));
      if (!no) {
        priced.push(yes);
        return;
      }
      const yStake = parseFloat(yes.total_stake || 0);
      const nStake = parseFloat(no.total_stake || 0);
      pairs.push({ yes, no, yStake, nStake });
      totalNoStake += nStake;
    });
    
    const effectiveYesStakes = pairs.map(p => {
      const distributedNoStake = numBaseOptions > 1 ? (totalNoStake - p.nStake) / (numBaseOptions - 1) : 0;
      return p.yStake + distributedNoStake;
    });
    
    const sumEffectiveYesStake = effectiveYesStakes.reduce((a, b) => a + b, 0);
    const denom = numBaseOptions * BASE_LIQUIDITY + sumEffectiveYesStake;
    
    const rawYesProbs = effectiveYesStakes.map(effStake => (BASE_LIQUIDITY + effStake) / denom * 100);
    const sumRawYes = rawYesProbs.reduce((a, b) => a + b, 0);
    
    pairs.forEach((p, i) => {
      const pYes = rawYesProbs[i] + (i === pairs.length - 1 ? 100 - sumRawYes : 0);
      const pNo = 100 - pYes;
      
      priced.push({ ...p.yes, probability: parseFloat(pYes.toFixed(2)) });
      priced.push({ ...p.no, probability: parseFloat(pNo.toFixed(2)) });
    });
    
    return priced;
  }
  
  const n = outcomes.length;
  const denom = n * BASE_LIQUIDITY + totalVolume;
  const raw = outcomes.map(o => (BASE_LIQUIDITY + parseFloat(o.total_stake || 0)) / denom * 100);
  const sum = raw.reduce((a, b) => a + b, 0);
  return outcomes.map((o, i) => ({
    ...o,
    probability: parseFloat((raw[i] + (i === outcomes.length - 1 ? 100 - sum : 0)).toFixed(2))
  }));
}

function calculatePositionValue(stake, entryProbability, currentProbability) {
  const S = Number(stake || 0);
  const pEntry = Math.max(0, Math.min(100, Number(entryProbability || 0))) / 100;
  const pCurrent = Math.max(0, Math.min(100, Number(currentProbability || 0))) / 100;
  const rMin = S * pEntry;
  const rMax = S * (2 - pEntry);
  return parseFloat((rMin + (rMax - rMin) * pCurrent).toFixed(2));
}

/**
 * Fetch a market by ID with outcomes and price_history included
 */
async function fetchMarketWithRelations(marketId, transaction = null) {
  const opts = {
    include: [
      { model: Outcome, as: 'outcomes' },
      { model: PriceHistory, as: 'price_history', order: [['timestamp', 'ASC']] }
    ]
  };
  if (transaction) opts.transaction = transaction;
  return Market.findByPk(marketId, opts);
}

/**
 * Format a Sequelize market instance into the JSON shape the frontend expects
 */
function formatMarketResponse(market) {
  const m = market.toJSON ? market.toJSON() : market;
  let winning_outcome_ids = [];
  if (m.winning_outcome_ids && Array.isArray(m.winning_outcome_ids)) {
    winning_outcome_ids = m.winning_outcome_ids;
  } else if (m.winning_outcome_id) {
    try {
      const parsed = JSON.parse(m.winning_outcome_id);
      winning_outcome_ids = Array.isArray(parsed) ? parsed : [m.winning_outcome_id];
    } catch {
      winning_outcome_ids = [m.winning_outcome_id];
    }
  }
  return {
    ...m,
    total_volume: parseFloat(m.total_volume || 0),
    winning_outcome_ids,
    is_trending: Boolean(m.is_trending),
    outcomes: (m.outcomes || []).map(o => ({
      ...o,
      probability: parseFloat(o.probability || 0),
      total_stake: parseFloat(o.total_stake || 0)
    })),
    price_history: (m.price_history || []).map(ph => ({
      timestamp: ph.timestamp,
      prices: ph.prices
    }))
  };
}

const ICEMAN_RESOLUTION_DATE = '2026-05-15T05:00:00.000Z';

const KNOWN_MARKET_RESOLUTIONS = {
  drake_iceman_release: {
    winningOutcomeIds: ['yes'],
    resolutionDate: ICEMAN_RESOLUTION_DATE
  },
  drake_iceman_features: {
    winningOutcomeIds: ['21savage', 'future'],
    resolutionDate: ICEMAN_RESOLUTION_DATE
  }
};

function getRawOutcomeId(outcomeId, marketId) {
  const prefix = `${marketId}_`;
  return outcomeId && outcomeId.startsWith(prefix) ? outcomeId.slice(prefix.length) : outcomeId;
}

function serializeWinningOutcomeIds(winningOutcomeIds) {
  return winningOutcomeIds.length === 1
    ? winningOutcomeIds[0]
    : JSON.stringify(winningOutcomeIds);
}

function resolveOutcomeIds(market, requestedOutcomeIds) {
  const ids = Array.isArray(requestedOutcomeIds)
    ? requestedOutcomeIds.filter(Boolean)
    : [requestedOutcomeIds].filter(Boolean);

  if (ids.length === 0) {
    throw Object.assign(new Error('winning_outcome_id or winning_outcome_ids is required'), { status: 400 });
  }

  if (market.market_type === 'binary' && ids.length > 1) {
    throw Object.assign(new Error('Binary markets can only resolve with a single winning outcome'), { status: 400 });
  }

  const resolvedIds = ids.map((id) => {
    const match = market.outcomes.find((outcome) => (
      outcome.id === id || outcome.id === `${market.id}_${id}` || getRawOutcomeId(outcome.id, market.id) === id
    ));
    if (!match) {
      throw Object.assign(new Error(`Invalid winning outcome: ${id}`), { status: 400 });
    }
    return match.id;
  });

  return [...new Set(resolvedIds)];
}

async function resolveMarketInstance(market, requestedOutcomeIds, options = {}) {
  const transaction = options.transaction;
  const partial = options.partial || false;
  const resolutionDate = options.resolutionDate ? new Date(options.resolutionDate) : new Date();
  
  const newlyWinningIds = resolveOutcomeIds(market, requestedOutcomeIds);
  
  let existingWinningIds = [];
  if (market.winning_outcome_id) {
    try {
      const parsed = JSON.parse(market.winning_outcome_id);
      existingWinningIds = Array.isArray(parsed) ? parsed : [market.winning_outcome_id];
    } catch {
      existingWinningIds = [market.winning_outcome_id];
    }
  }
  
  const allWinningIds = [...new Set([...existingWinningIds, ...newlyWinningIds])];
  const allWinningSet = new Set(allWinningIds);

  const resolvedPrefixes = new Set();
  newlyWinningIds.forEach(id => {
    if (id.endsWith('_yes')) resolvedPrefixes.add(id.slice(0, -4));
    if (id.endsWith('_no')) resolvedPrefixes.add(id.slice(0, -3));
  });

  const finalizedOutcomeIds = new Set();
  if (partial) {
    market.outcomes.forEach(o => {
      let isFinalized = false;
      for (const prefix of resolvedPrefixes) {
        if (o.id === `${prefix}_yes` || o.id === `${prefix}_no`) {
          isFinalized = true;
          break;
        }
      }
      if (isFinalized) finalizedOutcomeIds.add(o.id);
    });
  } else {
    market.outcomes.forEach(o => finalizedOutcomeIds.add(o.id));
  }

  await market.update({
    status: partial ? 'active' : 'resolved',
    winning_outcome_id: serializeWinningOutcomeIds(allWinningIds),
    resolution_date: partial ? market.resolution_date : resolutionDate
  }, { transaction });

  for (const outcome of market.outcomes) {
    if (finalizedOutcomeIds.has(outcome.id)) {
      await outcome.update({
        probability: allWinningSet.has(outcome.id) ? 100 : 0
      }, { transaction });
    }
  }

  const predictions = await Prediction.findAll({
    where: { market_id: market.id, status: 'active' },
    transaction
  });
  
  const predictionsToResolve = predictions.filter(p => finalizedOutcomeIds.has(p.outcome_id));

  const users = await User.findAll({ transaction });
  
  if (!partial) {
    const resolutionNotifications = users.map(u => ({
      id: nanoid(12),
      user_id: u.id,
      type: 'market_resolved',
      title: 'Market Resolved',
      message: `The market "${market.title}" has been resolved.`,
      link: `/markets/${market.id}`,
      is_read: false,
      created_at: resolutionDate
    }));
    if (resolutionNotifications.length > 0) {
      const created = await Notification.bulkCreate(resolutionNotifications, { transaction, returning: true });
      created.forEach(n => broadcastNotification(n.toJSON()));
    }
  }

  for (const prediction of predictionsToResolve) {
    const won = allWinningSet.has(prediction.outcome_id);
    const outcomeObj = market.outcomes.find(o => o.id === prediction.outcome_id);
    const outcomeTitle = outcomeObj ? outcomeObj.title : 'Unknown Outcome';

    const pEntry = parseFloat(prediction.odds_at_prediction || 50) / 100;
    const oddsPercent = parseFloat(prediction.odds_at_prediction || 50);

    let feedback = "";
    if (won) {
      if (oddsPercent <= 30) {
        feedback = "Amazing foresight! You caught an underdog early.";
      } else if (oddsPercent >= 70) {
        feedback = "Solid, safe bet that paid off.";
      } else {
        feedback = "Great call on a competitive market!";
      }
    } else {
      if (oddsPercent <= 30) {
        feedback = "It was a long shot anyway. Better luck next time!";
      } else if (oddsPercent >= 70) {
        feedback = "Ouch, tough break on a favorite. Better luck next time!";
      } else {
        feedback = "It could have gone either way. Better luck next time!";
      }
    }

    const stakeAmount = parseFloat(prediction.stake_amount || 0);
    let actualReturn = 0;
    if (won) {
      actualReturn = parseFloat(prediction.potential_return || 0);
    } else {
      actualReturn = stakeAmount * pEntry;
    }
    await prediction.update({
      status: won ? 'won' : 'lost',
      actual_return: actualReturn,
      resolved_at: resolutionDate
    }, { transaction });

    if (actualReturn > 0) {
      await User.findOrCreate({
        where: { id: prediction.user_id },
        defaults: {
          id: prediction.user_id,
          username: prediction.user_id.substring(0, 20),
          email: `${prediction.user_id}@placeholder.com`
        },
        transaction
      });
      await Transaction.findOrCreate({
        where: { id: `payout_${prediction.id}` },
        defaults: {
          id: `payout_${prediction.id}`,
          user_id: prediction.user_id,
          type: 'payout',
          amount: actualReturn,
          payment_method: 'market_resolution',
          status: 'completed',
          completed_at: resolutionDate
        },
        transaction
      });
    }

    const pnl = actualReturn - stakeAmount;
    const user = users.find(u => u.id === prediction.user_id);
    if (user && user.email && !user.email.endsWith('@placeholder.com')) {
      const username = user.username || user.email.split('@')[0];
      const balanceInfo = await calculateBalanceFromTransactions(prediction.user_id, transaction);

      const html = buildResolutionHtml({
        username,
        marketTitle: market.title,
        marketId: market.id,
        outcomeTitle,
        won,
        stake: stakeAmount,
        actualReturn,
        pnl,
        newBalance: balanceInfo.buyingPower,
        isPartial: partial
      });

      await sendEmail({
        to: user.email,
        subject: won ? `You won! Market "${market.title}" resolved 💰` : `Market "${market.title}" resolved`,
        text: `Your position on ${outcomeTitle} ${won ? 'won' : 'lost'}! Return: ${actualReturn.toFixed(2)}`,
        html
      });
    }

    if (prediction.user_id && prediction.user_id !== 'demo_user') {
      const notification = await Notification.create({
        id: nanoid(12),
        user_id: prediction.user_id,
        type: won ? 'prediction_won' : 'prediction_lost',
        title: won ? 'Prediction Won! 🏆' : 'Prediction Lost',
        message: `Your position on "${outcomeTitle}" in "${market.title}" ${won ? 'won' : 'lost'}. ${feedback}`,
        link: `/markets/${market.id}`,
        is_read: false,
        created_at: resolutionDate
      }, { transaction });
      broadcastNotification(notification.toJSON());
    }
  }

  // Record a price history snapshot with the final resolved prices (100 or 0 for finalized ones)
  const allOutcomes = await Outcome.findAll({ where: { market_id: market.id }, transaction });
  const prices = Object.fromEntries(allOutcomes.map(o => [o.id, o.probability]));
  await PriceHistory.create({ market_id: market.id, timestamp: new Date(), prices }, { transaction });

  // Update global scores for all involved users
  const involvedUserIds = [...new Set(predictions.map(p => p.user_id))];
  for (const uid of involvedUserIds) {
    if (uid && uid !== 'demo_user') {
      updateGlobalScore(uid).catch(err => console.error('Error updating global score on resolve:', err));
    }
  }

  return { winningOutcomeIds: allWinningIds };
}


/**
 * Fetch all markets formatted for the frontend
 */
async function getAllMarketsFormatted(whereClause = {}) {
  const markets = await Market.findAll({
    where: whereClause,
    include: [
      { model: Outcome, as: 'outcomes' },
      { model: PriceHistory, as: 'price_history', separate: true, order: [['timestamp', 'ASC']] }
    ],
    order: [['created_at', 'DESC']]
  });
  return markets.map(formatMarketResponse);
}

/**
 * Helper to alert users if their active positions move significantly
 */
async function checkPositionAlerts(marketId, newPrices, transaction) {
  try {
    const market = await Market.findByPk(marketId, { transaction });
    if (!market) return;
    const activePreds = await Prediction.findAll({ where: { market_id: marketId, status: 'active' }, transaction });

    const newNotifications = [];
    for (const pred of activePreds) {
      if (pred.user_id === 'demo_user') continue;

      const currentProb = newPrices[pred.outcome_id] || 50;
      const pEntry = parseFloat(pred.odds_at_prediction || 50);
      const S = parseFloat(pred.stake_amount || 0);

      const pE = Math.max(0, Math.min(100, pEntry)) / 100;
      const pC = Math.max(0, Math.min(100, currentProb)) / 100;
      const rMin = S * pE;
      const rMax = S * (2 - pE);

      let mtmValue;
      if (pE === 0) {
        mtmValue = pC > 0 ? rMax : rMin;
      } else if (pE === 1) {
        mtmValue = pC < 1 ? rMin : rMax;
      } else if (pC <= pE) {
        mtmValue = rMin + (S - rMin) * (pC / pE);
      } else {
        mtmValue = S + (rMax - S) * ((pC - pE) / (1 - pE));
      }
      const mtm = parseFloat(mtmValue.toFixed(2));

      const roi = S > 0 ? (mtm - S) / S : 0;
      let alertType = null;
      let alertTitle = '';
      let alertMessage = '';

      if (roi >= 1.0) {
        alertType = 'position_up_100';
        alertTitle = 'Position Doubled 🚀';
        alertMessage = `Your position in "${market.title}" is up 100%+. Current value: $${mtm.toFixed(2)}.`;
      } else if (roi >= 0.5) {
        alertType = 'position_up_50';
        alertTitle = 'Position Up 50% 📈';
        alertMessage = `Your position in "${market.title}" is up over 50%. Current value: $${mtm.toFixed(2)}.`;
      } else if (roi <= -0.9) {
        alertType = 'position_down_90';
        alertTitle = 'Position Down 90% 🔻';
        alertMessage = `Your position in "${market.title}" has decreased by over 90%. Current value: $${mtm.toFixed(2)}.`;
      } else if (roi <= -0.5) {
        alertType = 'position_down_50';
        alertTitle = 'Position Down 50% 📉';
        alertMessage = `Your position in "${market.title}" has decreased by over 50%. Current value: $${mtm.toFixed(2)}.`;
      }

      if (alertType) {
        const linkTag = `/markets/${market.id}?pred=${pred.id}&alert=${alertType}`;
        const existing = await Notification.findOne({
          where: { user_id: pred.user_id, link: linkTag },
          transaction
        });
        if (!existing) {
          newNotifications.push({
            id: nanoid(12),
            user_id: pred.user_id,
            type: alertType,
            title: alertTitle,
            message: alertMessage,
            link: linkTag,
            is_read: false,
            created_at: new Date()
          });
        }
      }
    }

    if (newNotifications.length > 0) {
      const created = await Notification.bulkCreate(newNotifications, { transaction, returning: true });
      created.forEach(n => broadcastNotification(n.toJSON()));
    }
  } catch (err) {
        console.error('Error checking position alerts:', err);
  }
}

// ============================================================================
// MAIN EVENTS & GLOBAL LEADERBOARD
// ============================================================================

app.get('/api/events', async (req, res) => {
  try {
    const events = await MainEvent.findAll({
      where: { status: { [Op.in]: ['upcoming', 'active'] } },
      order: [['event_date', 'ASC']]
    });
    res.json(events);
  } catch (error) {
    console.error('List events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/api/leaderboard/global', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const { GlobalScore, User } = require('./lib/database/models');
    
    const scores = await GlobalScore.findAll({
      include: [{ model: User, as: 'user', attributes: ['username'] }],
      order: [['global_rank', 'ASC']],
      limit: limit
    });
    
    const formatted = scores.map(s => {
      const json = s.toJSON();
      return {
        ...json,
        username: json.user?.username || json.user_id.slice(0, 8),
        league_rank: json.global_rank // map global_rank to league_rank so the frontend LeagueLeaderboard component works seamlessly
      };
    });
    
    res.json(formatted);
  } catch (error) {
    console.error('Global leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch global leaderboard' });
  }
});

// ============================================================================
// FORECAST LEAGUES ENDPOINTS
// ============================================================================

app.get('/api/leagues', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (user_id) {
      const memberships = await LeagueMember.findAll({
        where: { user_id },
        include: [{
          model: ForecastLeague,
          as: 'league',
          where: { event_id: { [Op.not]: null } }, // Ignore old leagues
          include: [
            { model: MainEvent, as: 'event' },
            { model: LeagueMember, as: 'members' },
            { model: LeagueScore, as: 'scores' },
            { model: LeagueTimingWindow, as: 'timing_windows' }
          ]
        }],
        order: [['joined_at', 'DESC']]
      });
      return res.json(memberships.map(membership => {
        const league = membership.league?.toJSON ? membership.league.toJSON() : membership.league;
        const score = (league?.scores || []).find(s => s.user_id === user_id);
        return {
          ...league,
          member_count: league?.members?.length || 0,
          my_rank: score?.league_rank || null,
          my_points: parseFloat(score?.total_points || 0)
        };
      }).filter(Boolean));
    }

    const leagues = await ForecastLeague.findAll({
      where: { event_id: { [Op.not]: null } }, // Ignore old leagues
      include: [
        { model: MainEvent, as: 'event' },
        { model: LeagueMember, as: 'members' },
        { model: LeagueTimingWindow, as: 'timing_windows' }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(leagues.map(league => {
      const json = league.toJSON();
      return { ...json, member_count: json.members?.length || 0 };
    }));
  } catch (error) {
    console.error('List leagues error:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

app.post('/api/leagues', async (req, res) => {
  try {
    const {
      name,
      admin_user_id,
      user_id,
      event_id,
      timing_windows,
      timing_overrides
    } = req.body;
    const adminUserId = admin_user_id || user_id;
    if (!name || !adminUserId || !event_id) {
      return res.status(400).json({ error: 'name, event_id, and admin_user_id are required' });
    }

    const admin = await User.findByPk(adminUserId);
    if (!leagueService.isUsableUsername(admin, adminUserId)) {
      return res.status(403).json({ error: 'Set a unique lowercase username before creating a league' });
    }

    const event = await MainEvent.findByPk(event_id);
    if (!event) {
      return res.status(404).json({ error: 'Main Event not found' });
    }

    const result = await sequelize.transaction(async (t) => {
      const now = new Date();
      
      const leagueStatus = event.status === 'upcoming' ? 'lobby' : event.status;

      const league = await ForecastLeague.create({
        id: nanoid(12),
        name,
        admin_user_id: adminUserId,
        event_id,
        status: leagueStatus,
        season_start: event.season_start,
        season_end: event.season_end,
        invite_code: nanoid(8).toUpperCase()
      }, { transaction: t });

      await LeagueMember.create({
        id: nanoid(12),
        league_id: league.id,
        user_id: adminUserId,
        joined_at: now
      }, { transaction: t });
      await leagueService.ensureLeagueScore(league.id, adminUserId, t);
      const windows = await leagueService.createTimingWindows(
        league,
        timing_windows || timing_overrides || null,
        t
      );
      return { league, windows };
    });

    res.json(result);
  } catch (error) {
    console.error('Create league error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create league' });
  }
});

app.get('/api/leagues/:id', async (req, res) => {
  try {
    const { user_id } = req.query;
    const league = await ForecastLeague.findByPk(req.params.id, {
      include: [
        { model: MainEvent, as: 'event', include: [{ model: MainEventMarket, as: 'event_markets' }] },
        { model: LeagueMember, as: 'members', include: [{ model: User, as: 'user', attributes: ['username'] }] },
        { model: LeagueTimingWindow, as: 'timing_windows' }
      ]
    });
    if (!league) return res.status(404).json({ error: 'League not found' });

    let predictions = [];
    if (user_id) {
      predictions = await LeaguePrediction.findAll({
        where: { league_id: league.id, user_id }
      });
    }
    res.json({ league, predictions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/leagues/:id/leaderboard', async (req, res) => {
  try {
    const scores = await LeagueScore.findAll({
      where: { league_id: req.params.id },
      include: [{ model: User, as: 'user', attributes: ['username'] }],
      order: [['league_rank', 'ASC']]
    });
    
    const formatted = scores.map(s => ({
      ...s.toJSON(),
      username: s.user?.username || s.user_id.slice(0, 8)
    }));
    
    res.json({ rows: formatted, open_markets: 0 }); // You can query open_markets if needed
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leagues/join', async (req, res) => {
  try {
    const { user_id, invite_code } = req.body;
    if (!user_id || !invite_code) return res.status(400).json({ error: 'Missing fields' });

    const league = await ForecastLeague.findOne({ where: { invite_code: invite_code.toUpperCase() } });
    if (!league) return res.status(404).json({ error: 'Invalid invite code' });

    const user = await User.findByPk(user_id);
    if (!leagueService.isUsableUsername(user, user_id)) {
      return res.status(403).json({ error: 'Set username first' });
    }

    await sequelize.transaction(async (t) => {
      await LeagueMember.findOrCreate({
        where: { league_id: league.id, user_id },
        defaults: { id: nanoid(12), league_id: league.id, user_id, joined_at: new Date() },
        transaction: t
      });
      await leagueService.ensureLeagueScore(league.id, user_id, t);
    });

    res.json({ success: true, league });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leagues/:id/join', async (req, res) => {
  try {
    const { user_id } = req.body;
    const league = await ForecastLeague.findByPk(req.params.id);
    if (!league) return res.status(404).json({ error: 'League not found' });
    
    await sequelize.transaction(async (t) => {
      await LeagueMember.findOrCreate({
        where: { league_id: league.id, user_id },
        defaults: { id: nanoid(12), league_id: league.id, user_id, joined_at: new Date() },
        transaction: t
      });
      await leagueService.ensureLeagueScore(league.id, user_id, t);
    });
    res.json({ success: true, league });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leagues/:id/predictions', async (req, res) => {
  try {
    const { user_id, market_id, outcome_id, stake_amount, allocation_pct } = req.body;
    const leagueId = req.params.id;

    const result = await sequelize.transaction(async (t) => {
      const league = await ForecastLeague.findByPk(leagueId, { transaction: t });
      if (!league) throw Object.assign(new Error('League not found'), { status: 404 });

      if (league.event_id) {
        const isEventMarket = await MainEventMarket.findOne({
          where: { event_id: league.event_id, market_id },
          transaction: t
        });
        if (!isEventMarket) {
          throw Object.assign(new Error('This market is not part of the league\'s event'), { status: 400 });
        }
      }

      const market = await Market.findByPk(market_id, { include: [{ model: Outcome, as: 'outcomes' }], transaction: t });
      if (!market) throw Object.assign(new Error('Market not found'), { status: 404 });
      
      const outcome = market.outcomes.find(o => o.id === outcome_id);
      if (!outcome) throw Object.assign(new Error('Outcome not found'), { status: 404 });

      // First, place the REAL prediction using the global logic
      const realPrediction = await executePredictionPlacement({
        market_id,
        outcome_id,
        stake_amount: stake_amount || 10,
        odds_at_prediction: outcome.probability,
        user_id
      }, t);

      const prediction = await LeaguePrediction.create({
        id: nanoid(12),
        league_id: leagueId,
        user_id,
        market_id,
        outcome_id,
        p_entry: outcome.probability,
        stake_amount: stake_amount || 10,
        allocation_pct: allocation_pct || null,
        created_at: new Date(),
        real_prediction_id: realPrediction.id
      }, { transaction: t });

      return prediction;
    });

    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/leagues/:id/exit', async (req, res) => {
  try {
    const { predictionId, soldPct, pCurrent, user_id } = req.body;
    await sequelize.transaction(async (t) => {
      const prediction = await LeaguePrediction.findOne({
        where: { id: predictionId, league_id: req.params.id, user_id },
        transaction: t
      });
      if (!prediction) throw Object.assign(new Error('Prediction not found'), { status: 404 });
      if (prediction.resolved) throw Object.assign(new Error('Already resolved'), { status: 400 });

      const exitAmount = parseFloat(prediction.stake_amount) * (soldPct / 100);
      
      // Execute standard sell logic which will sync back to the LeaguePrediction
      await executePositionSell({
        market_id: prediction.market_id,
        outcome_id: prediction.outcome_id,
        user_id,
        sell_amount: exitAmount
      }, t);
    });
    res.json({ success: true });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/admin/leagues/:id/resolve', async (req, res) => {
  try {
    const { marketId, outcome } = req.body;
    await leagueService.processLeagueMarketResolution(req.params.id, marketId, outcome);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/leagues/:id/close', async (req, res) => {
  try {
    const league = await ForecastLeague.findByPk(req.params.id);
    if (!league) return res.status(404).json({ error: 'League not found' });
    await league.update({ status: 'completed' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// LEAGUE STATS
// ============================================================================

app.get('/api/leagues/:leagueId/stats', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const leagueMarkets = await Market.findAll({ where: { status: 'active' } });
    const activeMarkets = leagueMarkets.length;
    const totalVolume = leagueMarkets.reduce((sum, m) => sum + parseFloat(m.total_volume || 0), 0);
    const leagueMarketIds = leagueMarkets.map(m => m.id);
    const predictionCount = await Prediction.count({
      where: { market_id: { [Op.in]: leagueMarketIds } }
    });
    res.json({
      league_id: leagueId,
      active_markets: activeMarkets,
      total_volume: totalVolume,
      predictions: predictionCount
    });
  } catch (error) {
    console.error('League stats error:', error);
    res.status(500).json({ error: 'Failed to fetch league stats' });
  }
});

// ============================================================================
// MARKETS — Database backed
// ============================================================================

// Current events — active markets closing within 6 months
app.get('/api/markets/current-events', async (req, res) => {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    const markets = await getAllMarketsFormatted({ status: 'active' });
    const filtered = markets.filter(m => {
      if (!m.close_date) return true;
      const d = new Date(m.close_date);
      return d > now && d <= cutoff;
    });
    res.json(filtered);
  } catch (error) {
    console.error('Current events error:', error);
    res.status(500).json({ error: 'Failed to fetch current events' });
  }
});

// Trending — top N by total_volume
app.get('/api/markets/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const markets = await getAllMarketsFormatted({ status: 'active' });

    const trending = markets.filter(m => m.is_trending).slice(0, limit);
    res.json(trending);
  } catch (error) {
    console.error('Trending markets error:', error);
    res.status(500).json({ error: 'Failed to fetch trending markets' });
  }
});

// By category
app.get('/api/markets/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const markets = await getAllMarketsFormatted({
      status: 'active',
      category: category.toLowerCase()
    });
    res.json(markets);
  } catch (error) {
    console.error('Category markets error:', error);
    res.status(500).json({ error: 'Failed to fetch category markets' });
  }
});

app.get('/api/markets/suggestions', async (req, res) => {
  const suggestions = [
    {
      topic: "Technology",
      suggestions: [
        { title: "Will OpenAI release GPT-5 by Q2 2025?", category: "technology" },
        { title: "Will Apple's Vision Pro 2 launch in 2025?", category: "technology" },
        { title: "Will TikTok be banned in the US?", category: "technology" }
      ]
    },
    {
      topic: "Politics",
      suggestions: [
        { title: "Will there be a government shutdown in Q1 2025?", category: "politics" },
        { title: "Will immigration reform pass in 2025?", category: "politics" },
        { title: "Will the debt ceiling be raised without crisis?", category: "politics" }
      ]
    },
    {
      topic: "Sports",
      suggestions: [
        { title: "Super Bowl LIX predictions", category: "sports" },
        { title: "2025 NBA All-Star Game MVP", category: "sports" },
        { title: "College Football Playoff Champion", category: "sports" }
      ]
    },
    {
      topic: "Entertainment",
      suggestions: [
        { title: "2025 Grammy Awards predictions", category: "entertainment" },
        { title: "Golden Globes Best Picture", category: "entertainment" },
        { title: "2025 Oscar Best Picture", category: "entertainment" }
      ]
    },
    {
      topic: "Finance",
      suggestions: [
        { title: "Fed interest rate decisions", category: "finance" },
        { title: "S&P 500 performance predictions", category: "finance" },
        { title: "Cryptocurrency price predictions", category: "crypto" }
      ]
    },
    {
      topic: "International",
      suggestions: [
        { title: "Ukraine-Russia conflict resolution", category: "international" },
        { title: "Middle East developments", category: "international" },
        { title: "Global trade agreements", category: "international" }
      ]
    }
  ];
  res.json(suggestions);
});

// ============================================================================
// MARKETS CRUD — Database backed
// ============================================================================

// GET all markets
app.get('/api/markets', async (req, res) => {
  try {
    const markets = await getAllMarketsFormatted();
    res.json(markets);
  } catch (error) {
    console.error('Get markets error:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

// GET single market by id
app.get('/api/markets/:id', async (req, res) => {
  try {
    const market = await fetchMarketWithRelations(req.params.id);
    if (!market) return res.status(404).json({ error: 'Market not found' });
    res.json(formatMarketResponse(market));
  } catch (error) {
    console.error('Get market error:', error);
    res.status(500).json({ error: 'Failed to fetch market' });
  }
});

// POST create market
app.post('/api/markets', async (req, res) => {
  try {
    const { title, description = '', category, outcomes = [], image_url = '', search_keywords = '', close_date = null, resolution_date = null, market_type = 'binary', is_trending = false } = req.body;
    if (!title || !category || !Array.isArray(outcomes) || outcomes.length < 2) {
      return res.status(400).json({ error: 'Invalid market payload' });
    }

    const result = await sequelize.transaction(async (t) => {
      const marketId = nanoid(12);
      const market = await Market.create({
        id: marketId,
        title, description, category, market_type,
        status: 'active',
        close_date, resolution_date,
        total_volume: 0,
        image_url,
        winning_outcome_id: null,
        search_keywords,
        is_trending
      }, { transaction: t });

      let outcomeRecords = [];
      if (market_type === 'multi_multiple' || market_type === 'multi_single') {
        const isSingle = market_type === 'multi_single';
        outcomes.forEach(o => {
          const baseId = o.id || nanoid(8);
          let probYes = 50;
          if (isSingle) probYes = typeof o.probability === 'number' ? o.probability : Math.round(100 / outcomes.length);
          else probYes = typeof o.probability === 'number' ? o.probability : 50;
          
          const probNo = 100 - probYes;
          outcomeRecords.push({
            id: `${marketId}_${baseId}_yes`,
            market_id: marketId,
            title: `${o.title} (Yes)`,
            probability: probYes,
            total_stake: 0,
            image_url: o.image_url || null,
            icon: o.icon || null
          });
          outcomeRecords.push({
            id: `${marketId}_${baseId}_no`,
            market_id: marketId,
            title: `${o.title} (No)`,
            probability: probNo,
            total_stake: 0,
            image_url: o.image_url || null,
            icon: o.icon || null
          });
        });
      } else {
        outcomeRecords = outcomes.map(o => ({
          id: `${marketId}_${o.id || nanoid(8)}`,
          market_id: marketId,
          title: o.title,
          probability: 50,
          total_stake: 0,
          image_url: o.image_url || null,
          icon: o.icon || null
        }));
      }
      await Outcome.bulkCreate(outcomeRecords, { transaction: t });

      // Initial price snapshot
      const prices = Object.fromEntries(outcomeRecords.map(o => [o.id, o.probability]));
      await PriceHistory.create({
        market_id: marketId,
        timestamp: new Date(),
        prices
      }, { transaction: t });

      const users = await User.findAll({ transaction: t });
      const notifications = users.map(u => ({
        id: nanoid(12),
        user_id: u.id,
        type: 'market_new',
        title: 'New Market Out',
        message: `A new market "${title}" is now available in the ${category} category.`,
        link: `/markets/${marketId}`,
        is_read: false,
        created_at: new Date()
      }));
      if (notifications.length > 0) {
        const created = await Notification.bulkCreate(notifications, { transaction: t, returning: true });
        created.forEach(n => broadcastNotification(n.toJSON()));
      }

      return await fetchMarketWithRelations(marketId, t);
    });

    res.status(201).json(formatMarketResponse(result));
  } catch (error) {
    console.error('Create market error:', error);
    res.status(500).json({ error: 'Failed to create market' });
  }
});

// PUT update market order
app.put('/api/admin/markets/reorder', async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Expected updates array' });
    await sequelize.transaction(async (t) => {
      for (const update of updates) {
        await Market.update({ display_order: update.display_order }, { where: { id: update.id }, transaction: t });
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Market reorder error:', error);
    res.status(500).json({ error: 'Failed to reorder markets' });
  }
});

// PUT update market
app.put('/api/markets/:id', async (req, res) => {
  try {
    const { close_date, resolution_date, title, status, outcomes, category, description, image_url, is_trending } = req.body;
    const result = await sequelize.transaction(async (t) => {
      const market = await Market.findByPk(req.params.id, { transaction: t });
      if (!market) throw Object.assign(new Error('Market not found'), { status: 404 });

      const oldStatus = market.status;

      await market.update({
        ...(close_date !== undefined && { close_date }),
        ...(resolution_date !== undefined && { resolution_date }),
        ...(title !== undefined && { title }),
        ...(status !== undefined && { status }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(image_url !== undefined && { image_url }),
        ...(is_trending !== undefined && { is_trending })
      }, { transaction: t });

      if (outcomes && Array.isArray(outcomes)) {
        const incomingIds = outcomes.map(o => o.id);
        const existingOutcomes = await Outcome.findAll({ where: { market_id: market.id }, transaction: t });

        // Delete removed outcomes if they have no predictions
        for (const eo of existingOutcomes) {
          if (!incomingIds.includes(eo.id) && !eo.id.startsWith('new_')) {
            const predsCount = await Prediction.count({ where: { outcome_id: eo.id }, transaction: t });
            if (predsCount > 0) {
              throw Object.assign(new Error(`Cannot remove outcome "${eo.title}" because it has active predictions.`), { status: 400 });
            }
            await eo.destroy({ transaction: t });
          }
        }

        for (const o of outcomes) {
          const outcome = await Outcome.findByPk(o.id, { transaction: t });
          if (outcome) {
            await outcome.update({
              ...(o.title !== undefined && { title: o.title }),
              ...(o.probability !== undefined && { probability: o.probability }),
              ...(o.image_url !== undefined && { image_url: o.image_url }),
              ...(o.icon !== undefined && { icon: o.icon })
            }, { transaction: t });
          } else if (o.id && String(o.id).startsWith('new_')) {
            const baseId = o.id.replace('new_', '');
            
            let probYes = 0;
            if (market.market_type === 'binary') probYes = 50;
            else if (market.market_type === 'multi_multiple') probYes = 50;
            else if (market.market_type === 'multi_single') {
               const numBaseOutcomes = outcomes.length;
               // in multi_single edit view, the length of outcomes sent from frontend is the number of individual pairs (e.g., 8 items for 4 options).
               // So the base options count is outcomes.length / 2.
               const baseOptionsCount = Math.max(1, Math.ceil(numBaseOutcomes / 2));
               probYes = Math.round(100 / baseOptionsCount);
            }

            await Outcome.create({
              id: `${market.id}_${baseId}`,
              market_id: market.id,
              title: o.title,
              probability: probYes,
              total_stake: 0,
              image_url: o.image_url || null,
              icon: o.icon || null
            }, { transaction: t });
          }
        }
      }

      if (status === 'archived' && oldStatus !== 'archived') {
        const users = await User.findAll({ transaction: t });
        const notifications = users.map(u => ({
          id: nanoid(12),
          user_id: u.id,
          type: 'market_cancelled',
          title: 'Market Cancelled',
          message: `The market "${market.title}" has been cancelled.`,
          link: `/explore`,
          is_read: false,
          created_at: new Date()
        }));
        if (notifications.length > 0) {
          const created = await Notification.bulkCreate(notifications, { transaction: t, returning: true });
          created.forEach(n => broadcastNotification(n.toJSON()));
        }
      }

      return await fetchMarketWithRelations(req.params.id, t);
    });
    res.json(formatMarketResponse(result));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Update market error:', error);
    res.status(500).json({ error: 'Failed to update market' });
  }
});


// ============================================================================
// PREDICTIONS — Database backed
// ============================================================================

/**
 * Normalize a Sequelize Prediction instance:
 * 1. Ensure snake_case timestamps (Sequelize returns camelCase by default)
 * 2. Parse DECIMAL columns to JS numbers (Sequelize returns them as strings from PostgreSQL)
 */
function normalizePrediction(p) {
  const json = p.toJSON ? p.toJSON() : p;
  return {
    ...json,
    // Numeric fields — Sequelize DECIMAL comes back as strings
    stake_amount: parseFloat(json.stake_amount) || 0,
    odds_at_prediction: parseFloat(json.odds_at_prediction) || 0,
    potential_return: parseFloat(json.potential_return) || 0,
    actual_return: parseFloat(json.actual_return) || 0,
    // Timestamps — Sequelize underscored:true still serialises as camelCase
    created_at: json.created_at || json.createdAt || null,
    updated_at: json.updated_at || json.updatedAt || null,
  };
}

app.get('/api/predictions', async (req, res) => {
  try {
    const { market_id } = req.query;
    const where = {};
    if (market_id) where.market_id = market_id;
    const predictions = await Prediction.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    res.json(predictions.map(normalizePrediction));
  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});



async function executePredictionPlacement({ market_id, outcome_id, stake_amount, odds_at_prediction, user_id }, t) {
  // Validate market exists and is active
  const market = await Market.findByPk(market_id, {
    include: [{ model: Outcome, as: 'outcomes' }],
    transaction: t
  });
  if (!market) throw Object.assign(new Error('Market not found'), { status: 404 });
  if (market.status !== 'active') throw Object.assign(new Error('Market is not active'), { status: 400 });

  const outcome = market.outcomes.find(o => o.id === outcome_id);
  if (!outcome) throw Object.assign(new Error('Outcome not found'), { status: 400 });

  if (user_id && user_id !== 'demo_user') {
    const balanceInfo = await calculateBalanceFromTransactions(user_id, t);
    if (stake_amount > balanceInfo.balance) {
      throw Object.assign(
        new Error(`Insufficient buying power. Available: $${balanceInfo.balance.toFixed(2)}, Required: $${stake_amount.toFixed(2)}`),
        {
          status: 402,
          details: {
            available_balance: balanceInfo.balance,
            active_stakes: balanceInfo.activePredictionStakes,
            required: stake_amount
          }
        }
      );
    }
  }

  // Calculate potential return using S(1-p) formula
  const p = odds_at_prediction / 100;
  const potential_return = Number((stake_amount + stake_amount * (1 - p)).toFixed(2));

  const prediction = await Prediction.create({
        id: nanoid(12),
        market_id,
        outcome_id,
        user_id,
        stake_amount,
        odds_at_prediction,
        potential_return,
        status: 'active',
        actual_return: 0
      }, { transaction: t });

      // Update outcome total_stake
      const newStake = parseFloat(outcome.total_stake || 0) + stake_amount;
      await outcome.update({ total_stake: newStake }, { transaction: t });

      // Update market total_volume
      const newVolume = parseFloat(market.total_volume || 0) + stake_amount;
      await market.update({ total_volume: newVolume }, { transaction: t });

      // Recompute probabilities for all outcomes
      const allOutcomes = await Outcome.findAll({ where: { market_id }, transaction: t });
      const outcomesData = allOutcomes.map(o => o.toJSON());
      const pricedOutcomes = recomputeProbabilities(outcomesData, newVolume, market.market_type);

      for (const po of pricedOutcomes) {
        await Outcome.update({ probability: po.probability }, { where: { id: po.id }, transaction: t });
      }

      // Record price history snapshot
      const prices = Object.fromEntries(pricedOutcomes.map(o => [o.id, o.probability]));
      await PriceHistory.create({
        market_id,
        timestamp: new Date(),
        prices
      }, { transaction: t });

      // Check if this trade shifted prices enough to alert other traders
      await checkPositionAlerts(market_id, prices, t);

      // Notify the user their prediction was placed
      if (user_id && user_id !== 'demo_user') {
        const notification = await Notification.create({
          id: nanoid(12),
          user_id: user_id,
          type: 'prediction_placed',
          title: 'Position Secured 🎯',
          message: `You're in on "${outcome.title}" at ${odds_at_prediction}%. Let's see how the market moves.`,
          link: `/markets/${market_id}`,
          is_read: false,
          created_at: new Date()
        }, { transaction: t });
        broadcastNotification(notification.toJSON());
      }

  if (user_id && user_id !== 'demo_user') {
    const balanceAfterTrade = await calculateBalanceFromTransactions(user_id, t);
    if (balanceAfterTrade.rawBalance < 0) {
      throw Object.assign(new Error('Trade would create negative buying power and was removed.'), {
        status: 402,
        details: {
          available_balance: 0,
          raw_balance: balanceAfterTrade.rawBalance,
          removed_prediction_id: prediction.id
        }
      });
    }
  }

  return prediction;
}


// ============================================================================
// MARKET COMMENTS
// ============================================================================
app.get('/api/markets/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.findAll({
      where: { market_id: req.params.id },
      order: [['created_at', 'ASC']]
    });
    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/markets/:id/comments', async (req, res) => {
  try {
    const { user_id, username, body, parent_id = null } = req.body;
    if (!user_id || !body || !String(body).trim()) {
      return res.status(400).json({ error: 'Missing user or comment body' });
    }
    const clean = String(body).trim().slice(0, 2000);
    const comment = await Comment.create({
      market_id: req.params.id,
      user_id,
      username: (username || 'trader').slice(0, 50),
      body: clean,
      parent_id
    });
    res.json(comment);
  } catch (error) {
    console.error('Post comment error:', error);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// ============================================================================
// MARKET SCOUT — trending suggestions
// ============================================================================
const { runMarketScout } = require('./jobs/market-scout');

// Vercel Cron hits this daily; also callable manually from the admin
// ============================================================================
// WAITLIST — real-money signup (own database, no Supabase table dependency)
// ============================================================================
// ============================================================================
// MARKET NEWS — live Google News headlines per market (Kalshi-style),
// cached in memory for 30 minutes. No API key required.
// ============================================================================
const newsCache = new Map(); // marketId -> { fetched: ts, items: [...] }
const NEWS_TTL = 30 * 60 * 1000;

function decodeEntities(str) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201D', ldquo: '\u201C', ndash: '\u2013', mdash: '\u2014', hellip: '\u2026' };
  return (str || '')
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => named[name] ?? m)
    .trim();
}

app.get('/api/markets/:id/news', async (req, res) => {
  try {
    const cached = newsCache.get(req.params.id);
    if (cached && Date.now() - cached.fetched < NEWS_TTL) {
      return res.json({ items: cached.items, cached: true });
    }
    const market = await Market.findByPk(req.params.id);
    if (!market) return res.status(404).json({ error: 'Market not found' });

    // search_keywords give the best query; otherwise strip the question framing from the title
    const query = (market.search_keywords && market.search_keywords.trim())
      || market.title.replace(/^will\s+/i, '').replace(/\?+$/, '').trim();
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const rss = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DobiumNews/1.0)' } });
    if (!rss.ok) throw new Error(`Google News ${rss.status}`);
    const xml = await rss.text();

    const items = [];
    const itemBlocks = xml.split('<item>').slice(1, 7);
    for (const block of itemBlocks) {
      const title = decodeEntities((block.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
      const link = decodeEntities((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1]);
      const pubDate = decodeEntities((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]);
      const source = decodeEntities((block.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1]);
      if (title && link) items.push({ title, link, source: source || 'Google News', published: pubDate || null });
      if (items.length >= 4) break;
    }
    newsCache.set(req.params.id, { fetched: Date.now(), items });
    res.json({ items });
  } catch (error) {
    console.error('Market news error:', error.message);
    res.json({ items: [] }); // never break the page over news
  }
});

// ============================================================================
// PRICE SYNC — paper prices track real markets (Kalshi/Polymarket) so
// positions gain and lose value as real events unfold. Runs on a Vercel cron.
// Attach a source to a binary market via PUT /api/admin/markets/:id/price-source
// ============================================================================
app.put('/api/admin/markets/:id/price-source', requireRadarKey, async (req, res) => {
  try {
    const market = await Market.findByPk(req.params.id);
    if (!market) return res.status(404).json({ error: 'Market not found' });
    const { provider, ticker, slug } = req.body || {};
    if (!provider) {
      await market.update({ price_source: null });
      return res.json({ ok: true, cleared: true });
    }
    if (provider === 'kalshi' && !ticker) return res.status(400).json({ error: 'Kalshi source needs a ticker' });
    if (provider === 'polymarket' && !slug) return res.status(400).json({ error: 'Polymarket source needs a slug' });
    await market.update({ price_source: JSON.stringify({ provider, ticker, slug }) });
    res.json({ ok: true });
  } catch (error) {
    console.error('Price source error:', error);
    res.status(500).json({ error: 'Failed to save price source' });
  }
});

async function runPriceSync() {
  const { getYesProbability, getSettlement, fetchAllCandidates, bestMatch } = require('./providers/pricing');
  const results = [];
  const resolved = [];
  const autoLinked = [];

    // ── AUTO-LINK: find real-money twins for any unlinked binary market ──
    // No manual tickers. Candidate lists are fetched once per run and every
    // unlinked market is matched against them.
    try {
      const unlinked = await Market.findAll({
        where: { status: 'active', price_source: null },
        include: [{ model: Outcome, as: 'outcomes' }],
      });
      const binaryUnlinked = unlinked.filter(m => {
        const o = m.outcomes || [];
        return o.length === 2 && o.some(x => (x.title || '').toLowerCase().startsWith('yes'));
      });
      if (binaryUnlinked.length > 0) {
        const candidates = await fetchAllCandidates();
        for (const m of binaryUnlinked) {
          const match = bestMatch(m.title, candidates);
          if (match) {
            const source = match.provider === 'kalshi'
              ? { provider: 'kalshi', ticker: match.ref, auto: true, score: Math.round(match.score * 100) / 100, matched_title: match.title }
              : { provider: 'polymarket', slug: match.ref, auto: true, score: Math.round(match.score * 100) / 100, matched_title: match.title };
            await m.update({ price_source: JSON.stringify(source) });
            autoLinked.push({ id: m.id, title: m.title, matched: match.title, provider: match.provider, score: source.score });
          }
        }
      }
    } catch (err) {
      console.error('Auto-link error:', err.message);
    }

    const linked = await Market.findAll({
      where: { status: 'active', price_source: { [Op.ne]: null } },
      include: [{ model: Outcome, as: 'outcomes' }],
    });
    for (const market of linked) {
      try {
        const source = JSON.parse(market.price_source);
        const outcomes = market.outcomes || [];
        const yes = outcomes.find(o => (o.title || '').toLowerCase().startsWith('yes'));
        const no = outcomes.find(o => (o.title || '').toLowerCase().startsWith('no'));
        if (!yes || !no) { results.push({ id: market.id, skipped: 'not binary' }); continue; }

        // Check settlement FIRST: if the real market has a final answer, resolve
        // Dobium's copy the same way real trades already do — same payouts, same
        // emails, same price-history close. No manual click needed for linked markets.
        const settlement = await getSettlement(source);
        const resolveSafe = !source.auto || (source.score || 0) >= 0.8;
        if (settlement.settled && resolveSafe) {
          const winningOutcome = settlement.result === 'yes' ? yes : no;
          await sequelize.transaction(async (t) => {
            const fresh = await Market.findByPk(market.id, { include: [{ model: Outcome, as: 'outcomes' }], transaction: t });
            await resolveMarketInstance(fresh, [winningOutcome.id], { transaction: t });
          });
          resolved.push({ id: market.id, title: market.title, result: settlement.result, source: source.provider });
          continue; // no need to also sync price on a market we just resolved
        }

        const yesProb = await getYesProbability(source);
        await Outcome.update({ probability: yesProb }, { where: { id: yes.id } });
        await Outcome.update({ probability: Math.round((100 - yesProb) * 10) / 10 }, { where: { id: no.id } });
        await PriceHistory.create({
          market_id: market.id,
          timestamp: new Date(),
          prices: { [yes.id]: yesProb, [no.id]: Math.round((100 - yesProb) * 10) / 10 },
        });
        results.push({ id: market.id, title: market.title, yes: yesProb, source: source.provider });
      } catch (err) {
        results.push({ id: market.id, error: err.message });
      }
    }
    return { synced: results.filter(r => r.yes != null).length, autoLinked, autoResolved: resolved, results };
}

app.get('/api/cron/sync-prices', requireRadarKey, async (req, res) => {
  try {
    res.json({ ok: true, ...(await runPriceSync()) });
  } catch (error) {
    console.error('Price sync error:', error);
    res.status(500).json({ error: 'Price sync failed' });
  }
});

// ONE daily cron for everything — Vercel Hobby allows max 2 cron jobs, daily
// granularity only. A sub-daily cron in vercel.json makes Vercel REJECT every
// deployment (which froze production on July 8). This consolidates scout +
// curated-batch publish + real-price sync into a single Hobby-safe job.
// Auto-publish the hottest exchange-mirrored suggestions. Exchange wording is
// already market-grade and these auto-link to their real-money originals via
// price sync — trending markets appear with zero manual clicks. RSS-drafted
// suggestions still get one-tap human review (machine wording needs eyes).
async function autoPublishMirrors(limit = 5) {
  const mirrors = await MarketSuggestion.findAll({
    where: { status: 'pending', source: { [Op.in]: ['Kalshi', 'Polymarket'] }, score: { [Op.gte]: 55 } },
    order: [['score', 'DESC']],
    limit,
  });
  const published = [];
  for (const sug of mirrors) {
    const dupe = await Market.findOne({ where: { title: sug.headline } });
    if (dupe) { await sug.update({ status: 'published' }); continue; }
    await sequelize.transaction(async (t) => {
      const marketId = nanoid(12);
      await Market.create({
        id: marketId,
        title: sug.headline,
        description: `Mirrored from a live ${sug.source} market — prices track the real market and this resolves automatically with the real-world outcome.`,
        category: sug.category || 'entertainment',
        market_type: 'binary',
        status: 'active',
        close_date: sug.suggested_close_date || null,
        resolution_date: null,
        total_volume: 0,
        image_url: makeIconBadge(sug.headline, sug.category),
        winning_outcome_id: null,
        search_keywords: '',
        is_trending: true,
      }, { transaction: t });
      await Outcome.bulkCreate([
        { id: `${marketId}_yes`, market_id: marketId, title: 'Yes', probability: 50, total_stake: 0 },
        { id: `${marketId}_no`, market_id: marketId, title: 'No', probability: 50, total_stake: 0 },
      ], { transaction: t });
    });
    await sug.update({ status: 'published' });
    published.push(sug.headline);
  }
  return published;
}

app.get('/api/cron/daily', requireRadarKey, async (req, res) => {
  const out = {};
  try { out.badges = await regenerateAllBadges(); } catch (e) { out.badges = { error: e.message }; }
  try { out.scout = await runMarketScout(); } catch (e) { out.scout = { error: e.message }; }
  try {
    out.autoPublished = await autoPublishMirrors(5);
  } catch (e) { out.autoPublished = { error: e.message }; }
  if (false) {
  try {
    const mirrors = await MarketSuggestion.findAll({
      where: { status: 'pending', source: { [Op.in]: ['Kalshi', 'Polymarket'] }, score: { [Op.gte]: 60 } },
      order: [['score', 'DESC']],
      limit: 3,
    });
    const published = [];
    for (const sug of mirrors) {
      const dupe = await Market.findOne({ where: { title: sug.headline } });
      if (dupe) { await sug.update({ status: 'published' }); continue; }
      await sequelize.transaction(async (t) => {
        const marketId = nanoid(12);
        await Market.create({
          id: marketId,
          title: sug.headline,
          description: `Mirrored from a live ${sug.source} market — prices track the real market and this resolves automatically with the real-world outcome.`,
          category: sug.category || 'entertainment',
          market_type: 'binary',
          status: 'active',
          close_date: sug.suggested_close_date || null,
          resolution_date: null,
          total_volume: 0,
          image_url: makeIconBadge(sug.headline, sug.category),
          winning_outcome_id: null,
          search_keywords: '',
          is_trending: true,
        }, { transaction: t });
        await Outcome.bulkCreate([
          { id: `${marketId}_yes`, market_id: marketId, title: 'Yes', probability: 50, total_stake: 0 },
          { id: `${marketId}_no`, market_id: marketId, title: 'No', probability: 50, total_stake: 0 },
        ], { transaction: t });
      });
      await sug.update({ status: 'published' });
      published.push(sug.headline);
    }
    out.autoPublishedLegacy = published;
  } catch (e) { /* disabled */ }
  }

  try {
    let seedResult = null;
    await seedCuratedBatch({ query: {}, headers: {} }, { json: (j) => { seedResult = j; }, status: () => ({ json: (j) => { seedResult = j; } }) });
    out.seed = seedResult;
  } catch (e) { out.seed = { error: e.message }; }
  try { out.priceSync = await runPriceSync(); } catch (e) { out.priceSync = { error: e.message }; }
  res.json({ ok: true, ...out });
});


// ============================================================================
// ICON BADGES — copyright-safe market images, Kalshi-style: one small generic
// icon (hand-drawn geometric shapes, not copied artwork) on a solid color
// tile. No photos, no logos, no giant text — just a universal symbol for the
// market's topic (mic for music, film strip for box office, trophy for
// awards, TV for streaming, rocket for trending/tech).
// ============================================================================
const ICON_TILE_COLORS = {
  mic: ['#7F1D3A', '#FFB4CE'],
  film: ['#1D3A5C', '#8FC6FF'],
  trophy: ['#5C3A1D', '#FFD68F'],
  tv: ['#1D5C3A', '#8FFFC6'],
  rocket: ['#3A1D5C', '#D6B4FF'],
  mask: ['#5C1D2E', '#FF9EB8'],
  coin: ['#5C4A1D', '#FFE68F'],
  controller: ['#1D4A5C', '#8FE3FF'],
};

// Simple hand-built geometric icon paths, each centered in a 100x100 box.
const ICON_PATHS = {
  mic: '<rect x="40" y="18" width="20" height="38" rx="10"/><path d="M28 46a22 22 0 0 0 44 0" fill="none" stroke-width="6" stroke-linecap="round"/><line x1="50" y1="68" x2="50" y2="82" stroke-width="6" stroke-linecap="round"/><line x1="36" y1="82" x2="64" y2="82" stroke-width="6" stroke-linecap="round"/>',
  film: '<rect x="16" y="26" width="68" height="48" rx="4" fill="none" stroke-width="5"/><rect x="16" y="26" width="14" height="48" fill-opacity="0.35"/><rect x="70" y="26" width="14" height="48" fill-opacity="0.35"/><circle cx="23" cy="34" r="2.5"/><circle cx="23" cy="50" r="2.5"/><circle cx="23" cy="66" r="2.5"/><circle cx="77" cy="34" r="2.5"/><circle cx="77" cy="50" r="2.5"/><circle cx="77" cy="66" r="2.5"/><path d="M38 38l22 12-22 12z"/>',
  trophy: '<path d="M32 22h36v18a18 18 0 0 1-36 0z" fill="none" stroke-width="6"/><path d="M32 26H18a10 10 0 0 0 12 16" fill="none" stroke-width="5"/><path d="M68 26h14a10 10 0 0 1-12 16" fill="none" stroke-width="5"/><rect x="46" y="58" width="8" height="14"/><rect x="36" y="72" width="28" height="8" rx="2"/>',
  tv: '<rect x="16" y="24" width="68" height="46" rx="5" fill="none" stroke-width="6"/><line x1="38" y1="82" x2="62" y2="82" stroke-width="6" stroke-linecap="round"/><line x1="50" y1="70" x2="50" y2="82" stroke-width="6"/>',
  rocket: '<path d="M50 14c12 8 16 24 12 40l-24 0c-4-16 0-32 12-40z" fill="none" stroke-width="6" stroke-linejoin="round"/><circle cx="50" cy="34" r="6" fill="none" stroke-width="5"/><path d="M38 54l-10 16 16-6" fill="none" stroke-width="5" stroke-linejoin="round"/><path d="M62 54l10 16-16-6" fill="none" stroke-width="5" stroke-linejoin="round"/><path d="M44 70l6 14 6-14z"/>',
  mask: '<circle cx="36" cy="42" r="18" fill="none" stroke-width="6"/><circle cx="64" cy="42" r="18" fill="none" stroke-width="6"/><path d="M50 30a14 14 0 0 0 0 24" fill="none" stroke-width="5"/><path d="M28 62c4 8 14 12 22 6M50 62c8 6 18 2 22-6" fill="none" stroke-width="5" stroke-linecap="round"/>',
  coin: '<circle cx="50" cy="50" r="30" fill="none" stroke-width="6"/><path d="M50 34v32M42 42a8 8 0 0 1 16 0c0 6-16 6-16 12a8 8 0 0 0 16 0" fill="none" stroke-width="5" stroke-linecap="round"/>',
  controller: '<rect x="18" y="36" width="64" height="30" rx="15" fill="none" stroke-width="6"/><line x1="30" y1="51" x2="30" y2="51" stroke-width="7" stroke-linecap="round"/><line x1="24" y1="45" x2="24" y2="57" stroke-width="6" stroke-linecap="round"/><line x1="18" y1="51" x2="30" y2="51" stroke-width="6" stroke-linecap="round"/><circle cx="66" cy="46" r="3.5"/><circle cx="74" cy="54" r="3.5"/>',
};

function pickIcon(title, category) {
  const t = (title || '').toLowerCase();
  const c = (category || '').toLowerCase();
  // Category drives the icon (Kalshi's model); title keywords only refine
  // WITHIN the category. A Media market about an acquisition is still a
  // movie-world story — it gets the film icon, not a finance coin.
  if (c === 'music') return /award|grammy|vma/.test(t) ? 'trophy' : 'mic';
  if (c === 'awards') return 'trophy';
  if (c === 'entertainment' || c === 'media' || c === 'movies') {
    if (/game|gta|nintendo|playstation|xbox|steam|esports/.test(t)) return 'controller';
    if (/netflix top|top 10|streaming numbers|renew|season \d|episodes/.test(t)) return 'tv';
    if (/award|oscar|emmy|golden globe|nominat/.test(t)) return 'trophy';
    return 'film';
  }
  if (c === 'trending') {
    if (/game|gta|nintendo|playstation|xbox|steam/.test(t)) return 'controller';
    if (/ipo|valuation|funding|billion|stock/.test(t)) return 'coin';
    return 'rocket';
  }
  // No/unknown category: fall back to title keywords
  if (/album|single|song|mixtape|billboard|tour|concert|headlin/.test(t)) return 'mic';
  if (/oscar|academy award|emmy|golden globe|award|nominat/.test(t)) return 'trophy';
  if (/netflix|hbo|streaming|top 10|renew/.test(t)) return 'tv';
  if (/box office|gross|movie|film|sequel|biopic|documentary|letterboxd/.test(t)) return 'film';
  if (/ipo|acqui|valuation|billion|funding/.test(t)) return 'coin';
  if (/game|nintendo|playstation|xbox|steam|gta/.test(t)) return 'controller';
  if (/launch|rocket|starship|spacex|ai model|gpt/.test(t)) return 'rocket';
  return 'mask';
}

function makeIconBadge(title, category) {
  const icon = pickIcon(title, category);
  const [bg, fg] = ICON_TILE_COLORS[icon];
  const size = 400;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><rect width="100" height="100" rx="14" fill="${bg}"/><g fill="${fg}" stroke="${fg}" stroke-linecap="round">${ICON_PATHS[icon]}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}


app.post('/api/waitlist', async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    const [entry, created] = await Waitlist.findOrCreate({ where: { email }, defaults: { email } });
    // Position = how many people joined at or before this entry (stable across duplicates)
    const position = await Waitlist.count({
      where: { created_at: { [Op.lte]: entry.created_at } }
    });
    const total = await Waitlist.count();
    res.json({ ok: true, already: !created, position, count: total });

    // Fire-and-forget emails — never block or fail the signup on email problems.
    if (created && process.env.EMAIL_PASS) {
      const { sendEmail } = require('./lib/email');
      sendEmail({
        to: email,
        subject: `You're #${position} on the Dobium waitlist`,
        text: `You're #${position} in line for early access to Dobium — the entertainment prediction market.\n\nYou'll get priority onboarding and an initial allocation of paper credits when real-money trading opens. Refer friends to move up the queue: https://dobium.com\n\n— The Dobium Team`,
        html: `<div style="font-family:Arial,sans-serif;background:#0B1229;color:#DCE1FF;padding:32px;border-radius:8px;max-width:520px;margin:0 auto">
          <h2 style="color:#FFDF9B;margin:0 0 6px">Dobium</h2>
          <p style="font-size:15px;line-height:1.6">You're <strong style="color:#FFDF9B">#${position}</strong> in line for early access to <strong>Dobium</strong> — the entertainment prediction market.</p>
          <p style="font-size:13px;color:#D2C5AF;line-height:1.6">You'll get priority onboarding and an initial allocation of paper credits when real-money trading opens. Refer friends to move up the queue.</p>
          <p style="font-size:13px"><a href="https://dobium.com" style="color:#F0C04A">dobium.com</a></p>
        </div>`
      }).catch(err => console.error('Waitlist confirmation email failed:', err.message));

      sendEmail({
        to: ADMIN_EMAILS.join(','),
        subject: `Dobium waitlist: ${email} joined (#${position} of ${total})`,
        text: `New waitlist signup: ${email}\nPosition: #${position}\nTotal signups: ${total}\nTime: ${new Date().toISOString()}`
      }).catch(err => console.error('Waitlist admin notification failed:', err.message));
    }
  } catch (error) {
    console.error('Waitlist signup error:', error);
    res.status(500).json({ error: "Couldn't save your spot — please try again." });
  }
});

// Full waitlist for the admin panel — who joined, when, in order. Radar-key gated.
app.get('/api/admin/waitlist', requireRadarKey, async (req, res) => {
  try {
    const entries = await Waitlist.findAll({ order: [['created_at', 'ASC']] });
    res.json({
      count: entries.length,
      entries: entries.map((e, i) => ({ id: e.id, email: e.email, created_at: e.created_at, position: i + 1 })),
    });
  } catch (error) {
    console.error('Admin waitlist error:', error);
    res.status(500).json({ error: 'Failed to load waitlist' });
  }
});

// The "press a button" control — remove a single entry (typos, opt-outs, or post-launch cleanup).
app.delete('/api/admin/waitlist/:id', requireRadarKey, async (req, res) => {
  try {
    const deleted = await Waitlist.destroy({ where: { id: req.params.id } });
    res.json({ ok: true, deleted });
  } catch (error) {
    console.error('Admin waitlist delete error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

app.get('/api/waitlist/count', async (req, res) => {
  try {
    const count = await Waitlist.count();
    res.json({ count });
  } catch (error) {
    console.error('Waitlist count error:', error);
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

// ============================================================================
// PULSE — public lightweight stats (paper money + waitlist tracking)
// ============================================================================
// Exchange 24h volume approximations (top open markets summed), 30-min cache.
// Fetches are timeout-guarded and NEVER block /api/pulse's own response —
// a slow/large exchange payload must not be able to take Dobium's own stats
// down with it (this was happening: fetching up to 2000 full Kalshi market
// objects — each one is large — inside the request the homepage polls every
// 20s was timing out the whole endpoint, so the frontend silently fell back
// to a less accurate local calculation).
let exchangeVolCache = { fetched: 0, kalshi: null, polymarket: null };
let exchangeVolRefreshing = false;

async function fetchWithTimeout(url, opts = {}, ms = 4000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function refreshExchangeVolumes() {
  if (exchangeVolRefreshing) return;
  exchangeVolRefreshing = true;
  let kalshi = exchangeVolCache.kalshi;
  let polymarket = exchangeVolCache.polymarket;
  try {
    // One page, modest limit — a representative sample of top markets is
    // enough for a volume approximation and keeps the payload small/fast.
    const r = await fetchWithTimeout('https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=200');
    if (r.ok) {
      const data = await r.json();
      let sum = 0;
      for (const m of data.markets || []) {
        const v = m.volume_24h_dollars ?? m.volume_24h_fp ?? m.volume_24h ?? 0;
        sum += Number(v) || 0;
      }
      if (sum > 0) kalshi = sum;
    }
  } catch { /* keep last known value */ }
  try {
    const r = await fetchWithTimeout('https://gamma-api.polymarket.com/markets?closed=false&order=volume24hr&ascending=false&limit=200', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' },
    });
    if (r.ok) {
      const arr = await r.json();
      const sum = (Array.isArray(arr) ? arr : []).reduce((a, m) => a + Number(m.volume24hr || 0), 0);
      if (sum > 0) polymarket = sum;
    }
  } catch { /* keep last known value */ }
  exchangeVolCache = { fetched: Date.now(), kalshi, polymarket };
  exchangeVolRefreshing = false;
}

// Never awaited by a request handler directly: returns whatever is cached
// Serverless functions can be torn down right after the response is sent —
// a true 'fire and forget' background refresh can die mid-fetch and never
// populate the cache. Await it directly (already has a 4s hard timeout per
// exchange) so a stale cache always gets a real chance to fill before we
// respond, instead of returning null forever.
async function getExchangeVolumes() {
  if (Date.now() - exchangeVolCache.fetched > 30 * 60 * 1000) {
    await refreshExchangeVolumes();
  }
  return exchangeVolCache;
}

app.get('/api/pulse', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const [userCount, waitlistCount, markets, txCount, volumeRow] = await Promise.all([
      User.count(),
      Waitlist.count(),
      Market.findAll({ attributes: ['id', 'status', 'category'] }),
      Transaction.count(),
      // Ground-truth volume: sum the real trade ledger (Prediction.stake_amount) —
      // this is every actual paper trade, logged-in or guest.
      Prediction.sum('stake_amount'),
    ]);
    const exchanges = await getExchangeVolumes();
    // Historical baseline: real trade volume from before the market-delete
    // CASCADE bug wiped that history out of the Prediction table. Live
    // ledger sum keeps adding on top, so this still moves with every trade.
    const HISTORICAL_VOLUME_BASELINE = Number(process.env.VOLUME_BASELINE || 20000);
    const totalVolume = HISTORICAL_VOLUME_BASELINE + Number(volumeRow || 0);
    const activeMarkets = markets.filter(m => m.status === 'active').length;
    const byCategory = {};
    for (const m of markets) {
      byCategory[m.category] = (byCategory[m.category] || 0) + 1;
    }
    res.json({
      users: userCount,
      waitlist: waitlistCount,
      markets_total: markets.length,
      markets_active: activeMarkets,
      paper_volume_traded: totalVolume,
      kalshi_24h_volume: exchanges.kalshi,
      polymarket_24h_volume: exchanges.polymarket,
      transactions: txCount,
      markets_by_category: byCategory,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pulse error:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ============================================================================
// CURATED SEED BATCH — one-time, hand-picked, properly categorized markets
// ============================================================================
const CURATED_MARKETS = [
  { title: "Will Travis Scott release a new album before September 1, 2026?", category: 'music', market_type: 'binary', close_date: '2026-09-01T00:00:00.000Z', outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will Kanye West release "BULLY" before March 21, 2027?', category: 'music', market_type: 'binary', close_date: '2027-03-21T00:00:00.000Z', outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: "Will Bad Bunny finish 2026 as Spotify's #1 most-streamed artist?", category: 'music', market_type: 'binary', close_date: '2026-12-31T00:00:00.000Z', outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: "Bad Bunny vs. Taylor Swift — who finishes 2026 as Spotify's #1 artist?", category: 'music', market_type: 'multi_single', close_date: '2026-12-31T00:00:00.000Z', outcomes: [{ title: 'Bad Bunny', probability: 40 }, { title: 'Taylor Swift', probability: 35 }, { title: 'Other', probability: 25 }] },
  { title: 'Will a country song win Album of the Year at the 2027 Grammys?', category: 'awards', market_type: 'binary', close_date: '2027-02-01T00:00:00.000Z', outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will "Iceman" cross 1 billion streams within 30 days of release?', category: 'music', market_type: 'binary', close_date: '2026-08-15T00:00:00.000Z', outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will Kanye West release a Yeezy clothing drop before August 2026?', category: 'music', market_type: 'binary', close_date: '2026-08-01T00:00:00.000Z', outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will Drake announce a new tour in 2026?', category: 'music', market_type: 'binary', close_date: '2026-12-31T00:00:00.000Z', outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will Travis Scott headline Coachella 2027?', category: 'music', market_type: 'binary', close_date: '2027-04-01T00:00:00.000Z', outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will Travis Scott feature on a Kanye West project in 2026?', category: 'music', market_type: 'binary', close_date: '2026-12-31T00:00:00.000Z', outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will Drake and 21 Savage release a joint sequel album in 2026?', category: 'music', market_type: 'binary', close_date: '2026-12-31T00:00:00.000Z', outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: "Will Future feature on Playboi Carti's next album?", category: 'music', market_type: 'binary', close_date: '2027-01-01T00:00:00.000Z', outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'When will Playboi Carti release his next album?', category: 'music', market_type: 'multi_single', close_date: '2027-06-01T00:00:00.000Z', outcomes: [{ title: 'Q3 2026', probability: 20 }, { title: 'Q4 2026', probability: 30 }, { title: '2027', probability: 35 }, { title: 'Never', probability: 15 }] },
  { title: 'What will be #1 on the Billboard Hot 100 the first week of August 2026?', category: 'music', market_type: 'multi_single', close_date: '2026-08-07T00:00:00.000Z', outcomes: [{ title: 'Sabrina Carpenter', probability: 30 }, { title: 'Drake', probability: 20 }, { title: 'Morgan Wallen', probability: 20 }, { title: 'Other', probability: 30 }] },
  { title: "Who will feature on Kanye West's next album?", category: 'music', market_type: 'multi_single', close_date: '2026-12-31T00:00:00.000Z', outcomes: [{ title: 'Travis Scott', probability: 30 }, { title: 'Drake', probability: 20 }, { title: 'Future', probability: 20 }, { title: 'Other', probability: 30 }] },
  { title: 'Will "Euphoria" be the top show on HBO Max this week?', category: 'entertainment', market_type: 'binary', close_date: '2026-07-12T00:00:00.000Z', outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'What will be the #1 show on Netflix this week (US)?', category: 'entertainment', market_type: 'multi_single', close_date: '2026-07-12T00:00:00.000Z', outcomes: [{ title: 'Voicemails for Isabelle', probability: 30 }, { title: 'Little Brother', probability: 25 }, { title: 'Enola Holmes 3', probability: 20 }, { title: 'Other', probability: 25 }] },
  { title: 'What will be the #1 show on HBO Max this week?', category: 'entertainment', market_type: 'multi_single', close_date: '2026-07-12T00:00:00.000Z', outcomes: [{ title: 'House of the Dragon', probability: 40 }, { title: 'Euphoria', probability: 20 }, { title: 'Stuart Fails to Save the Universe', probability: 15 }, { title: 'Other', probability: 25 }] },
  { title: "Will MrBeast's next video hit 100M views within 7 days of upload?", category: 'entertainment', market_type: 'binary', close_date: '2026-08-05T00:00:00.000Z', outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Oscar Best Picture 2027 — who wins?', category: 'awards', market_type: 'multi_single', close_date: '2027-03-14T00:00:00.000Z', outcomes: [{ title: 'The Odyssey', probability: 25 }, { title: 'Dune: Part Three', probability: 20 }, { title: 'Wild Horse Nine', probability: 20 }, { title: 'Fjord', probability: 15 }, { title: 'Other', probability: 20 }] },
  { title: 'Grammy Album of the Year 2027 — which artist wins?', category: 'awards', market_type: 'multi_single', close_date: '2027-02-01T00:00:00.000Z', outcomes: [{ title: 'Bad Bunny', probability: 30 }, { title: 'Taylor Swift', probability: 25 }, { title: 'Kendrick Lamar', probability: 20 }, { title: 'Other', probability: 25 }] },

  // ── Sonotrade-style batch (July 2026): release questions + box-office brackets ──
  { title: 'The Odyssey — opening weekend domestic box office?', category: 'entertainment', market_type: 'multi_single', close_date: '2026-07-20T12:00:00.000Z',
    description: "Resolves by bracket based on the domestic (US/Canada) opening weekend gross for Christopher Nolan's 'The Odyssey' (opens July 17, 2026), per Box Office Mojo's final 3-day figure. Tracking projects an $80–100M open.",
    search_keywords: 'The Odyssey Nolan box office opening weekend',
    outcomes: [{ title: 'Under $80M', probability: 25 }, { title: '$80M–$100M', probability: 45 }, { title: 'Over $100M', probability: 30 }] },
  { title: 'Spider-Man: Brand New Day — opening weekend domestic box office?', category: 'entertainment', market_type: 'multi_single', close_date: '2026-08-03T12:00:00.000Z',
    description: "Resolves by bracket based on the domestic opening weekend gross for 'Spider-Man: Brand New Day' (opens July 31, 2026), per Box Office Mojo's final 3-day figure. Its first trailer set the all-time 24-hour record with 718M views.",
    search_keywords: 'Spider-Man Brand New Day box office',
    outcomes: [{ title: 'Under $150M', probability: 30 }, { title: '$150M–$200M', probability: 45 }, { title: 'Over $200M', probability: 25 }] },
  { title: 'Will Spider-Man: Brand New Day cross $1 billion worldwide?', category: 'entertainment', market_type: 'binary', close_date: '2026-09-30T00:00:00.000Z',
    description: "Resolves Yes if 'Spider-Man: Brand New Day' passes $1B in worldwide gross by September 30, 2026, per Box Office Mojo.",
    search_keywords: 'Spider-Man Brand New Day box office worldwide',
    outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will GTA VI launch on or before November 19, 2026?', category: 'entertainment', market_type: 'binary', close_date: '2026-11-20T00:00:00.000Z',
    description: 'Resolves Yes if Grand Theft Auto VI is publicly available on PS5/Xbox on or before its announced November 19, 2026 date. Any further delay resolves No.',
    search_keywords: 'GTA 6 release date Rockstar',
    outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will Playboi Carti release another album before 2027?', category: 'music', market_type: 'binary', close_date: '2026-12-31T00:00:00.000Z',
    description: 'Resolves Yes if Playboi Carti releases a new full-length studio album (not singles, features, or deluxe reissues) on major streaming platforms before January 1, 2027.',
    search_keywords: 'Playboi Carti new album',
    outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will Don Toliver release a new album before 2027?', category: 'music', market_type: 'binary', close_date: '2026-12-31T00:00:00.000Z',
    description: 'Resolves Yes if Don Toliver releases a new full-length studio album on major streaming platforms before January 1, 2027.',
    search_keywords: 'Don Toliver new album',
    outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will Kendrick Lamar release a new album in 2026?', category: 'music', market_type: 'binary', close_date: '2026-12-31T00:00:00.000Z',
    description: 'Resolves Yes if Kendrick Lamar releases a new full-length studio album on major streaming platforms during 2026.',
    search_keywords: 'Kendrick Lamar new album',
    outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will Rihanna release a new studio album before 2027?', category: 'music', market_type: 'binary', close_date: '2026-12-31T00:00:00.000Z',
    description: "Resolves Yes if Rihanna releases a new full-length studio album (her first since 2016's Anti) on major streaming platforms before January 1, 2027.",
    search_keywords: 'Rihanna new album R9',
    outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will Taylor Swift announce her 13th studio album before 2027?', category: 'music', market_type: 'binary', close_date: '2026-12-31T00:00:00.000Z',
    description: 'Resolves Yes if Taylor Swift officially announces a new (13th) original studio album — re-recordings excluded — before January 1, 2027.',
    search_keywords: 'Taylor Swift new album announcement',
    outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will Avengers: Doomsday open above $200M domestic?', category: 'entertainment', market_type: 'binary', close_date: '2026-12-21T00:00:00.000Z',
    description: "Resolves Yes if 'Avengers: Doomsday' grosses over $200M in its domestic opening weekend (December 2026), per Box Office Mojo's final 3-day figure.",
    search_keywords: 'Avengers Doomsday box office',
    outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Will Stranger Things win Outstanding Drama Series at the 2026 Emmys?', category: 'awards', market_type: 'binary', close_date: '2026-09-15T00:00:00.000Z',
    description: 'Resolves Yes if Stranger Things wins Outstanding Drama Series at the 78th Primetime Emmy Awards.',
    search_keywords: 'Stranger Things Emmys Outstanding Drama',
    outcomes: [{ title: 'Yes' }, { title: 'No' }] },

  // ── Letterboxd sale (news broke July 10, 2026 — Puck via Variety/TheWrap) ──
  { title: 'Will Netflix acquire Letterboxd before 2027?', category: 'entertainment', market_type: 'binary', close_date: '2026-12-31T00:00:00.000Z',
    description: "Resolves Yes if Netflix (or a subsidiary) announces a definitive agreement to acquire Letterboxd before January 1, 2027. Per Puck (July 10, 2026), Netflix is among several parties in early talks; bankers are floating a ~$250M valuation. Rumored interest alone does not resolve Yes — a definitive announced deal is required.",
    search_keywords: 'Netflix Letterboxd acquisition',
    outcomes: [{ title: 'Yes' }, { title: 'No' }] },
  { title: 'Who will acquire Letterboxd?', category: 'entertainment', market_type: 'multi_single', close_date: '2026-12-31T00:00:00.000Z',
    description: "Resolves to the first party to announce a definitive agreement to acquire a controlling stake in Letterboxd in 2026. Per Puck (July 10, 2026), early talks include Netflix, Sony Pictures, Paramount Skydance, TPG/RedBird, and Alexis Ohanian, with bankers floating a ~$250M valuation. If no definitive deal is announced in 2026, resolves 'No deal in 2026'.",
    search_keywords: 'Letterboxd sale acquisition Netflix Sony Paramount',
    outcomes: [
      { title: 'Netflix', probability: 28 },
      { title: 'Sony Pictures', probability: 20 },
      { title: 'Paramount Skydance', probability: 14 },
      { title: 'Other buyer (TPG, Ohanian, etc.)', probability: 18 },
      { title: 'No deal in 2026', probability: 20 },
    ] },

  // ── Fight markets (verified July 11, 2026: UFC 329 is TONIGHT at T-Mobile Arena) ──
  { title: 'Will Conor McGregor beat Max Holloway at UFC 329?', category: 'sports', market_type: 'binary', close_date: '2026-07-12T01:00:00.000Z',
    description: "Resolves Yes if Conor McGregor defeats Max Holloway in the UFC 329 main event (July 11, 2026, T-Mobile Arena, Las Vegas) — McGregor's first fight since 2021 and a rematch of their 2013 bout. Resolves No on a Holloway win; voided on a draw/no-contest/cancellation. Closes at main-card start.",
    search_keywords: 'McGregor Holloway UFC 329',
    outcomes: [{ title: 'Yes', probability: 38 }, { title: 'No', probability: 62 }] },
  { title: 'Who wins at UFC 330: Makhachev or Machado Garry?', category: 'sports', market_type: 'multi_single', close_date: '2026-08-15T22:00:00.000Z',
    description: 'Resolves to the winner of the UFC 330 main event (August 15, 2026, Philadelphia): Islam Makhachev defends the welterweight title against Ian Machado Garry. Voided on draw/no-contest/cancellation.',
    search_keywords: 'Makhachev Machado Garry UFC 330',
    outcomes: [{ title: 'Islam Makhachev', probability: 70 }, { title: 'Ian Machado Garry', probability: 30 }] },

  // ── WHEN markets: date brackets instead of yes/no ──
  { title: 'When will GTA VI actually release?', category: 'entertainment', market_type: 'multi_single', close_date: '2026-11-20T00:00:00.000Z',
    description: "Resolves to the window in which Grand Theft Auto VI becomes publicly playable on consoles. Rockstar's announced date is November 19, 2026 — the eternal question is whether they hold it.",
    search_keywords: 'GTA 6 release date delay Rockstar',
    outcomes: [{ title: 'On or before Nov 19, 2026', probability: 55 }, { title: 'December 2026', probability: 18 }, { title: '2027 or later', probability: 27 }] },
  { title: "When will Playboi Carti's next album arrive?", category: 'music', market_type: 'multi_single', close_date: '2026-12-31T00:00:00.000Z',
    description: 'Resolves to the window in which Playboi Carti releases his next full-length studio album on major streaming platforms (singles, features and deluxe reissues excluded).',
    search_keywords: 'Playboi Carti new album',
    outcomes: [{ title: 'Before October 2026', probability: 28 }, { title: 'October–December 2026', probability: 30 }, { title: '2027 or later', probability: 42 }] },
];

const seedCuratedBatch = async (req, res) => {
  try {
    const existing = await Market.findAll({ attributes: ['title'] });
    const known = new Set(existing.map(m => (m.title || '').toLowerCase()));

    let created = 0;
    const skipped = [];

    for (const def of CURATED_MARKETS) {
      if (known.has(def.title.toLowerCase())) {
        skipped.push(def.title);
        continue;
      }
      known.add(def.title.toLowerCase());

      await sequelize.transaction(async (t) => {
        const marketId = nanoid(12);
        await Market.create({
          id: marketId,
          title: def.title,
          description: def.description || '',
          category: def.category,
          market_type: def.market_type,
          status: 'active',
          close_date: def.close_date,
          resolution_date: null,
          total_volume: 0,
          image_url: def.image_url || makeIconBadge(def.title, def.category),
          winning_outcome_id: null,
          search_keywords: def.search_keywords || '',
          is_trending: true,
        }, { transaction: t });

        let outcomeRecords = [];
        if (def.market_type === 'multi_single' || def.market_type === 'multi_multiple') {
          def.outcomes.forEach(o => {
            const baseId = nanoid(8);
            const probYes = typeof o.probability === 'number' ? o.probability : Math.round(100 / def.outcomes.length);
            outcomeRecords.push({ id: `${marketId}_${baseId}_yes`, market_id: marketId, title: `${o.title} (Yes)`, probability: probYes, total_stake: 0 });
            outcomeRecords.push({ id: `${marketId}_${baseId}_no`, market_id: marketId, title: `${o.title} (No)`, probability: 100 - probYes, total_stake: 0 });
          });
        } else {
          outcomeRecords = def.outcomes.map(o => ({ id: `${marketId}_${nanoid(8)}`, market_id: marketId, title: o.title, probability: 50, total_stake: 0 }));
        }
        await Outcome.bulkCreate(outcomeRecords, { transaction: t });

        const prices = Object.fromEntries(outcomeRecords.map(o => [o.id, o.probability]));
        await PriceHistory.create({ market_id: marketId, timestamp: new Date(), prices }, { transaction: t });
      });
      created++;
    }

    res.json({ ok: true, created, skipped_existing: skipped.length, skipped_titles: skipped });
  } catch (error) {
    console.error('Curated seed error:', error);
    res.status(500).json({ error: 'Seed failed', detail: error.message });
  }
};
app.post('/api/seed/curated-batch', requireRadarKey, seedCuratedBatch);
app.get('/api/seed/curated-batch', requireRadarKey, seedCuratedBatch);

// Regenerates every active market's badge to the current icon system.
// Isolated on purpose: earlier this was nested inside the scan handler,
// so if runMarketScout() threw for ANY reason, this code never ran at
// all — the badge fix silently never executed no matter how many times
// 'Scan now' was pressed. Per-market errors are now also isolated so one
// bad title can't abort the rest of the batch, and every failure is
// reported back instead of swallowed.
async function regenerateAllBadges() {
  const markets = await Market.findAll({ where: { status: 'active' } });
  let updated = 0;
  const errors = [];
  for (const m of markets) {
    try {
      await m.update({ image_url: makeIconBadge(m.title, m.category) });
      updated++;
    } catch (e) {
      errors.push({ id: m.id, title: m.title, error: e.message });
    }
  }
  return { total: markets.length, updated, errors };
}

// Standalone, bulletproof: does ONLY the badge regen, nothing else in the
// way that could throw first and block it.
app.get('/api/admin/regenerate-badges', requireRadarKey, async (req, res) => {
  try {
    res.json({ ok: true, ...(await regenerateAllBadges()) });
  } catch (error) {
    console.error('Badge regen error:', error);
    res.status(500).json({ error: 'Badge regen failed', message: error.message });
  }
});

app.get('/api/cron/market-scout', requireRadarKey, async (req, res) => {
  const result = {};
  // Badges run FIRST and independently — guaranteed to execute even if
  // everything below throws.
  try { result.badges = await regenerateAllBadges(); } catch (e) { result.badges = { error: e.message }; }
  try {
    const scoutResult = await runMarketScout();
    Object.assign(result, scoutResult);
  } catch (e) {
    result.scout_error = e.message;
  }
  try { result.auto_published = await autoPublishMirrors(5); } catch (e) { result.auto_published = { error: e.message }; }
  res.json({ ok: true, ...result });
});

app.get('/api/market-suggestions', requireRadarKey, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const suggestions = await MarketSuggestion.findAll({
      where: { status },
      order: [['score', 'DESC'], ['created_at', 'DESC']],
      limit: 60
    });
    res.json(suggestions);
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

app.post('/api/market-suggestions/:id/status', requireRadarKey, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'dismissed', 'published'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const suggestion = await MarketSuggestion.findByPk(req.params.id);
    if (!suggestion) return res.status(404).json({ error: 'Suggestion not found' });
    suggestion.status = status;
    await suggestion.save();
    res.json(suggestion);
  } catch (error) {
    console.error('Update suggestion error:', error);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

app.post('/api/predictions', async (req, res) => {
  try {
    const {
      market_id,
      outcome_id,
      stake_amount,
      odds_at_prediction,
      user_id = null
    } = req.body;

    if (!market_id || !outcome_id || typeof stake_amount !== 'number' || typeof odds_at_prediction !== 'number') {
      return res.status(400).json({ error: 'Invalid prediction payload' });
    }

    if (stake_amount <= 0) {
      return res.status(400).json({ error: 'Stake amount must be greater than zero' });
    }

    // Auto-close: reject trades on markets past their close date or not active
    const guardMarket = await Market.findByPk(market_id);
    if (!guardMarket) {
      return res.status(404).json({ error: 'Market not found' });
    }
    if (guardMarket.status !== 'active' || (guardMarket.close_date && new Date(guardMarket.close_date) < new Date())) {
      return res.status(400).json({ error: 'This market has closed and no longer accepts trades' });
    }

    // Ensure the user exists in the local DB (Supabase auth users may not be synced yet)
    if (user_id) {
      await User.findOrCreate({
        where: { id: user_id },
        defaults: {
          id: user_id,
          username: user_id.substring(0, 20),
          email: `${user_id}@placeholder.com`
        }
      });
    }

    const result = await sequelize.transaction(async (t) => {
      return await executePredictionPlacement(req.body, t);
    });

    res.status(201).json(normalizePrediction(result));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message, ...(error.details || {}) });
    console.error('Create prediction error:', error);
    res.status(500).json({ error: 'Failed to create prediction' });
  }
});

// ============================================================================
// SELL POSITION — Database backed
// ============================================================================

/**
 * Calculate the Mark-to-Market (MTM) cash value of selling a position.
 * Based on S(1-p) payout model:
 *   R_min = S × p_entry (loss case)
 *   R_max = S × (2 - p_entry) (win case)
 *   R_current = R_min + (R_max - R_min) × p_current
 *   Simplified: R = S × (p_entry + 2×p_current×(1 - p_entry))
 * 
 * @param {number} stake - Position size in dollars
 * @param {number} entryProb - Entry probability (0-100)
 * @param {number} currentProb - Current probability (0-100)
 * @returns {number} Cash value user receives
 */
function calculatePositionValue(stake, entryProb, currentProb) {
  const S = Number(stake || 0);
  const pEntry = Math.max(0, Math.min(100, Number(entryProb || 0))) / 100;
  const pCurrent = Math.max(0, Math.min(100, Number(currentProb || 0))) / 100;

  const rMin = S * pEntry;
  const rMax = S * (2 - pEntry);

  let returnValue;
  if (pEntry === 0) {
    returnValue = pCurrent > 0 ? rMax : rMin;
  } else if (pEntry === 1) {
    returnValue = pCurrent < 1 ? rMin : rMax;
  } else if (pCurrent <= pEntry) {
    returnValue = rMin + (S - rMin) * (pCurrent / pEntry);
  } else {
    returnValue = S + (rMax - S) * ((pCurrent - pEntry) / (1 - pEntry));
  }

  return Number(Math.max(0, returnValue).toFixed(2));
}



async function executePositionSell({ market_id, outcome_id, user_id, sell_amount }, t) {
  const market = await Market.findByPk(market_id, {
    include: [{ model: Outcome, as: 'outcomes' }],
    transaction: t
  });
  if (!market) throw Object.assign(new Error('Market not found'), { status: 404 });
  if (market.status !== 'active') throw Object.assign(new Error('Cannot sell on a resolved market'), { status: 400 });

  const outcome = market.outcomes.find(o => o.id === outcome_id);
  if (!outcome) throw Object.assign(new Error('Outcome not found'), { status: 400 });

  const currentProb = parseFloat(outcome.probability || 50);

  let userAliases = [user_id];
  let user = null;
  try {
    if (user_id.includes('@')) {
      user = await User.findOne({ where: { email: user_id }, transaction: t });
    } else {
      user = await User.findOne({ where: { id: user_id }, transaction: t });
    }
  } catch (err) { }

  if (user) {
    userAliases.push(user.id);
    if (user.email && user.email !== `${user_id}@placeholder.com`) userAliases.push(user.email);
  }
  userAliases = [...new Set(userAliases)];

  const safeAliases = userAliases.filter(id => !id.includes('@'));
  if (safeAliases.length === 0) safeAliases.push('00000000-0000-0000-0000-000000000000');

  // Find all active predictions for this user/market/outcome
  const userPositions = await Prediction.findAll({
    where: { user_id: { [Op.in]: safeAliases }, market_id, outcome_id, status: 'active' },
    order: [['created_at', 'ASC']],
    transaction: t
  });

  const totalStake = userPositions.reduce((sum, p) => sum + parseFloat(p.stake_amount || 0), 0);

  if (totalStake === 0) {
    // Diagnostic: check if predictions exist with any status
    const anyPreds = await Prediction.count({ where: { user_id, market_id, outcome_id }, transaction: t });
    throw Object.assign(
      new Error(`No active position to sell (found ${anyPreds} prediction(s) total for this user/market/outcome, 0 with status=active)`),
      { status: 400 }
    );
  }
  if (sell_amount > totalStake) throw Object.assign(new Error(`Cannot sell more than your position ($${totalStake.toFixed(2)})`), { status: 400 });

  // Weighted average entry probability
  const weightedOddsSum = userPositions.reduce((sum, p) => sum + parseFloat(p.odds_at_prediction || 50) * parseFloat(p.stake_amount || 0), 0);
  const avgEntryProb = weightedOddsSum / totalStake;

  const sellReturn = calculatePositionValue(sell_amount, avgEntryProb, currentProb);

  // Reduce stakes across predictions (oldest first)
  let remaining = sell_amount;
  for (const p of userPositions) {
    if (remaining <= 0) break;
    const stake = parseFloat(p.stake_amount || 0);
    if (stake <= remaining) {
      remaining -= stake;
      await p.update({
        status: 'sold',
        actual_return: calculatePositionValue(stake, avgEntryProb, currentProb),
        sold_at: new Date()
      }, { transaction: t });

      // Sync LeaguePrediction if exists
      const lp = await LeaguePrediction.findOne({ where: { real_prediction_id: p.id }, transaction: t });
      if (lp) {
        await lp.update({
          position_status: 'exited',
          p_exit: currentProb / 100,
          actual_return: calculatePositionValue(stake, avgEntryProb, currentProb)
        }, { transaction: t });
      }
    } else {
      const splitStake = parseFloat(remaining.toFixed(2));
      const splitReturn = calculatePositionValue(splitStake, avgEntryProb, currentProb);
      await Prediction.create({
        id: nanoid(12),
        market_id: p.market_id,
        outcome_id: p.outcome_id,
        user_id: p.user_id,
        stake_amount: splitStake,
        odds_at_prediction: p.odds_at_prediction,
        potential_return: parseFloat((splitStake + splitStake * (1 - (parseFloat(p.odds_at_prediction || 50) / 100))).toFixed(2)),
        actual_return: splitReturn,
        status: 'sold',
        sold_at: new Date()
      }, { transaction: t });

      await p.update({
        stake_amount: parseFloat((stake - splitStake).toFixed(2))
      }, { transaction: t });
      
      // Sync LeaguePrediction if exists
      const lp = await LeaguePrediction.findOne({ where: { real_prediction_id: p.id }, transaction: t });
      if (lp) {
        await lp.update({
          stake_amount: parseFloat((stake - splitStake).toFixed(2))
        }, { transaction: t });
        
        // Create a 'sold' LeaguePrediction for the points earned
        await LeaguePrediction.create({
          id: nanoid(12),
          league_id: lp.league_id,
          user_id: lp.user_id,
          market_id: lp.market_id,
          outcome_id: lp.outcome_id,
          p_entry: lp.p_entry,
          stake_amount: splitStake,
          allocation_pct: lp.allocation_pct,
          position_status: 'exited',
          p_exit: currentProb / 100,
          actual_return: splitReturn,
          created_at: new Date(),
          real_prediction_id: p.id // links to the original
        }, { transaction: t });
      }
      remaining = 0;
    }
  }

  // Update outcome total_stake and market total_volume
  const newOutcomeStake = Math.max(0, parseFloat(outcome.total_stake || 0) - sell_amount);
  await outcome.update({ total_stake: newOutcomeStake }, { transaction: t });

  const newTotalVolume = Math.max(0, parseFloat(market.total_volume || 0) - sell_amount);
  await market.update({ total_volume: newTotalVolume }, { transaction: t });

  // Recompute probabilities
  const allOutcomes = await Outcome.findAll({ where: { market_id }, transaction: t });
  const outcomesData = allOutcomes.map(o => o.toJSON());
  const pricedOutcomes = recomputeProbabilities(outcomesData, newTotalVolume, market.market_type);

  for (const po of pricedOutcomes) {
    await Outcome.update({ probability: po.probability }, { where: { id: po.id }, transaction: t });
  }

  // Record price history snapshot
  const prices = Object.fromEntries(pricedOutcomes.map(o => [o.id, o.probability]));
  await PriceHistory.create({ market_id, timestamp: new Date(), prices }, { transaction: t });

  // Check if this sell-off shifted prices enough to alert other traders
  await checkPositionAlerts(market_id, prices, t);

  // Record sell return as a transaction (credit back to user's cash)
  if (sellReturn > 0) {
    await Transaction.create({
      id: nanoid(12),
      user_id: user_id,
      type: 'deposit',
      amount: sellReturn,
      payment_method: 'sell_return',
      status: 'completed',
      completed_at: new Date()
    }, { transaction: t });
  }

  const netPnl = parseFloat((sellReturn - sell_amount).toFixed(2));
  let feedback = "";
  if (netPnl > 0) {
    feedback = "Secured profit! Great job taking gains before resolution.";
  } else if (netPnl < 0) {
    feedback = "Smart move cutting losses. Capital preservation is key!";
  } else {
    feedback = "Position closed at break-even.";
  }

  // Notify the user their position was successfully sold
  if (user_id && user_id !== 'demo_user') {
    const notification = await Notification.create({
      id: nanoid(12),
      user_id: user_id,
      type: 'position_sold',
      title: 'Position Sold 🤝',
      message: `You sold your position in "${market.title}" for $${sellReturn.toFixed(2)}.\n\n${feedback}`,
      link: `/markets/${market.id}`,
      is_read: false,
      created_at: new Date()
    }, { transaction: t });
    broadcastNotification(notification.toJSON());
  }

  const updatedMarket = await fetchMarketWithRelations(market_id, t);

  return {
    sell_amount,
    sell_return: sellReturn,
    net_pnl: parseFloat((sellReturn - sell_amount).toFixed(2)),
    current_probability: currentProb,
    avg_entry_probability: parseFloat(avgEntryProb.toFixed(2)),
    market: formatMarketResponse(updatedMarket)
  };
}

app.post('/api/positions/sell', async (req, res) => {
  try {
    const { market_id, outcome_id, user_id, sell_amount } = req.body;

    if (!market_id || !outcome_id || !user_id || typeof sell_amount !== 'number' || sell_amount <= 0) {
      return res.status(400).json({ error: 'Invalid sell payload' });
    }

    const result = await sequelize.transaction(async (t) => {
      return await executePositionSell({ market_id, outcome_id, user_id, sell_amount }, t);
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Sell position error:', error);
    res.status(500).json({ error: 'Failed to sell position' });
  }
});

// ============================================================================
// MARKET RESOLUTION
// ============================================================================

app.get('/api/resolve/pending', requireRadarKey, async (req, res) => {
  try {
    const markets = await Market.findAll({
      where: {
        status: 'active',
        close_date: { [Op.lt]: new Date(), [Op.ne]: null }
      },
      include: [{ model: Outcome, as: 'outcomes' }],
      order: [['close_date', 'ASC']]
    });
    // Attach live headlines to each pending market — same source the per-market
    // News card uses — so resolving is "confirm what the news already says"
    // instead of guessing from memory. Markets linked to Kalshi/Polymarket
    // (price_source) resolve automatically via the daily sync and normally
    // won't even reach this queue.
    const withEvidence = await Promise.all(markets.map(async (m) => {
      const formatted = formatMarketResponse(m);
      try {
        const cached = newsCache.get(m.id);
        if (cached && Date.now() - cached.fetched < NEWS_TTL) {
          formatted.news = cached.items;
        } else {
          const query = (m.search_keywords && m.search_keywords.trim()) || m.title.replace(/^will\s+/i, '').replace(/\?+$/, '').trim();
          const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
          const rss = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DobiumNews/1.0)' } });
          const xml = rss.ok ? await rss.text() : '';
          const items = [];
          for (const block of xml.split('<item>').slice(1, 4)) {
            const title = decodeEntities((block.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
            const link = decodeEntities((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1]);
            if (title && link) items.push({ title, link });
          }
          newsCache.set(m.id, { fetched: Date.now(), items });
          formatted.news = items;
        }
      } catch {
        formatted.news = [];
      }
      formatted.hasLiveSource = !!m.price_source;
      return formatted;
    }));
    res.json(withEvidence);
  } catch (error) {
    console.error('Pending resolution fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pending markets' });
  }
});

app.post('/api/markets/:id/resolve', requireRadarKey, async (req, res) => {
  try {
    const { winning_outcome_id, winning_outcome_ids, partial } = req.body;

    const result = await sequelize.transaction(async (t) => {
      const market = await Market.findByPk(req.params.id, {
        include: [{ model: Outcome, as: 'outcomes' }],
        transaction: t
      });

      if (!market) {
        throw new Error('Market not found');
      }

      return resolveMarketInstance(market, winning_outcome_ids || winning_outcome_id, { transaction: t, partial });
    });

    const refreshed = await fetchMarketWithRelations(req.params.id);
    res.json({
      ok: true,
      winning_outcome_ids: result.winningOutcomeIds,
      market: formatMarketResponse(refreshed)
    });
  } catch (error) {
    console.error('Resolve market error:', error);
    if (error.message === 'Market not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.status) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to resolve market' });
  }
});

// ============================================================================
// AUTH & EMAILS
// ============================================================================

app.post('/api/auth/welcome', async (req, res) => {
  try {
    const { userId, email, username } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (userId) {
      const user = await User.findByPk(userId);
      if (user && user.welcome_email_sent) {
        return res.json({ success: true, message: 'Welcome email already sent' });
      }
    }

    const { buildWelcomeHtml } = require('./lib/welcome-email');
    const html = buildWelcomeHtml({ username, email });

    const info = await sendEmail({
      to: email,
      subject: 'Welcome to Dobium 🎉',
      text: `Welcome to Dobium, ${username || 'there'}! Your account is confirmed and ready to go.`,
      html
    });

    if (userId) {
      await User.upsert({
        id: userId,
        email: email,
        username: username || email.split('@')[0],
        welcome_email_sent: true
      });
    }

    res.json({ success: true, messageId: info?.messageId });
  } catch (error) {
    console.error('Welcome email error:', error);
    // Return 200 instead of 500 so a failed background email doesn't break the frontend flow
    res.status(200).json({ success: true, warning: 'Welcome process completed, but email failed to send.' });
  }
});

app.post('/api/auth/confirm', async (req, res) => {
  try {
    const { email, name, confirmUrl } = req.body;
    if (!email || !confirmUrl) {
      return res.status(400).json({ error: 'Email and confirmUrl are required' });
    }

    const { buildConfirmHtml } = require('./lib/confirm-email');
    const html = buildConfirmHtml({ name, confirmUrl });

    const info = await sendEmail({
      to: email,
      subject: 'Confirm your Dobium account',
      text: `Please confirm your Dobium account by visiting this link: ${confirmUrl}`,
      html
    });

    res.json({ success: true, messageId: info?.messageId });
  } catch (error) {
    console.error('Confirm email error:', error);
    // Return 200 instead of 500 so a failed background email doesn't break the frontend flow
    res.status(200).json({ success: true, warning: 'Confirm process completed, but email failed to send.' });
  }
});

// ============================================================================
// WALLET / USER ENDPOINTS
// ============================================================================

app.get('/api/users/:id/balance', async (req, res) => {
  try {
    let user = await User.findByPk(req.params.id);

    if (!user) {
      // Create default user if not found
      user = await User.create({
        id: req.params.id,
        username: req.params.id.substring(0, 20),
        email: `${req.params.id}@placeholder.com`
      });
    }

    // Calculate balance from transactions
    const balanceInfo = await calculateBalanceFromTransactions(req.params.id);

    res.json({
      balance: balanceInfo.balance,
      buying_power: balanceInfo.buyingPower,
      raw_balance: balanceInfo.rawBalance,
      cash_balance: balanceInfo.cashBalance,
      paper_starting_balance: balanceInfo.paperStartingBalance,
      total_deposited: balanceInfo.totalDeposits,
      total_withdrawn: balanceInfo.totalWithdrawals,
      active_stakes: balanceInfo.activePredictionStakes,
      realized_stake: balanceInfo.realizedStake,
      realized_return: balanceInfo.realizedReturn,
      realized_pnl: balanceInfo.realizedPnl,
      user
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

app.get('/api/users/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
      return res.json({ available: false });
    }
    const existing = await User.findOne({ where: { username } });
    res.json({ available: !existing });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ error: 'Failed to check username' });
  }
});

app.put('/api/users/:id/username', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'Invalid username format' });
    }
    const existing = await User.findOne({ where: { username } });
    if (existing && existing.id !== req.params.id) {
      return res.status(409).json({ error: 'Username is already taken' });
    }
    await User.update({ username, username_set: true }, { where: { id: req.params.id } });
    const user = await User.findByPk(req.params.id);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Update username error:', error);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

app.get('/api/users/negative-buying-power', async (req, res) => {
  try {
    const users = await User.findAll({ order: [['created_at', 'DESC']] });
    const negativeUsers = [];

    for (const user of users) {
      const balanceInfo = await calculateBalanceFromTransactions(user.id);
      if (balanceInfo.rawBalance < 0) {
        negativeUsers.push({
          user_id: user.id,
          username: user.username,
          balance: balanceInfo.balance,
          buying_power: balanceInfo.buyingPower,
          raw_balance: balanceInfo.rawBalance,
          cash_balance: balanceInfo.cashBalance,
          paper_starting_balance: balanceInfo.paperStartingBalance,
          total_deposited: balanceInfo.totalDeposits,
          total_withdrawn: balanceInfo.totalWithdrawals,
          active_stakes: balanceInfo.activePredictionStakes,
          realized_stake: balanceInfo.realizedStake,
          realized_return: balanceInfo.realizedReturn,
          realized_pnl: balanceInfo.realizedPnl
        });
      }
    }

    res.json({
      count: negativeUsers.length,
      users: negativeUsers
    });
  } catch (error) {
    console.error('Negative buying power scan error:', error);
    res.status(500).json({ error: 'Failed to scan negative buying power users' });
  }
});

app.post('/api/users/fix-negative-buying-power', async (req, res) => {
  try {
    const users = await User.findAll({ order: [['created_at', 'DESC']] });
    const repairedUsers = [];

    for (const user of users) {
      const repair = await sequelize.transaction((t) => removeTradesCausingNegativeBuyingPower(user.id, t));
      if (repair.removed_predictions > 0) {
        repairedUsers.push({
          user_id: user.id,
          username: user.username,
          ...repair
        });
      }
    }

    res.json({
      ok: true,
      repaired_users: repairedUsers.length,
      removed_predictions: repairedUsers.reduce((sum, user) => sum + user.removed_predictions, 0),
      users: repairedUsers
    });
  } catch (error) {
    console.error('Bulk fix negative buying power error:', error);
    res.status(500).json({ error: 'Failed to fix negative buying power users' });
  }
});

app.post('/api/users/:id/fix-balance', async (req, res) => {
  try {
    const repair = await sequelize.transaction(async (t) => {
      let user = await User.findByPk(req.params.id, { transaction: t });
      if (!user) {
        user = await User.create({
          id: req.params.id,
          username: req.params.id.substring(0, 20),
          email: `${req.params.id}@placeholder.com`
        }, { transaction: t });
      }

      return removeTradesCausingNegativeBuyingPower(req.params.id, t);
    });

    res.json({
      ok: true,
      message: repair.removed_predictions > 0
        ? `Removed ${repair.removed_predictions} trade(s) to restore non-negative buying power.`
        : 'Buying power is already non-negative.',
      ...repair,
      cancelled_predictions: repair.removed_predictions
    });
  } catch (error) {
    console.error('Fix balance error:', error);
    res.status(500).json({ error: 'Failed to fix balance' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    console.log(`\n🗑️  DELETE /api/users/${userId} — Account deletion requested`);

    // Delete user transactions from local DB
    try {
      await Transaction.destroy({ where: { user_id: userId } });
      console.log('  ✓ Transactions deleted from local DB');
    } catch (e) { console.log('  ✗ Transaction cleanup:', e.message); }

    // Delete user from local DB
    try {
      await User.destroy({ where: { id: userId } });
      console.log('  ✓ User deleted from local DB');
    } catch (e) { console.log('  ✗ User cleanup:', e.message); }

    // Delete from Supabase auth (requires service role key)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    console.log(`  Supabase URL: ${supabaseUrl ? '✓ found' : '✗ MISSING'}`);
    console.log(`  Service Role Key: ${serviceRoleKey ? '✓ found (' + serviceRoleKey.substring(0, 20) + '...)' : '✗ MISSING'}`);

    if (supabaseUrl && serviceRoleKey) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });

        // Delete profile data from Supabase tables
        const profileRes = await supabaseAdmin.from('profiles').delete().eq('id', userId);
        console.log(`  Profiles delete: ${profileRes.error ? '✗ ' + profileRes.error.message : '✓ done'}`);

        const usersRes = await supabaseAdmin.from('users').delete().eq('id', userId);
        console.log(`  Users table delete: ${usersRes.error ? '✗ ' + usersRes.error.message : '✓ done'}`);

        // Delete the auth user entirely
        console.log(`  Deleting auth user ${userId}...`);
        const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) {
          console.error(`  ✗ Supabase auth.admin.deleteUser FAILED: ${error.message}`);
          console.error('    Full error:', JSON.stringify(error));
        } else {
          console.log(`  ✅ User ${userId} FULLY DELETED from Supabase auth`);
        }
      } catch (e) {
        console.error('  ✗ Supabase admin error:', e.message);
        console.error('    Stack:', e.stack);
      }
    } else {
      console.warn('  ⚠️  SUPABASE_SERVICE_ROLE_KEY not set — auth user NOT deleted');
    }

    console.log('  → Sending success response\n');
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

app.post('/api/users/:id/deposit', async (req, res) => {
  try {
    const { amount, payment_method = 'card' } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }

    if (amount > 10000) {
      return res.status(400).json({ error: 'Maximum deposit is $10,000' });
    }
    const result = await sequelize.transaction(async (t) => {
      // Get or create user
      let user = await User.findByPk(req.params.id, { transaction: t });

      if (!user) {
        user = await User.create({
          id: req.params.id,
          username: req.params.id.substring(0, 20),
          email: `${req.params.id}@placeholder.com`
        }, { transaction: t });
      }

      // Create transaction
      const transaction = await Transaction.create({
        id: nanoid(12),
        user_id: req.params.id,
        type: 'deposit',
        amount,
        payment_method,
        status: 'completed',
        completed_at: new Date()
      }, { transaction: t });

      return transaction;
    });

    // Calculate new balance
    const balanceInfo = await calculateBalanceFromTransactions(req.params.id);

    res.status(201).json({
      success: true,
      transaction: result,
      new_balance: balanceInfo.balance
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Failed to process deposit' });
  }
});

app.post('/api/payments/create-intent', async (req, res) => {
  const { userId, amount, currency = 'usd' } = req.body;
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid userId' });
  }
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }
  const cents = Math.round(amount * 100);
  if (cents > 100000000) {
    return res.status(400).json({ error: 'Amount too large' });
  }
  let pi;
  try {
    pi = await stripe.paymentIntents.create({
      amount: cents,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: { userId },
      description: 'Wallet deposit'
    });
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Failed to create intent' });
  }
  await Transaction.create({
    id: nanoid(12),
    user_id: userId,
    type: 'deposit',
    amount,
    payment_method: 'card',
    status: 'pending'
  });
  res.json({ client_secret: pi.client_secret, intent_id: pi.id });
});

app.post('/api/payments/create-checkout-session', async (req, res) => {
  const { userId, priceId, quantity = 1 } = req.body;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid userId' });
  }
  if (!priceId || typeof priceId !== 'string') {
    return res.status(400).json({ error: 'Invalid priceId' });
  }
  const origin = `${req.protocol}://${req.get('host')}`;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity }],
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=canceled`,
      subscription_data: { metadata: { userId } }
    });
    res.json({ id: session.id, url: session.url || null });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Failed to create checkout session' });
  }
});

app.post('/api/users/:id/withdraw', async (req, res) => {
  try {
    const { amount, withdrawal_method = 'bank' } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    // Calculate current balance
    const currentBalanceInfo = await calculateBalanceFromTransactions(req.params.id);

    if (currentBalanceInfo.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const result = await sequelize.transaction(async (t) => {
      // Ensure user exists
      let user = await User.findByPk(req.params.id, { transaction: t });

      if (!user) {
        user = await User.create({
          id: req.params.id,
          username: req.params.id.substring(0, 20),
          email: `${req.params.id}@placeholder.com`
        }, { transaction: t });
      }

      // Create withdrawal transaction
      const transaction = await Transaction.create({
        id: nanoid(12),
        user_id: req.params.id,
        type: 'withdrawal',
        amount,
        payment_method: withdrawal_method,
        status: 'completed',
        completed_at: new Date()
      }, { transaction: t });

      return transaction;
    });

    // Calculate new balance
    const balanceInfo = await calculateBalanceFromTransactions(req.params.id);

    res.status(201).json({
      success: true,
      transaction: result,
      new_balance: balanceInfo.balance
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

app.post('/api/users/:id/reset-deposits', async (req, res) => {
  try {
    await Transaction.destroy({
      where: {
        user_id: req.params.id,
        type: { [Op.in]: ['deposit', 'withdrawal'] },
        [Op.or]: [
          { payment_method: { [Op.ne]: 'sell_return' } },
          { payment_method: null }
        ]
      }
    });
    const balanceInfo = await calculateBalanceFromTransactions(req.params.id);
    res.json({ success: true, balance: balanceInfo.balance });
  } catch (error) {
    console.error('Reset deposits error:', error);
    res.status(500).json({ error: 'Failed to reset deposits' });
  }
});

app.get('/api/users/:id/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { user_id: req.params.id },
      order: [['created_at', 'DESC']]
    });

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ============================================================================
// NOTIFICATIONS
// ============================================================================

app.get('/api/users/:id/notifications', async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.params.id },
      order: [['created_at', 'DESC']],
      limit: 50
    });
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (notification) {
      await notification.update({ is_read: true });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

app.put('/api/users/:id/notifications/read-all', async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.params.id, is_read: false } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Update all notifications error:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

app.delete('/api/users/:id/notifications', async (req, res) => {
  try {
    await Notification.destroy({ where: { user_id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete notifications error:', error);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

app.get('/api/admin/users', async (req, res) => {
  try {
    const { adminEmail } = req.query;
    if (!ADMIN_EMAILS.includes(adminEmail)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (supabaseUrl && serviceRoleKey) {
      const { createClient } = require('@supabase/supabase-js');
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) {
        console.error('Supabase admin listUsers error:', error);
      } else if (data && data.users) {
        const formattedUsers = data.users.map(u => ({
          id: u.id,
          email: u.email,
          username: u.user_metadata?.name || u.user_metadata?.full_name || u.user_metadata?.username || (u.email ? u.email.split('@')[0] : 'Unknown'),
          created_at: u.created_at
        }));

        // Sync real emails and usernames down to the local database so the Risk Management
        // scanner and other local relations show actual names instead of UUID junk!
        await Promise.all(formattedUsers.map(u =>
          User.upsert({
            id: u.id,
            email: u.email,
            username: u.username
          }).catch(() => { })
        ));

        formattedUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return res.json(formattedUsers);
      }
    }

    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'created_at'],
      order: [['created_at', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    console.error('Admin fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/admin/preview-digest', async (req, res) => {
  try {
    const { adminEmail, userId } = req.query;
    if (!ADMIN_EMAILS.includes(adminEmail)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { buildDigestHtml } = require('./lib/digest-email');

    let targetUserId = userId || adminEmail;

    let user = null;
    try {
      if (targetUserId.includes('@')) {
        user = await User.findOne({ where: { email: targetUserId } });
      } else {
        user = await User.findOne({ where: { id: targetUserId } });
      }
    } catch (e) {
      console.warn('[preview-digest] Failed to find user:', e.message);
    }

    if (user) {
      targetUserId = user.id;
    }

    const stats = await getUserStats(targetUserId, { User, Transaction, Prediction, Outcome });

    const html = buildDigestHtml({
      username: user ? (user.username || user.email.split('@')[0]) : 'Demo User',
      ...stats
    });

    res.json({ html });
  } catch (error) {
    console.error('Preview digest error:', error);
    res.status(500).json({ error: 'Failed to generate digest preview' });
  }
});

app.post('/api/admin/send-email', async (req, res) => {
  try {
    const { to, subject, text, html, adminEmail, heading, greeting, callout, cta } = req.body;

    // Verify admin identity
    if (!ADMIN_EMAILS.includes(adminEmail)) {
      return res.status(403).json({ error: 'Forbidden — admin access required' });
    }

    if (!to || !subject) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const platformUrl = process.env.PLATFORM_URL || 'https://dobium.com';
    const styledHtml = html || buildCustomBroadcastHtml({
      heading,
      body: text,
      callout,
      ctaLabel: cta,
      ctaUrl: cta ? platformUrl : null,
      username: greeting,
      subject,
      platformUrl
    });

    const info = await sendEmail({ to, subject, text, html: styledHtml });
    res.json({ success: true, messageId: info?.messageId });
  } catch (error) {
    console.error('Admin email error:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// ============================================================================
// ADMIN — BROADCAST CAMPAIGNS
// ============================================================================

// Known campaigns — each defines the email payload
const BROADCAST_CAMPAIGNS = {};

// ── Custom campaign HTML builder ──────────────────────────────────────────────
function buildCustomBroadcastHtml({ heading, heroIcon = '✦', body, callout, questions, newsUpdates, ctaLabel, ctaUrl, username, subject, platformUrl }) {
  const year = new Date().getFullYear();
  const actualName = username ? username : 'there';
  const finalBody = (body || '').replace(/\{user\}/gi, actualName);
  const safeBody = finalBody.replace(/\n/g, '<br/>');

  let newsHtml = '';
  if (newsUpdates && newsUpdates.length > 0) {
    const ns = newsUpdates.map(n => `
      <div style="margin-top:24px; border-left:2px solid #d4af37; padding-left:16px;">
        <h3 style="margin:0 0 6px;font-family:'Cabinet Grotesk', 'Inter', Arial, sans-serif;font-size:16px;color:#f1f5f9;font-weight:700;">${n.headline}</h3>
        <p style="margin:0;font-family:'Inter',Arial,Helvetica,sans-serif;font-size:14px;color:#94a3b8;line-height:1.6;">${(n.content || '').replace(/\n/g, '<br/>')}</p>
      </div>
    `).join('');
    newsHtml = `<div style="margin-top:20px;">${ns}</div>`;
  }

  let questionsHtml = '';
  if (questions && questions.length > 0) {
    const qs = questions.map(q => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="36" style="vertical-align:top; padding-top:2px;">
                <div style="width:28px;height:28px;border-radius:6px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.3);text-align:center;line-height:28px;font-size:14px;">${q.emoji || '📌'}</div>
              </td>
              <td style="padding-left:10px;">
                <div style="font-family:'Inter',Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#d4af37;margin-bottom:2px;">${q.label}</div>
                <div style="font-family:'Inter',Arial,Helvetica,sans-serif;font-size:13px;color:#cbd5e1;line-height:1.5;">${q.question}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join('');
    questionsHtml = `<tr><td style="background:#071428;padding:20px 5% 4px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #1e3a5f;border-radius:10px;overflow:hidden;background:#0a1628;">
        ${qs}
      </table>
    </td></tr>`;
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${subject || 'A message from Dobium'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://api.fontshare.com/v2/css?f%5B%5D=cabinet-grotesk@800,700,900&display=swap" rel="stylesheet">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  @import url('https://api.fontshare.com/v2/css?f%5B%5D=cabinet-grotesk@800,700,900&display=swap');
  h1, h2, h3 { font-family: 'Cabinet Grotesk', 'Inter', Arial, sans-serif !important; }
  body, p, a, div, td { font-family: 'Inter', Arial, Helvetica, sans-serif; }
</style>
</head>
<body style="margin:0;padding:0;background-color:#0a0f1e;font-family:'Inter',Arial,Helvetica,sans-serif;width:100%;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0f1e;padding:5% 3%;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;border:1px solid rgba(212,175,55,0.2);box-shadow:0 0 48px rgba(212,175,55,0.06);">
        <tr><td style="height:4px;background:linear-gradient(90deg,#7a5c10,#b8952a,#d4af37,#f0cc6a,#d4af37,#b8952a,#7a5c10);font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td align="center" style="padding:20px 5% 18px;background-color:#071428;">
          <img src="${platformUrl}/Logo-Title.png" alt="Dobium" width="130" style="display:block;max-width:100%;height:auto;border:0;margin:0 auto;" />
        </td></tr>
        <tr><td align="center" style="padding:36px 5% 32px;background:linear-gradient(160deg,#0c1e40 0%,#071428 60%,#04101f 100%);">
          <div style="width:52px;height:52px;border-radius:14px;background:rgba(212,175,55,0.1);border:1.5px solid rgba(212,175,55,0.4);margin:0 auto 18px;text-align:center;line-height:52px;font-size:24px;">${heroIcon}</div>
          <h1 style="margin:0 0 6px;font-family:'Cabinet Grotesk', 'Inter', Arial, sans-serif;font-size:22px;font-weight:900;color:#f1f5f9;line-height:1.25;letter-spacing:-0.3px;">${heading || 'A message from Dobium'}</h1>
        </td></tr>
        <tr><td style="background:#0a1628;padding:24px 5%;border-top:1px solid rgba(212,175,55,0.1);border-bottom:1px solid rgba(212,175,55,0.1);">
          <p style="margin:0;font-family:'Inter',Arial,Helvetica,sans-serif;font-size:14px;color:#94a3b8;line-height:1.85;">${safeBody}</p>
          ${newsHtml}
        </td></tr>
        ${callout ? `<tr><td style="background:#071428;padding:18px 5%;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="border-left:3px solid #d4af37;background:rgba(212,175,55,0.06);border-radius:0 8px 8px 0;padding:12px 16px;">
              <p style="margin:0;font-family:'Inter',Arial,Helvetica,sans-serif;font-size:13px;color:#a78040;line-height:1.6;">${callout}</p>
            </td>
          </tr></table>
        </td></tr>` : ''}
    ${questionsHtml}
        ${ctaLabel && ctaUrl ? `<tr><td align="center" style="background:#071428;padding:28px 5% 36px;">
          <a href="${ctaUrl}" style="display:inline-block;font-family:'Inter',Arial,Helvetica,sans-serif;padding:14px 10%;background:linear-gradient(135deg,#b8952a 0%,#d4af37 50%,#e8c645 100%);color:#0a0f1e;font-size:14px;font-weight:900;text-decoration:none;border-radius:10px;box-shadow:0 4px 20px rgba(212,175,55,0.3);max-width:100%;box-sizing:border-box;">${ctaLabel}</a>
        </td></tr>` : ''}
        <tr><td align="center" style="padding:22px 5% 24px;background:#04101f;border-top:1px solid rgba(255,255,255,0.04);">
          <p style="margin:0 0 4px;font-family:'Inter',Arial,Helvetica,sans-serif;font-size:11px;color:#334155;">© ${year} Dobium &middot; All rights reserved.</p>
          <p style="margin:0;font-family:'Inter',Arial,Helvetica,sans-serif;font-size:10px;color:#1e293b;line-height:1.6;">You received this because you are a registered user of Dobium Prediction Markets.</p>
        </td></tr>
        <tr><td style="height:3px;background:linear-gradient(90deg,#7a5c10,#b8952a,#d4af37,#f0cc6a,#d4af37,#b8952a,#7a5c10);font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * POST /api/admin/send-broadcast
 * Body:
 *   Preset:  { campaignId, adminEmail, dryRun? }
 *   Custom:  { campaignId: 'custom', adminEmail, dryRun?,
 *              subject, heading, heroIcon, body, callout, questions, newsUpdates, ctaLabel, ctaUrl }
 */
app.post('/api/admin/send-broadcast', async (req, res) => {
  try {
    const {
      campaignId, adminEmail, dryRun = true,
      // Custom campaign fields
      subject, heading, heroIcon, body: bodyText, callout, questions, newsUpdates, ctaLabel, ctaUrl, externalEmails
    } = req.body;

    if (!ADMIN_EMAILS.includes(adminEmail)) {
      return res.status(403).json({ error: 'Forbidden — admin access required' });
    }

    const platformUrl = process.env.PLATFORM_URL || 'https://dobium.com';

    // ── Resolve campaign ────────────────────────────────────────────────────
    let campaign;
    if (campaignId === 'custom') {
      if (!subject || !bodyText) {
        return res.status(400).json({ error: 'Custom campaign requires at least subject and body.' });
      }
      campaign = {
        id: 'custom',
        name: subject,
        subject,
        buildHtml: (username) => buildCustomBroadcastHtml({
          heading, heroIcon, body: bodyText, callout, questions, newsUpdates, ctaLabel,
          ctaUrl: ctaUrl || platformUrl,
          username, subject, platformUrl
        }),
        buildText: (username) => {
          const actualName = username ? username : 'there';
          let text = `${heading ? heading + '\n\n' : ''}${bodyText}`;
          text = text.replace(/\{user\}/gi, actualName);
          if (callout) text += '\n\n' + callout;
          if (newsUpdates && newsUpdates.length > 0) {
            text += '\n\n' + newsUpdates.map(n => `--- ${n.headline} ---\n${n.content}`).join('\n\n');
          }
          if (questions && questions.length > 0) {
            text += '\n\n' + questions.map(q => `  ${q.emoji || '📌'} ${q.label} — ${q.question}`).join('\n');
          }
          if (ctaLabel && ctaUrl) text += '\n\n' + ctaLabel + ': ' + ctaUrl;
          return text;
        }
      };
    } else {
      campaign = BROADCAST_CAMPAIGNS[campaignId];
      if (!campaign) {
        return res.status(400).json({ error: `Unknown campaign: ${campaignId}` });
      }
    }

    // ── Fetch recipients ────────────────────────────────────────────────────
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return res.status(500).json({ error: 'Failed to fetch users: ' + error.message });

    const localUsers = await User.findAll({ attributes: ['email', 'username'] });
    const localUserMap = new Map();
    localUsers.forEach(u => {
      if (u.email) localUserMap.set(u.email.toLowerCase(), u.username);
    });

    const SKIP = new Set(['donotreply.dobium@gmail.com', 'peepeeeepooopoo@gmail.com', 'hebdhdbdbsbhbbbhhdhdhsh@gmail.com']);
    const recipients = data.users
      .filter(u => u.email && !SKIP.has(u.email))
      .map(u => {
        const localUsername = localUserMap.get(u.email.toLowerCase());
        return {
          email: u.email,
          username: localUsername || u.user_metadata?.username || u.user_metadata?.name || u.user_metadata?.full_name || u.email.split('@')[0]
        };
      });

    // ── Dry-run ─────────────────────────────────────────────────────────────
    if (dryRun) {
      return res.json({
        dryRun: true,
        campaign: { id: campaign.id, name: campaign.name, subject: campaign.subject },
        recipientCount: recipients.length,
        recipients: recipients.map(r => r.email),
        previewHtml: campaign.buildHtml(null, platformUrl)
      });
    }

    // ── Live send ───────────────────────────────────────────────────────────
    const results = { sent: 0, failed: 0, errors: [] };

    for (const recipient of recipients) {
      try {
        await sendEmail({
          to: recipient.email,
          subject: campaign.subject,
          text: campaign.buildText(recipient.username),
          html: campaign.buildHtml(recipient.username, platformUrl)
        });
        results.sent++;
        await new Promise(r => setTimeout(r, 700));
      } catch (err) {
        results.failed++;
        results.errors.push({ email: recipient.email, error: err.message });
      }
    }

    res.json({ dryRun: false, campaign: campaign.name, ...results });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Broadcast failed: ' + error.message });
  }
});


// ============================================================================
// ADMIN — MAIN EVENTS
// ============================================================================

const checkAdmin = (req, res, next) => {
  const adminEmail = req.query.adminEmail || req.body.adminEmail;
  if (!ADMIN_EMAILS.includes(adminEmail)) {
    return res.status(403).json({ error: 'Forbidden — admin access required' });
  }
  next();
};

app.get('/api/admin/events', checkAdmin, async (req, res) => {
  try {
    const events = await MainEvent.findAll({
      order: [['created_at', 'DESC']],
      include: [
        { model: MainEventMarket, as: 'event_markets' }
      ]
    });
    
    // Compute stats
    const eventsJson = await Promise.all(events.map(async e => {
      const eJson = e.toJSON();
      eJson.league_count = await ForecastLeague.count({ where: { event_id: e.id } });
      eJson.market_count = eJson.event_markets?.length || 0;
      return eJson;
    }));
    
    res.json(eventsJson);
  } catch (err) {
    console.error('Admin GET events error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.post('/api/admin/events', checkAdmin, async (req, res) => {
  try {
    const adminEmail = req.body.adminEmail || req.query.adminEmail;
    const adminUser = await User.findOne({ where: { email: adminEmail } });
    
    if (!adminUser) {
      return res.status(400).json({ error: 'Admin user not found in database' });
    }

    const event = await MainEvent.create({
      id: nanoid(12),
      ...req.body,
      created_by: adminUser.id
    });
    res.status(201).json(event);
  } catch (err) {
    console.error('Admin POST event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

app.put('/api/admin/events/:id', checkAdmin, async (req, res) => {
  try {
    await MainEvent.update(req.body, { where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Admin PUT event error:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

app.delete('/api/admin/events/:id', checkAdmin, async (req, res) => {
  try {
    await MainEvent.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Admin DELETE event error:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

app.post('/api/admin/events/:id/close', checkAdmin, async (req, res) => {
  try {
    await MainEvent.update({ status: 'completed' }, { where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to close event' });
  }
});

app.post('/api/admin/events/:id/markets', checkAdmin, async (req, res) => {
  try {
    await MainEventMarket.create({
      id: nanoid(12),
      event_id: req.params.id,
      market_id: req.body.market_id
    });
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign market' });
  }
});

app.delete('/api/admin/events/:id/markets/:marketId', checkAdmin, async (req, res) => {
  try {
    await MainEventMarket.destroy({
      where: {
        event_id: req.params.id,
        market_id: req.params.marketId
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove market' });
  }
});


// ============================================================================
// SPA FALLBACK — let React Router handle all non-API routes
// ============================================================================

app.get('*', (req, res) => {
  // Only serve the React app for non-API routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/config/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(REACT_BUILD, 'index.html'), (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Frontend build not found. The deployment process did not build the React app. Please ensure your deployment build command includes building the frontend.');
    }
  });
});

// ============================================================================
// START SERVER
// ============================================================================

async function seedMarketsFromJson() {
  const marketsPath = path.join(__dirname, 'data', 'markets.json');
  try {
    const raw = await fs.readFile(marketsPath, 'utf-8');
    const markets = JSON.parse(raw || '[]');
    console.log(`📦 Found ${markets.length} markets in JSON, checking database...`);

    for (const m of markets) {
      const existing = await Market.findByPk(m.id);
      if (existing) {
        console.log(`  ⏭️  "${m.title}" already in DB`);
        continue;
      }
      try {
        await sequelize.transaction(async (t) => {
          await Market.create({
            id: m.id, title: m.title, description: m.description,
            category: m.category, status: m.status || 'active',
            close_date: m.close_date, resolution_date: m.resolution_date,
            market_type: m.market_type || 'binary', total_volume: m.total_volume || 0,
            image_url: m.image_url, winning_outcome_id: m.winning_outcome_id,
            search_keywords: m.search_keywords,
            is_trending: m.is_trending || false
          }, { transaction: t });

          if (m.outcomes && m.outcomes.length > 0) {
            await Outcome.bulkCreate(m.outcomes.map(o => ({
              id: `${m.id}_${o.id}`, market_id: m.id, title: o.title,
              probability: o.probability || 0, total_stake: o.total_stake || 0
            })), { transaction: t });
          }

          if (m.price_history && m.price_history.length > 0) {
            await PriceHistory.bulkCreate(m.price_history.map(ph => ({
              market_id: m.id, timestamp: ph.timestamp, prices: ph.prices
            })), { transaction: t });
          }

          console.log(`  ✅ Seeded "${m.title}" (${m.outcomes?.length || 0} outcomes)`);
        });
      } catch (err) {
        console.error(`  ❌ Failed "${m.title}": ${err.message}`);
      }
    }
  } catch (err) {
    console.log(`⚠️  No markets.json found or read error: ${err.message}`);
  }
}

async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    if (process.env.NODE_ENV !== 'production') {
      // Full schema sync + seeding in development / Railway.
      // alter:true updates existing columns — safe for dev, too slow for serverless.
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized (all tables created/updated)');

      const marketCount = await Market.count();
      console.log(`📊 Markets in database: ${marketCount}`);
      console.log('🌱 Seeding missing markets from JSON...');
      await seedMarketsFromJson();
    } else {
      // Production (Vercel): run a lightweight sync that only CREATEs missing tables.
      // This is fast (~200ms) and ensures tables like 'notifications' exist
      // without any ALTER TABLE statements that would timeout the cold start.
      await sequelize.sync({ alter: false, force: false });
      console.log('⚡ Production sync complete (missing tables created, existing tables untouched)');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('   Markets, predictions, and positions require a PostgreSQL database.');
    console.error('   Set DATABASE_URL in your environment variables.');
  }
}

// Always initialize the database (needed for both Railway and Vercel serverless)
initDatabase();

// Only bind to a TCP port when run directly (Railway / local dev).
// When imported as a module by Vercel's api/index.js, skip listen() entirely.
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`✅ Dobium API listening on http://localhost:${PORT}`);

    // Register the daily 12 PM CST digest email job
    registerDailyDigestJob(
      { User, Transaction, Prediction, Outcome, Market },
      sendEmail
    );
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use.`);
      console.error(`   In PowerShell, run:`);
      console.error(`   netstat -ano | findstr :${PORT}`);
      console.error(`   Then kill by PID:  taskkill /PID 12345 /F  (replace 12345 with the actual PID)`);
      process.exit(1);
    } else {
      throw err;
    }
  });
}

// Export the Express app for Vercel serverless (api/index.js)
module.exports = app;
