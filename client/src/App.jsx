import { Outlet, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LandingPage from './pages/LandingPage.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import GamesPage from './pages/GamesPage.jsx';
import PlayPage from './pages/PlayPage.jsx';
import LocalGamesPage from './pages/LocalGamesPage.jsx';
import LocalSetupPage from './pages/LocalSetupPage.jsx';
import LocalGamePage from './pages/LocalGamePage.jsx';
import RoomsPage from './pages/RoomsPage.jsx';
import WaitingRoomPage from './pages/WaitingRoomPage.jsx';
import GamePage from './pages/GamePage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import { LocalGameProvider } from './local/LocalGameContext.jsx';
import Icon from './components/Icon.jsx';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="page center not-found">
      <span className="eyebrow"><Icon name="compass" size={15} /> Wrong turn</span>
      <h1>404 — Game over</h1>
      <p className="muted">This page is not in the arcade. Let’s get you back to the fun.</p>
      <Link to="/" className="btn btn--primary btn--lg">Back to FunZone <Icon name="arrow" size={17} /></Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/local" element={<LocalGameProvider><Outlet /></LocalGameProvider>}>
          <Route index element={<LocalGamesPage />} />
          <Route path="setup/:gameId" element={<LocalSetupPage />} />
          <Route path="play/:gameId" element={<LocalGamePage />} />
        </Route>
        <Route path="/games" element={<GamesPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/players/:id" element={<ProfilePage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/rooms" element={<ProtectedRoute><RoomsPage /></ProtectedRoute>} />
        <Route path="/room/:code" element={<ProtectedRoute><WaitingRoomPage /></ProtectedRoute>} />
        <Route path="/game/:code" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
        <Route path="/results/:id" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
