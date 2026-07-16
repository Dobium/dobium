import { useNavigate } from 'react-router-dom';
import { categoryBucket, bucketLabel, bucketIcon } from '../lib/categories';

// Explore-grid market card — matched to the reference mock: colored bucket
// eyebrow + stacked VOL, bold two-line title, curved sparkline, then either
// Yes/No price buttons (binary), a dual-line chart with rows (two-runner
// markets), or top-3 outcome rows with a "View all N options" bar.

const BUCKET_COLORS = {
  trending: '#3DDC84',
  music: '#A78BFA',
  media: '#6FA8FF',
  sports: '#F3C74F',
  awards: '#F3C74F',
  politics: '#F0857B',
};

function trim(x) {
  const v = x.toFixed(1);
  return v.endsWith('.0') ? v.slice(0, -2) : v;
}
function volLabel(n) {
  const v = Number(n || 0);
  if (v >= 1e6) return `$${trim(v / 1e6)}M`;
  if (v >= 1e3) return `$${trim(v / 1e3)}K`;
  return `$${v.toFixed(0)}`;
}

function linePath(data, width, height) {
  const pad = 3;
  const gw = width - pad * 2;
  const gh = height - pad * 2;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * gw,
    y: pad + gh - (Math.max(0, Math.min(100, v)) / 100) * gh,
  }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]; const c = pts[i];
    const cp1 = p.x + (c.x - p.x) / 3;
    const cp2 = p.x + (2 * (c.x - p.x)) / 3;
    d += ` C ${cp1} ${p.y}, ${cp2} ${c.y}, ${c.x} ${c.y}`;
  }
  return d;
}

function seriesFor(market, outcome) {
  const history = market?.price_history || [];
  if (history.length >= 2) return history.map((s) => s.prices?.[outcome.id] ?? outcome.probability ?? 50);
  const p = outcome.probability ?? 50;
  return [p, p];
}

const DUAL_COLORS = ['#F3C74F', '#A78BFA'];

export default function ExploreCard({ market }) {
  const navigate = useNavigate();
  const outcomes = [...(market.outcomes || [])].sort((a, b) => (b.probability || 0) - (a.probability || 0));
  const isBinary = outcomes.length === 2 && outcomes.some((o) => (o.title || '').toLowerCase().startsWith('yes'));
  const bucket = categoryBucket(market.category);
  const accent = BUCKET_COLORS[bucket] || '#F3C74F';

  const yes = isBinary ? outcomes.find((o) => (o.title || '').toLowerCase().startsWith('yes')) : null;
  const no = isBinary ? outcomes.find((o) => !(o.title || '').toLowerCase().startsWith('yes')) : null;
  const yesP = Math.round(yes?.probability || 0);

  const go = () => navigate(`/markets/${market.id}`);

  const W = 280; const H = 46;
  const binarySeries = isBinary ? seriesFor(market, yes) : null;
  const binaryColor = binarySeries && binarySeries[binarySeries.length - 1] >= binarySeries[0] ? '#3DDC84' : '#F0857B';

  return (
    <div
      onClick={go}
      style={{
        display: 'flex', flexDirection: 'column',
        background: '#0D1226', border: '1px solid #262E4E', borderRadius: 8,
        padding: '14px 16px', cursor: 'pointer', transition: 'border-color .15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#F3C74F')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#262E4E')}
    >
      {/* Eyebrow + stacked volume */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, color: accent }}>{bucketIcon(bucket)}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.12em', color: accent }}>
            {bucketLabel(market.category).toUpperCase()}
          </span>
        </span>
        <span style={{ textAlign: 'right', lineHeight: 1.3, flexShrink: 0 }}>
          <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: '0.1em', color: '#7E88A6' }}>VOL:</span>
          <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, color: '#C9D4F2' }}>{volLabel(market.total_volume)}</span>
        </span>
      </div>

      <p style={{ color: '#F2F5FF', fontWeight: 700, fontSize: 13.5, lineHeight: 1.4, margin: '10px 0 12px' }}>
        {market.title}
      </p>

      <div style={{ flex: 1 }} />

      {isBinary ? (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <path d={linePath(binarySeries, W, H)} fill="none" stroke={binaryColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'rgba(61,220,132,.06)', border: '1px solid #2E9E63', borderRadius: 4, padding: '8px 12px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#3DDC84' }}>Yes</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#3DDC84' }}>{yesP}¢</span>
            </span>
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#1A2138', border: '1px solid #2A3352', borderRadius: 4, padding: '8px 12px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#DCE1FF' }}>No</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#F0857B' }}>{Math.round(no?.probability || 0)}¢</span>
            </span>
          </div>
        </>
      ) : outcomes.length === 2 ? (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {outcomes.map((o, i) => (
              <path key={o.id} d={linePath(seriesFor(market, o), W, H)} fill="none" stroke={DUAL_COLORS[i]} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
            ))}
          </svg>
          <div style={{ marginTop: 10 }}>
            {outcomes.map((o) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '5px 0' }}>
                <span style={{ fontSize: 11.5, color: '#DCE1FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700, color: '#F3C74F', flexShrink: 0 }}>{Math.round(o.probability || 0)}¢</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div>
            {outcomes.slice(0, 3).map((o) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '5px 0' }}>
                <span style={{ fontSize: 11.5, color: '#DCE1FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700, color: '#F3C74F', flexShrink: 0 }}>{Math.round(o.probability || 0)}¢</span>
              </div>
            ))}
          </div>
          {outcomes.length > 3 && (
            <span style={{ display: 'block', textAlign: 'center', marginTop: 10, background: '#1A2138', border: '1px solid #2A3352', borderRadius: 4, padding: '8px 0', fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', color: '#C9D4F2' }}>
              View all {outcomes.length} options
            </span>
          )}
        </>
      )}
    </div>
  );
}
