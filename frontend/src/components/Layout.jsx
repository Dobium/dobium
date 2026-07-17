import { Outlet, useLocation } from 'react-router-dom';
import TopNav from './TopNav';
import { HomeTicker } from '../pages/LandingPage';
import Footer from './Footer';
import PaperTradingDisclaimer from './PaperTradingDisclaimer';
import AuthModal from './AuthModal';
import ResolutionModal from './ResolutionModal';

// Note: the old icon-rail Sidebar is intentionally not rendered here anymore.
// TopNav is now the only navigation — that fixed-width left rail was what
// caused the "hybrid old + new UI" look (it sat underneath the new top bar
// on every page, offsetting content 80px to the right).
export default function Layout() {
  const { pathname } = useLocation();

  // The waitlist landing page ships its own terminal-styled nav and footer
  // (per the approved mock), so the global chrome steps aside for it.
  if (pathname === '/waitlist') {
    return (
      <>
        <Outlet />
        <AuthModal />
        <ResolutionModal />
      </>
    );
  }

  return (
    <>
      <PaperTradingDisclaimer />
      <div className="main-content" style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {pathname === '/' && <HomeTicker />}
        <TopNav />
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
        <Footer />
      </div>
      <AuthModal />
      <ResolutionModal />
    </>
  );
}
