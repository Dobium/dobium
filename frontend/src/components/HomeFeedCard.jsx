import { useNavigate } from 'react-router-dom';
import { bucketLabel } from '../lib/categories';
import MarketIcon from './MarketIcon';

// Home-feed market card — the approved mockup design: category chip + live
// status up top, bold question, VOLUME / CHANCE row, big Yes/No price
// buttons. (Explore keeps its own MarketCard; this is homepage-only.)
export default function HomeFeedCard({ market }) {
  const navigate = useNavigate();
  const outcomes = market.outcomes || [];
  const isBinary =
    outcomes.length === 2 &&
    outcomes.some((o) => (o.title || '').toLowerCase().startsWith('yes'));

  const yes = isBinary ? outcomes.find((o) => (o.title || '').toLowerCase().startsWith('yes')) : null;
  const leader = [...outcomes].sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];
  const chancePct = Math.round((isBinary ? yes?.probability : leader?.probability) || 0);
  const chanceLabel = isBinary
    ? `${chancePct}% Yes`
    : leader
      ? `${chancePct}% ${(leader.title || '').replace(/\s*\((Yes|No)\)\s*$/i, '').slice(0, 14)}`
      : '—';

  const vol = Number(market.total_volume || 0);
  const volLabel = vol >= 1e6 ? `$${(vol / 1e6).toFixed(1)}M` : vol >= 1e3 ? `$${(vol / 1e3).toFixed(1)}K` : `$${vol.toFixed(0)}`;

  const yesPrice = isBinary ? `$${(chancePct / 100).toFixed(2)}` : null;
  const noPrice = isBinary ? `$${((100 - chancePct) / 100).toFixed(2)}` : null;

  const go = () => navigate(`/markets/${market.id}`);

  return (
    <div
      onClick={go}
      style={{
        background: '#181E36', border: '1px solid #33312E', borderRadius: 10,
        padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'border-color .15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#FFDF9B')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#33312E')}
    >
      {/* Top row: icon + category chip left, live status right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <MarketIcon market={market} size={22} radius={5} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#D2C5AF', background: '#2D344C', borderRadius: 4, padding: '3px 8px' }}>
            {bucketLabel(market.category)}
          </span>
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em', color: '#4AE176', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#4AE176', display: 'inline-block' }} />
          {market.status === 'active' ? 'LIVE' : 'CLOSED'}
        </span>
      </div>

      {/* Question */}
      <p style={{ color: '#DCE1FF', fontWeight: 700, fontSize: 14.5, lineHeight: 1.4, margin: 0, minHeight: 40, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {market.title}
      </p>

      {/* Volume / Chance row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', fontFamily: 'var(--mono)' }}>
        <span>
          <span style={{ display: 'block', fontSize: 9.5, letterSpacing: '0.08em', color: '#948D87', marginBottom: 3 }}>VOLUME</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#DCE1FF' }}>{volLabel}</span>
        </span>
        <span style={{ textAlign: 'right' }}>
          <span style={{ display: 'block', fontSize: 9.5, letterSpacing: '0.08em', color: '#948D87', marginBottom: 3 }}>CHANCE</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#4AE176' }}>{chanceLabel}</span>
        </span>
      </div>

      {/* Price buttons */}
      {isBinary ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={(e) => { e.stopPropagation(); go(); }}
            style={{ flex: 1, background: '#12351F', color: '#4AE176', border: '1px solid #1D4A2C', borderRadius: 6, padding: '9px 0', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
          >
            Yes {yesPrice}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); go(); }}
            style={{ flex: 1, background: '#251B32', color: '#FFB4AB', border: '1px solid #3A2A44', borderRadius: 6, padding: '9px 0', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
          >
            No {noPrice}
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); go(); }}
          style={{ width: '100%', background: '#2D344C', color: '#FFDF9B', border: 'none', borderRadius: 6, padding: '9px 0', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
        >
          Trade {outcomes.length} outcomes →
        </button>
      )}
    </div>
  );
}
