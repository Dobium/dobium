import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { classifySector, SECTORS } from '../lib/sectors';

// Right-hand column beside the featured carousel, per Neel's mockup:
// a dismissible Dobium Terminal promo over a Trending Public Sentiment top-3.
//
// The sentiment list is built from real markets — the three highest-volume
// active ones — with the leading outcome's probability as the headline number.
// The percentage beneath it is the move since the market's last price snapshot,
// omitted when there's no history to compare against rather than invented.

const GOLD = '#FFDF9B';
const GREEN = '#4BE176';
const SALMON = '#FFB4AB';

function leaderOf(m) {
  return [...(m.outcomes || [])].sort((a, b) => (b.probability || 0) - (a.probability || 0))[0] || null;
}

function sectorLabel(m) {
  const id = classifySector(m.title);
  const hit = SECTORS.find((s) => s.id === id);
  return (hit?.label || 'Global Attention').toUpperCase();
}

// Move since the previous snapshot, or null when there's nothing to compare.
function deltaFor(m, outcome) {
  const hist = m.price_history || [];
  if (!outcome || hist.length < 1) return null;
  const prev = hist[hist.length - 1]?.prices?.[outcome.id];
  if (!Number.isFinite(Number(prev))) return null;
  const now = Number(outcome.probability);
  if (!Number.isFinite(now)) return null;
  return Math.round(now - Number(prev));
}

export default function FeaturedRail({ markets = [] }) {
  const navigate = useNavigate();
  const [showPromo, setShowPromo] = useState(true);

  const top = [...markets]
    .filter((m) => m.status === 'active' && (m.outcomes || []).length > 0)
    .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
    .slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      {showPromo && (
        <div style={{
          position: 'relative', background: '#0A2342', border: '1px solid #0A2342',
          borderRadius: 8, padding: '26px 24px 24px', textAlign: 'center',
        }}>
          <button
            onClick={() => setShowPromo(false)}
            aria-label="Dismiss"
            style={{
              position: 'absolute', top: 12, right: 12, background: 'transparent',
              border: 'none', color: '#8A8375', fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: 4,
            }}
          >×</button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 20, color: '#FFFFFF' }}>Dobium Terminal</span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
              color: '#CFC5B5', border: '1px solid #22314A', borderRadius: 4, padding: '3px 7px',
            }}>BETA</span>
          </div>

          <p style={{ color: '#CFC5B5', fontSize: 13.5, lineHeight: 1.6, margin: '0 0 20px' }}>
            Access powerful trading features for both Predictions and Viral Sentiment. Coming soon.
          </p>

          <button
            onClick={() => navigate('/waitlist')}
            style={{
              width: '100%', background: 'transparent', color: '#FFFFFF',
              border: '1px solid #2E3E5C', borderRadius: 8, padding: '13px 18px',
              fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}
          >
            Get started
          </button>
        </div>
      )}

      <div style={{ background: '#0A2342', border: '1px solid #0A2342', borderRadius: 8, padding: '20px 22px 18px' }}>
        <button
          onClick={() => navigate('/explore?filter=attention')}
          style={{
            display: 'flex', alignItems: 'center', gap: 9, background: 'transparent',
            border: 'none', padding: 0, cursor: 'pointer', marginBottom: 18,
          }}
        >
          <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 17, color: '#FFFFFF' }}>
            Trending Public Sentiment
          </span>
          <span style={{ color: GOLD, fontSize: 15 }}>›</span>
        </button>

        {top.length === 0 ? (
          <p style={{ color: '#8A8375', fontSize: 13, margin: 0 }}>No active markets yet.</p>
        ) : top.map((m, i) => {
          const lead = leaderOf(m);
          const pct = Math.round(Number(lead?.probability) || 0);
          const delta = deltaFor(m, lead);
          return (
            <div
              key={m.id}
              onClick={() => navigate(`/markets/${m.id}`)}
              style={{
                display: 'flex', gap: 14, alignItems: 'flex-start', cursor: 'pointer',
                padding: '13px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(34,49,74,.7)',
              }}
            >
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#8A8375', flexShrink: 0, paddingTop: 2 }}>{i + 1}</span>

              <span style={{
                fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                color: GOLD, flexShrink: 0, width: 74, lineHeight: 1.45, paddingTop: 2,
              }}>
                SECTOR:<br />{sectorLabel(m)}
              </span>

              <span style={{ flex: 1, minWidth: 0, color: '#DCE1FF', fontSize: 13, lineHeight: 1.45 }}>
                {m.title}
              </span>

              <span style={{ flexShrink: 0, textAlign: 'right' }}>
                <span style={{ display: 'block', fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 17, color: '#FFFFFF' }}>
                  {pct}%
                </span>
                {delta !== null && delta !== 0 && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: delta < 0 ? SALMON : GREEN }}>
                    {delta < 0 ? '↓' : '↑'} {Math.abs(delta)}%
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
