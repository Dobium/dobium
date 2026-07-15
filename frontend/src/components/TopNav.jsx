import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';

const LINKS = [
  { label: 'Markets', to: '/' },
  { label: 'Explore', to: '/explore' },
  { label: 'Charts', to: '/portfolio' },
  { label: 'Awards', to: '/explore?filter=awards' },
];

// Avatar + hover/click dropdown: Portfolio, Settings, Log out.
// Layered on top of the existing Stitch nav — no visual changes to the rest of the bar.
function ProfileMenu({ session, balance }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const wrapRef = useRef(null);

  const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 160); };

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
    session?.user?.user_metadata?.display_name ||
    email ||
    'N';
  const initial = displayName.charAt(0).toUpperCase();

  const itemStyle = {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '13px 18px', background: 'none', border: 'none',
    color: '#DCE1FF', fontSize: 14, fontWeight: 400, cursor: 'pointer',
    transition: 'background .12s ease',
  };

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <div style={{ textAlign: 'right', lineHeight: 1.2, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.12em', color: '#8E94AF', marginBottom: 2 }}>
          PORTFOLIO
        </span>
        <span style={{ display: 'block', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: '#DCE1FF' }}>
          ${Number(balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <button
        onClick={() => { setOpen(false); navigate('/portfolio'); }}
        title={initial}
        style={{
          flexShrink: 0, cursor: 'pointer',
          background: 'linear-gradient(180deg,#FFE9B8,#F0C04A)',
          color: '#3A2A00', fontWeight: 800, fontSize: 13,
          border: 'none', borderRadius: 8, padding: '9px 18px',
          fontFamily: 'var(--wordmark)',
        }}
      >
        Portfolio
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0, minWidth: 210,
            background: '#181E36', border: '1px solid #2D344C', borderRadius: 6,
            boxShadow: '0 12px 30px rgba(0,0,0,.45)', overflow: 'hidden', zIndex: 60,
          }}
        >
          <div style={{ padding: '10px 18px 11px', borderBottom: '1px solid #0B1229' }}>
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
            onMouseEnter={e => e.currentTarget.style.background = '#1E2540'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            onClick={() => { setOpen(false); navigate('/portfolio'); }}
          >
            Portfolio
          </button>
          <button
            style={itemStyle}
            onMouseEnter={e => e.currentTarget.style.background = '#1E2540'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            onClick={() => { setOpen(false); navigate('/settings'); }}
          >
            Settings
          </button>
          <div style={{ borderTop: '1px solid #0B1229' }} />
          <button
            style={itemStyle}
            onMouseEnter={e => e.currentTarget.style.background = '#1E2540'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            onClick={() => { setOpen(false); logout(); navigate('/'); }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

// Logged-out version of the avatar dropdown — matches the reference mockup:
// $100.00 + gold-ringed avatar, menu with Sign In / Sign Up.
function GuestMenu({ balance, openAuthModal }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const wrapRef = useRef(null);

  const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 160); };

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const itemStyle = {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '13px 18px', background: 'none', border: 'none',
    color: '#DCE1FF', fontSize: 14, fontWeight: 400, cursor: 'pointer',
    transition: 'background .12s ease',
  };

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <div style={{ textAlign: 'right', lineHeight: 1.2, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.12em', color: '#8E94AF', marginBottom: 2 }}>
          PORTFOLIO
        </span>
        <span style={{ display: 'block', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: '#DCE1FF' }}>
          ${Number(balance || 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <button
        onClick={() => { setOpen(false); openAuthModal('signup'); }}
        aria-label="Portfolio — sign up"
        style={{
          flexShrink: 0, cursor: 'pointer',
          background: 'linear-gradient(180deg,#FFE9B8,#F0C04A)',
          color: '#3A2A00', fontWeight: 800, fontSize: 13,
          border: 'none', borderRadius: 8, padding: '9px 18px',
          fontFamily: 'var(--wordmark)',
        }}
      >
        Portfolio
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0, minWidth: 210,
            background: '#181E36', border: '1px solid #2D344C', borderRadius: 6,
            boxShadow: '0 12px 30px rgba(0,0,0,.45)', overflow: 'hidden', zIndex: 60,
          }}
        >
          <button
            style={itemStyle}
            onMouseEnter={e => e.currentTarget.style.background = '#1E2540'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            onClick={() => { setOpen(false); openAuthModal('login'); }}
          >
            Sign In
          </button>
          <div style={{ borderTop: '1px solid #0B1229' }} />
          <button
            style={itemStyle}
            onMouseEnter={e => e.currentTarget.style.background = '#1E2540'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            onClick={() => { setOpen(false); openAuthModal('signup'); }}
          >
            Sign Up
          </button>
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { session, openAuthModal } = useAuth();
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
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
              {l.label}
            </button>
          );
        })}
      </div>

      {/* Site-wide search — like Sonotrade's, visible on every page */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = e.currentTarget.q.value.trim();
          navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');
        }}
        style={{ position: 'relative', flex: '1 1 220px', maxWidth: 360, minWidth: 120 }}
      >
        <span className="material-symbols-outlined" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#8E94AF', pointerEvents: 'none' }}>
          search
        </span>
        <input
          name="q"
          type="text"
          placeholder="Trade on Music and Entertainment"
          style={{
            width: '100%', background: '#0B1229', border: '1px solid #33312E', borderRadius: 8,
            padding: '8px 12px 8px 34px', color: '#DCE1FF', fontSize: 13, outline: 'none',
          }}
        />
      </form>

      {/* Right: paper portfolio + profile dropdown, or Log in / Sign up */}
      {session ? (
        <ProfileMenu session={session} balance={balance} />
      ) : (
        <GuestMenu balance={balance} openAuthModal={openAuthModal} />
      )}
    </div>
  );
}
