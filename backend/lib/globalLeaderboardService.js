const { Op } = require('sequelize');
const {
  sequelize,
  GlobalScore,
  Prediction,
  Outcome,
  User
} = require('./database/models');
const { nanoid } = require('./leagueService'); // Reuse nanoid if possible, or just generate it. We can just use crypto directly.
const crypto = require('crypto');

function generateId(size = 12) {
  return crypto.randomBytes(Math.ceil(size / 2)).toString('hex').slice(0, size);
}

function parseNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function roundPoints(value) {
  return Number(Math.round(value * 100) / 100);
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

async function ensureGlobalScore(userId, transaction = null) {
  const [score] = await GlobalScore.findOrCreate({
    where: { user_id: userId },
    defaults: {
      id: generateId(12),
      user_id: userId
    },
    ...(transaction ? { transaction } : {})
  });
  return score;
}

async function updateGlobalRanks(transaction = null) {
  const scores = await GlobalScore.findAll({
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
    
    await score.update({ global_rank: rank, updated_at: new Date() }, transaction ? { transaction } : {});
  }
}

async function updateGlobalScore(userId, transaction = null) {
  const predictions = await Prediction.findAll({
    where: { user_id: userId },
    ...(transaction ? { transaction } : {})
  });

  const openOutcomeIds = [...new Set(predictions.filter(p => p.status === 'active').map(p => p.outcome_id))];
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

  const resolved = predictions.filter(p => ['won', 'lost', 'sold'].includes(p.status));
  const correctCount = resolved.filter(p => p.status === 'won').length;
  const wrongCount = resolved.filter(p => p.status === 'lost').length;
  const settledCount = correctCount + wrongCount;

  let brierSum = 0;
  for (const p of predictions) {
    if (p.status === 'refunded') continue;
    
    const pEntry = parseFloat(p.odds_at_prediction) / 100; // Note: odds_at_prediction is 0-100
    let pFinal;
    if (p.status === 'won') {
      pFinal = 1.0;
    } else if (p.status === 'lost') {
      pFinal = 0.0;
    } else if (p.status === 'sold') {
      // We don't have p_exit in standard Prediction, so we use actual_return to back-calculate, or just use entry
      const stake = parseFloat(p.stake_amount);
      const actualRet = parseFloat(p.actual_return || 0);
      const pExitRaw = stake > 0 ? (actualRet * pEntry) / stake : pEntry;
      pFinal = Math.min(1.0, Math.max(0, pExitRaw));
    } else {
      pFinal = outcomeMap[p.outcome_id] !== undefined ? outcomeMap[p.outcome_id] : pEntry;
    }
    brierSum += Math.pow(pFinal - pEntry, 2);
  }

  const validPredictionsCount = predictions.filter(p => p.status !== 'refunded').length;
  const brierScore = validPredictionsCount > 0 ? brierSum / validPredictionsCount : 0.5;
  const calibrationScore = resolved.length >= 3 ? brierScore : 0.5;
  const calMult = 1 - calibrationScore;

  let totalPoints = 0;
  let totalConvictionMargin = 0;

  for (const p of predictions) {
    if (p.status === 'refunded') continue;

    const pEntry = parseFloat(p.odds_at_prediction) / 100;
    const stake = parseFloat(p.stake_amount);
    const difficulty = pEntry > 0 ? 1 / pEntry : 100;
    let forecastPts = 0;
    let posValue = 0;

    if (['won', 'lost'].includes(p.status)) {
      if (p.status === 'won') {
        posValue = p.actual_return !== null ? parseFloat(p.actual_return) : stake * (2 - pEntry);
        forecastPts = difficulty * (1 / pEntry) * calMult + (posValue - stake);
      } else {
        posValue = 0;
        forecastPts = 0 - stake;
      }
    } else if (p.status === 'sold') {
      posValue = p.actual_return !== null ? parseFloat(p.actual_return) : stake;
      const pExitRaw = stake > 0 ? (posValue * pEntry) / stake : pEntry;
      const pExit = Math.min(1.0, Math.max(0, pExitRaw));
      forecastPts = difficulty * (pExit / pEntry) * calMult + (posValue - stake);
    } else {
      const pCurrent = outcomeMap[p.outcome_id] !== undefined ? outcomeMap[p.outcome_id] : pEntry;
      posValue = calculatePositionValue(stake, pEntry * 100, pCurrent * 100);
      forecastPts = difficulty * (pCurrent / pEntry) * calMult + (posValue - stake);
    }

    totalConvictionMargin += (posValue - stake);
    totalPoints += forecastPts;
  }

  totalPoints = Number(totalPoints.toFixed(2));
  totalConvictionMargin = Number(totalConvictionMargin.toFixed(2));
  
  const accuracyPct = settledCount > 0 ? roundPoints((correctCount / settledCount) * 100) : 0;

  const score = await ensureGlobalScore(userId, transaction);
  const prevRank = score.global_rank || null;
  const avgEntryPrice = validPredictionsCount > 0 
    ? predictions.filter(p => p.status !== 'refunded').reduce((sum, p) => sum + parseFloat(p.odds_at_prediction || 0)/100, 0) / validPredictionsCount 
    : 0;

  await score.update({
    total_points: totalPoints,
    conviction_margin: totalConvictionMargin,
    accuracy_pct: accuracyPct,
    calibration_score: Number(brierScore.toFixed(4)),
    correct_count: correctCount,
    wrong_count: wrongCount,
    total_predictions_count: validPredictionsCount,
    avg_entry_price: avgEntryPrice,
    previous_rank: prevRank,
    updated_at: new Date()
  }, transaction ? { transaction } : {});

  await updateGlobalRanks(transaction);
  return score.reload(transaction ? { transaction } : {});
}

module.exports = {
  updateGlobalScore,
  updateGlobalRanks
};
