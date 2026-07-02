const crypto = require('crypto');
const { Op, QueryTypes } = require('sequelize');
const {
  sequelize,
  PlatformConfig,
  ForecastLeague,
  LeagueTimingWindow,
  LeagueMember,
  LeaguePrediction,
  PositionExit,
  LeagueScore,
  CalledItEntry,
  User,
  Market,
  Outcome
} = require('./database/models');
const {
  DEFAULT_MAX_STAKE,
  calculateConvictionMultiplier,
  calculateDifficultyMultiplier,
  calculateExitQuality,
  calculateExitPoints,
  calculatePoints,
  calculateStakeWeight,
  normalizeProbability,
  roundPoints
} = require('./scoring');

function nanoid(size = 12) {
  return crypto.randomBytes(Math.ceil(size / 2)).toString('hex').slice(0, size);
}

function parseNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeUsername(value) {
  const username = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
  return /^[a-z0-9_]{3,20}$/.test(username) ? username : null;
}

function isUsableUsername(user, userId) {
  if (!user?.username) return false;
  const username = normalizeUsername(user.username);
  if (!username) return false;
  const idSlug = normalizeUsername(userId);
  return username !== idSlug;
}

async function getPlatformNumber(key, fallback, transaction = null) {
  const row = await PlatformConfig.findByPk(key, transaction ? { transaction } : {});
  return row ? parseNumber(row.value, fallback) : fallback;
}

async function seedPlatformConfigs(transaction = null) {
  const defaults = [
    ['league_max_stake', DEFAULT_MAX_STAKE],
    ['called_it_probability_threshold', 0.25],
    ['called_it_min_points', 250],
    ['default_early_multiplier', 2.0],
    ['default_standard_multiplier', 1.0],
    ['default_late_multiplier', 0.5]
  ];
  for (const [key, value] of defaults) {
    await PlatformConfig.findOrCreate({
      where: { key },
      defaults: { key, value },
      ...(transaction ? { transaction } : {})
    });
  }
}

async function ensureForecastLeagueInfrastructure() {
  await seedPlatformConfigs();
  await sequelize.query(`
    CREATE OR REPLACE VIEW league_leaderboard AS
    WITH prediction_counts AS (
      SELECT league_id, user_id, COUNT(*) AS prediction_count
      FROM league_predictions
      GROUP BY league_id, user_id
    )
    SELECT
      s.league_id,
      s.user_id,
      u.username,
      s.total_points,
      s.accuracy_pct,
      s.calibration_score,
      s.calibration_tier,
      s.called_it_count,
      s.timing_tier,
      s.conviction_tier,
      s.correct_count,
      s.wrong_count,
      s.archetype,
      pc.prediction_count,
      RANK() OVER (
        PARTITION BY s.league_id
        ORDER BY s.total_points DESC, s.accuracy_pct DESC, s.called_it_count DESC
      ) AS league_rank
    FROM league_scores s
    JOIN users u ON u.id = s.user_id
    JOIN prediction_counts pc ON pc.league_id = s.league_id AND pc.user_id = s.user_id
    WHERE pc.prediction_count >= 3
  `);
}

function calculateArchetype({
  calledItCount = 0,
  timingTier = 'B',
  accuracyPct = 0,
  convictionTier = 'Medium',
  calibrationTier = 'Unrated',
  consistent = false
}) {
  if (calledItCount > 5 && timingTier === 'S') return 'Visionary';
  if (accuracyPct > 70 && convictionTier === 'High') return 'Sharp';
  if (calledItCount > 3 && ['A', 'S'].includes(timingTier)) return 'Underdog Specialist';
  if (calibrationTier === 'Elite' && consistent) return 'Analytical';
  if (calledItCount > 7) return 'Contrarian';
  return 'Consensus';
}

function timingTierFromMultiplier(avgMultiplier) {
  if (avgMultiplier >= 1.75) return 'S';
  if (avgMultiplier >= 1.25) return 'A';
  if (avgMultiplier >= 0.75) return 'B';
  return 'C';
}

function calibrationTier(score) {
  if (score >= 80) return 'Elite';
  if (score >= 65) return 'Strong';
  if (score >= 45) return 'Developing';
  return 'Volatile';
}

function convictionTier(avgMultiplier) {
  if (avgMultiplier >= 1.18) return 'High';
  if (avgMultiplier >= 1.08) return 'Medium';
  return 'Low';
}

async function ensureLeagueScore(leagueId, userId, transaction = null) {
  const [score] = await LeagueScore.findOrCreate({
    where: { league_id: leagueId, user_id: userId },
    defaults: {
      id: nanoid(12),
      league_id: leagueId,
      user_id: userId
    },
    ...(transaction ? { transaction } : {})
  });
  return score;
}

async function updateLeagueRanks(leagueId, transaction = null) {
  const scores = await LeagueScore.findAll({
    where: { league_id: leagueId },
    order: [
      ['total_points', 'DESC'],
      ['accuracy_pct', 'DESC'],
      ['called_it_count', 'DESC']
    ],
    ...(transaction ? { transaction } : {})
  });

  let lastPoints = null;
  let lastAccuracy = null;
  let lastCalledIt = null;
  let rank = 0;
  for (let i = 0; i < scores.length; i += 1) {
    const score = scores[i];
    const points = parseNumber(score.total_points);
    const accuracy = parseNumber(score.accuracy_pct);
    const calledIt = parseNumber(score.called_it_count);
    if (points !== lastPoints || accuracy !== lastAccuracy || calledIt !== lastCalledIt) {
      rank = i + 1;
      lastPoints = points;
      lastAccuracy = accuracy;
      lastCalledIt = calledIt;
    }
    await score.update({ league_rank: rank, updated_at: new Date() }, transaction ? { transaction } : {});
  }
}

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

async function updateLeagueScores(leagueId, userId, transaction = null) {
  const predictions = await LeaguePrediction.findAll({
    where: { league_id: leagueId, user_id: userId },
    ...(transaction ? { transaction } : {})
  });

  const openOutcomeIds = [...new Set(predictions.filter(p => !p.resolved && p.position_status !== 'exited').map(p => p.outcome_id))];
  const outcomeMap = {};
  if (openOutcomeIds.length > 0) {
    const outcomes = await Outcome.findAll({
      where: { id: openOutcomeIds },
      ...(transaction ? { transaction } : {})
    });
    for (const o of outcomes) {
      outcomeMap[o.id] = parseFloat(o.probability || 0) / 100;
    }
  }

  const resolved = predictions.filter(p => p.resolved);
  const correctCount = resolved.filter(p => p.was_correct).length;
  const wrongCount = resolved.filter(p => p.was_correct === false).length;
  const settledCount = correctCount + wrongCount;

  let brierSum = 0;
  for (const p of predictions) {
    const pEntry = parseFloat(p.p_entry);
    let pFinal;
    if (p.resolved) {
      pFinal = p.was_correct ? 1.0 : 0.0;
    } else if (p.position_status === 'exited') {
      pFinal = p.p_exit !== null ? parseFloat(p.p_exit) : pEntry;
    } else {
      pFinal = outcomeMap[p.outcome_id] !== undefined ? outcomeMap[p.outcome_id] : pEntry;
    }
    brierSum += Math.pow(pFinal - pEntry, 2);
  }

  const brierScore = predictions.length > 0 ? brierSum / predictions.length : 0.5;
  const calibrationScore = resolved.length >= 3 ? brierScore : 0.5;
  const calMult = 1 - calibrationScore;

  let totalPoints = 0;
  let totalConvictionMargin = 0;

  for (const p of predictions) {
    const pEntry = parseFloat(p.p_entry);
    const stake = parseFloat(p.stake_amount);
    const difficulty = pEntry > 0 ? 1 / pEntry : 100;
    let forecastPts = 0;
    let posValue = 0;

    if (p.resolved) {
      if (p.was_correct) {
        posValue = p.actual_return !== null ? parseFloat(p.actual_return) : stake * (2 - pEntry);
        forecastPts = difficulty * (1 / pEntry) * calMult + (posValue - stake);
      } else {
        posValue = 0;
        forecastPts = 0 - stake;
      }
    } else if (p.position_status === 'exited') {
      posValue = p.actual_return !== null ? parseFloat(p.actual_return) : parseFloat(p.final_points || stake);
      const pExit = p.p_exit !== null ? parseFloat(p.p_exit) : pEntry;
      forecastPts = difficulty * (pExit / pEntry) * calMult + (posValue - stake);
    } else {
      const pCurrent = outcomeMap[p.outcome_id] !== undefined ? outcomeMap[p.outcome_id] : pEntry;
      posValue = calculatePositionValue(stake, pEntry * 100, pCurrent * 100);
      forecastPts = difficulty * (pCurrent / pEntry) * calMult + (posValue - stake);
    }

    totalConvictionMargin += (posValue - stake);
    totalPoints += forecastPts;

    await p.update({ final_points: forecastPts }, transaction ? { transaction } : {});
  }

  totalPoints = Number(totalPoints.toFixed(2));
  totalConvictionMargin = Number(totalConvictionMargin.toFixed(2));
  
  const accuracyPct = settledCount > 0 ? roundPoints((correctCount / settledCount) * 100) : 0;
  const calledItCount = predictions.filter(p => p.is_called_it).length;

  const score = await ensureLeagueScore(leagueId, userId, transaction);
  const prevRank = score.league_rank || null;
  const totalPredictionsCount = predictions.length;
  const avgEntryPrice = predictions.length > 0 ? predictions.reduce((sum, p) => sum + parseFloat(p.p_entry || 0), 0) / predictions.length : 0;

  await score.update({
    total_points: totalPoints,
    conviction_margin: totalConvictionMargin,
    accuracy_pct: accuracyPct,
    calibration_score: Number(brierScore.toFixed(4)),
    called_it_count: calledItCount,
    correct_count: correctCount,
    wrong_count: wrongCount,
    total_predictions_count: totalPredictionsCount,
    avg_entry_price: avgEntryPrice,
    previous_rank: prevRank,
    updated_at: new Date()
  }, transaction ? { transaction } : {});

  await updateLeagueRanks(leagueId, transaction);
  return score.reload(transaction ? { transaction } : {});
}

async function getTimingWindowForSubmission(leagueId, submittedAt = new Date(), transaction = null) {
  const at = new Date(submittedAt);
  const window = await LeagueTimingWindow.findOne({
    where: {
      league_id: leagueId,
      window_start: { [Op.lte]: at },
      window_end: { [Op.gte]: at }
    },
    order: [['multiplier', 'DESC']],
    ...(transaction ? { transaction } : {})
  });
  return window;
}

function buildDefaultTimingWindows(league, overrides = {}) {
  const start = new Date(league.season_start);
  const lock = new Date(league.season_end);
  const duration = Math.max(lock.getTime() - start.getTime(), 60 * 60 * 1000);
  const firstEnd = new Date(start.getTime() + duration * 0.30);
  const secondEnd = new Date(start.getTime() + duration * 0.80);
  return [
    {
      label: 'Early Bird',
      tier: 'S',
      window_start: start,
      window_end: firstEnd,
      multiplier: parseNumber(overrides.early, 2.0)
    },
    {
      label: 'Standard',
      tier: 'B',
      window_start: firstEnd,
      window_end: secondEnd,
      multiplier: parseNumber(overrides.standard, 1.0)
    },
    {
      label: 'Late',
      tier: 'C',
      window_start: secondEnd,
      window_end: lock,
      multiplier: parseNumber(overrides.late, 0.5)
    }
  ];
}

async function createTimingWindows(league, timingWindows = null, transaction = null) {
  const windows = Array.isArray(timingWindows) && timingWindows.length > 0
    ? timingWindows
    : buildDefaultTimingWindows(league, timingWindows || {});

  return LeagueTimingWindow.bulkCreate(windows.map(window => ({
    id: nanoid(12),
    league_id: league.id,
    label: window.label,
    tier: window.tier || 'B',
    window_start: window.window_start || window.windowStart,
    window_end: window.window_end || window.windowEnd,
    multiplier: parseNumber(window.multiplier, 1)
  })), transaction ? { transaction, returning: true } : { returning: true });
}

async function exitPosition(predictionId, soldPct, pCurrent, options = {}) {
  const transaction = options.transaction || null;
  const prediction = await LeaguePrediction.findByPk(predictionId, transaction ? { transaction } : {});
  if (!prediction) throw Object.assign(new Error('League prediction not found'), { status: 404 });
  if (prediction.resolved) throw Object.assign(new Error('Cannot exit a resolved league prediction'), { status: 400 });

  const league = await ForecastLeague.findByPk(prediction.league_id, transaction ? { transaction } : {});
  const existingExits = await PositionExit.findAll({
    where: { prediction_id: prediction.id },
    ...(transaction ? { transaction } : {})
  });

  const originalStake = parseNumber(prediction.stake_amount);
  const alreadySold = existingExits.reduce((sum, exit) => sum + parseNumber(exit.stake_amount_sold), 0);
  const remainingStake = Math.max(0, originalStake - alreadySold);
  if (remainingStake <= 0.01) throw Object.assign(new Error('Position is already fully exited'), { status: 400 });

  const ratio = parseNumber(soldPct) > 1 ? parseNumber(soldPct) / 100 : parseNumber(soldPct);
  const sellRatio = Math.min(1, Math.max(0, ratio));
  if (sellRatio <= 0) throw Object.assign(new Error('soldPct must be greater than zero'), { status: 400 });

  const stakeAmountSold = roundPoints(remainingStake * sellRatio);
  const nextRemaining = Math.max(0, remainingStake - stakeAmountSold);
  const submittedAt = new Date(prediction.submitted_at);
  const endAt = league ? new Date(league.season_end) : new Date();
  const exitedAt = new Date();
  const totalDuration = Math.max(1, endAt.getTime() - submittedAt.getTime());
  const heldDurationPct = Math.min(1, Math.max(0.01, (exitedAt.getTime() - submittedAt.getTime()) / totalDuration));
  const pEntry = normalizeProbability(prediction.p_entry);
  const pExit = normalizeProbability(pCurrent);
  const allocationPctSold = originalStake > 0
    ? parseNumber(prediction.allocation_pct) * (stakeAmountSold / originalStake)
    : 0;
  const maxStake = await getPlatformNumber('league_max_stake', DEFAULT_MAX_STAKE, transaction);
  const exitQuality = calculateExitQuality(pEntry, pExit);
  const exitPoints = calculateExitPoints({
    pEntry,
    pExit,
    stakeAmountSold,
    allocationPctSold,
    heldDurationPct,
    timingMultiplier: parseNumber(prediction.timing_multiplier, 1),
    maxStake
  });
  const exitType = nextRemaining <= 0.01 ? 'full' : 'partial';

  const exit = await PositionExit.create({
    id: nanoid(12),
    league_id: prediction.league_id,
    user_id: prediction.user_id,
    prediction_id: prediction.id,
    market_id: prediction.market_id,
    p_entry: pEntry,
    p_exit: pExit,
    stake_amount_sold: stakeAmountSold,
    allocation_pct_sold: allocationPctSold,
    held_duration_pct: heldDurationPct,
    exit_quality: exitQuality,
    hold_factor: heldDurationPct,
    exit_points: exitPoints,
    exit_type: exitType,
    exited_at: exitedAt
  }, transaction ? { transaction } : {});

  const newExitPoints = roundPoints(parseNumber(prediction.exit_points) + exitPoints);
  await prediction.update({
    exit_points: newExitPoints,
    final_points: roundPoints(newExitPoints + parseNumber(prediction.resolution_points)),
    position_status: exitType === 'full' ? 'exited' : 'partial_exit',
    hold_factor: heldDurationPct,
    exit_quality: exitQuality
  }, transaction ? { transaction } : {});

  await updateLeagueScores(prediction.league_id, prediction.user_id, transaction);
  return { exit, prediction: await prediction.reload(transaction ? { transaction } : {}) };
}

async function resolveLeagueMarket(marketId, outcome, options = {}) {
  const transaction = options.transaction || null;
  const winningOutcomeIds = Array.isArray(outcome)
    ? outcome.filter(Boolean)
    : outcome ? [outcome] : [];

  if (winningOutcomeIds.length === 0) {
    const market = await Market.findByPk(marketId, transaction ? { transaction } : {});
    if (market?.winning_outcome_id) {
      try {
        const parsed = JSON.parse(market.winning_outcome_id);
        winningOutcomeIds.push(...(Array.isArray(parsed) ? parsed : [market.winning_outcome_id]));
      } catch {
        winningOutcomeIds.push(market.winning_outcome_id);
      }
    }
  }

  if (winningOutcomeIds.length === 0) {
    throw Object.assign(new Error('Resolution outcome is required'), { status: 400 });
  }

  const winningSet = new Set(winningOutcomeIds);
  const predictions = await LeaguePrediction.findAll({
    where: { market_id: marketId, resolved: false },
    include: [{ model: LeagueTimingWindow, as: 'timing_window' }],
    ...(transaction ? { transaction } : {})
  });
  const maxStake = await getPlatformNumber('league_max_stake', DEFAULT_MAX_STAKE, transaction);
  const calledItThreshold = await getPlatformNumber('called_it_probability_threshold', 0.25, transaction);
  const calledItMinPoints = await getPlatformNumber('called_it_min_points', 250, transaction);
  const touchedUsers = new Map();

  for (const prediction of predictions) {
    const exits = await PositionExit.findAll({
      where: { prediction_id: prediction.id },
      ...(transaction ? { transaction } : {})
    });
    const originalStake = parseNumber(prediction.stake_amount);
    const soldStake = exits.reduce((sum, exit) => sum + parseNumber(exit.stake_amount_sold), 0);
    const remainingStake = Math.max(0, originalStake - soldStake);
    const remainingAllocation = originalStake > 0
      ? parseNumber(prediction.allocation_pct) * (remainingStake / originalStake)
      : 0;
    const correct = winningSet.has(prediction.outcome_id);
    const resolutionPoints = remainingStake > 0.01
      ? calculatePoints({
        correct,
        pEntry: prediction.p_entry,
        stakeAmount: remainingStake,
        allocationPct: remainingAllocation,
        timingMultiplier: prediction.timing_multiplier,
        holdFactor: 1,
        exitQuality: 1,
        maxStake
      })
      : 0;
    const exitPoints = parseNumber(prediction.exit_points);
    const finalPoints = roundPoints(exitPoints + resolutionPoints);
    const timingTier = prediction.timing_window?.tier || timingTierFromMultiplier(parseNumber(prediction.timing_multiplier, 1));
    const isCalledIt = correct && normalizeProbability(prediction.p_entry) <= calledItThreshold && finalPoints >= calledItMinPoints;

    await prediction.update({
      was_correct: correct,
      is_called_it: isCalledIt,
      base_points: resolutionPoints,
      resolution_points: resolutionPoints,
      final_points: finalPoints,
      resolved: true,
      position_status: 'resolved'
    }, transaction ? { transaction } : {});

    if (isCalledIt) {
      const market = await Market.findByPk(prediction.market_id, transaction ? { transaction } : {});
      await CalledItEntry.findOrCreate({
        where: {
          user_id: prediction.user_id,
          league_id: prediction.league_id,
          market_id: prediction.market_id
        },
        defaults: {
          id: nanoid(12),
          user_id: prediction.user_id,
          league_id: prediction.league_id,
          market_id: prediction.market_id,
          p_entry: prediction.p_entry,
          timing_tier: timingTier,
          points_earned: finalPoints,
          description: `${prediction.predicted_outcome} on ${market?.title || prediction.market_id}`
        },
        ...(transaction ? { transaction } : {})
      });
    }

    touchedUsers.set(`${prediction.league_id}:${prediction.user_id}`, {
      leagueId: prediction.league_id,
      userId: prediction.user_id
    });
  }

  for (const { leagueId, userId } of touchedUsers.values()) {
    await updateLeagueScores(leagueId, userId, transaction);
  }

  return { resolved_predictions: predictions.length, winning_outcome_ids: winningOutcomeIds };
}

async function closeLeague(leagueId, options = {}) {
  const transaction = options.transaction || null;
  const league = await ForecastLeague.findByPk(leagueId, transaction ? { transaction } : {});
  if (!league) throw Object.assign(new Error('League not found'), { status: 404 });

  const members = await LeagueMember.findAll({
    where: { league_id: leagueId },
    ...(transaction ? { transaction } : {})
  });
  for (const member of members) {
    await updateLeagueScores(leagueId, member.user_id, transaction);
  }

  const scores = await LeagueScore.findAll({
    where: { league_id: leagueId },
    order: [['league_rank', 'ASC'], ['total_points', 'DESC']],
    ...(transaction ? { transaction } : {})
  });
  for (const score of scores) {
    await LeagueMember.update({
      final_rank: score.league_rank,
      final_score: score.total_points
    }, {
      where: { league_id: leagueId, user_id: score.user_id },
      ...(transaction ? { transaction } : {})
    });
  }
  await league.update({ status: 'completed' }, transaction ? { transaction } : {});
  return { league, champion: scores[0] || null };
}

async function getLeaderboard(leagueId) {
  try {
    const rows = await sequelize.query(
      'SELECT * FROM league_leaderboard WHERE league_id = :leagueId ORDER BY league_rank ASC',
      { replacements: { leagueId }, type: QueryTypes.SELECT }
    );
    if (rows.length > 0) return rows;
  } catch {
    // The view is created during app boot. Fall through to table-backed results
    // for first-run environments where sync has not completed yet.
  }

  const scores = await LeagueScore.findAll({
    where: { league_id: leagueId },
    include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
    order: [['league_rank', 'ASC'], ['total_points', 'DESC']]
  });
  return Promise.all(scores.map(async score => {
    const predictionCount = await LeaguePrediction.count({ where: { league_id: leagueId, user_id: score.user_id } });
    const json = score.toJSON();
    return {
      ...json,
      username: json.user?.username || json.user_id.slice(0, 8),
      prediction_count: predictionCount,
      movement: '-'
    };
  }));
}

async function getUserLeagueProfile(userId) {
  const [scores, calledItEntries, memberships] = await Promise.all([
    LeagueScore.findAll({
      where: { user_id: userId },
      include: [{ model: ForecastLeague, as: 'league' }],
      order: [['updated_at', 'DESC']]
    }),
    CalledItEntry.findAll({
      where: { user_id: userId },
      include: [{ model: ForecastLeague, as: 'league' }, { model: Market, as: 'market' }],
      order: [['created_at', 'DESC']]
    }),
    LeagueMember.findAll({
      where: { user_id: userId },
      include: [{ model: ForecastLeague, as: 'league' }]
    })
  ]);

  const totalCorrect = scores.reduce((sum, s) => sum + parseNumber(s.correct_count), 0);
  const totalWrong = scores.reduce((sum, s) => sum + parseNumber(s.wrong_count), 0);
  const totalSettled = totalCorrect + totalWrong;
  const rating = roundPoints(scores.reduce((sum, s) => sum + parseNumber(s.total_points), 0));
  const bestScore = scores[0] || null;
  const archetype = bestScore?.archetype || 'Consensus';

  return {
    user_id: userId,
    rating,
    record: `${totalCorrect}-${totalWrong}`,
    accuracy_pct: totalSettled > 0 ? roundPoints((totalCorrect / totalSettled) * 100) : 0,
    called_it_count: calledItEntries.length,
    archetype,
    calibration_tier: bestScore?.calibration_tier || 'Unrated',
    timing_tier: bestScore?.timing_tier || 'B',
    conviction_tier: bestScore?.conviction_tier || 'Medium',
    highlight_reel: calledItEntries.slice(0, 6).map(entry => ({
      id: entry.id,
      league_id: entry.league_id,
      league_name: entry.league?.name,
      market_id: entry.market_id,
      market_title: entry.market?.title,
      p_entry: parseNumber(entry.p_entry),
      timing_tier: entry.timing_tier,
      points_earned: parseNumber(entry.points_earned),
      description: entry.description,
      created_at: entry.created_at
    })),
    league_history: memberships.map(member => {
      const score = scores.find(s => s.league_id === member.league_id);
      return {
        league_id: member.league_id,
        league_name: member.league?.name,
        status: member.league?.status,
        final_rank: member.final_rank || score?.league_rank || null,
        final_score: parseNumber(member.final_score || score?.total_points),
        archetype: score?.archetype || 'Consensus'
      };
    })
  };
}

async function getUserLeagueDigest(userId) {
  const score = await LeagueScore.findOne({
    where: { user_id: userId },
    include: [{ model: ForecastLeague, as: 'league', where: { status: { [Op.in]: ['active', 'locked'] } } }],
    order: [['updated_at', 'DESC']]
  });
  const lastResolution = await LeaguePrediction.findOne({
    where: { user_id: userId, resolved: true },
    include: [{ model: ForecastLeague, as: 'league' }, { model: Market, as: 'market' }],
    order: [['submitted_at', 'DESC']]
  });

  let standing = null;
  if (score) {
    const openMarkets = await LeaguePrediction.count({
      where: {
        league_id: score.league_id,
        resolved: false
      }
    });
    standing = {
      league_name: score.league?.name,
      league_id: score.league_id,
      rank: score.league_rank,
      points: parseNumber(score.total_points),
      rank_change: 0,
      open_markets: openMarkets
    };
  }

  return {
    standing,
    last_resolution: lastResolution ? {
      league_name: lastResolution.league?.name,
      market_title: lastResolution.market?.title,
      market_id: lastResolution.market_id,
      outcome: lastResolution.predicted_outcome,
      probability: parseNumber(lastResolution.p_entry),
      timing_tier: lastResolution.timing_window?.tier || timingTierFromMultiplier(parseNumber(lastResolution.timing_multiplier, 1)),
      called_it: Boolean(lastResolution.is_called_it),
      points: parseNumber(lastResolution.final_points),
      new_rank: standing?.rank || null
    } : null
  };
}

module.exports = {
  buildDefaultTimingWindows,
  calculateArchetype,
  closeLeague,
  createTimingWindows,
  ensureForecastLeagueInfrastructure,
  ensureLeagueScore,
  exitPosition,
  getLeaderboard,
  getPlatformNumber,
  getTimingWindowForSubmission,
  getUserLeagueDigest,
  getUserLeagueProfile,
  isUsableUsername,
  nanoid,
  normalizeUsername,
  resolveLeagueMarket,
  seedPlatformConfigs,
  updateLeagueScores
};
