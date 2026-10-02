const PREFIX = 'samsa_';

export const storage = {
  save: (key, value) => {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch {}
  },
  load: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch { return defaultValue; }
  },
  remove: (key) => { try { localStorage.removeItem(PREFIX + key); } catch {} },
  clear: () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  },
};

// Kept under its old name because several screens import it, but paper
// balances are points, not money, so it formats through the same helper as
// everything else.
import { points } from '../lib/points';
export const formatCurrency = (value) => points(value);

export const formatPercentage = (value) => `${Math.round(value)}%`;

export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const formatRelativeTime = (date) => {
  const diffMs = Date.now() - new Date(date);
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
};

export const truncateText = (text, max = 100) =>
  text && text.length > max ? text.substring(0, max - 3) + '...' : text;

export const CATEGORY_COLORS = {
  technology: '#a855f7',
  sports: '#22c55e',
  entertainment: '#ec4899',
};
