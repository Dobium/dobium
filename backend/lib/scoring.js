const DEFAULT_MAX_STAKE = 1000;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeProbability(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0.01;
  return clamp(n > 1 ? n / 100 : n, 0.01, 0.99);
}

function roundPoints(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function calculateStakeWeight(stakeAmount, maxStake = DEFAULT_MAX_STAKE) {
  const stake = Math.max(0, Number(stakeAmount) || 0);
  const max = Math.max(1, Number(maxStake) || DEFAULT_MAX_STAKE);
  return clamp(Math.log(stake + 1) / Math.log(max + 1), 0, 1.5);
}

function calculateConvictionMultiplier(stakeAmount, allocationPct, maxStake = DEFAULT_MAX_STAKE) {
  const stakeWeight = calculateStakeWeight(stakeAmount, maxStake);
  const commitment = Math.min(Math.max(Number(allocationPct) || 0, 0) / 100, 0.30);
  return 1 + (stakeWeight * commitment);
}

function calculateDifficultyMultiplier(pEntry) {
  return 1 / normalizeProbability(pEntry);
}

function calculateExitQuality(pEntry, pExit) {
  const entry = normalizeProbability(pEntry);
  const exit = normalizeProbability(pExit);
  return clamp(exit / entry, 0.10, 3.00);
}

function calculatePoints({
  correct,
  pEntry,
  stakeAmount,
  allocationPct,
  timingMultiplier = 1,
  holdFactor = 1,
  exitQuality = 1,
  maxStake = DEFAULT_MAX_STAKE
}) {
  const base = !correct && Number(holdFactor) === 1 ? 0 : 100;
  const difficulty = calculateDifficultyMultiplier(pEntry);
  const conviction = calculateConvictionMultiplier(stakeAmount, allocationPct, maxStake);
  const timing = Math.max(0, Number(timingMultiplier) || 1);
  const hold = clamp(Number(holdFactor) || 0, 0, 1);
  const quality = Math.max(0, Number(exitQuality) || 0);

  return roundPoints(base * difficulty * conviction * timing * hold * quality);
}

function calculateExitPoints({
  pEntry,
  pExit,
  stakeAmountSold,
  allocationPctSold,
  heldDurationPct = 1,
  timingMultiplier = 1,
  maxStake = DEFAULT_MAX_STAKE
}) {
  const holdFactor = clamp(Number(heldDurationPct) || 0, 0, 1);
  const exitQuality = calculateExitQuality(pEntry, pExit);
  return calculatePoints({
    correct: true,
    pEntry,
    stakeAmount: stakeAmountSold,
    allocationPct: allocationPctSold,
    timingMultiplier,
    holdFactor,
    exitQuality,
    maxStake
  });
}

module.exports = {
  DEFAULT_MAX_STAKE,
  calculateConvictionMultiplier,
  calculateDifficultyMultiplier,
  calculateExitQuality,
  calculateExitPoints,
  calculatePoints,
  calculateStakeWeight,
  normalizeProbability,
  roundPoints
};
