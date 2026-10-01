import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// The homepage and waitlist are the front doors, so they ship in the main
// bundle. Every other page loads its own code the first time it's opened:
// everything used to download as one ~940KB file before anything could draw,
// including admin consoles and terminals almost no visitor ever opens.
import { AuthProvider } from './hooks/useAuth';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const PulsePage = lazy(() => import('./pages/PulsePage'));
import ErrorBoundary from './components/ErrorBoundary';
const RadarPage = lazy(() => import('./pages/RadarPage'));
const MarketMakerPage = lazy(() => import('./pages/MarketMakerPage'));
const NewsTerminalPage = lazy(() => import('./pages/NewsTerminalPage'));
const XTerminalPage = lazy(() => import('./pages/XTerminalPage'));
const XSignalPage = lazy(() => import('./pages/XSignalPage'));
const RedditTerminalPage = lazy(() => import('./pages/RedditTerminalPage'));
const RedditSubPage = lazy(() => import('./pages/RedditSubPage'));
const YouTubeTerminalPage = lazy(() => import('./pages/YouTubeTerminalPage'));
const YouTubeChannelPage = lazy(() => import('./pages/YouTubeChannelPage'));
const TrendsTerminalPage = lazy(() => import('./pages/TrendsTerminalPage'));
const TrendsExplorerPage = lazy(() => import('./pages/TrendsExplorerPage'));
const TerminalPage = lazy(() => import('./pages/TerminalPage'));
const MarketDetailPage = lazy(() => import('./pages/MarketDetailPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const WaitlistAdminPage = lazy(() => import('./pages/WaitlistAdminPage'));
const LeaguesPage = lazy(() => import('./pages/LeaguesPage'));
const LeagueDetailPage = lazy(() => import('./pages/LeagueDetailPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const GlobalLeaderboardPage = lazy(() => import('./pages/GlobalLeaderboardPage'));
import WaitlistPage from './pages/WaitlistPage';


function AppRoutes() {
  // No app-wide wait for the login check. The whole site used to sit behind a
  // full-screen spinner until supabase.auth.getSession() resolved — on every
  // load, for every visitor, including people who have never made an account.
  // With a saved but expired session that meant a network round-trip to
  // Supabase before anything drew, which is the "buffering on reload". No
  // route depends on the session to render; the components that do skip their
  // work until it arrives and re-run when it does.

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
      <Routes>
        <Route path="/auth" element={<Navigate to="/explore" replace />} />
        <Route element={<Layout />}>
          {/* Front door: the landing page with the real-money waitlist */}
          <Route path="/" element={<LandingPage />} />
          {/* Logged-in portfolio/dashboard lives here now */}
          <Route path="/portfolio" element={<DashboardPage />} />
          <Route path="/charts" element={<DashboardPage />} />
          {/* Operations console. Previously /admin — a guessable URL that
              advertised itself. It now lives behind the radar terminal's
              passphrase gate and off any predictable path. */}
          <Route path="/radar/ops" element={<AdminDashboard />} />
          <Route path="/radar/waitlist" element={<WaitlistAdminPage />} />
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/pulse" element={<PulsePage />} />
          <Route path="/radar" element={<RadarPage />} />
          <Route path="/market-maker" element={<MarketMakerPage />} />
          <Route path="/news" element={<NewsTerminalPage />} />
          <Route path="/x" element={<XTerminalPage />} />
          <Route path="/x/:slug" element={<XSignalPage />} />
          <Route path="/reddit" element={<RedditTerminalPage />} />
          <Route path="/reddit/:slug" element={<RedditSubPage />} />
          <Route path="/youtube" element={<YouTubeTerminalPage />} />
          <Route path="/youtube/:slug" element={<YouTubeChannelPage />} />
          <Route path="/trends" element={<TrendsTerminalPage />} />
          <Route path="/trends/:slug" element={<TrendsExplorerPage />} />
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
      </ErrorBoundary>
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
