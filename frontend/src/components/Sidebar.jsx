import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { points } from '../lib/points';

export default function Sidebar() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const { balance } = useWallet();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <>
      <div className="sidebar">
        <div className="sidebar-content">
          {/* Logo */}
          <div className="sidebar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="sidebar-logo-icon">
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="sidebar-logo-img">
            <defs>
              <linearGradient id="sideGoldG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FFDF9B" /><stop offset="1" stopColor="#F0C04A" />
              </linearGradient>
            </defs>
            <path d="M11.5 7.5 h5 a8.5 8.5 0 0 1 0 17 h-5 Z" stroke="url(#sideGoldG)" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
            </div>
            <div style={{ textAlign: 'center', lineHeight: 1.2, opacity: 0, transition: 'opacity 0.3s' }} className="sidebar-balance-chip">
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--gold)', fontSize: 13 }}>
                {points(balance)}
              </span>
              <span style={{ display: 'block', fontFamily: 'inherit', fontWeight: 500, color: 'var(--muted)', fontSize: 10 }}>
                Paper portfolio
              </span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <NavLink to="/explore" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
              <div className="sidebar-item-icon">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <span className="sidebar-item-text">Explore</span>
            </NavLink>

            <NavLink to="/portfolio" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
              <div className="sidebar-item-icon">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <span className="sidebar-item-text">Dashboard</span>
            </NavLink>
          </nav>

          <div className="sidebar-footer">
            {session && (
              <button className="sidebar-item" onClick={handleLogout}>
                <div className="sidebar-item-icon">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                </div>
                <span className="sidebar-item-text">Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
