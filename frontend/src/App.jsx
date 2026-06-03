import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ExplorePage from './pages/ExplorePage';
import MarketDetailPage from './pages/MarketDetailPage';
import NewsPage from './pages/NewsPage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboard from './pages/AdminDashboard';
import LeaguesPage from './pages/LeaguesPage';
import LeagueDetailPage from './pages/LeagueDetailPage';
import UserProfilePage from './pages/UserProfilePage';


function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/auth" element={<Navigate to="/explore" replace />} />
        <Route element={<Layout />}>
          <Route path="/" element={session ? <DashboardPage /> : <Navigate to="/explore" replace />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/portfolio" element={<Navigate to="/" replace />} />
          <Route path="/markets/:id" element={<MarketDetailPage />} />
          <Route path="/leagues" element={<LeaguesPage />} />
          <Route path="/leagues/:id" element={<LeagueDetailPage />} />
          <Route path="/profile/:id" element={<UserProfilePage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
