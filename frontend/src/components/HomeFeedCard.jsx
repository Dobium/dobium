import { useNavigate } from 'react-router-dom';
import { bucketLabel } from '../lib/categories';
import MarketIcon from './MarketIcon';

// Home-feed market card — matched to the mock: big square icon tile on the
// left, gold category + volume line, bold question, YES/NO percentages
// underneath, and compact Yes/No buttons on the right edge.
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

  const go = () => navigate(`/markets/${market.id}`);

  return (
    <div
      onClick={go}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        background: '#181E36', border: '1px solid #2D344C', borderRadius: 12,
        padding: 16, cursor: 'pointer', transition: 'border-color .15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#FFDF9B')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2D344C')}
    >
      <MarketIcon market={market} size={88} radius={10} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', color: '#FFDF9B' }}>
            {bucketLabel(market.category).toUpperCase()}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#8E94AF' }}>VOL: {volLabel}</span>
        </div>
        <p style={{ color: '#DCE1FF', fontWeight: 700, fontSize: 14.5, lineHeight: 1.35, margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {market.title}
        </p>
        {isBinary ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700 }}>
            <span style={{ color: '#4AE176' }}>YES {chancePct}%</span>
            <span style={{ color: '#8E94AF' }}>NO {100 - chancePct}%</span>
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: '#FFDF9B' }}>
            {chanceLabel}
          </div>
        )}
      </div>

      {isBinary && (
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); go(); }}
            style={{ fontWeight: 700, fontSize: 12.5, background: '#232A45', border: '1px solid #3A4160', color: '#DCE1FF', borderRadius: 8, padding: '9px 20px', cursor: 'pointer' }}>
            Yes
          </button>
          <button onClick={(e) => { e.stopPropagation(); go(); }}
            style={{ fontWeight: 700, fontSize: 12.5, background: '#232A45', border: '1px solid #3A4160', color: '#DCE1FF', borderRadius: 8, padding: '9px 20px', cursor: 'pointer' }}>
            No
          </button>
        </div>
      )}
    </div>
  );
}
