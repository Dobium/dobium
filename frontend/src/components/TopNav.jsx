import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';

const LINKS = [
  { label: 'Markets', to: '/' },
  { label: 'Explore', to: '/explore' },
  { label: 'Chart Performance', to: '/leagues/leaderboard' },
  { label: 'Awards', to: '/explore?filter=awards' },
  { label: 'Latest News', to: '/news' },
];

export default function TopNav() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { session } = useAuth();
  const { balance } = useWallet();

  const isActive = (to) => {
    const [p, q] = to.split('?');
    if (p !== pathname) return false;
    if (q) return search.includes(q);
    if (p === '/explore') return !search.includes('filter=awards');
    return true;
  };

  const initial = (
    session?.user?.user_metadata?.name ||
    session?.user?.user_metadata?.display_name ||
    session?.user?.email ||
    'N'
  ).charAt(0).toUpperCase();

  return (
    <div
      style={{
        position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        padding: '10px 20px',
        background: 'rgba(10,17,40,.94)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      {/* Logo */}
      <div
        onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', flexShrink: 0 }}
      >
        <svg viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg" style={{ height: 26, width: 'auto' }}>
          <defs>
            <linearGradient id="navGoldG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFDF9B" /><stop offset="1" stopColor="#F0C04A" />
            </linearGradient>
          </defs>
          <g stroke="url(#navGoldG)" strokeWidth="14" strokeLinejoin="round" fill="url(#navGoldG)">
            <path d="M60 12 L104 34 L104 78 L60 100 L16 78 L16 34 Z" />
          </g>
          <path d="M16 34 L60 54 L104 34 M60 54 L60 100" stroke="#0A1128" strokeWidth="4.5" fill="none" strokeLinecap="round" opacity=".9" />
          <path d="M68 62 C88 58 94 68 94 76 C94 86 84 92 70 90 C68.5 89.7 68 88 68 86 L68 66 C68 64 68 62.4 68 62 Z" fill="#0A1128" />
          <ellipse cx="78" cy="30" rx="6.5" ry="4.2" fill="#0A1128" transform="rotate(8 78 30)" />
          <ellipse cx="30" cy="56" rx="4.6" ry="5.4" fill="#0A1128" transform="rotate(-18 30 56)" />
          <ellipse cx="40" cy="74" rx="4.6" ry="5.4" fill="#0A1128" transform="rotate(-18 40 74)" />
        </svg>
        <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 600, fontSize: 25, background: 'linear-gradient(180deg,#FFDF9B,var(--gold-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', lineHeight: 1 }}>
          Dobium
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', flex: 1, scrollbarWidth: 'none' }}>
        {LINKS.map((l) => {
          const active = isActive(l.to);
          return (
            <button
              key={l.label}
              onClick={() => navigate(l.to)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', borderRadius: 10, border: 'none',
                background: active ? 'rgba(148,163,184,.13)' : 'transparent',
                color: active ? 'var(--text)' : 'var(--muted)',
                fontSize: 14, fontWeight: active ? 600 : 500,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s ease',
              }}
            >
              {active && (
                <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--no)', display: 'inline-block' }} />
              )}
              {l.label}
            </button>
          );
        })}
      </div>

      {/* Right: paper portfolio */}
      {session ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
            <span style={{ display: 'block', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: 'var(--gold)' }}>
              ${Number(balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Paper portfolio</span>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: 999, flexShrink: 0,
            background: 'linear-gradient(180deg,#FFDF9B,var(--gold-2))',
            color: '#1a1405', fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {initial}
          </div>
        </div>
      ) : (
        <button
          onClick={() => navigate('/explore')}
          style={{
            background: 'linear-gradient(180deg,#FFDF9B,var(--gold-2))',
            color: '#1a1405', fontWeight: 700, fontSize: 13,
            border: 'none', borderRadius: 10, padding: '9px 16px',
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          Start Predicting
        </button>
      )}
    </div>
  );
}
