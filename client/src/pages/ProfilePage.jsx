import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useApi, apiFetch } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/common/LoadingSpinner'
import StatusBadge from '../components/common/StatusBadge'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Trophy, TrendingUp, Coins, Target, Calendar } from 'lucide-react'

export default function ProfilePage() {
  const { id }    = useParams()
  const { user: me, refreshUser } = useAuth()
  const isMe      = me?.id === parseInt(id)

  const { data,    loading,    error }    = useApi(`/api/users/${id}`)
  const { data: betsData }               = useApi(`/api/users/${id}/bets`)
  const { data: placementsData }         = useApi(`/api/users/${id}/placements`)
  const { data: txData }                 = useApi(isMe ? `/api/users/${id}/transactions` : null)

  const [activeTab, setActiveTab] = useState('placements')

  if (loading) return <LoadingSpinner text="Loading profile..." />
  if (error)   return <p className="text-red-400 text-center py-8">{error}</p>

  const { user, achievements } = data
  const winRate = (user.win_count + user.loss_count) > 0
    ? Math.round((user.win_count / (user.win_count + user.loss_count)) * 100)
    : 0

  const claimDaily = async () => {
    try {
      const data = await apiFetch('/api/users/daily-bonus', { method: 'POST' })
      toast.success(`+${data.bonus} Schmekels! 🪙`)
      refreshUser()
      window.location.reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const tabs = [
    { key: 'placements', label: 'Bet History' },
    { key: 'created',    label: 'Created Bets' },
    { key: 'achievements', label: `Achievements (${achievements.length})` },
    ...(isMe ? [{ key: 'transactions', label: 'Transactions' }] : []),
  ]

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Profile header */}
      <div className="card mb-6">
        <div className="flex items-start gap-4">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-20 h-20 rounded-xl border-2 border-dark-600 flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-dark-700 flex items-center justify-center text-3xl flex-shrink-0">
              👤
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-xl font-bold">{user.username}</h1>
                <p className="text-dark-400 text-xs flex items-center gap-1 mt-0.5">
                  <Calendar size={11} />
                  Joined {format(new Date(user.created_at), 'MMMM yyyy')}
                </p>
              </div>
              {isMe && (
                <button onClick={claimDaily} className="btn-secondary text-xs">
                  🎁 Daily Bonus
                </button>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <StatBlock
                icon={<Coins size={16} className="text-schmekel-400" />}
                value={user.schmekels.toLocaleString()}
                label="Schmekels"
                highlight
              />
              <StatBlock
                icon={<Trophy size={16} className="text-yellow-400" />}
                value={`${user.win_count}W / ${user.loss_count}L`}
                label="Record"
              />
              <StatBlock
                icon={<TrendingUp size={16} className="text-blue-400" />}
                value={`${winRate}%`}
                label="Win Rate"
              />
              <StatBlock
                icon={<Target size={16} className="text-purple-400" />}
                value={user.total_wagered?.toLocaleString() || '0'}
                label="Total Wagered"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-dark-700 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? 'border-schmekel-500 text-schmekel-400'
                : 'border-transparent text-dark-400 hover:text-dark-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'placements' && (
        <div className="space-y-2">
          {!placementsData?.placements?.length && (
            <p className="text-dark-400 text-center py-8">No bets placed yet</p>
          )}
          {placementsData?.placements?.map(p => (
            <Link key={p.id} to={`/bets/${p.bet_id}`} className="card-hover block">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-200 truncate">{p.bet_title}</p>
                  <p className="text-xs text-dark-400 mt-0.5">
                    Chose: <span className="text-dark-300">{p.outcome_label}</span>
                  </p>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <p className="text-sm font-bold text-schmekel-400">
                    {p.payout !== null
                      ? p.payout > 0
                        ? `+${p.payout} 🏆`
                        : `−${p.amount} 💀`
                      : `${p.amount} 🪙`
                    }
                  </p>
                  <StatusBadge status={p.bet_status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'created' && (
        <div className="space-y-2">
          {!betsData?.bets?.length && (
            <p className="text-dark-400 text-center py-8">No bets created yet</p>
          )}
          {betsData?.bets?.map(b => (
            <Link key={b.id} to={`/bets/${b.id}`} className="card-hover block">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-200 truncate">{b.title}</p>
                  <p className="text-xs text-dark-400 mt-0.5">
                    {b.placement_count} bets · {parseInt(b.total_pool).toLocaleString()} 🪙 in pot
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {achievements.length === 0 && (
            <div className="col-span-2 text-dark-400 text-center py-8">
              No achievements yet. Get betting!
            </div>
          )}
          {achievements.map(a => (
            <div key={a.key} className="card flex gap-3">
              <span className="text-3xl">{a.emoji}</span>
              <div>
                <p className="font-semibold text-sm">{a.name}</p>
                <p className="text-xs text-dark-400">{a.description}</p>
                <p className="text-xs text-dark-500 mt-1">
                  {format(new Date(a.earned_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'transactions' && isMe && (
        <div className="space-y-1">
          {!txData?.transactions?.length && (
            <p className="text-dark-400 text-center py-8">No transactions yet</p>
          )}
          {txData?.transactions?.map((tx, i) => (
            <div key={i} className="card py-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-dark-200">{formatTxType(tx.type)}</p>
                {tx.note && <p className="text-xs text-dark-400 truncate max-w-xs">{tx.note}</p>}
                <p className="text-xs text-dark-500">{format(new Date(tx.created_at), 'MMM d, HH:mm')}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${tx.amount > 0 ? 'text-schmekel-400' : 'text-red-400'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} 🪙
                </p>
                <p className="text-xs text-dark-400">→ {tx.balance_after} 🪙</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatBlock({ icon, value, label, highlight }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-schmekel-900/30 border border-schmekel-800' : 'bg-dark-700'}`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={`font-bold text-sm ${highlight ? 'text-schmekel-300' : 'text-dark-100'}`}>{value}</p>
      <p className="text-xs text-dark-400">{label}</p>
    </div>
  )
}

function formatTxType(type) {
  const map = {
    signup_bonus: '🎁 Signup Bonus',
    daily_bonus:  '📅 Daily Bonus',
    bet_placed:   '🎲 Bet Placed',
    bet_won:      '🏆 Bet Won',
    bet_refund:   '↩️ Bet Refunded',
    admin_grant:  '👑 Admin Grant',
  }
  return map[type] || type
}

