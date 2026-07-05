// Use relative URL in production (same domain), absolute for local dev
let API_BASE = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '/api'  // Production: relative URL (same domain)
    : 'http://localhost:3001/api'  // Development: absolute URL
);

// Automatically append /api if the user provided a raw base Render URL
if (import.meta.env.VITE_API_URL) {
  API_BASE = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  if (!API_BASE.endsWith('/api')) {
    API_BASE = `${API_BASE}/api`;
  }
}

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
  getPendingResolution: (radarKey) => request('/resolve/pending', { headers: { 'x-radar-key': radarKey } }),
  resolveMarket: (marketId, winningOutcomeIds, radarKey) => request(`/markets/${marketId}/resolve`, { method: 'POST', body: JSON.stringify({ winning_outcome_ids: winningOutcomeIds }), headers: { 'x-radar-key': radarKey } }),

  seedCuratedMarkets: (radarKey) => request('/seed/curated-batch', { method: 'POST', headers: { 'x-radar-key': radarKey } }),

  joinWaitlist: (email) => request('/waitlist', { method: 'POST', body: JSON.stringify({ email }) }),
  getWaitlistCount: () => request('/waitlist/count'),
  getPulse: () => request('/pulse'),

  getSuggestions: (status = 'pending', radarKey) => request(`/market-suggestions?status=${status}`, { headers: { 'x-radar-key': radarKey } }),
  runMarketScout: (radarKey) => request('/cron/market-scout', { headers: { 'x-radar-key': radarKey } }),
  setSuggestionStatus: (id, status, radarKey) => request(`/market-suggestions/${id}/status`, { method: 'POST', body: JSON.stringify({ status }), headers: { 'x-radar-key': radarKey } }),

  getComments: (marketId) => request(`/markets/${marketId}/comments`),
  postComment: (marketId, data) => request(`/markets/${marketId}/comments`, { method: 'POST', body: JSON.stringify(data) }),

  getPredictions: (marketId = null) =>
    request(`/predictions${marketId ? `?market_id=${marketId}` : ''}`),
  createPrediction: (data) =>
    request('/predictions', { method: 'POST', body: JSON.stringify(data) }),
  sellPosition: (data) =>
    request('/positions/sell', { method: 'POST', body: JSON.stringify(data) }),

  // Main Events & Leaderboards
  getEvents: () => request('/events'),
  getGlobalLeaderboard: (limit = 10) => request(`/leaderboard/global?limit=${limit}`),

  // Forecast Leagues
  getLeagues: (userId) => request(`/leagues${userId ? `?user_id=${userId}` : ''}`),
  getLeague: (id, userId) => request(`/leagues/${id}${userId ? `?user_id=${userId}` : ''}`),
  getLeagueLeaderboard: (id) => request(`/leagues/${id}/leaderboard`),
  createLeague: (data) => request('/leagues', { method: 'POST', body: JSON.stringify(data) }),
  joinLeagueByCode: (data) => request('/leagues/join', { method: 'POST', body: JSON.stringify(data) }),
  submitLeaguePrediction: (id, data) => request(`/leagues/${id}/predictions`, { method: 'POST', body: JSON.stringify(data) }),
  exitLeaguePosition: (id, data) => request(`/leagues/${id}/positions/sell`, { method: 'POST', body: JSON.stringify(data) }),
  resolveLeagueMarket: (id, data) => request(`/admin/events/${id}/markets/resolve`, { method: 'POST', body: JSON.stringify(data) }),
  closeLeague: (id) => request(`/admin/events/${id}/close`, { method: 'POST' }),

  // Admin Main Events
  adminGetEvents: (adminEmail) => request(`/admin/events?adminEmail=${encodeURIComponent(adminEmail)}`),
  adminCreateEvent: (data) => request('/admin/events', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateEvent: (id, data) => request(`/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteEvent: (id, adminEmail) => request(`/admin/events/${id}`, { method: 'DELETE', body: JSON.stringify({ adminEmail }) }),
  adminAddEventMarket: (id, data) => request(`/admin/events/${id}/markets`, { method: 'POST', body: JSON.stringify(data) }),
  adminRemoveEventMarket: (id, marketId, adminEmail) => request(`/admin/events/${id}/markets/${marketId}`, { method: 'DELETE', body: JSON.stringify({ adminEmail }) }),
  adminCloseEvent: (id, adminEmail) => request(`/admin/events/${id}/close`, { method: 'POST', body: JSON.stringify({ adminEmail }) }),

  // User Profile
  checkUsername: (username) => request(`/users/check-username?username=${encodeURIComponent(username)}`),
  setUsername: (id, data) => request(`/users/${id}/username`, { method: 'PUT', body: JSON.stringify(data) }),

  // Wallet
  getBalance: (userId) => request(`/users/${userId}/balance`),
  deposit: (userId, amount, paymentMethod = 'card') =>
    request(`/users/${userId}/deposit`, { method: 'POST', body: JSON.stringify({ amount, payment_method: paymentMethod }) }),
  withdraw: (userId, amount) =>
    request(`/users/${userId}/withdraw`, { method: 'POST', body: JSON.stringify({ amount }) }),
  resetDeposits: (userId) =>
    request(`/users/${userId}/reset-deposits`, { method: 'POST' }),
  getTransactions: (userId) => request(`/users/${userId}/transactions`),
  fixBalance: (userId) =>
    request(`/users/${userId}/fix-balance`, { method: 'POST' }),
};
