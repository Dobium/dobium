// Paper balances and amounts are points, not money.
//
// Everything a trader sees — balance, cost, payout, volume, P&L — goes through
// here so it reads one way across the site. A dollar sign on paper money reads
// as real money, which is the betting-app impression Dobium is trying to shed.
// Whole numbers only: fractions of a point add noise and no information.

const trim = (n) => n.toFixed(1).replace(/\.0$/, '');

export function points(value, { compact = false, signed = false } = {}) {
  const n = Math.round(Number(value) || 0);
  const sign = signed && n > 0 ? '+' : '';
  if (compact) {
    const a = Math.abs(n);
    if (a >= 1e6) return `${sign}${trim(n / 1e6)}M points`;
    if (a >= 1e3) return `${sign}${trim(n / 1e3)}K points`;
  }
  return `${sign}${n.toLocaleString('en-US')} points`;
}
