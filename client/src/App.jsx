import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import BetDetailPage from './pages/BetDetailPage'
import CreateBetPage from './pages/CreateBetPage'
import ProfilePage from './pages/ProfilePage'
import LeaderboardPage from './pages/LeaderboardPage'
import MyBetsPage from './pages/MyBetsPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/"              element={<HomePage />} />
          <Route path="/bets/new"      element={<CreateBetPage />} />
          <Route path="/bets/:id"      element={<BetDetailPage />} />
          <Route path="/profile/:id"  element={<ProfilePage />} />
          <Route path="/leaderboard"  element={<LeaderboardPage />} />
          <Route path="/my-bets"      element={<MyBetsPage />} />
          <Route path="*"              element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}
