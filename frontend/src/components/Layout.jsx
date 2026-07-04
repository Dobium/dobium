import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import PaperTradingDisclaimer from './PaperTradingDisclaimer';
import AuthModal from './AuthModal';
import ResolutionModal from './ResolutionModal';

export default function Layout() {
  return (
    <>
      <PaperTradingDisclaimer />
      <Sidebar />
      <div className="main-content" style={{ background: 'var(--bg)' }}>
        <TopNav />
        <Outlet />
      </div>
      <AuthModal />
      <ResolutionModal />
    </>
  );
}
