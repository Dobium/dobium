const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateExitPoints, calculatePoints } = require('../backend/lib/scoring');

test('Spain World Cup early underdog scores about 2345 points', () => {
  const points = calculatePoints({
    correct: true,
    pEntry: 0.11,
    stakeAmount: 800,
    allocationPct: 30,
    timingMultiplier: 2.0,
    maxStake: 1000
  });

  assert.equal(points, 2346.04);
});

test('Argentina half exit from 18% to 45% scores about 1531 exit points', () => {
  const points = calculateExitPoints({
    pEntry: 0.18,
    pExit: 0.45,
    stakeAmountSold: 362,
    allocationPctSold: 12,
    heldDurationPct: 1,
    timingMultiplier: 1,
    maxStake: 1000
  });

  assert.equal(points, 1531.09);
});

test('France panic exit from 45% to 20% with short hold scores about 31 points', () => {
  const points = calculateExitPoints({
    pEntry: 0.45,
    pExit: 0.20,
    stakeAmountSold: 100,
    allocationPctSold: 10,
    heldDurationPct: 0.30,
    timingMultiplier: 1,
    maxStake: 1000
  });

  assert.equal(points, 31.61);
});
