import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import PaperTradingDisclaimer from './PaperTradingDisclaimer';
import AuthModal from './AuthModal';
import ResolutionModal from './ResolutionModal';

// Note: the old icon-rail Sidebar is intentionally not rendered here anymore.
// TopNav is now the only navigation — that fixed-width left rail was what
// caused the "hybrid old + new UI" look (it sat underneath the new top bar
// on every page, offsetting content 80px to the right).
export default function Layout() {
  return (
    <>
      <PaperTradingDisclaimer />
      <div className="main-content" style={{ background: 'var(--bg)' }}>
        <TopNav />
        <Outlet />
      </div>
      <AuthModal />
      <ResolutionModal />
    </>
  );
}
