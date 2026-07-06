import { useState, useEffect, useRef } from 'react';
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

function ProfileMenu() {
  const navigate = useNavigate();
  const { session, logout, openAuthModal } = useAuth();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const wrapRef = useRef(null);

  const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 160); };

  // Close on outside click (covers touch devices, where hover doesn't apply)
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const email = session?.user?.email || '';
  const displayName =
    session?.user?.user_metadata?.name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.display_name ||
    email ||
    'Account';
  const initial = displayName.charAt(0).toUpperCase();

  const itemStyle = {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '10px 14px', background: 'none', border: 'none',
    color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    borderRadius: 6, transition: 'background .12s ease',
  };

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative' }}
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 32, height: 32, borderRadius: 999, flexShrink: 0, cursor: 'pointer',
          background: session ? 'linear-gradient(135deg, var(--gold), #c76fa0)' : 'var(--card-hover)',
          border: '1px solid var(--line)',
          color: session ? '#1a1405' : 'var(--muted)',
          fontWeight: 700, fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {session ? initial : (
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person</span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0, minWidth: 220,
            background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10,
            boxShadow: '0 12px 30px rgba(0,0,0,.45)', padding: 6, zIndex: 60,
          }}
        >
          {session ? (
            <>
              <div style={{ padding: '8px 14px 10px', borderBottom: '1px solid var(--line)', marginBottom: 6 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
                {email && email !== displayName && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {email}
                  </div>
                )}
              </div>
              <button
                style={itemStyle}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                onClick={() => { setOpen(false); navigate('/portfolio'); }}
              >
                Portfolio
              </button>
              <button
                style={itemStyle}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                onClick={() => { setOpen(false); navigate('/settings'); }}
              >
                Settings
              </button>
              <div style={{ borderTop: '1px solid var(--line)', margin: '6px 0' }} />
              <button
                style={{ ...itemStyle, color: 'var(--no)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--no-dim)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                onClick={() => { setOpen(false); logout(); navigate('/'); }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <div style={{ padding: '6px 14px 10px', fontSize: 12, color: 'var(--muted)' }}>
                Sign in to trade and track your portfolio.
              </div>
              <button
                style={{ ...itemStyle, color: 'var(--gold)', fontWeight: 700 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--gold-dim)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                onClick={() => { setOpen(false); openAuthModal(); }}
              >
                Log in
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { balance } = useWallet();

  const isActive = (to) => {
    const [p, q] = to.split('?');
    if (p !== pathname) return false;
    if (q) return search.includes(q);
    if (p === '/explore') return !search.includes('filter=awards');
    return true;
  };

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

      {/* Right: balance + profile dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13.5, color: 'var(--gold)' }}>
          ${Number(balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <ProfileMenu />
      </div>
    </div>
  );
}
