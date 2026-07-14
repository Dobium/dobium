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
        display: 'flex', alignItems: 'center', gap: 16,
        background: '#181E36', border: '1px solid #33312E', borderRadius: 10,
        padding: '14px 16px', cursor: 'pointer', transition: 'border-color .15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#FFDF9B')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#33312E')}
    >
      <MarketIcon market={market} size={46} radius={8} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', color: '#D2C5AF', background: '#2D344C', borderRadius: 3, padding: '2px 7px' }}>
            {bucketLabel(market.category).toUpperCase()}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#948D87' }}>VOL: {volLabel}</span>
        </div>
        <p style={{ color: '#DCE1FF', fontWeight: 700, fontSize: 14, lineHeight: 1.35, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {market.title}
        </p>
      </div>

      {isBinary ? (
        <>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'right', flexShrink: 0 }}>
            <div style={{ color: '#4AE176', fontWeight: 700 }}>YES {chancePct}%</div>
            <div style={{ color: '#8E94AF', marginTop: 3 }}>NO {100 - chancePct}%</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={(e) => { e.stopPropagation(); go(); }}
              style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12, background: 'rgba(74,225,118,.12)', border: '1px solid #2E7D4F', color: '#4AE176', borderRadius: 6, padding: '8px 18px', cursor: 'pointer' }}>
              Yes
            </button>
            <button onClick={(e) => { e.stopPropagation(); go(); }}
              style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12, background: '#232A45', border: '1px solid #33312E', color: '#DCE1FF', borderRadius: 6, padding: '8px 18px', cursor: 'pointer' }}>
              No
            </button>
          </div>
        </>
      ) : (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: '#FFDF9B', fontWeight: 700, flexShrink: 0 }}>
          {chanceLabel}
        </div>
      )}
    </div>
  );
}
