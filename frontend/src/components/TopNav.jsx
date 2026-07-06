import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';

const LINKS = [
  { label: 'Markets', to: '/' },
  { label: 'Explore', to: '/explore' },
  { label: 'Charts', to: '/portfolio' },
  { label: 'Awards', to: '/explore?filter=awards' },
  { label: 'News', to: '/news' },
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
        display: 'flex', alignItems: 'center', gap: 26,
        padding: '10px 24px',
        background: 'rgba(12,16,30,.94)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      {/* Wordmark */}
      <div
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}
      >
        <span style={{
          fontFamily: 'var(--wordmark)', fontWeight: 400, fontSize: 27,
          background: 'linear-gradient(180deg, var(--gold-text), var(--gold-2))',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>
          Dobium
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, overflowX: 'auto', flex: 1, scrollbarWidth: 'none' }}>
        {LINKS.map((l) => {
          const active = isActive(l.to);
          return (
            <button
              key={l.label}
              onClick={() => navigate(l.to)}
              style={{
                position: 'relative',
                padding: '10px 12px', border: 'none', background: 'transparent',
                color: active ? 'var(--text)' : 'var(--muted)',
                fontSize: 13.5, fontWeight: active ? 700 : 500,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color .15s ease',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--muted)'; }}
            >
              {l.label}
              {active && (
                <span style={{
                  position: 'absolute', left: 12, right: 12, bottom: 2, height: 2,
                  background: 'var(--gold)', borderRadius: 2,
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Right: balance + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13.5, color: 'var(--gold)' }}>
          ${Number(balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        {session ? (
          <div style={{
            width: 30, height: 30, borderRadius: 999, flexShrink: 0,
            background: 'var(--card-hover)', border: '1px solid var(--line)',
            color: 'var(--text)', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {initial}
          </div>
        ) : (
          <button
            onClick={() => navigate('/explore')}
            style={{
              background: 'var(--gold)', color: '#1a1405',
              fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12,
              border: 'none', borderRadius: 6, padding: '8px 14px',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Start Predicting
          </button>
        )}
      </div>
    </div>
  );
}
