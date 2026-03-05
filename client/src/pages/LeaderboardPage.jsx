import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Trophy, Coins, TrendingUp, Target } from 'lucide-react'

const TABS = [
  { key: 'balance', label: '🪙 Richest',     icon: <Coins size={14} /> },
  { key: 'wins',    label: '🏆 Most Wins',   icon: <Trophy size={14} /> },
  { key: 'wagered', label: '🎲 Most Wagered', icon: <Target size={14} /> },
]

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [type, setType] = useState('balance')
  const { data, loading, error } = useApi(`/api/leaderboard?type=${type}`)

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="text-yellow-400" size={24} />
          Leaderboard
        </h1>
        <p className="text-dark-400 text-sm mt-1">Who's winning the Schmekel game?</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 bg-dark-800 border border-dark-700 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              type === t.key
                ? 'bg-dark-600 text-dark-100 shadow'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner text="Loading rankings..." />}
      {error   && <p className="text-red-400 text-center py-8">{error}</p>}

      {!loading && !error && (
        <div className="space-y-2">
          {data?.leaderboard?.length === 0 && (
            <p className="text-dark-400 text-center py-8">No data yet</p>
          )}
          {data?.leaderboard?.map((u, i) => (
            <Link
              key={u.id}
              to={`/profile/${u.id}`}
              className={`card-hover flex items-center gap-4 ${i < 3 ? 'glow-green border-dark-600' : ''}`}
            >
              {/* Rank */}
              <div className="w-10 text-center flex-shrink-0">
                {i < 3 ? (
                  <span className="text-2xl">{MEDALS[i]}</span>
                ) : (
                  <span className="text-dark-400 font-bold">{i + 1}</span>
                )}
              </div>

              {/* Avatar + name */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt={u.username}
                    className="w-10 h-10 rounded-full border-2 border-dark-600 flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center flex-shrink-0">
                    👤
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{u.username}</p>
                  <p className="text-xs text-dark-400">
                    {u.win_count}W / {u.loss_count}L · {u.win_rate}% WR
                    {u.achievement_count > 0 && ` · ${u.achievement_count} 🏅`}
                  </p>
                </div>
              </div>

              {/* Stat */}
              <div className="text-right flex-shrink-0">
                {type === 'balance' && (
                  <p className="font-bold text-schmekel-400">
                    {parseInt(u.schmekels).toLocaleString()} 🪙
                  </p>
                )}
                {type === 'wins' && (
                  <p className="font-bold text-yellow-400">
                    {u.win_count} wins
                  </p>
                )}
                {type === 'wagered' && (
                  <p className="font-bold text-purple-400">
                    {parseInt(u.total_wagered).toLocaleString()} 🪙
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
