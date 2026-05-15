// Use relative URL in production (same domain), absolute for local dev
const API_BASE = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '/api'  // Production: relative URL (same domain)
    : 'http://localhost:3001/api'  // Development: absolute URL
);

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Health
  health: () => request('/health'),

  // Markets
  getMarkets: () => request('/markets'),
  getMarket: (id) => request(`/markets/${id}`),
  getTrending: (limit = 10) => request(`/markets/trending?limit=${limit}`),
  getCurrentEvents: () => request('/markets/current-events'),
  getByCategory: (cat) => request(`/markets/category/${cat}`),
  createMarket: (data) => request('/markets', { method: 'POST', body: JSON.stringify(data) }),
  resolveMarket: (id, winningOutcomeId) =>
    request(`/markets/${id}/resolve`, { method: 'POST', body: JSON.stringify({ winning_outcome_id: winningOutcomeId }) }),

  // Predictions
  getPredictions: (marketId = null) =>
    request(`/predictions${marketId ? `?market_id=${marketId}` : ''}`),
  createPrediction: (data) =>
    request('/predictions', { method: 'POST', body: JSON.stringify(data) }),
  sellPosition: (data) =>
    request('/positions/sell', { method: 'POST', body: JSON.stringify(data) }),

  // Wallet
  getBalance: (userId) => request(`/users/${userId}/balance`),
  deposit: (userId, amount, paymentMethod = 'card') =>
    request(`/users/${userId}/deposit`, { method: 'POST', body: JSON.stringify({ amount, payment_method: paymentMethod }) }),
  withdraw: (userId, amount) =>
    request(`/users/${userId}/withdraw`, { method: 'POST', body: JSON.stringify({ amount }) }),
  getTransactions: (userId) => request(`/users/${userId}/transactions`),
  fixBalance: (userId) =>
    request(`/users/${userId}/fix-balance`, { method: 'POST' }),
};
