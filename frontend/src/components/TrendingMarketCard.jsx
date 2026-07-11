import { useNavigate } from 'react-router-dom';
import MarketIcon from './MarketIcon';
import { bucketLabel } from '../lib/categories';

// Trending market card — used ONLY on the landing page.
// Pixel-matched to the approved mockup: mono category chip + thumbnail on top,
// title, then a divider and a Yes/No price row with volume on the right.
// (ExplorePage keeps the shared MarketCard with sparklines.)


function compactMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function yesNoPrices(market) {
  const outcomes = market.outcomes || [];
  const yes = outcomes.find((o) => (o.title || '').toLowerCase().startsWith('yes')) || outcomes[0];
  const no = outcomes.find((o) => (o.title || '').toLowerCase().startsWith('no')) || outcomes[1];
  const yesPrice = Math.round(yes?.probability ?? 50);
  const noPrice = no ? Math.round(no.probability ?? (100 - yesPrice)) : 100 - yesPrice;
  return { yesPrice, noPrice };
}

export default function TrendingMarketCard({ market }) {
  const navigate = useNavigate();
  const { yesPrice, noPrice } = yesNoPrices(market);

  return (
    <div
      onClick={() => navigate(`/markets/${market.id}`)}
      style={{
        background: '#181E36',
        border: '1px solid #33312E',
        borderRadius: 6,
        padding: '16px 16px 14px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 190,
        cursor: 'pointer',
        transition: 'border-color .15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#FFDF9B')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#33312E')}
    >
      {/* Top row: category chip left, thumbnail right */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: '#D2C5AF',
            background: '#2D344C',
            borderRadius: 3,
            padding: '4px 8px',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {bucketLabel(market.category)}
        </span>
        {market.image_url && /^https?:/.test(market.image_url) ? (
          <img
            src={market.image_url}
            alt=""
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <MarketIcon market={market} size={40} radius={6} />
        )}
      </div>

      {/* Title */}
      <h3
        className="line-clamp-2"
        style={{
          color: '#DCE1FF',
          fontSize: 15,
          fontWeight: 500,
          lineHeight: 1.45,
          margin: 0,
        }}
      >
        {market.title}
      </h3>

      {/* Spacer pushes the price row to the bottom */}
      <div style={{ flex: 1, minHeight: 24 }} />

      {/* Divider + bottom row */}
      <div
        style={{
          borderTop: '1px solid rgba(45,52,76,.7)',
          paddingTop: 10,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontFamily: 'var(--mono)' }}>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, lineHeight: 1 }}>
            <span style={{ color: '#64EB87' }}>Yes</span>
            <span style={{ color: '#FFB4AB' }}>No</span>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 13, color: '#DCE1FF', marginTop: 5, lineHeight: 1 }}>
            <span>{yesPrice}¢</span>
            <span>{noPrice}¢</span>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#CCC0AB', lineHeight: 1 }}>Vol.</div>
          <div style={{ fontSize: 13, color: '#DCE1FF', marginTop: 5, lineHeight: 1 }}>
            {compactMoney(market.total_volume || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
