import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import StatusBadge from '../common/StatusBadge'
import { Users, Coins, Clock, Lock } from 'lucide-react'

export default function BetCard({ bet }) {
  const totalPool   = parseInt(bet.total_pool) || 0
  const outcomes    = bet.outcomes || []
  const hasWinner   = bet.status === 'resolved' && bet.winning_outcome_id

  return (
    <Link to={`/bets/${bet.id}`} className="block group">
      <div className="card group-hover:border-dark-500 group-hover:bg-dark-750 transition-all duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {bet.category_emoji && (
                <span className="text-base">{bet.category_emoji}</span>
              )}
              <StatusBadge status={bet.status} />
              {bet.is_private && (
                <span className="badge bg-dark-700 text-dark-400 border border-dark-600">
                  <Lock size={10} /> Private
                </span>
              )}
            </div>
            <h3 className="font-semibold text-dark-100 text-sm leading-snug line-clamp-2 group-hover:text-schmekel-400 transition-colors">
              {bet.title}
            </h3>
          </div>
        </div>

        {/* Outcomes bar */}
        {outcomes.length > 0 && totalPool > 0 && (
          <div className="mb-3">
            <div className="flex rounded-full overflow-hidden h-2 gap-px">
              {outcomes.map((o) => {
                const pct = totalPool > 0 ? Math.round((parseInt(o.total) / totalPool) * 100) : 0
                return pct > 0 ? (
                  <div
                    key={o.id}
                    style={{ width: `${pct}%`, backgroundColor: o.color }}
                    title={`${o.label}: ${pct}%`}
                  />
                ) : null
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
              {outcomes.map((o) => {
                const pct = totalPool > 0 ? Math.round((parseInt(o.total) / totalPool) * 100) : 0
                const isWinner = hasWinner && o.id === bet.winning_outcome_id
                return (
                  <span
                    key={o.id}
                    className={`text-xs flex items-center gap-1 ${isWinner ? 'font-bold' : 'text-dark-400'}`}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: o.color }}
                    />
                    {isWinner && '🏆 '}
                    {o.label} {pct}%
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* No bets yet */}
        {outcomes.length > 0 && totalPool === 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {outcomes.map((o) => (
              <span
                key={o.id}
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{ borderColor: o.color + '60', color: o.color }}
              >
                {o.label}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-dark-400 pt-2 border-t border-dark-700">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-schmekel-500 font-medium">
              <Coins size={12} />
              {totalPool.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              {bet.unique_bettors || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {bet.creator_avatar && (
              <img src={bet.creator_avatar} alt="" className="w-4 h-4 rounded-full" />
            )}
            <span className="truncate max-w-[80px]">{bet.creator_name}</span>
            {bet.closes_at && bet.status === 'open' && (
              <span className="flex items-center gap-1 text-yellow-500">
                <Clock size={10} />
                {formatDistanceToNow(new Date(bet.closes_at), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
