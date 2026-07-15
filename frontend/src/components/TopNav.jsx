import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';

const LINKS = [
  { label: 'Markets', to: '/' },
  { label: 'Explore', to: '/explore' },
  { label: 'Charts', to: '/portfolio' },
  { label: 'Awards', to: '/explore?filter=awards' },
  { label: 'Waitlist', to: '/waitlist' },
];

// Gold waveform mark — the reference mock's logo (audio bars).
export function WaveMark({ height = 22 }) {
  return (
    <svg viewBox="0 0 28 26" xmlns="http://www.w3.org/2000/svg" style={{ height, width: 'auto', display: 'block' }} aria-hidden="true">
      <g fill="#F3C74F">
        <rect x="0" y="10" width="3.2" height="6" rx="1.6" />
        <rect x="6" y="5" width="3.2" height="16" rx="1.6" />
        <rect x="12" y="1" width="3.2" height="24" rx="1.6" />
        <rect x="18" y="6.5" width="3.2" height="13" rx="1.6" />
        <rect x="24" y="10" width="3.2" height="6" rx="1.6" />
      </g>
    </svg>
  );
}

// Shared dropdown item style
const itemStyle = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '13px 18px', background: 'none', border: 'none',
  color: '#DCE1FF', fontSize: 14, fontWeight: 400, cursor: 'pointer',
  transition: 'background .12s ease',
};

// Right side of the nav — mock layout: stacked PORTFOLIO label + balance,
// flat gold "Portfolio" button. Hovering the block opens the account menu.
function PortfolioBlock({ balance, buttonAction, menuItems }) {
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

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <div style={{ textAlign: 'right', lineHeight: 1.25, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: '#8E94AF' }}>
          PORTFOLIO
        </span>
        <span style={{ display: 'block', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14.5, color: '#F2F5FF', marginTop: 2 }}>
          ${Number(balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <button
        onClick={() => { setOpen(false); buttonAction(); }}
        style={{
          flexShrink: 0, cursor: 'pointer',
          background: '#F3C74F',
          color: '#2A1F00', fontWeight: 800, fontSize: 15,
          border: 'none', borderRadius: 8, padding: '11px 24px',
          fontFamily: 'var(--wordmark)',
        }}
      >
        Portfolio
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0, minWidth: 210,
            background: '#161D3A', border: '1px solid #2A3352', borderRadius: 6,
            boxShadow: '0 12px 30px rgba(0,0,0,.45)', overflow: 'hidden', zIndex: 60,
          }}
        >
          {menuItems.map((it, i) => (
            it.divider ? (
              <div key={`d-${i}`} style={{ borderTop: '1px solid #0A1128' }} />
            ) : it.header ? (
              <div key={`h-${i}`} style={{ padding: '10px 18px 11px', borderBottom: '1px solid #0A1128' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#DCE1FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.header}
                </div>
                {it.sub && (
                  <div style={{ fontSize: 11, color: '#8E94AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {it.sub}
                  </div>
                )}
              </div>
            ) : (
              <button
                key={it.label}
                style={itemStyle}
                onMouseEnter={e => e.currentTarget.style.background = '#1E2540'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                onClick={() => { setOpen(false); it.onClick(); }}
              >
                {it.label}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { session, openAuthModal, logout } = useAuth();
  const { balance } = useWallet();

  const isActive = (to) => {
    const [p, q] = to.split('?');
    if (p !== pathname) return false;
    if (q) return search.includes(q);
    if (p === '/explore') return !search.includes('filter=awards');
    return true;
  };

  const email = session?.user?.email || '';
  const displayName =
    session?.user?.user_metadata?.name ||
    session?.user?.user_metadata?.display_name ||
    email || '';

  const loggedInMenu = [
    { header: displayName, sub: email && email !== displayName ? email : null },
    { label: 'Portfolio', onClick: () => navigate('/portfolio') },
    { label: 'Settings', onClick: () => navigate('/settings') },
    { divider: true },
    { label: 'Sign Out', onClick: () => { logout(); navigate('/'); } },
  ];
  const guestMenu = [
    { label: 'Sign In', onClick: () => openAuthModal('login') },
    { divider: true },
    { label: 'Sign Up', onClick: () => openAuthModal('signup') },
  ];

  return (
    <div
      style={{
        position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', gap: 26,
        padding: '13px 24px',
        background: 'rgba(10,17,40,.97)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #1B2240',
      }}
    >
      {/* Logo — gold waveform mark + gold wordmark */}
      <div
        onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', flexShrink: 0 }}
      >
        <WaveMark height={22} />
        <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 27, background: 'linear-gradient(180deg,#FFDF9B,#F0C04A)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', lineHeight: 1 }}>
          Dobium
        </span>
      </div>

      {/* Nav links — active tab is white with an underline (mock style) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
        {LINKS.map((l) => {
          const active = isActive(l.to);
          return (
            <button
              key={l.label}
              onClick={() => navigate(l.to)}
              style={{
                background: 'transparent', border: 'none',
                padding: '8px 10px 0', cursor: 'pointer', whiteSpace: 'nowrap',
                color: active ? '#FFFFFF' : '#8E94AF',
                fontSize: 15.5, fontWeight: active ? 700 : 500,
                transition: 'color .15s ease',
              }}
            >
              <span style={{ display: 'inline-block', paddingBottom: 8, borderBottom: active ? '2px solid #FFFFFF' : '2px solid transparent' }}>
                {l.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Site-wide search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = e.currentTarget.q.value.trim();
          navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');
        }}
        style={{ position: 'relative', flex: '1 1 240px', maxWidth: 300, minWidth: 130, marginLeft: 'auto' }}
      >
        <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 17, color: '#8E94AF', pointerEvents: 'none' }}>
          search
        </span>
        <input
          name="q"
          type="text"
          placeholder="Trade on Music and Entertainment"
          style={{
            width: '100%', background: '#0D1329', border: '1px solid #2A3352', borderRadius: 8,
            padding: '10px 12px 10px 36px', color: '#DCE1FF', fontSize: 13.5, outline: 'none',
          }}
        />
      </form>

      {/* Right: PORTFOLIO stack + gold button */}
      {session ? (
        <PortfolioBlock
          balance={balance}
          buttonAction={() => navigate('/portfolio')}
          menuItems={loggedInMenu}
        />
      ) : (
        <PortfolioBlock
          balance={balance || 100}
          buttonAction={() => openAuthModal('signup')}
          menuItems={guestMenu}
        />
      )}
    </div>
  );
}
