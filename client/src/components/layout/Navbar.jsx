import { Link, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../hooks/useApi'
import toast from 'react-hot-toast'
import { TrendingUp, Trophy, PlusCircle, User, LogOut, Menu, X, Coins } from 'lucide-react'

export default function Navbar() {
  const { user, logout, refreshUser } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast('See ya! 👋')
  }

  const claimDaily = async () => {
    try {
      const data = await apiFetch('/api/users/daily-bonus', { method: 'POST' })
      toast.success(`+${data.bonus} Schmekels! Daily bonus claimed 🪙`)
      refreshUser()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
      isActive
        ? 'bg-dark-700 text-schmekel-400'
        : 'text-dark-300 hover:text-dark-100 hover:bg-dark-800'
    }`

  return (
    <nav className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur border-b border-dark-700">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl animate-float">🪙</span>
          <span className="text-gradient">SchmekelBets</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            <TrendingUp size={15} /> Markets
          </NavLink>
          <NavLink to="/leaderboard" className={navLinkClass}>
            <Trophy size={15} /> Leaderboard
          </NavLink>
          {user && (
            <>
              <NavLink to="/bets/new" className={navLinkClass}>
                <PlusCircle size={15} /> New Bet
              </NavLink>
              <NavLink to="/my-bets" className={navLinkClass}>
                My Bets
              </NavLink>
            </>
          )}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={claimDaily}
                title="Claim daily bonus"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700
                           hover:bg-dark-600 text-schmekel-400 text-sm font-medium transition-colors"
              >
                <Coins size={14} />
                <span>{user.schmekels.toLocaleString()}</span>
              </button>
              <Link
                to={`/profile/${user.id}`}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-8 h-8 rounded-full border-2 border-dark-600"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center">
                    <User size={14} />
                  </div>
                )}
                <span className="text-sm text-dark-200">{user.username}</span>
              </Link>
              <button onClick={handleLogout} className="btn-ghost px-2 py-2" title="Log out">
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <a
              href="/auth/steam"
              className="btn-primary"
            >
              <SteamIcon />
              Sign in with Steam
            </a>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden btn-ghost p-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-dark-700 bg-dark-900 px-4 py-3 flex flex-col gap-2">
          <NavLink to="/" end className={navLinkClass} onClick={() => setMenuOpen(false)}>
            <TrendingUp size={15} /> Markets
          </NavLink>
          <NavLink to="/leaderboard" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            <Trophy size={15} /> Leaderboard
          </NavLink>
          {user && (
            <>
              <NavLink to="/bets/new" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                <PlusCircle size={15} /> New Bet
              </NavLink>
              <NavLink to="/my-bets" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                My Bets
              </NavLink>
              <NavLink to={`/profile/${user.id}`} className={navLinkClass} onClick={() => setMenuOpen(false)}>
                <User size={15} /> Profile
              </NavLink>
              <button onClick={claimDaily} className="btn-secondary text-left">
                <Coins size={14} /> Claim Daily Bonus
              </button>
              <button onClick={handleLogout} className="btn-ghost text-left">
                <LogOut size={15} /> Sign Out
              </button>
            </>
          )}
          {!user && (
            <a href="/auth/steam" className="btn-primary w-full justify-center">
              <SteamIcon /> Sign in with Steam
            </a>
          )}
        </div>
      )}
    </nav>
  )
}

function SteamIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.497 1.009 2.453-.4.957-1.497 1.41-2.454 1.01zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
    </svg>
  )
}
