import { useMemo } from 'react';

// Terminal-mock palette (shared with the restyled pages)
const BAND_BG = '#000E24';
const LABEL = '#6B82A6';
const GREEN = '#6BFE8F';
const RED = '#FF9E8E';

// Under-nav price tape — mock format: "LIVE VOL: $412,842,912" followed by
// per-market "TITLE: 99¢ (+1.2%)" entries, looping as a marquee.
export default function MarketTicker({ markets }) {
  const items = useMemo(() => {
    const list = Array.isArray(markets) ? markets.filter(m => m.status === 'active') : [];
    const liveVol = list.reduce((s, m) => s + (m.total_volume || 0), 0);
    const entries = list.slice(0, 8).map(m => {
      const outs = m.outcomes || [];
      const yes = outs.find(o => (o.title || '').toLowerCase() === 'yes');
      const lead = yes || [...outs].sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];
      const price = Math.round(lead?.probability || 0);
      let delta = 0;
      const hist = m.price_history || [];
      if (lead && hist.length >= 2) {
        const cur = hist[hist.length - 1]?.prices?.[lead.id];
        const prev = hist[hist.length - 2]?.prices?.[lead.id];
        if (typeof cur === 'number' && typeof prev === 'number') delta = cur - prev;
      }
      const name = (m.title || '')
        .replace(/^will\s+/i, '')
        .replace(/\?+\s*$/, '')
        .toUpperCase();
      return {
        label: name.length > 26 ? `${name.slice(0, 26)}…` : name,
        value: `${price}¢`,
        delta,
      };
    });
    return [{ label: 'LIVE VOL', value: `$${Math.round(liveVol).toLocaleString()}`, delta: null, dot: true }, ...entries];
  }, [markets]);

  if (items.length <= 1) return null;

  const renderItem = (it, key) => (
    <span key={key} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, marginRight: 38, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
      {it.dot && <span style={{ width: 5, height: 5, borderRadius: 999, background: GREEN, alignSelf: 'center' }} />}
      <span style={{ color: LABEL, fontWeight: 700 }}>{it.label}:</span>
      <span style={{ color: '#DCE6F5', fontWeight: 700 }}>{it.value}</span>
      {it.delta !== null && it.delta !== 0 && (
        <span style={{ color: it.delta > 0 ? GREEN : RED }}>
          ({it.delta > 0 ? '+' : ''}{it.delta.toFixed(1)}%)
        </span>
      )}
    </span>
  );

  return (
    <div style={{ background: BAND_BG, borderBottom: '1px solid #14223E', overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <div className="dbm-mkt-ticker" style={{ display: 'inline-flex', alignItems: 'center', padding: '9px 0' }}>
        {items.map((it, i) => renderItem(it, `a-${i}`))}
        {items.map((it, i) => renderItem(it, `b-${i}`))}
      </div>
      <style>{`
        @keyframes dbm-mkt-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .dbm-mkt-ticker { animation: dbm-mkt-marquee 52s linear infinite; }
        .dbm-mkt-ticker:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .dbm-mkt-ticker { animation: none; } }
      `}</style>
    </div>
  );
}

