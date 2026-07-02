import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import PaperTradingDisclaimer from './PaperTradingDisclaimer';
import AuthModal from './AuthModal';
import ResolutionModal from './ResolutionModal';

export default function Layout() {
  return (
    <>
      <PaperTradingDisclaimer />
      <Sidebar />
      <div className="main-content" style={{ background: 'var(--bg)' }}>
        <Outlet />
      </div>
      <AuthModal />
      <ResolutionModal />
    </>
  );
}
