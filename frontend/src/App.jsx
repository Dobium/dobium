import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ExplorePage from './pages/ExplorePage';
import PulsePage from './pages/PulsePage';
import RadarPage from './pages/RadarPage';
import TerminalPage from './pages/TerminalPage';
import MarketDetailPage from './pages/MarketDetailPage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboard from './pages/AdminDashboard';
import LeaguesPage from './pages/LeaguesPage';
import LeagueDetailPage from './pages/LeagueDetailPage';
import UserProfilePage from './pages/UserProfilePage';
import GlobalLeaderboardPage from './pages/GlobalLeaderboardPage';
import WaitlistPage from './pages/WaitlistPage';


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
          {/* Front door: the landing page with the real-money waitlist */}
          <Route path="/" element={<LandingPage />} />
          {/* Logged-in portfolio/dashboard lives here now */}
          <Route path="/portfolio" element={<DashboardPage />} />
          <Route path="/charts" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/pulse" element={<PulsePage />} />
          <Route path="/radar" element={<RadarPage />} />
          <Route path="/terminal" element={<TerminalPage />} />
          <Route path="/markets/:id" element={<MarketDetailPage />} />
          <Route path="/leagues" element={<LeaguesPage />} />
          <Route path="/leagues/leaderboard" element={<GlobalLeaderboardPage />} />
          <Route path="/leagues/:id" element={<LeagueDetailPage />} />
          <Route path="/profile/:id" element={<UserProfilePage />} />
          <Route path="/waitlist" element={<WaitlistPage />} />
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
