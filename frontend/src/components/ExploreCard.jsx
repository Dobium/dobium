import { useNavigate } from 'react-router-dom';
import { categoryBucket, bucketLabel, bucketIcon } from '../lib/categories';

// Explore-grid market card — matched to the reference mock.
//
// Data note: multi-option markets store each option as a PAIR of outcomes,
// "Name (Yes)" and "Name (No)". Rendering those raw produces duplicate rows
// and ~100¢ prices (the No sides). collapseOutcomes() folds each pair into
// one option priced at its YES probability — which is what the mock shows
// ("Yan Diomande (CIV)  2¢").

const YES_RE = /\s*\((yes)\)\s*$/i;
const NO_RE = /\s*\((no)\)\s*$/i;

function collapseOutcomes(outcomes) {
  const hasPairs = outcomes.some((o) => YES_RE.test(o.title || '') || NO_RE.test(o.title || ''));
  if (!hasPairs) return outcomes;
  const byName = new Map();
  for (const o of outcomes) {
    const t = o.title || '';
    if (YES_RE.test(t)) {
      const name = t.replace(YES_RE, '').trim();
      byName.set(name, { id: o.id, title: name, probability: o.probability ?? 50 });
    }
  }
  for (const o of outcomes) {
    const t = o.title || '';
    if (NO_RE.test(t)) {
      const name = t.replace(NO_RE, '').trim();
      if (!byName.has(name)) byName.set(name, { id: o.id, title: name, probability: 100 - (o.probability ?? 50), inverted: true });
    }
  }
  return byName.size > 0 ? [...byName.values()] : outcomes;
}

// Eyebrow meta: prefer the market's RAW category (the mock shows gold
// SPORTS/AWARDS even though filtering buckets them under Trending), fall
// back to the bucket.
const RAW_META = {
  sports: { label: 'SPORTS', icon: 'sports_basketball', color: '#F3C74F' },
  awards: { label: 'AWARDS', icon: 'emoji_events', color: '#F3C74F' },
  politics: { label: 'POLITICS', icon: 'gavel', color: '#F0857B' },
  music: { label: 'MUSIC', icon: 'music_note', color: '#A78BFA' },
  festivals: { label: 'FESTIVALS', icon: 'festival', color: '#3DDC84' },
};
const BUCKET_META = {
  trending: { color: '#3DDC84' },
  music: { color: '#A78BFA' },
  media: { color: '#6FA8FF' },
  politics: { color: '#F0857B' },
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

// Auto-scaled curve: the y-domain fits the series (with padding) instead of
// a fixed 0-100, so real price movement fills the chart like the mock —
// a 97→99 move is a visible climb, not a flat line at the top edge.
function buildPath(data, width, height, domain) {
  const pad = 3;
  const gw = width - pad * 2;
  const gh = height - pad * 2;
  const [lo, hi] = domain;
  const span = Math.max(hi - lo, 0.0001);
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * gw,
    y: pad + gh - ((v - lo) / span) * gh,
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

function domainFor(seriesList) {
  const all = seriesList.flat();
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (hi - lo < 4) { // near-flat: frame around the line
    const mid = (hi + lo) / 2;
    lo = mid - 2; hi = mid + 2;
  } else {
    const padY = (hi - lo) * 0.12;
    lo -= padY; hi += padY;
  }
  return [Math.max(0, lo), Math.min(100, hi)];
}

function seriesFor(market, outcome) {
  const history = market?.price_history || [];
  let data;
  if (history.length >= 2) data = history.map((s) => s.prices?.[outcome.id] ?? outcome.probability ?? 50);
  else { const p = outcome.probability ?? 50; data = [p, p]; }
  return outcome.inverted ? data.map((v) => 100 - v) : data;
}

const DUAL_COLORS = ['#F3C74F', '#A78BFA'];
const W = 280; const H = 64;

export default function ExploreCard({ market }) {
  const navigate = useNavigate();
  const raw = market.outcomes || [];
  const isBinary = raw.length === 2 && raw.some((o) => (o.title || '').toLowerCase().startsWith('yes'));
  const options = isBinary ? raw : collapseOutcomes(raw).sort((a, b) => (b.probability || 0) - (a.probability || 0));

  const bucket = categoryBucket(market.category);
  const meta = RAW_META[(market.category || '').toLowerCase()] || {
    label: bucketLabel(market.category).toUpperCase(),
    icon: bucketIcon(bucket),
    color: (BUCKET_META[bucket] || {}).color || '#F3C74F',
  };

  const yes = isBinary ? raw.find((o) => (o.title || '').toLowerCase().startsWith('yes')) : null;
  const no = isBinary ? raw.find((o) => !(o.title || '').toLowerCase().startsWith('yes')) : null;

  const go = () => navigate(`/markets/${market.id}`);

  let chart = null;
  if (isBinary) {
    const s = seriesFor(market, yes);
    const color = s[s.length - 1] >= s[0] ? '#3DDC84' : '#F0857B';
    chart = (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <path d={buildPath(s, W, H, domainFor([s]))} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  } else if (options.length === 2) {
    const seriesList = options.map((o) => seriesFor(market, o));
    const domain = domainFor(seriesList);
    chart = (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {seriesList.map((s, i) => (
          <path key={options[i].id} d={buildPath(s, W, H, domain)} fill="none" stroke={DUAL_COLORS[i]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
        ))}
      </svg>
    );
  }

  return (
    <div
      onClick={go}
      style={{
        display: 'flex', flexDirection: 'column',
        background: '#0D1226', border: '1px solid #262E4E', borderRadius: 8,
        padding: '16px 18px', cursor: 'pointer', transition: 'border-color .15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#F3C74F')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#262E4E')}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: meta.color }}>{meta.icon}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: meta.color }}>
            {meta.label}
          </span>
        </span>
        <span style={{ textAlign: 'right', lineHeight: 1.3, flexShrink: 0 }}>
          <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', color: '#7E88A6' }}>VOL:</span>
          <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: '#C9D4F2' }}>{volLabel(market.total_volume)}</span>
        </span>
      </div>

      <p style={{ color: '#F2F5FF', fontWeight: 700, fontSize: 14.5, lineHeight: 1.4, margin: '12px 0 14px' }}>
        {market.title}
      </p>

      <div style={{ flex: 1 }} />

      {isBinary ? (
        <>
          {chart}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'rgba(61,220,132,.06)', border: '1px solid #2E9E63', borderRadius: 4, padding: '9px 14px' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#3DDC84' }}>Yes</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 700, color: '#3DDC84' }}>{Math.round(yes?.probability || 0)}¢</span>
            </span>
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#1A2138', border: '1px solid #3A2A32', borderRadius: 4, padding: '9px 14px' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#DCE1FF' }}>No</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 700, color: '#F0857B' }}>{Math.round(no?.probability || 0)}¢</span>
            </span>
          </div>
        </>
      ) : options.length === 2 ? (
        <>
          {chart}
          <div style={{ marginTop: 12 }}>
            {options.map((o, i) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: i < options.length - 1 ? '1px solid #1A2138' : 'none' }}>
                <span style={{ fontSize: 12, color: '#DCE1FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#F3C74F', flexShrink: 0 }}>{Math.round(o.probability || 0)}¢</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div>
            {options.slice(0, 3).map((o, i) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: i < Math.min(options.length, 3) - 1 ? '1px solid #1A2138' : 'none' }}>
                <span style={{ fontSize: 12, color: '#DCE1FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#F3C74F', flexShrink: 0 }}>{Math.round(o.probability || 0)}¢</span>
              </div>
            ))}
          </div>
          {options.length > 3 && (
            <span style={{ display: 'block', textAlign: 'center', marginTop: 12, background: '#1A2138', border: '1px solid #2A3352', borderRadius: 4, padding: '9px 0', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: '#C9D4F2' }}>
              View all {options.length} options
            </span>
          )}
        </>
      )}
    </div>
  );
}
