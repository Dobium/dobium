import { useNavigate } from 'react-router-dom';

// Per-category chip colors from the reference mock (FESTIVALS green,
// AWARDS gold); everything else stays in the same palette family.
const CHIP_COLORS = [
  [/festival/, '#3DDC84'],
  [/award|grammy/, '#F3C74F'],
  [/music|hip ?hop/, '#F0857B'],
  [/entertainment|media|movie|tv|streaming|celebrity|culture|gaming/, '#8F9BE8'],
];
function chipColor(category) {
  const c = (category || '').toLowerCase();
  for (const [re, color] of CHIP_COLORS) if (re.test(c)) return color;
  return '#F3C74F';
}

// Home-feed market card — matched to the reference mock: big deep-indigo
// square tile with a small glyph, colored category chip + VOL line, bold
// question, YES/NO label-over-value stats, blue Yes / dark No buttons
// bottom-aligned with the stats row.
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
  const trim = (x) => { const v = x.toFixed(1); return v.endsWith('.0') ? v.slice(0, -2) : v; };
  const volLabel = vol >= 1e6 ? `$${trim(vol / 1e6)}M` : vol >= 1e3 ? `$${trim(vol / 1e3)}K` : `$${vol.toFixed(0)}`;

  const go = () => navigate(market.demo ? '/explore' : `/markets/${market.id}`);

  return (
    <div
      onClick={go}
      style={{
        display: 'flex', alignItems: 'center', gap: 18,
        background: '#161D3A', border: '1px solid #2A3352', borderRadius: 10,
        padding: 18, cursor: 'pointer', transition: 'border-color .15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#F3C74F')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2A3352')}
    >
      {/* Artwork placeholder tile — deep indigo with a small glyph */}
      <span style={{
        width: 148, height: 148, borderRadius: 8, background: '#1B2150', flexShrink: 0,
        alignItems: 'center', justifyContent: 'center',
      }} className="hidden sm:flex">
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#6F7BD9' }}>image</span>
      </span>

      <div style={{ flex: 1, minWidth: 0, padding: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', color: chipColor(market.category), background: `${chipColor(market.category)}1F`, borderRadius: 3, padding: '3px 8px' }}>
            {(market.category || 'trending').toUpperCase()}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: '#D2C5AF' }}>VOL: {volLabel}</span>
        </div>
        <p style={{ color: '#F2F5FF', fontWeight: 700, fontSize: 15, lineHeight: 1.4, margin: '0 0 14px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {market.title}
        </p>
        {isBinary ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 30 }}>
            <span>
              <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#8E94AF' }}>YES</span>
              <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800, color: '#F2F5FF', marginTop: 3 }}>{chancePct}%</span>
            </span>
            <span>
              <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#8E94AF' }}>NO</span>
              <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800, color: '#F2F5FF', marginTop: 3 }}>{100 - chancePct}%</span>
            </span>
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700, color: '#F3C74F' }}>
            {chanceLabel}
          </div>
        )}
      </div>

      {isBinary && (
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignSelf: 'flex-end', paddingBottom: 6 }}>
          <button onClick={(e) => { e.stopPropagation(); go(); }}
            style={{ fontWeight: 700, fontSize: 13, background: '#3E4FD8', border: 'none', color: '#FFFFFF', borderRadius: 6, padding: '9px 22px', cursor: 'pointer' }}>
            Yes
          </button>
          <button onClick={(e) => { e.stopPropagation(); go(); }}
            style={{ fontWeight: 700, fontSize: 13, background: '#232A45', border: '1px solid #3A4160', color: '#DCE1FF', borderRadius: 6, padding: '9px 22px', cursor: 'pointer' }}>
            No
          </button>
        </div>
      )}
    </div>
  );
}
