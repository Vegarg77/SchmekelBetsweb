import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/common/LoadingSpinner'
import StatusBadge from '../components/common/StatusBadge'
import { formatDistanceToNow } from 'date-fns'
import { PlusCircle, Coins } from 'lucide-react'

const TABS = [
  { key: 'placed',   label: 'My Wagers' },
  { key: 'created',  label: 'I Created' },
]

export default function MyBetsPage() {
  const { user }   = useAuth()
  const [tab, setTab] = useState('placed')

  const { data: placementsData, loading: pLoading } = useApi(
    user ? `/api/users/${user.id}/placements` : null
  )
  const { data: createdData, loading: cLoading } = useApi(
    user ? `/api/users/${user.id}/bets` : null
  )

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-dark-300 text-lg">Sign in to see your bets</p>
        <a href="/auth/steam" className="btn-primary mt-4 inline-flex">Sign in with Steam</a>
      </div>
    )
  }

  const placements = placementsData?.placements || []
  const created    = createdData?.bets || []

  const activePlacements = placements.filter(p => p.bet_status === 'open' || p.bet_status === 'closed')
  const pastPlacements   = placements.filter(p => !['open', 'closed'].includes(p.bet_status))

  const activeCreated    = created.filter(b => ['open', 'closed'].includes(b.status))
  const pastCreated      = created.filter(b => !['open', 'closed'].includes(b.status))

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Bets</h1>
        <Link to="/bets/new" className="btn-primary text-sm">
          <PlusCircle size={14} /> New Bet
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-schmekel-400">{placements.length}</p>
          <p className="text-xs text-dark-400">Total Wagers</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-yellow-400">
            {placements.filter(p => p.payout > 0).length}
          </p>
          <p className="text-xs text-dark-400">Wins</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-purple-400">{created.length}</p>
          <p className="text-xs text-dark-400">Bets Created</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-dark-700">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-schmekel-500 text-schmekel-400'
                : 'border-transparent text-dark-400 hover:text-dark-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* My Wagers tab */}
      {tab === 'placed' && (
        <div>
          {pLoading && <LoadingSpinner />}
          {!pLoading && placements.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🎲</div>
              <p className="text-dark-400">No wagers yet!</p>
              <Link to="/" className="text-schmekel-400 hover:underline text-sm mt-2 inline-block">
                Browse open bets
              </Link>
            </div>
          )}

          {activePlacements.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-dark-400 uppercase tracking-wider mb-2">Active</p>
              <div className="space-y-2">
                {activePlacements.map(p => <PlacementRow key={p.id} p={p} />)}
              </div>
            </div>
          )}

          {pastPlacements.length > 0 && (
            <div>
              <p className="text-xs text-dark-400 uppercase tracking-wider mb-2">Past</p>
              <div className="space-y-2">
                {pastPlacements.map(p => <PlacementRow key={p.id} p={p} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Created tab */}
      {tab === 'created' && (
        <div>
          {cLoading && <LoadingSpinner />}
          {!cLoading && created.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🏗️</div>
              <p className="text-dark-400">You haven't created any bets yet</p>
              <Link to="/bets/new" className="text-schmekel-400 hover:underline text-sm mt-2 inline-block">
                Create your first bet
              </Link>
            </div>
          )}

          {activeCreated.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-dark-400 uppercase tracking-wider mb-2">Active</p>
              <div className="space-y-2">
                {activeCreated.map(b => <CreatedBetRow key={b.id} b={b} />)}
              </div>
            </div>
          )}

          {pastCreated.length > 0 && (
            <div>
              <p className="text-xs text-dark-400 uppercase tracking-wider mb-2">Past</p>
              <div className="space-y-2">
                {pastCreated.map(b => <CreatedBetRow key={b.id} b={b} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlacementRow({ p }) {
  const isWon  = p.payout !== null && p.payout > 0
  const isLost = p.payout !== null && p.payout === 0
  const isPending = p.payout === null

  return (
    <Link to={`/bets/${p.bet_id}`} className="card-hover block">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-dark-200 truncate">{p.bet_title}</p>
          <p className="text-xs text-dark-400 mt-0.5">
            Chose: <span className="text-dark-300">{p.outcome_label}</span>
            <span className="mx-1.5">·</span>
            {formatDistanceToNow(new Date(p.placed_at), { addSuffix: true })}
          </p>
        </div>
        <div className="text-right ml-4 flex-shrink-0">
          {isPending && (
            <span className="font-bold text-sm text-schmekel-300 flex items-center gap-1">
              <Coins size={12} />  {p.amount}
            </span>
          )}
          {isWon && (
            <span className="font-bold text-sm text-schmekel-400">+{p.payout} 🏆</span>
          )}
          {isLost && (
            <span className="font-bold text-sm text-red-400">−{p.amount} 💀</span>
          )}
          <div className="mt-0.5">
            <StatusBadge status={p.bet_status} />
          </div>
        </div>
      </div>
    </Link>
  )
}

function CreatedBetRow({ b }) {
  return (
    <Link to={`/bets/${b.id}`} className="card-hover block">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-dark-200 truncate">{b.title}</p>
          <p className="text-xs text-dark-400 mt-0.5">
            {b.placement_count} bets · {parseInt(b.total_pool).toLocaleString()} 🪙 pool
          </p>
        </div>
        <StatusBadge status={b.status} />
      </div>
    </Link>
  )
}
