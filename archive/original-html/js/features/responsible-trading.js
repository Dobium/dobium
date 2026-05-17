// ========================================
// DOBIUM - RESPONSIBLE TRADING MODULE
// Implements ethical forecasting practices
// Risk management and user protection
// ========================================

// ============================================================================
// RISK CONTROLS CONFIGURATION
// ============================================================================

const RISK_CONTROLS = {
  // LIMITS FEATURE - Commented out but preserved for future use
  // Position size limits (as percentage of balance)
  // maxPositionSizePercent: 10, // Max 10% of balance per position
  // warningPositionSizePercent: 5, // Warn at 5%

  // Daily allocation limits
  // maxDailyAllocationPercent: 25, // Max 25% of balance per day

  // Cooldown after losses (in milliseconds)
  lossCooldownDuration: 30000, // 30 seconds reflection time after loss
  rapidTradeWindow: 60000, // 1 minute window for rapid trade detection
  maxTradesInWindow: 3, // Max 3 trades per minute

  // Self-control defaults
  defaultDailyLimit: null, // User can set
  defaultWeeklyLimit: null,
  observeOnlyMode: false,
  tradingPaused: false
};

// ============================================================================
// USER RISK STATE
// ============================================================================

// Load user's risk control preferences from storage
function loadRiskControlState() {
  const stored = Storage.load('riskControls', {});
  return {
    dailyLimit: stored.dailyLimit || null,
    weeklyLimit: stored.weeklyLimit || null,
    dailySpent: stored.dailySpent || 0,
    weeklySpent: stored.weeklySpent || 0,
    lastDailyReset: stored.lastDailyReset || new Date().toDateString(),
    lastWeeklyReset: stored.lastWeeklyReset || getWeekStart(),
    observeOnlyMode: stored.observeOnlyMode || false,
    tradingPaused: stored.tradingPaused || false,
    recentTrades: stored.recentTrades || [],
    lastLossTime: stored.lastLossTime || null,
    totalAccuracyScore: stored.totalAccuracyScore || 0,
    totalPredictions: stored.totalPredictions || 0,
    calibrationData: stored.calibrationData || {}
  };
}

function saveRiskControlState(state) {
  Storage.save('riskControls', state);
}

function getWeekStart() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toDateString();
}

// Reset daily/weekly limits if needed
function checkAndResetLimits() {
  const state = loadRiskControlState();
  const today = new Date().toDateString();
  const weekStart = getWeekStart();

  let updated = false;

  if (state.lastDailyReset !== today) {
    state.dailySpent = 0;
    state.lastDailyReset = today;
    updated = true;
  }

  if (state.lastWeeklyReset !== weekStart) {
    state.weeklySpent = 0;
    state.lastWeeklyReset = weekStart;
    updated = true;
  }

  if (updated) {
    saveRiskControlState(state);
  }

  return state;
}

// ============================================================================
// TRADING FRICTION & VALIDATION
// ============================================================================

/**
 * Calculate capital at risk as percentage of balance
 */
function calculateCapitalAtRisk(amount) {
  const balance = typeof getBalance === 'function' ? getBalance() : 0;
  if (balance <= 0) return 100;
  return (amount / balance) * 100;
}

/**
 * Check if trade is within risk limits
 * Returns { allowed: boolean, warnings: string[], blocked: string[] }
 */
function validateTradeRisk(amount) {
  const state = checkAndResetLimits();
  const balance = typeof getBalance === 'function' ? getBalance() : 0;
  const capitalAtRisk = calculateCapitalAtRisk(amount);

  const warnings = [];
  const blocked = [];

  // Check if trading is paused
  if (state.tradingPaused) {
    blocked.push('Trading is currently paused. Go to Settings > Risk Controls to resume.');
  }

  // Check observe-only mode
  if (state.observeOnlyMode) {
    blocked.push('Observe-only mode is active. Disable it in Settings > Risk Controls to trade.');
  }

  // Check loss cooldown
  if (state.lastLossTime) {
    const timeSinceLoss = Date.now() - new Date(state.lastLossTime).getTime();
    if (timeSinceLoss < RISK_CONTROLS.lossCooldownDuration) {
      const remainingSeconds = Math.ceil((RISK_CONTROLS.lossCooldownDuration - timeSinceLoss) / 1000);
      warnings.push(`Reflection period: ${remainingSeconds}s remaining since your last resolved position.`);
    }
  }

  // LIMITS FEATURE - Commented out but preserved for future use
  // Check position size limits
  // if (capitalAtRisk > RISK_CONTROLS.maxPositionSizePercent) {
  //   blocked.push(`Position size exceeds ${RISK_CONTROLS.maxPositionSizePercent}% of your capital. Consider a smaller position.`);
  // } else if (capitalAtRisk > RISK_CONTROLS.warningPositionSizePercent) {
  //   warnings.push(`This position represents ${capitalAtRisk.toFixed(1)}% of your capital.`);
  // }

  // LIMITS FEATURE - Commented out but preserved for future use
  // Check daily limits
  // if (state.dailyLimit && (state.dailySpent + amount) > state.dailyLimit) {
  //   const remaining = Math.max(0, state.dailyLimit - state.dailySpent);
  //   blocked.push(`Daily allocation limit reached. Remaining: $${remaining.toFixed(2)}`);
  // }

  // Check weekly limits
  // if (state.weeklyLimit && (state.weeklySpent + amount) > state.weeklyLimit) {
  //   const remaining = Math.max(0, state.weeklyLimit - state.weeklySpent);
  //   blocked.push(`Weekly allocation limit reached. Remaining: $${remaining.toFixed(2)}`);
  // }

  // Check rapid trading
  const now = Date.now();
  const recentTrades = state.recentTrades.filter(t => now - t < RISK_CONTROLS.rapidTradeWindow);
  if (recentTrades.length >= RISK_CONTROLS.maxTradesInWindow) {
    warnings.push('Multiple trades detected in quick succession. Take a moment to review your strategy.');
  }

  return {
    allowed: blocked.length === 0,
    warnings,
    blocked,
    capitalAtRisk,
    dailyRemaining: state.dailyLimit ? Math.max(0, state.dailyLimit - state.dailySpent) : null,
    weeklyRemaining: state.weeklyLimit ? Math.max(0, state.weeklyLimit - state.weeklySpent) : null
  };
}

/**
 * Record a trade for limit tracking
 */
function recordTrade(amount) {
  const state = checkAndResetLimits();
  state.dailySpent += amount;
  state.weeklySpent += amount;
  state.recentTrades.push(Date.now());

  // Keep only recent trades within the window
  const now = Date.now();
  state.recentTrades = state.recentTrades.filter(t => now - t < RISK_CONTROLS.rapidTradeWindow * 2);

  saveRiskControlState(state);
}

/**
 * Record a loss outcome for cooldown
 */
function recordLoss() {
  const state = loadRiskControlState();
  state.lastLossTime = new Date().toISOString();
  saveRiskControlState(state);
}

// ============================================================================
// ACCURACY & CALIBRATION TRACKING
// ============================================================================

/**
 * Update user's forecasting accuracy
 * @param {number} predictedProbability - The probability they bought at (0-100)
 * @param {boolean} wasCorrect - Whether the outcome they predicted occurred
 */
function updateAccuracyScore(predictedProbability, wasCorrect) {
  const state = loadRiskControlState();

  // Brier score component (lower is better, we track average)
  const probabilityDecimal = predictedProbability / 100;
  const outcome = wasCorrect ? 1 : 0;
  const brierScore = Math.pow(probabilityDecimal - outcome, 2);

  // Update totals
  state.totalPredictions += 1;
  state.totalAccuracyScore += (1 - brierScore); // Convert to 0-1 where 1 is perfect

  // Update calibration buckets (group predictions by probability range)
  const bucket = Math.floor(predictedProbability / 10) * 10; // 0, 10, 20, ..., 90
  if (!state.calibrationData[bucket]) {
    state.calibrationData[bucket] = { total: 0, correct: 0 };
  }
  state.calibrationData[bucket].total += 1;
  if (wasCorrect) {
    state.calibrationData[bucket].correct += 1;
  }

  saveRiskControlState(state);
}

/**
 * Get user's forecasting statistics
 */
function getForecasterStats() {
  const state = loadRiskControlState();

  const avgAccuracy = state.totalPredictions > 0
    ? (state.totalAccuracyScore / state.totalPredictions) * 100
    : 0;

  // Calculate calibration score
  let calibrationError = 0;
  let calibrationBuckets = 0;

  for (const [bucket, data] of Object.entries(state.calibrationData)) {
    if (data.total >= 5) { // Only count buckets with enough data
      const expectedRate = (parseInt(bucket) + 5) / 100; // Center of bucket
      const actualRate = data.correct / data.total;
      calibrationError += Math.abs(expectedRate - actualRate);
      calibrationBuckets += 1;
    }
  }

  const calibrationScore = calibrationBuckets > 0
    ? 100 - (calibrationError / calibrationBuckets * 100)
    : 0;

  return {
    totalPredictions: state.totalPredictions,
    accuracyScore: avgAccuracy.toFixed(1),
    calibrationScore: calibrationScore.toFixed(1),
    calibrationData: state.calibrationData
  };
}

// ============================================================================
// SELF-CONTROL SETTINGS
// ============================================================================

/**
 * Set daily allocation limit
 */
function setDailyLimit(amount) {
  const state = loadRiskControlState();
  state.dailyLimit = amount > 0 ? amount : null;
  saveRiskControlState(state);
}

/**
 * Set weekly allocation limit
 */
function setWeeklyLimit(amount) {
  const state = loadRiskControlState();
  state.weeklyLimit = amount > 0 ? amount : null;
  saveRiskControlState(state);
}

/**
 * Toggle observe-only mode
 */
function setObserveOnlyMode(enabled) {
  const state = loadRiskControlState();
  state.observeOnlyMode = enabled;
  saveRiskControlState(state);
}

/**
 * Pause trading
 */
function pauseTrading() {
  const state = loadRiskControlState();
  state.tradingPaused = true;
  saveRiskControlState(state);
}

/**
 * Resume trading
 */
function resumeTrading() {
  const state = loadRiskControlState();
  state.tradingPaused = false;
  saveRiskControlState(state);
}

// ============================================================================
// EDUCATIONAL CONTENT
// ============================================================================

const EDUCATIONAL_NUDGES = {
  beforeTrade: [
    "Market probabilities reflect collective beliefs, not certainty.",
    "Even high-probability outcomes can resolve unexpectedly.",
    "Consider what information supports this probability.",
    "Forecasting accuracy improves with careful reasoning.",
    "Your position size should reflect your conviction level."
  ],
  afterLoss: [
    "The final outcome differed from the market consensus at entry.",
    "Unexpected outcomes provide valuable calibration data.",
    "Markets update as new information emerges.",
    "Review what information was missing from your analysis."
  ],
  afterWin: [
    "Your forecast aligned with the final outcome.",
    "Consider whether skill or variance drove this result.",
    "Track your accuracy over time for better calibration."
  ],
  general: [
    "Dobium helps you express beliefs about future events through trading.",
    "Focus on accuracy and calibration, not short-term results.",
    "The best forecasters acknowledge uncertainty.",
    "Take time to review your reasoning before each position."
  ]
};

function getRandomNudge(category) {
  const nudges = EDUCATIONAL_NUDGES[category] || EDUCATIONAL_NUDGES.general;
  return nudges[Math.floor(Math.random() * nudges.length)];
}

// ============================================================================
// PROBABILITY-FOCUSED LANGUAGE HELPERS
// ============================================================================

/**
 * Format outcome language (probability-first, not money-first)
 */
function formatProbabilityLanguage(probability) {
  return `This market currently implies a ${probability}% probability.`;
}

/**
 * Format loss in informational terms
 */
function formatLossInformational(marketTitle, entryProbability) {
  return `The final outcome differed from the ${entryProbability}% market consensus at your entry.`;
}

/**
 * Format position in responsible terms
 */
function formatPositionDescription(amount, probability, balance) {
  const capitalPercent = ((amount / balance) * 100).toFixed(1);
  return `This position represents ${capitalPercent}% of your available capital, expressing a belief that differs from the ${probability}% market probability.`;
}

// ============================================================================
// RENDER SELF-CONTROL SETTINGS UI
// ============================================================================

function renderSelfControlSettings() {
  const state = checkAndResetLimits();
  const stats = getForecasterStats();

  return `
    <!-- Risk Controls Section -->
    <div class="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
      <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span style="color: rgb(212, 175, 55);">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </span> Risk Controls
      </h2>
      <p class="text-slate-400 text-sm mb-6">Manage your forecasting activity with these self-control tools.</p>
      
      <div class="space-y-4">
        <!-- LIMITS FEATURE - Commented out but preserved for future use -->
        <!-- Daily Limit
        <div class="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
          <div class="flex-1">
            <span class="text-white font-medium">Daily Allocation Limit</span>
            <p class="text-slate-500 text-sm">Maximum amount you can allocate per day</p>
            ${state.dailyLimit ? `<p class="text-yellow-400 text-xs mt-1">Today: $${state.dailySpent.toFixed(2)} / $${state.dailyLimit.toFixed(2)}</p>` : ''}
          </div>
          <div class="flex items-center gap-2">
            <input type="number" id="dailyLimitInput" placeholder="No limit" 
              value="${state.dailyLimit || ''}"
              class="w-24 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500" />
            <button onclick="updateDailyLimit()" class="px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30 transition-colors">Set</button>
          </div>
        </div>
        -->
        
        <!-- Weekly Limit
        <div class="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
          <div class="flex-1">
            <span class="text-white font-medium">Weekly Allocation Limit</span>
            <p class="text-slate-500 text-sm">Maximum amount you can allocate per week</p>
            ${state.weeklyLimit ? `<p class="text-yellow-400 text-xs mt-1">This week: $${state.weeklySpent.toFixed(2)} / $${state.weeklyLimit.toFixed(2)}</p>` : ''}
          </div>
          <div class="flex items-center gap-2">
            <input type="number" id="weeklyLimitInput" placeholder="No limit" 
              value="${state.weeklyLimit || ''}"
              class="w-24 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500" />
            <button onclick="updateWeeklyLimit()" class="px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30 transition-colors">Set</button>
          </div>
        </div>
        -->
        
        <!-- Observe Only Mode -->
        <div class="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
          <div>
            <span class="text-white font-medium">Observe-Only Mode</span>
            <p class="text-slate-500 text-sm">View markets without the ability to trade</p>
          </div>
          <button onclick="toggleObserveMode()" 
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors ${state.observeOnlyMode ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}">
            ${state.observeOnlyMode ? 'Active' : 'Inactive'}
          </button>
        </div>
        
        <!-- Pause Trading -->
        <div class="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
          <div>
            <span class="text-white font-medium">Pause Trading</span>
            <p class="text-slate-500 text-sm">Temporarily disable all trading activity</p>
          </div>
          <button onclick="toggleTradingPause()" 
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors ${state.tradingPaused ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}">
            ${state.tradingPaused ? 'Trading Paused' : 'Trading Active'}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Forecaster Statistics -->
    <div class="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
      <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span style="color: rgb(212, 175, 55);">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </span> Your Forecasting Stats
      </h2>
      <p class="text-slate-400 text-sm mb-6">Track your forecasting accuracy and calibration over time.</p>
      
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-slate-800/50 rounded-xl p-4 text-center">
          <p class="text-3xl font-bold text-yellow-400">${stats.totalPredictions}</p>
          <p class="text-slate-400 text-sm">Predictions</p>
        </div>
        <div class="bg-slate-800/50 rounded-xl p-4 text-center">
          <p class="text-3xl font-bold text-green-400">${stats.accuracyScore}%</p>
          <p class="text-slate-400 text-sm">Accuracy</p>
        </div>
        <div class="bg-slate-800/50 rounded-xl p-4 text-center">
          <p class="text-3xl font-bold text-blue-400">${stats.calibrationScore}%</p>
          <p class="text-slate-400 text-sm">Calibration</p>
        </div>
      </div>
      
      <p class="text-slate-500 text-xs mt-4 text-center">
        Accuracy measures how often your predictions are correct. Calibration measures how well your confidence matches actual outcomes.
      </p>
    </div>
    
    <!-- Platform Disclaimer -->
    <div class="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>📋</span> About Dobium
      </h2>
      <p class="text-slate-300 leading-relaxed">
        Dobium is designed to help users express beliefs about future events through probability forecasting. 
        It is not intended for entertainment gambling. Our platform emphasizes accuracy, calibration, and 
        thoughtful analysis over speculation.
      </p>
      <p class="text-slate-500 text-sm mt-4">
        Market probabilities reflect collective beliefs, not certainty. Even high-probability outcomes can resolve unexpectedly.
      </p>
    </div>
  `;
}

// ============================================================================
// UI INTERACTION HANDLERS
// ============================================================================

function updateDailyLimit() {
  const input = document.getElementById('dailyLimitInput');
  const value = parseFloat(input.value) || 0;
  setDailyLimit(value);
  // Refresh settings view
  if (typeof navigateTo === 'function') {
    navigateTo('settings');
  }
}

function updateWeeklyLimit() {
  const input = document.getElementById('weeklyLimitInput');
  const value = parseFloat(input.value) || 0;
  setWeeklyLimit(value);
  if (typeof navigateTo === 'function') {
    navigateTo('settings');
  }
}

function toggleObserveMode() {
  const state = loadRiskControlState();
  setObserveOnlyMode(!state.observeOnlyMode);
  if (typeof navigateTo === 'function') {
    navigateTo('settings');
  }
}

function toggleTradingPause() {
  const state = loadRiskControlState();
  if (state.tradingPaused) {
    resumeTrading();
  } else {
    pauseTrading();
  }
  if (typeof navigateTo === 'function') {
    navigateTo('settings');
  }
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

window.RISK_CONTROLS = RISK_CONTROLS;
window.validateTradeRisk = validateTradeRisk;
window.recordTrade = recordTrade;
window.recordLoss = recordLoss;
window.calculateCapitalAtRisk = calculateCapitalAtRisk;
window.getForecasterStats = getForecasterStats;
window.updateAccuracyScore = updateAccuracyScore;
window.renderSelfControlSettings = renderSelfControlSettings;
window.getRandomNudge = getRandomNudge;
window.formatProbabilityLanguage = formatProbabilityLanguage;
window.formatLossInformational = formatLossInformational;
window.formatPositionDescription = formatPositionDescription;
window.updateDailyLimit = updateDailyLimit;
window.updateWeeklyLimit = updateWeeklyLimit;
window.toggleObserveMode = toggleObserveMode;
window.toggleTradingPause = toggleTradingPause;
window.loadRiskControlState = loadRiskControlState;
window.EDUCATIONAL_NUDGES = EDUCATIONAL_NUDGES;

console.log('%c[DOBIUM] Responsible Trading Module loaded', 'color: #22c55e; font-weight: bold');
