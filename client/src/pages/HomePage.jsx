import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import BetCard from '../components/bets/BetCard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Search, Filter, PlusCircle, TrendingUp } from 'lucide-react'

const CATEGORIES = [
  { id: '', name: 'All', emoji: '🎲' },
]

const STATUSES = [
  { value: 'open',     label: 'Open' },
  { value: 'closed',   label: 'Closed' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all',      label: 'All' },
]

const SORTS = [
  { value: 'newest',  label: 'Newest' },
  { value: 'hottest', label: 'Hottest 🔥' },
  { value: 'closing', label: 'Closing Soon' },
]

export default function HomePage() {
  const { user } = useAuth()
  const [status,   setStatus]   = useState('open')
  const [category, setCategory] = useState('')
  const [sort,     setSort]     = useState('newest')
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)

  const query = new URLSearchParams({
    status, sort, page,
    ...(category && { category }),
    ...(search && { q: search }),
  }).toString()

  const { data, loading, error } = useApi(`/api/bets?${query}`)
  const { data: catData }        = useApi('/api/bets/categories')

  const categories = [
    { id: '', name: 'All', emoji: '🎲' },
    ...(catData?.categories || []),
  ]

  return (
    <div className="animate-fade-in">
      {/* Hero for logged-out users */}
      {!user && (
        <div className="text-center py-12 mb-8">
          <div className="text-6xl mb-4 animate-float">🪙</div>
          <h1 className="text-4xl font-bold mb-3 text-gradient">SchmekelBets</h1>
          <p className="text-dark-300 text-lg mb-6 max-w-lg mx-auto">
            The premier prediction market for you and your friends. Bet Schmekels on anything.
            Start with 100 free Schmekels when you sign up!
          </p>
          <a href="/auth/steam" className="btn-primary text-base px-6 py-3">
            <SteamIcon /> Sign in with Steam to Start Betting
          </a>
        </div>
      )}

      {/* Welcome back / quick stats */}
      {user && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="text-schmekel-400" size={24} />
              Prediction Markets
            </h1>
            <p className="text-dark-400 text-sm mt-0.5">
              What are you betting on today?
            </p>
          </div>
          <Link to="/bets/new" className="btn-primary">
            <PlusCircle size={16} /> New Bet
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search bets..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Status filter */}
          <div className="flex gap-1 flex-wrap">
            {STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => { setStatus(s.value); setPage(1) }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  status === s.value
                    ? 'bg-schmekel-600 border-schmekel-600 text-white'
                    : 'border-dark-600 text-dark-300 hover:border-dark-500'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-dark-600 hidden sm:block" />

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="input w-auto py-1.5 text-xs"
          >
            {SORTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Categories */}
        <div className="flex gap-1 flex-wrap">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => { setCategory(String(c.id)); setPage(1) }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                category === String(c.id)
                  ? 'bg-dark-600 border-dark-500 text-dark-100'
                  : 'border-dark-700 text-dark-400 hover:border-dark-600 hover:text-dark-300'
              }`}
            >
              <span>{c.emoji}</span> {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Bet grid */}
      {loading && <LoadingSpinner text="Loading bets..." />}
      {error   && <p className="text-red-400 text-center py-8">{error}</p>}

      {!loading && !error && (
        <>
          {data?.bets?.length === 0 ? (
            <div className="text-center py-16 text-dark-400">
              <div className="text-5xl mb-4">🦗</div>
              <p className="text-lg">No bets found</p>
              {user && (
                <p className="text-sm mt-2">
                  Be the first!{' '}
                  <Link to="/bets/new" className="text-schmekel-400 hover:underline">
                    Create a bet
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.bets.map(bet => (
                  <BetCard key={bet.id} bet={bet} />
                ))}
              </div>

              {/* Pagination */}
              {data.pages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    ← Prev
                  </button>
                  <span className="flex items-center text-sm text-dark-400">
                    {page} / {data.pages}
                  </span>
                  <button
                    disabled={page >= data.pages}
                    onClick={() => setPage(p => p + 1)}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function SteamIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.497 1.009 2.453-.4.957-1.497 1.41-2.454 1.01zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
    </svg>
  )
}
