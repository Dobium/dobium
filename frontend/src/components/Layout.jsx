import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <>
      <Sidebar />
      <div className="main-content" style={{ background: 'var(--bg)' }}>
        <Outlet />
      </div>
    </>
  );
}
