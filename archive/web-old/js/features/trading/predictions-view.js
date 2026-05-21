// ========================================
// SAMSA - PREDICTIONS
// Handles prediction form modal with LMSR trading model
// Uses the LMSR engine for all calculations
// Implements responsible forecasting practices
// ========================================

// Use LMSR engine constants and functions
const PLATFORM_FEE = window.LMSR ? window.LMSR.PLATFORM_FEE : 0.01;

/**
 * Normalize outcome title - converts "Yes, Banned" → "Yes", "No, Still Operating" → "No"
 */
function normalizePredictionOutcomeTitle(title) {
  const lower = (title || '').toLowerCase().trim();
  if (lower === 'yes' || lower.startsWith('yes,') || lower.startsWith('yes ')) {
    return 'Yes';
  }
  if (lower === 'no' || lower.startsWith('no,') || lower.startsWith('no ')) {
    return 'No';
  }
  return title;
}

// Wrapper functions that delegate to LMSR engine
function calcWinProfit(stake, probability, fee = PLATFORM_FEE) {
  return window.LMSR ? window.LMSR.calcWinProfit(stake, probability, fee) : stake * (1 - (probability > 1 ? probability / 100 : probability)) * (1 - fee);
}

function calcWinReturn(stake, probability, fee = PLATFORM_FEE) {
  return window.LMSR ? window.LMSR.calcWinReturn(stake, probability, fee) : stake + calcWinProfit(stake, probability, fee);
}

function calcLossAmount(stake, probability) {
  return window.LMSR ? window.LMSR.calcLossAmount(stake, probability) : stake * (1 - (probability > 1 ? probability / 100 : probability));
}

function calcLoseReturn(stake, probability) {
  return window.LMSR ? window.LMSR.calcLoseReturn(stake, probability) : stake * (probability > 1 ? probability / 100 : probability);
}

// Track currently selected outcome for inline form
let currentInlineSelection = null;
let currentTradeMode = 'buy'; // 'buy' or 'sell'

/**
 * Get user's current position for a specific outcome
 */
function getUserPosition(marketId, outcomeId) {
  const userPredictions = typeof predictions !== 'undefined' ? predictions : [];
  const position = userPredictions
    .filter(p => String(p.marketId || p.market_id) === String(marketId) &&
      String(p.outcomeId || p.outcome_id) === String(outcomeId) &&
      p.status === 'active')
    .reduce((sum, p) => sum + (p.stake || p.stake_amount || 0), 0);
  return position;
}

function getAvgEntryProb(marketId, outcomeId) {
  const userPredictions = typeof predictions !== 'undefined' ? predictions : [];
  const activePreds = userPredictions.filter(p =>
    String(p.marketId || p.market_id) === String(marketId) &&
    String(p.outcomeId || p.outcome_id) === String(outcomeId) &&
    p.status === 'active'
  );

  const totalStake = activePreds.reduce((sum, p) => sum + (p.stake || p.stake_amount || 0), 0);
  if (totalStake === 0) return 50;

  const weightedSum = activePreds.reduce((sum, p) => sum + (p.probability || p.odds_at_prediction || p.entryProb || 50) * (p.stake || p.stake_amount || 0), 0);
  return weightedSum / totalStake;
}

/**
 * Calculate sell value - what user gets back when selling position
 * Sell value = position * current probability (they exit at current market price)
 */
function calcSellValue(positionSize, currentProbability, avgEntryProbability) {
  const currentP = currentProbability > 1 ? currentProbability : currentProbability * 100;
  const entryP = avgEntryProbability ? (avgEntryProbability > 1 ? avgEntryProbability : avgEntryProbability * 100) : 50;
  if (entryP === 0) return 0;
  return positionSize * (currentP / entryP) * (1 - PLATFORM_FEE);
}

/**
 * Calculate sell profit/loss
 */
function calcSellProfitLoss(positionSize, entryProbability, currentProbability) {
  const sellValue = calcSellValue(positionSize, currentProbability, entryProbability);
  // Original cost was the position size
  return sellValue - positionSize;
}

/**
 * Show inline trading form in the sidebar (replaces stats card temporarily)
 */
function showInlineTradingForm(marketId, outcomeId) {
  const market = markets.find(m => String(m.id) === String(marketId));
  if (!market) {
    console.error('Market not found:', marketId);
    return;
  }
  const outcome = market.outcomes.find(o => String(o.id) === String(outcomeId));
  if (!outcome) {
    console.error('Outcome not found:', outcomeId);
    return;
  }

  const probability = outcome.probability;
  const container = document.getElementById('inlineTradingForm');
  const statsCard = document.getElementById('statsCard');

  if (!container) {
    // Fallback to modal if container doesn't exist
    openPredictionForm(marketId, outcomeId);
    return;
  }

  // Update button states - highlight selected
  document.querySelectorAll('.outcome-btn').forEach(btn => {
    btn.classList.remove('ring-2', 'ring-yellow-500', 'ring-offset-2', 'ring-offset-slate-950');
  });
  const selectedBtn = document.getElementById(`outcomeBtn-${outcomeId}`);
  if (selectedBtn) {
    selectedBtn.classList.add('ring-2', 'ring-yellow-500', 'ring-offset-2', 'ring-offset-slate-950');
  }

  // Store current selection
  currentInlineSelection = { marketId, outcomeId, probability };

  // Hide stats card and show trading form
  if (statsCard) statsCard.classList.add('hidden');
  container.classList.remove('hidden');

  // Determine colors based on outcome
  const isYes = normalizePredictionOutcomeTitle(outcome.title).toLowerCase() === 'yes';
  const isBinary = market.outcomes.length === 2 &&
    market.outcomes.some(o => normalizePredictionOutcomeTitle(o.title).toLowerCase() === 'yes') &&
    market.outcomes.some(o => normalizePredictionOutcomeTitle(o.title).toLowerCase() === 'no');

  // Check user's existing position
  const userPosition = getUserPosition(marketId, outcomeId);
  const avgEntryProb = getAvgEntryProb(marketId, outcomeId);
  const hasPosition = userPosition > 0;

  container.innerHTML = `
    <div class="bg-slate-900/80 border border-yellow-500/50 rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-white font-semibold text-sm">Trade</span>
          <span class="px-2 py-0.5 rounded text-xs font-medium ${isBinary ? (isYes ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400') : 'bg-yellow-500/20 text-yellow-400'}">${normalizePredictionOutcomeTitle(outcome.title)}</span>
        </div>
        <button onclick="hideInlineTradingForm()" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>
      
      <div class="p-4 space-y-4">
        <!-- Buy/Sell Toggle -->
        <div class="flex rounded-lg bg-slate-800 p-1">
          <button id="buyTabBtn" onclick="switchTradeMode('buy', '${marketId}', '${outcomeId}', ${probability})"
            class="flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all bg-green-500/20 text-green-400 border border-green-500/50">
            Buy
          </button>
          <button id="sellTabBtn" onclick="switchTradeMode('sell', '${marketId}', '${outcomeId}', ${probability}, ${avgEntryProb})"
            class="flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all text-slate-400 hover:text-white ${!hasPosition ? 'opacity-50 cursor-not-allowed' : ''}"
            ${!hasPosition ? 'disabled title="No position to sell"' : ''}>
            Sell ${hasPosition ? `($${userPosition.toFixed(2)})` : ''}
          </button>
        </div>

        <!-- User's Current Position (if any) -->
        ${hasPosition ? `
        <div class="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <div class="flex items-center justify-between">
            <span class="text-slate-400 text-xs">Your Position</span>
            <span class="text-yellow-400 font-bold">$${userPosition.toFixed(2)}</span>
          </div>
        </div>
        ` : ''}

        <!-- Market Probability Info -->
        <div class="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <p class="text-slate-400 text-xs mb-1">Market Probability</p>
          <p class="text-2xl font-bold ${isBinary ? (isYes ? 'text-green-400' : 'text-red-400') : 'text-yellow-400'}">${probability}%</p>
          <p class="text-slate-500 text-xs mt-1">This reflects the collective belief of market participants.</p>
        </div>

        <!-- Buy Mode Content -->
        <div id="buyModeContent">
          <!-- Investment Input -->
          <div class="mb-4">
            <label class="text-slate-400 text-xs mb-1 block">Position Size</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input type="number" id="inlineStakeAmount" min="1" step="0.01" placeholder="0.00" 
                class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-7 pr-4 py-2.5 focus:outline-none focus:border-yellow-500/50 text-lg" />
            </div>
          </div>

          <!-- LIMITS FEATURE - Commented out but preserved for future use -->
          <!-- Capital at Risk Indicator
          <div id="inlineCapitalRisk" class="hidden bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span class="text-amber-400 text-sm font-medium" id="inlineCapitalRiskText">0% of your capital</span>
            </div>
          </div>
          -->

          <!-- Quick Amounts -->
          <div class="flex gap-2 mb-4">
            ${['5', '10', '25', '50', '100'].map(amt => `
              <button onclick="document.getElementById('inlineStakeAmount').value='${amt}'; updateInlineTradeCalculations(${amt}, ${probability})" 
                class="flex-1 py-1.5 text-xs rounded-md bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">$${amt}</button>
            `).join('')}
          </div>

          <!-- Outcome Scenarios -->
          <div class="grid grid-cols-2 gap-2 mb-4">
            <div class="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p class="text-green-400 text-xs font-medium mb-1">If Outcome Occurs</p>
              <p class="text-green-400 font-bold" id="inlineWinReturn">$0.00</p>
              <p class="text-green-400/70 text-xs" id="inlineWinProfit">+$0.00 return</p>
            </div>
            <div class="bg-slate-500/10 border border-slate-500/20 rounded-lg p-3">
              <p class="text-slate-400 text-xs font-medium mb-1">If Outcome Doesn't Occur</p>
              <p class="text-yellow-400 font-bold" id="inlineLoseReturn">$0.00</p>
              <p class="text-slate-400/70 text-xs" id="inlineLossAmount">partial refund</p>
            </div>
          </div>

          <!-- Risk Warnings -->
          <div id="inlineRiskWarnings" class="hidden space-y-2 mb-4"></div>

          <!-- Balance -->
          <div class="flex items-center justify-between text-xs mb-4">
            <span class="text-slate-500">Available Balance</span>
            <span class="text-green-400 font-medium">$${typeof getBalance === 'function' ? getBalance().toFixed(2) : '0.00'}</span>
          </div>

          <!-- Review & Confirm Button -->
          <button onclick="showPositionReview('${marketId}', '${outcomeId}', ${probability})" 
            class="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded-lg transition-all">
            Review Buy Order
          </button>
        </div>

        <!-- Sell Mode Content (hidden by default) -->
        <div id="sellModeContent" class="hidden">
          <!-- Sell Amount Input -->
          <div class="mb-4">
            <label class="text-slate-400 text-xs mb-1 block">Amount to Sell</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input type="number" id="inlineSellAmount" min="0.01" max="${userPosition}" step="0.01" placeholder="0.00" 
                class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-7 pr-4 py-2.5 focus:outline-none focus:border-red-500/50 text-lg" />
            </div>
          </div>

          <!-- Quick Sell Amounts -->
          <div class="flex gap-2 mb-4">
            ${hasPosition ? ['25', '50', '75', '100'].map(pct => {
    const amt = (userPosition * (parseInt(pct) / 100)).toFixed(2);
    return `
                <button onclick="document.getElementById('inlineSellAmount').value='${amt}'; updateInlineSellCalculations(${amt}, ${probability}, ${avgEntryProb})" 
                  class="flex-1 py-1.5 text-xs rounded-md bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">${pct}%</button>
              `;
  }).join('') : ''}
          </div>

          <!-- Sell Value Display -->
          <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-slate-400 text-sm">You will receive</span>
              <span class="text-white font-bold text-xl" id="inlineSellValue">$0.00</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500 text-xs">After 1% platform fee</span>
              <span class="text-slate-400 text-sm" id="inlineSellProfitLoss">$0.00</span>
            </div>
          </div>

          <!-- Sell Warning -->
          <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span class="text-amber-400 text-xs">Selling exits your position at the current market probability. You will no longer receive payouts if this outcome occurs.</span>
            </div>
          </div>

          <!-- Confirm Sell Button -->
          <button onclick="showSellReview('${marketId}', '${outcomeId}', ${probability}, ${userPosition}, ${avgEntryProb})" 
            class="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 rounded-lg transition-all">
            Review Sell Order
          </button>
        </div>
      </div>
    </div>
  `;

  // Add input listener for real-time calculations
  document.getElementById('inlineStakeAmount').addEventListener('input', function (e) {
    updateInlineTradeCalculations(parseFloat(e.target.value) || 0, probability);
  });

  // Focus the input
  setTimeout(() => document.getElementById('inlineStakeAmount').focus(), 100);
}

/**
 * Hide inline trading form and show stats card again
 */
function hideInlineTradingForm() {
  const container = document.getElementById('inlineTradingForm');
  const statsCard = document.getElementById('statsCard');

  if (container) container.classList.add('hidden');
  if (statsCard) statsCard.classList.remove('hidden');

  // Remove highlight from buttons
  document.querySelectorAll('.outcome-btn').forEach(btn => {
    btn.classList.remove('ring-2', 'ring-yellow-500', 'ring-offset-2', 'ring-offset-slate-950');
  });

  currentInlineSelection = null;
}

/**
 * Update inline trade calculations with risk indicators
 */
function updateInlineTradeCalculations(stake, probability) {
  const p = probability / 100;
  const balance = typeof getBalance === 'function' ? getBalance() : 0;

  const winProfit = calcWinProfit(stake, p);
  const winReturn = calcWinReturn(stake, p);
  const lossAmount = calcLossAmount(stake, p);
  const loseReturn = calcLoseReturn(stake, p);

  const winReturnEl = document.getElementById('inlineWinReturn');
  const winProfitEl = document.getElementById('inlineWinProfit');
  const loseReturnEl = document.getElementById('inlineLoseReturn');
  const lossAmountEl = document.getElementById('inlineLossAmount');

  if (winReturnEl) winReturnEl.textContent = '$' + winReturn.toFixed(2);
  if (winProfitEl) winProfitEl.textContent = '+$' + winProfit.toFixed(2) + ' return';
  if (loseReturnEl) loseReturnEl.textContent = '$' + loseReturn.toFixed(2);
  if (lossAmountEl) lossAmountEl.textContent = loseReturn > 0 ? 'partial refund' : 'full position at risk';

  // LIMITS FEATURE - Commented out but preserved for future use
  // Update Capital at Risk indicator
  // const capitalRiskEl = document.getElementById('inlineCapitalRisk');
  // const capitalRiskTextEl = document.getElementById('inlineCapitalRiskText');
  // if (capitalRiskEl && capitalRiskTextEl && stake > 0 && balance > 0) {
  //   const capitalPercent = (stake / balance) * 100;
  //   capitalRiskEl.classList.remove('hidden');
  //   capitalRiskTextEl.textContent = `This position represents ${capitalPercent.toFixed(1)}% of your capital`;
  //   
  //   // Change color based on risk level
  //   if (capitalPercent > 10) {
  //     capitalRiskEl.className = 'bg-red-500/10 border border-red-500/30 rounded-lg p-3';
  //     capitalRiskTextEl.className = 'text-red-400 text-sm font-medium';
  //   } else if (capitalPercent > 5) {
  //     capitalRiskEl.className = 'bg-amber-500/10 border border-amber-500/30 rounded-lg p-3';
  //     capitalRiskTextEl.className = 'text-amber-400 text-sm font-medium';
  //   } else {
  //     capitalRiskEl.className = 'bg-slate-500/10 border border-slate-500/30 rounded-lg p-3';
  //     capitalRiskTextEl.className = 'text-slate-400 text-sm font-medium';
  //   }
  // } else if (capitalRiskEl) {
  //   capitalRiskEl.classList.add('hidden');
  // }

  // Validate against risk controls
  if (typeof validateTradeRisk === 'function' && stake > 0) {
    const validation = validateTradeRisk(stake);
    const warningsEl = document.getElementById('inlineRiskWarnings');

    if (warningsEl) {
      if (validation.warnings.length > 0 || validation.blocked.length > 0) {
        warningsEl.classList.remove('hidden');
        warningsEl.innerHTML = [
          ...validation.blocked.map(msg => `
            <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-2 flex items-start gap-2">
              <svg class="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span class="text-red-400 text-xs">${msg}</span>
            </div>
          `),
          ...validation.warnings.map(msg => `
            <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex items-start gap-2">
              <svg class="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span class="text-amber-400 text-xs">${msg}</span>
            </div>
          `)
        ].join('');
      } else {
        warningsEl.classList.add('hidden');
      }
    }
  }
}

/**
 * Show Position Review Modal (Soft Friction Step)
 * This adds a deliberate pause for users to review their position
 */
function showPositionReview(marketId, outcomeId, probability) {
  const stake = parseFloat(document.getElementById('inlineStakeAmount')?.value || document.getElementById('stakeAmount')?.value) || 0;

  if (stake <= 0) {
    alert('Please enter a valid position size');
    return;
  }

  // Validate against risk controls
  if (typeof validateTradeRisk === 'function') {
    const validation = validateTradeRisk(stake);
    if (!validation.allowed) {
      alert(validation.blocked.join('\n'));
      return;
    }
  }

  const market = markets.find(m => String(m.id) === String(marketId));
  const outcome = market?.outcomes.find(o => String(o.id) === String(outcomeId));
  const balance = typeof getBalance === 'function' ? getBalance() : 0;

  const p = probability / 100;
  const winProfit = calcWinProfit(stake, p);
  const winReturn = calcWinReturn(stake, p);
  const lossAmount = calcLossAmount(stake, p);
  const loseReturn = calcLoseReturn(stake, p);
  // LIMITS FEATURE - Commented out but preserved for future use
  // const capitalPercent = balance > 0 ? ((stake / balance) * 100).toFixed(1) : 0;

  // Get educational nudge
  const nudge = typeof getRandomNudge === 'function' ? getRandomNudge('beforeTrade') : '';

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4';
  modal.id = 'positionReviewModal';
  modal.innerHTML = `
    <div class="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold text-white flex items-center gap-2">
          <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Review Your Position
        </h3>
        <button onclick="closePositionReview()" class="text-slate-400 hover:text-white text-xl">✕</button>
      </div>
      
      <!-- Market Info -->
      <div class="bg-slate-800/50 rounded-xl p-4 mb-6">
        <p class="text-slate-400 text-sm mb-1">Market</p>
        <p class="text-white font-semibold">${market?.title || 'Unknown Market'}</p>
        <p class="text-yellow-400 font-medium mt-2">${normalizePredictionOutcomeTitle(outcome?.title || 'Unknown')}</p>
      </div>
      
      <!-- Key Information Grid -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-slate-800/30 rounded-xl p-4 text-center">
          <p class="text-slate-400 text-xs mb-1">Market Probability</p>
          <p class="text-2xl font-bold text-yellow-400">${probability}%</p>
        </div>
        <div class="bg-slate-800/30 rounded-xl p-4 text-center">
          <p class="text-slate-400 text-xs mb-1">Your Position</p>
          <p class="text-2xl font-bold text-white">$${stake.toFixed(2)}</p>
        </div>
      </div>
      
      <!-- LIMITS FEATURE - Commented out but preserved for future use -->
      <!-- Capital at Risk - Key Safeguard
      <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p class="text-amber-400 font-semibold">Capital at Risk</p>
            <p class="text-amber-300 text-sm">This position represents capitalPercent% of your available capital.</p>
          </div>
        </div>
      </div>
      -->
      
      <!-- Outcome Scenarios -->
      <div class="mb-6">
        <p class="text-slate-400 text-sm mb-3">Possible Outcomes</p>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div>
              <p class="text-green-400 font-medium">If outcome occurs</p>
              <p class="text-green-400/70 text-sm">You receive your position back plus profit</p>
            </div>
            <div class="text-right">
              <p class="text-green-400 font-bold">$${winReturn.toFixed(2)}</p>
              <p class="text-green-400/70 text-sm">+$${winProfit.toFixed(2)}</p>
            </div>
          </div>
          <div class="flex items-center justify-between p-3 bg-slate-500/10 border border-slate-500/20 rounded-lg">
            <div>
              <p class="text-slate-300 font-medium">If outcome doesn't occur</p>
              <p class="text-slate-400 text-sm">Partial refund based on probability</p>
            </div>
            <div class="text-right">
              <p class="text-yellow-400 font-bold">$${loseReturn.toFixed(2)}</p>
              <p class="text-slate-400 text-sm">-$${lossAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Worst-Case Scenario -->
      <div class="bg-slate-800/50 rounded-xl p-4 mb-6">
        <p class="text-slate-400 text-sm mb-2">Worst-Case Outcome</p>
        <p class="text-white">If the outcome doesn't occur, you would receive $${loseReturn.toFixed(2)} back (losing $${lossAmount.toFixed(2)}).</p>
      </div>
      
      <!-- Reflection Prompt (Optional) -->
      <div class="mb-6">
        <label class="text-slate-400 text-sm mb-2 block">What information led you to this belief? <span class="text-slate-500">(optional)</span></label>
        <textarea id="reflectionPrompt" rows="2" placeholder="e.g., Recent polling data, historical trends, expert analysis..."
          class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500/50 text-sm resize-none"
        ></textarea>
        <p class="text-slate-500 text-xs mt-1">Taking a moment to articulate your reasoning improves forecasting accuracy.</p>
      </div>
      
      <!-- Educational Nudge -->
      <div class="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 mb-6">
        <p class="text-slate-400 text-sm italic">"${nudge}"</p>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button onclick="closePositionReview()" 
          class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors">
          Go Back
        </button>
        <button onclick="confirmPosition('${marketId}', '${outcomeId}', ${probability}, ${stake})" 
          class="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-950 font-bold py-3 rounded-lg transition-all">
          Confirm Position
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

/**
 * Close position review modal
 */
function closePositionReview() {
  const modal = document.getElementById('positionReviewModal');
  if (modal) modal.remove();
}

/**
 * Confirm position after review
 */
async function confirmPosition(marketId, outcomeId, probability, stake) {
  closePositionReview();

  // Store reflection if provided
  const reflectionEl = document.getElementById('reflectionPrompt');
  const reflection = reflectionEl ? reflectionEl.value.trim() : '';

  // Close any inline form
  hideInlineTradingForm();

  // Submit the prediction
  await submitPredictionWithReview(marketId, outcomeId, probability, stake, reflection);
}

/**
 * Submit prediction from inline form
 */
async function submitInlinePrediction(marketId, outcomeId, probability) {
  const stake = parseFloat(document.getElementById('inlineStakeAmount').value) || 0;

  if (stake <= 0) {
    alert('Please enter a valid position size');
    return;
  }

  // Show position review instead of direct submission
  showPositionReview(marketId, outcomeId, probability);
}

/**
 * Switch between Buy and Sell modes
 */
function switchTradeMode(mode, marketId, outcomeId, probability, avgEntryProb = 50) {
  currentTradeMode = mode;

  const buyBtn = document.getElementById('buyTabBtn');
  const sellBtn = document.getElementById('sellTabBtn');
  const buyContent = document.getElementById('buyModeContent');
  const sellContent = document.getElementById('sellModeContent');

  if (mode === 'buy') {
    buyBtn.className = 'flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all bg-green-500/20 text-green-400 border border-green-500/50';
    sellBtn.className = sellBtn.disabled ?
      'flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all text-slate-400 opacity-50 cursor-not-allowed' :
      'flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all text-slate-400 hover:text-white';
    buyContent.classList.remove('hidden');
    sellContent.classList.add('hidden');
  } else {
    sellBtn.className = 'flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all bg-red-500/20 text-red-400 border border-red-500/50';
    buyBtn.className = 'flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all text-slate-400 hover:text-white';
    buyContent.classList.add('hidden');
    sellContent.classList.remove('hidden');

    // Add listener for sell amount input
    const sellInput = document.getElementById('inlineSellAmount');
    if (sellInput) {
      sellInput.addEventListener('input', function (e) {
        updateInlineSellCalculations(parseFloat(e.target.value) || 0, probability, avgEntryProb);
      });
    }
  }
}

/**
 * Update sell calculations in real-time
 */
function updateInlineSellCalculations(sellAmount, probability, avgEntryProb = 50) {
  const sellValue = calcSellValue(sellAmount, probability, avgEntryProb);
  const profitLoss = sellValue - sellAmount;

  const sellValueEl = document.getElementById('inlineSellValue');
  const profitLossEl = document.getElementById('inlineSellProfitLoss');

  if (sellValueEl) sellValueEl.textContent = '$' + sellValue.toFixed(2);
  if (profitLossEl) {
    if (profitLoss >= 0) {
      profitLossEl.textContent = '+$' + profitLoss.toFixed(2) + ' profit';
      profitLossEl.className = 'text-green-400 text-sm';
    } else {
      profitLossEl.textContent = '-$' + Math.abs(profitLoss).toFixed(2) + ' loss';
      profitLossEl.className = 'text-red-400 text-sm';
    }
  }
}

/**
 * Show sell review modal
 */
function showSellReview(marketId, outcomeId, probability, maxPosition, avgEntryProb = 50) {
  const sellAmount = parseFloat(document.getElementById('inlineSellAmount')?.value) || 0;

  if (sellAmount <= 0) {
    alert('Please enter a valid sell amount');
    return;
  }

  if (sellAmount > maxPosition) {
    alert(`You can only sell up to $${maxPosition.toFixed(2)} of your position`);
    return;
  }

  const market = markets.find(m => String(m.id) === String(marketId));
  const outcome = market?.outcomes.find(o => String(o.id) === String(outcomeId));

  const sellValue = calcSellValue(sellAmount, probability, avgEntryProb);
  const profitLoss = sellValue - sellAmount;

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4';
  modal.id = 'sellReviewModal';
  modal.innerHTML = `
    <div class="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold text-white flex items-center gap-2">
          <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Confirm Sell Order
        </h3>
        <button onclick="closeSellReview()" class="text-slate-400 hover:text-white text-xl">✕</button>
      </div>
      
      <!-- Market Info -->
      <div class="bg-slate-800/50 rounded-xl p-4 mb-6">
        <p class="text-slate-400 text-sm mb-1">Selling Position</p>
        <p class="text-white font-semibold">${market?.title || 'Unknown Market'}</p>
        <p class="text-yellow-400 font-medium mt-2">${normalizePredictionOutcomeTitle(outcome?.title || 'Unknown')}</p>
      </div>
      
      <!-- Sell Details -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-slate-800/30 rounded-xl p-4 text-center">
          <p class="text-slate-400 text-xs mb-1">Selling</p>
          <p class="text-2xl font-bold text-red-400">$${sellAmount.toFixed(2)}</p>
        </div>
        <div class="bg-slate-800/30 rounded-xl p-4 text-center">
          <p class="text-slate-400 text-xs mb-1">You Receive</p>
          <p class="text-2xl font-bold text-green-400">$${sellValue.toFixed(2)}</p>
        </div>
      </div>
      
      <!-- Profit/Loss -->
      <div class="${profitLoss >= 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'} rounded-xl p-4 mb-6">
        <div class="flex items-center justify-between">
          <span class="text-slate-300">Net ${profitLoss >= 0 ? 'Profit' : 'Loss'}</span>
          <span class="${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'} font-bold text-xl">
            ${profitLoss >= 0 ? '+' : '-'}$${Math.abs(profitLoss).toFixed(2)}
          </span>
        </div>
      </div>
      
      <!-- Warning -->
      <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p class="text-amber-400 font-semibold">This action is final</p>
            <p class="text-amber-300 text-sm">Once sold, you will no longer hold a position on this outcome. If the outcome occurs, you will not receive any payout.</p>
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button onclick="closeSellReview()" 
          class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors">
          Cancel
        </button>
        <button onclick="confirmSell('${marketId}', '${outcomeId}', ${sellAmount}, ${sellValue})" 
          class="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 rounded-lg transition-all">
          Confirm Sell
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

/**
 * Close sell review modal
 */
function closeSellReview() {
  const modal = document.getElementById('sellReviewModal');
  if (modal) modal.remove();
}

/**
 * Confirm and execute sell order
 */
async function confirmSell(marketId, outcomeId, sellAmount, sellValue) {
  closeSellReview();
  hideInlineTradingForm();

  // Show loading modal
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-center">
      <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <div class="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <h3 class="text-xl font-bold text-white mb-2">Processing Sell Order...</h3>
      <p class="text-slate-400">Please wait while we process your sale.</p>
    </div>
  `;
  document.body.appendChild(modal);

  // Update predictions - mark portion as sold
  const userPredictions = typeof predictions !== 'undefined' ? predictions : [];
  let remainingToSell = sellAmount;

  for (let i = 0; i < userPredictions.length && remainingToSell > 0; i++) {
    const pred = userPredictions[i];
    if (String(pred.marketId || pred.market_id) === String(marketId) &&
      String(pred.outcomeId || pred.outcome_id) === String(outcomeId) &&
      pred.status === 'active') {
      const predStake = pred.stake || pred.stake_amount || 0;
      if (predStake <= remainingToSell) {
        // Sell entire position
        pred.status = 'sold';
        pred.soldAt = new Date().toISOString();
        pred.saleValue = predStake * (sellValue / sellAmount);
        remainingToSell -= predStake;
      } else {
        // Partial sell - reduce position
        const soldPortion = remainingToSell;
        pred.stake = predStake - soldPortion;
        pred.stake_amount = predStake - soldPortion;
        remainingToSell = 0;

        // Record the sale
        userPredictions.push({
          id: Date.now(),
          marketId: marketId,
          market_id: marketId,
          outcomeId: outcomeId,
          outcome_id: outcomeId,
          stake: soldPortion,
          stake_amount: soldPortion,
          status: 'sold',
          soldAt: new Date().toISOString(),
          saleValue: soldPortion * (sellValue / sellAmount)
        });
      }
    }
  }

  // Add sell value to balance
  if (typeof addBalance === 'function') {
    addBalance(sellValue);
  } else if (typeof walletState !== 'undefined') {
    walletState.balance = (walletState.balance || 0) + sellValue;
  }

  // Show confirmation
  setTimeout(() => {
    const profitLoss = sellValue - sellAmount;
    modal.innerHTML = `
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-center">
        <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-green-400 text-3xl">✓</span>
        </div>
        <h3 class="text-xl font-bold text-white mb-2">Sell Order Complete</h3>
        <p class="text-slate-400 mb-4">Your position has been sold.</p>
        <div class="bg-slate-800/50 rounded-xl p-4 mb-4 text-left">
          <div class="flex justify-between mb-2">
            <span class="text-slate-400">Position Sold:</span>
            <span class="text-white font-semibold">$${sellAmount.toFixed(2)}</span>
          </div>
          <div class="flex justify-between mb-2">
            <span class="text-slate-400">Amount Received:</span>
            <span class="text-green-400 font-semibold">$${sellValue.toFixed(2)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Net ${profitLoss >= 0 ? 'Profit' : 'Loss'}:</span>
            <span class="${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold">${profitLoss >= 0 ? '+' : '-'}$${Math.abs(profitLoss).toFixed(2)}</span>
          </div>
        </div>
        <button onclick="this.closest('.fixed').remove(); if(typeof renderMarkets === 'function') renderMarkets();" 
          class="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-950 font-bold py-3 rounded-lg">
          Done
        </button>
      </div>
    `;
  }, 1000);
}

// Make functions globally available
window.showInlineTradingForm = showInlineTradingForm;
window.hideInlineTradingForm = hideInlineTradingForm;
window.updateInlineTradeCalculations = updateInlineTradeCalculations;
window.submitInlinePrediction = submitInlinePrediction;
window.showPositionReview = showPositionReview;
window.closePositionReview = closePositionReview;
window.confirmPosition = confirmPosition;
window.switchTradeMode = switchTradeMode;
window.updateInlineSellCalculations = updateInlineSellCalculations;
window.showSellReview = showSellReview;
window.closeSellReview = closeSellReview;
window.confirmSell = confirmSell;
window.getUserPosition = getUserPosition;

function openPredictionForm(marketId, outcomeId) {
  // Handle both string and numeric IDs
  const market = markets.find(m => String(m.id) === String(marketId));
  if (!market) {
    console.error('Market not found:', marketId);
    return;
  }
  const outcome = market.outcomes.find(o => String(o.id) === String(outcomeId));
  if (!outcome) {
    console.error('Outcome not found:', outcomeId);
    return;
  }
  const probability = outcome.probability; // Assume this is 0-100
  const balance = typeof getBalance === 'function' ? getBalance() : 0;

  // Get educational nudge
  const nudge = typeof getRandomNudge === 'function' ? getRandomNudge('beforeTrade') : '';

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold text-white">Review Position</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-white text-xl">✕</button>
      </div>
      
      <!-- Market Info with Probability-First Language -->
      <div class="bg-slate-800/50 rounded-xl p-4 mb-6">
        <p class="text-slate-400 text-sm mb-1">Position on</p>
        <p class="text-white font-semibold text-lg">${normalizePredictionOutcomeTitle(outcome.title)}</p>
        <div class="flex items-center gap-4 mt-3">
          <div>
            <p class="text-slate-500 text-xs">Market Probability</p>
            <p class="text-yellow-400 text-2xl font-bold">${probability}%</p>
          </div>
          <div>
            <p class="text-slate-500 text-xs">Platform Fee</p>
            <p class="text-slate-300 text-lg font-semibold">${PLATFORM_FEE * 100}%</p>
          </div>
          <div class="ml-auto">
            <p class="text-slate-500 text-xs">Available Balance</p>
            <p class="text-green-400 text-lg font-semibold">$${balance.toFixed(2)}</p>
          </div>
        </div>
      </div>
      
      <!-- Educational Nudge -->
      <div class="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 mb-4">
        <p class="text-slate-400 text-sm italic">"${nudge}"</p>
      </div>
      
      <!-- Position Size Input -->
      <div class="space-y-4">
        <div>
          <label class="text-white font-medium mb-2 block">Position Size ($)</label>
          <input type="number" id="stakeAmount" min="1" step="0.01" placeholder="Enter amount" 
            class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 text-lg" />
        </div>
        
        <!-- LIMITS FEATURE - Commented out but preserved for future use -->
        <!-- Capital at Risk Indicator
        <div id="capitalRiskIndicator" class="hidden bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span class="text-amber-400 text-sm font-medium" id="capitalRiskText">0% of your capital</span>
          </div>
        </div>
        -->
        
        <!-- Risk Warnings -->
        <div id="riskWarnings" class="hidden space-y-2"></div>
        
        <!-- Outcome Scenarios -->
        <div class="flex gap-4">
          <!-- If Outcome Occurs -->
          <div class="flex-1 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-green-400 text-lg">✓</span>
              <p class="text-green-400 font-semibold">If Outcome Occurs</p>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-slate-400 text-sm">Return</span>
                <span class="text-green-400 font-bold" id="winReturn">$0.00</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400 text-sm">Profit</span>
                <span class="text-green-400 font-semibold" id="winProfit">+$0.00</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500 text-xs">Return %</span>
                <span class="text-green-400 text-xs font-medium" id="winReturnPercent">0%</span>
              </div>
            </div>
          </div>
          
          <!-- If Outcome Doesn't Occur -->
          <div class="flex-1 bg-slate-500/10 border border-slate-500/30 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-slate-400 text-lg">○</span>
              <p class="text-slate-300 font-semibold">If Not</p>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-slate-400 text-sm">Refund</span>
                <span class="text-yellow-400 font-bold" id="loseReturn">$0.00</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400 text-sm">At Risk</span>
                <span class="text-slate-400 font-semibold" id="lossAmount">-$0.00</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500 text-xs">Refund %</span>
                <span class="text-yellow-400 text-xs font-medium" id="loseReturnPercent">0%</span>
              </div>
            </div>
          </div>
        </div>
        
        <button onclick="showPositionReviewFromModal('${marketId}', '${outcomeId}', ${probability})" 
          class="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-950 font-bold py-3 rounded-lg transition-all">
          Review Position
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Add input listener for real-time calculations
  document.getElementById('stakeAmount').addEventListener('input', function (e) {
    const stake = parseFloat(e.target.value) || 0;
    updateTradeCalculations(stake, probability);
    // LIMITS FEATURE - Commented out but preserved for future use
    // updateCapitalRiskIndicator(stake, balance);
    updateRiskWarnings(stake);
  });

  // Focus the input
  setTimeout(() => document.getElementById('stakeAmount').focus(), 100);
}

function showPositionReviewFromModal(marketId, outcomeId, probability) {
  const stake = parseFloat(document.getElementById('stakeAmount').value) || 0;

  if (stake <= 0) {
    alert('Please enter a valid position size');
    return;
  }

  // Close the initial modal
  const initialModal = document.querySelector('.fixed');
  if (initialModal) initialModal.remove();

  // Show the review modal
  showPositionReview(marketId, outcomeId, probability);
}

// LIMITS FEATURE - Commented out but preserved for future use
// function updateCapitalRiskIndicator(stake, balance) {
//   const indicatorEl = document.getElementById('capitalRiskIndicator');
//   const textEl = document.getElementById('capitalRiskText');
//   
//   if (!indicatorEl || !textEl) return;
//   
//   if (stake > 0 && balance > 0) {
//     const capitalPercent = (stake / balance) * 100;
//     indicatorEl.classList.remove('hidden');
//     textEl.textContent = `This position represents ${capitalPercent.toFixed(1)}% of your capital`;
//     
//     // Change color based on risk level
//     if (capitalPercent > 10) {
//       indicatorEl.className = 'bg-red-500/10 border border-red-500/30 rounded-lg p-3';
//       textEl.className = 'text-red-400 text-sm font-medium';
//     } else if (capitalPercent > 5) {
//       indicatorEl.className = 'bg-amber-500/10 border border-amber-500/30 rounded-lg p-3';
//       textEl.className = 'text-amber-400 text-sm font-medium';
//     } else {
//       indicatorEl.className = 'bg-slate-500/10 border border-slate-500/30 rounded-lg p-3';
//       textEl.className = 'text-slate-400 text-sm font-medium';
//     }
//   } else {
//     indicatorEl.classList.add('hidden');
//   }
// }

function updateRiskWarnings(stake) {
  if (typeof validateTradeRisk !== 'function' || stake <= 0) return;

  const validation = validateTradeRisk(stake);
  const warningsEl = document.getElementById('riskWarnings');

  if (!warningsEl) return;

  if (validation.warnings.length > 0 || validation.blocked.length > 0) {
    warningsEl.classList.remove('hidden');
    warningsEl.innerHTML = [
      ...validation.blocked.map(msg => `
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-2 flex items-start gap-2">
          <svg class="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span class="text-red-400 text-xs">${msg}</span>
        </div>
      `),
      ...validation.warnings.map(msg => `
        <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex items-start gap-2">
          <svg class="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span class="text-amber-400 text-xs">${msg}</span>
        </div>
      `)
    ].join('');
  } else {
    warningsEl.classList.add('hidden');
  }
}

function updateTradeCalculations(stake, probability) {
  const p = probability / 100; // Convert to decimal

  // Calculate values using the fair trading model
  const winProfit = calcWinProfit(stake, p);
  const winReturn = calcWinReturn(stake, p);
  const lossAmount = calcLossAmount(stake, p);
  const loseReturn = calcLoseReturn(stake, p);

  // Calculate return percentages (how much you get back relative to investment)
  const winReturnPercent = stake > 0 ? ((winReturn / stake) * 100).toFixed(0) : 0;
  const loseReturnPercent = stake > 0 ? ((loseReturn / stake) * 100).toFixed(0) : 0;

  // Update UI
  document.getElementById('winReturn').textContent = '$' + winReturn.toFixed(2);
  document.getElementById('winProfit').textContent = '+$' + winProfit.toFixed(2);
  document.getElementById('winReturnPercent').textContent = winReturnPercent + '%';
  document.getElementById('loseReturn').textContent = '$' + loseReturn.toFixed(2);
  document.getElementById('lossAmount').textContent = '-$' + lossAmount.toFixed(2);
  document.getElementById('loseReturnPercent').textContent = loseReturnPercent + '%';
}

/**
 * Submit prediction with review data
 */
async function submitPredictionWithReview(marketId, outcomeId, probability, stake, reflection = '') {
  // Check if user has sufficient balance
  if (typeof hasSufficientBalance === 'function' && !hasSufficientBalance(stake)) {
    const currentBalance = typeof getBalance === 'function' ? getBalance() : 0;
    alert(`Insufficient balance. You have $${currentBalance.toFixed(2)} available. Please deposit more funds.`);

    if (typeof openDepositModal === 'function') {
      openDepositModal();
    }
    return;
  }

  // Validate against risk controls
  if (typeof validateTradeRisk === 'function') {
    const validation = validateTradeRisk(stake);
    if (!validation.allowed) {
      alert(validation.blocked.join('\n'));
      return;
    }
  }

  // Get full breakdown from LMSR engine
  const lmsrBreakdown = window.LMSR ? window.LMSR.getTradeBreakdown(stake, probability) : null;

  const breakdown = {
    marketId,
    outcomeId,
    stake,
    probability,
    winProfit: lmsrBreakdown ? lmsrBreakdown.win.profit : calcWinProfit(stake, probability),
    winReturn: lmsrBreakdown ? lmsrBreakdown.win.totalReturn : calcWinReturn(stake, probability),
    lossAmount: lmsrBreakdown ? lmsrBreakdown.lose.loss : calcLossAmount(stake, probability),
    loseReturn: lmsrBreakdown ? lmsrBreakdown.lose.refund : calcLoseReturn(stake, probability),
    riskReward: lmsrBreakdown ? lmsrBreakdown.riskReward : null,
    platformRevenue: lmsrBreakdown ? lmsrBreakdown.platformRevenue : null,
    reflection: reflection
  };

  console.log('Position confirmed:', breakdown);

  // Record trade for limit tracking
  if (typeof recordTrade === 'function') {
    recordTrade(stake);
  }

  // Show loading modal
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-center">
      <div class="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <div class="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <h3 class="text-xl font-bold text-white mb-2">Processing Position...</h3>
      <p class="text-slate-400">Please wait while we confirm your position.</p>
    </div>
  `;
  document.body.appendChild(modal);

  let apiSuccess = false;

  // Try to save to API
  try {
    const response = await fetch('/api/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        market_id: String(marketId),
        outcome_id: String(outcomeId),
        stake_amount: stake,
        odds_at_prediction: probability,
        reflection: reflection
      })
    });

    if (response.ok) {
      const prediction = await response.json();
      console.log('Prediction saved to API:', prediction);
      apiSuccess = true;

      // Deduct balance from wallet
      if (typeof deductBalance === 'function') {
        deductBalance(stake);
      }

      // Update local market data
      const market = markets.find(m => String(m.id) === String(marketId));
      if (market) {
        const outcome = market.outcomes.find(o => String(o.id) === String(outcomeId));
        if (outcome) {
          // Update stake
          outcome.total_stake = (outcome.total_stake || 0) + stake;

          // Recalculate probabilities based on stakes
          const totalStake = market.outcomes.reduce((sum, o) => sum + (o.total_stake || 0), 0);
          if (totalStake > 0) {
            market.outcomes.forEach(o => {
              o.probability = Math.round((o.total_stake / totalStake) * 100);
            });
          }

          // Update volume
          market.volume = (market.volume || 0) + stake;
          market.volume24h = (market.volume24h || 0) + stake;
        }
      }
    } else {
      const error = await response.json();
      console.error('API error:', error);
    }
  } catch (error) {
    console.log('API call failed:', error.message);
  }

  // Update LMSR market state
  if (window.lmsrManager) {
    try {
      // Determine side - first outcome is typically YES/favorite
      const market = markets.find(m => String(m.id) === String(marketId));
      const outcomeIndex = market ? market.outcomes.findIndex(o => String(o.id) === String(outcomeId)) : -1;
      const side = outcomeIndex === 0 ? 'YES' : 'NO';
      const result = window.lmsrManager.invest(String(marketId), side, stake);
      console.log('LMSR market updated:', result);
    } catch (e) {
      const lmsrMarket = window.lmsrManager.getOrCreateMarket(String(marketId), 100, probability / 100);
      const market = markets.find(m => String(m.id) === String(marketId));
      const outcomeIndex = market ? market.outcomes.findIndex(o => String(o.id) === String(outcomeId)) : -1;
      const side = outcomeIndex === 0 ? 'YES' : 'NO';
      lmsrMarket.invest(side, stake);
      console.log('LMSR market created and updated');
    }
  }

  // Store locally
  if (typeof predictions === 'undefined') {
    window.predictions = [];
  }
  predictions.push({
    id: Date.now(),
    ...breakdown,
    timestamp: new Date().toISOString(),
    status: 'active'
  });

  // Get educational nudge for confirmation
  const nudge = typeof getRandomNudge === 'function' ? getRandomNudge('general') : '';

  // Show confirmation (no celebratory animations - just clean, informational)
  modal.innerHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-center">
      <div class="w-16 h-16 ${apiSuccess ? 'bg-green-500/20' : 'bg-yellow-500/20'} rounded-full flex items-center justify-center mx-auto mb-4">
        <span class="${apiSuccess ? 'text-green-400' : 'text-yellow-400'} text-3xl">${apiSuccess ? '✓' : '⚠'}</span>
      </div>
      <h3 class="text-xl font-bold text-white mb-2">${apiSuccess ? 'Position Confirmed' : 'Position Saved Locally'}</h3>
      <p class="text-slate-400 mb-4">Your $${stake.toFixed(2)} position has been recorded.</p>
      <div class="bg-slate-800/50 rounded-xl p-4 mb-4 text-left">
        <div class="flex justify-between mb-2">
          <span class="text-slate-400">If outcome occurs:</span>
          <span class="text-green-400 font-semibold">+$${breakdown.winProfit.toFixed(2)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">If outcome doesn't occur:</span>
          <span class="text-yellow-400 font-semibold">$${breakdown.loseReturn.toFixed(2)} refund</span>
        </div>
      </div>
      
      <!-- Educational nudge in confirmation -->
      <div class="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 mb-4">
        <p class="text-slate-400 text-sm italic">"${nudge}"</p>
      </div>
      
      <button onclick="closePredictionModal()" 
        class="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-950 font-bold py-3 rounded-lg">
        Done
      </button>
    </div>
  `;
}

async function submitPrediction(marketId, outcomeId, probability) {
  const stake = parseFloat(document.getElementById('stakeAmount')?.value) || 0;

  if (stake <= 0) {
    alert('Please enter a valid position size');
    return;
  }

  // Show position review instead of direct submission
  showPositionReview(marketId, outcomeId, probability);
}

/**
 * Close prediction modal and refresh the view
 */
function closePredictionModal() {
  const modal = document.querySelector('.fixed');
  if (modal) modal.remove();

  // Refresh markets view if visible
  if (!document.getElementById('marketsView').classList.contains('hidden')) {
    renderMarkets();
  }

  // Refresh detail view if visible
  const detailView = document.getElementById('detailView');
  if (detailView && !detailView.classList.contains('hidden')) {
    // Re-render the current market detail
    const detailContent = document.getElementById('detailContent');
    if (detailContent && detailContent.innerHTML) {
      // Get current market ID from the page and re-render
      const marketCards = document.querySelectorAll('[onclick*="showDetail"]');
      // Just close the modal, user can refresh manually
    }
  }
}

window.showPositionReviewFromModal = showPositionReviewFromModal;
