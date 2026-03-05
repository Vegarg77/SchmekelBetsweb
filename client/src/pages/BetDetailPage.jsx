import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { useApi, apiFetch } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/common/LoadingSpinner'
import StatusBadge from '../components/common/StatusBadge'
import toast from 'react-hot-toast'
import { Send, Trash2, CheckCircle, XCircle, Lock, Users, Coins, Clock, ChevronLeft } from 'lucide-react'

const ALLOWED_REACTIONS = ['🔥', '😂', '🤑', '💀', '👀', '🎉', '😬', '🤔']

export default function BetDetailPage() {
  const { id }        = useParams()
  const { user, refreshUser } = useAuth()
  const navigate      = useNavigate()
  const { data, loading, error, refetch } = useApi(`/api/bets/${id}`)

  const [wager,         setWager]         = useState('')
  const [selectedOutcome, setSelectedOutcome] = useState(null)
  const [placing,       setPlacing]       = useState(false)
  const [comment,       setComment]       = useState('')
  const [commenting,    setCommenting]    = useState(false)
  const [resolving,     setResolving]     = useState(false)
  const [resolveNotes,  setResolveNotes]  = useState('')
  const [resolveOutcome, setResolveOutcome] = useState('')
  const [showResolve,   setShowResolve]   = useState(false)

  if (loading) return <LoadingSpinner text="Loading bet..." />
  if (error)   return <p className="text-red-400 text-center py-8">{error}</p>

  const { bet, outcomes, comments, reactions, myPlacement } = data

  const totalPool   = outcomes.reduce((s, o) => s + parseInt(o.total || 0), 0)
  const isCreator   = user?.id === bet.creator_id
  const canBet      = user && bet.status === 'open' && !myPlacement && !isCreator &&
                      (!bet.closes_at || new Date(bet.closes_at) > new Date())

  const getPct = (outcomeTotal) =>
    totalPool > 0 ? Math.round((parseInt(outcomeTotal) / totalPool) * 100) : 0

  const getMultiplier = (outcomeId) => {
    const o = outcomes.find(o => o.id === outcomeId)
    if (!o || !totalPool) return null
    const myWager = parseInt(wager) || 0
    if (!myWager) return null
    const newPool = totalPool + myWager
    const newOutcomeTotal = parseInt(o.total) + myWager
    if (!newOutcomeTotal) return null
    return ((myWager / newOutcomeTotal) * newPool / myWager).toFixed(2)
  }

  const handlePlaceBet = async () => {
    if (!selectedOutcome || !wager || parseInt(wager) < 1) {
      toast.error('Pick an outcome and enter a wager amount')
      return
    }
    setPlacing(true)
    try {
      await apiFetch(`/api/bets/${id}/place`, {
        method: 'POST',
        body: JSON.stringify({ outcome_id: selectedOutcome, amount: parseInt(wager) }),
      })
      toast.success('Bet placed! 🎲 Good luck!')
      refreshUser()
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPlacing(false)
    }
  }

  const handleResolve = async () => {
    if (!resolveOutcome) return toast.error('Select the winning outcome')
    setResolving(true)
    try {
      const result = await apiFetch(`/api/bets/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          winning_outcome_id: parseInt(resolveOutcome),
          resolve_notes: resolveNotes || undefined,
        }),
      })
      toast.success(`Bet resolved! ${result.winners} winner(s) paid out 🏆`)
      refreshUser()
      refetch()
      setShowResolve(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setResolving(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this bet? All wagers will be refunded.')) return
    try {
      await apiFetch(`/api/bets/${id}/cancel`, { method: 'POST' })
      toast.success('Bet cancelled. Wagers refunded.')
      refreshUser()
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleClose = async () => {
    try {
      await apiFetch(`/api/bets/${id}/close`, { method: 'POST' })
      toast.success('Bet closed to new wagers')
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    setCommenting(true)
    try {
      await apiFetch(`/api/bets/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: comment.trim() }),
      })
      setComment('')
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCommenting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      await apiFetch(`/api/bets/${id}/comments/${commentId}`, { method: 'DELETE' })
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleReact = async (emoji) => {
    if (!user) return toast.error('Sign in to react')
    try {
      await apiFetch(`/api/bets/${id}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      })
      refetch()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Back link */}
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-2">
        <ChevronLeft size={16} /> Back
      </button>

      {/* Bet Header */}
      <div className="card mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              {bet.category_emoji && (
                <span className="text-sm">{bet.category_emoji} <span className="text-dark-400 text-xs">{bet.category_name}</span></span>
              )}
              <StatusBadge status={bet.status} />
              {bet.is_private && (
                <span className="badge bg-dark-700 text-dark-400 border border-dark-600">
                  <Lock size={10} /> Private
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-dark-100 leading-snug">{bet.title}</h1>
            {bet.description && (
              <p className="text-dark-300 text-sm mt-2 whitespace-pre-wrap">{bet.description}</p>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-400 pt-3 border-t border-dark-700">
          <span className="flex items-center gap-1">
            by{' '}
            <Link to={`/profile/${bet.creator_id}`} className="text-dark-300 hover:text-schmekel-400 transition-colors flex items-center gap-1">
              {bet.creator_avatar && <img src={bet.creator_avatar} alt="" className="w-4 h-4 rounded-full" />}
              {bet.creator_name}
            </Link>
          </span>
          <span>{format(new Date(bet.created_at), 'MMM d, yyyy')}</span>
          {bet.closes_at && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Clock size={10} />
              {bet.status === 'open'
                ? `Closes ${formatDistanceToNow(new Date(bet.closes_at), { addSuffix: true })}`
                : `Closed ${format(new Date(bet.closes_at), 'MMM d')}`}
            </span>
          )}
          <span className="flex items-center gap-1 text-schmekel-500">
            <Coins size={10} />
            {totalPool.toLocaleString()} Schmekels in pot
          </span>
          <span className="flex items-center gap-1">
            <Users size={10} />
            {outcomes.reduce((s, o) => s + parseInt(o.count || 0), 0)} bettors
          </span>
        </div>

        {/* Reactions */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-dark-700">
          {ALLOWED_REACTIONS.map(emoji => {
            const r = reactions.find(r => r.emoji === emoji)
            const count = r ? parseInt(r.count) : 0
            const reacted = r?.reacted_by_me
            return (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={`px-2 py-1 rounded-lg text-sm border transition-colors ${
                  reacted
                    ? 'bg-dark-600 border-dark-500'
                    : 'border-dark-700 hover:border-dark-600 hover:bg-dark-800'
                }`}
              >
                {emoji} {count > 0 && <span className="text-xs text-dark-400">{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Outcomes + Betting */}
      <div className="card mb-4">
        <h2 className="font-semibold mb-3 text-sm text-dark-300 uppercase tracking-wider">Outcomes</h2>

        <div className="space-y-3">
          {outcomes.map(o => {
            const pct        = getPct(o.total)
            const isWinner   = bet.status === 'resolved' && bet.winning_outcome_id === o.id
            const isMyChoice = myPlacement?.outcome_id === o.id
            const multiplier = selectedOutcome === o.id ? getMultiplier(o.id) : null

            return (
              <div
                key={o.id}
                onClick={() => canBet && setSelectedOutcome(o.id)}
                className={`rounded-lg border p-3 transition-all ${
                  canBet ? 'cursor-pointer hover:border-opacity-80' : ''
                } ${
                  selectedOutcome === o.id
                    ? 'border-opacity-100 bg-dark-700'
                    : 'border-dark-700'
                } ${isWinner ? 'border-schmekel-600 bg-schmekel-900/20' : ''}`}
                style={
                  selectedOutcome === o.id
                    ? { borderColor: o.color }
                    : isWinner
                    ? {}
                    : {}
                }
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: o.color }} />
                    <span className="font-medium text-sm">
                      {isWinner && '🏆 '}
                      {o.label}
                    </span>
                    {isMyChoice && (
                      <span className="badge bg-schmekel-900 text-schmekel-400 border border-schmekel-700 text-xs">
                        Your bet: {myPlacement.amount} 🪙
                      </span>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold text-sm">{pct}%</span>
                    {multiplier && (
                      <span className="ml-2 text-schmekel-400">{multiplier}x</span>
                    )}
                  </div>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${pct}%`, backgroundColor: o.color }}
                  />
                </div>
                <div className="flex justify-between text-xs text-dark-400 mt-1">
                  <span>{o.count} bets</span>
                  <span>{parseInt(o.total).toLocaleString()} 🪙</span>
                </div>

                {/* If resolved with winner */}
                {isWinner && myPlacement?.payout !== null && myPlacement?.payout !== undefined && isMyChoice && (
                  <div className="mt-2 text-sm text-schmekel-400 font-medium">
                    You won {myPlacement.payout} Schmekels! 🎉
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Place Bet form */}
        {canBet && (
          <div className="mt-4 pt-4 border-t border-dark-700">
            <p className="text-sm text-dark-300 mb-2 font-medium">Place Your Wager</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  className="input pr-20"
                  placeholder={`Min: ${bet.min_wager}`}
                  min={bet.min_wager || 1}
                  max={bet.max_wager || user?.schmekels}
                  value={wager}
                  onChange={e => setWager(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-dark-400">
                  🪙 {user?.schmekels?.toLocaleString()} avail
                </span>
              </div>
              <button
                onClick={handlePlaceBet}
                disabled={placing || !selectedOutcome || !wager}
                className="btn-primary px-5"
              >
                {placing ? '...' : 'Bet!'}
              </button>
            </div>
            {!selectedOutcome && (
              <p className="text-xs text-dark-400 mt-1.5">☝️ Click an outcome above to select it</p>
            )}
            {bet.max_wager && (
              <p className="text-xs text-dark-400 mt-1">Max wager: {bet.max_wager} 🪙</p>
            )}
          </div>
        )}

        {/* My placement (if already bet) */}
        {myPlacement && bet.status === 'open' && (
          <div className="mt-4 pt-4 border-t border-dark-700">
            <p className="text-sm text-schmekel-400 flex items-center gap-2">
              <CheckCircle size={14} />
              You've wagered <strong>{myPlacement.amount} Schmekels</strong> on this bet
            </p>
          </div>
        )}

        {/* Not logged in */}
        {!user && bet.status === 'open' && (
          <div className="mt-4 pt-4 border-t border-dark-700 text-center">
            <a href="/auth/steam" className="btn-primary">
              Sign in with Steam to bet
            </a>
          </div>
        )}

        {/* Creator bet on own bet */}
        {isCreator && bet.status === 'open' && (
          <p className="mt-4 pt-4 border-t border-dark-700 text-xs text-dark-400 text-center">
            You created this bet — you can't bet on your own
          </p>
        )}
      </div>

      {/* Creator Actions */}
      {isCreator && ['open', 'closed'].includes(bet.status) && (
        <div className="card mb-4">
          <h2 className="font-semibold mb-3 text-sm text-dark-300 uppercase tracking-wider">Creator Controls</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {bet.status === 'open' && (
              <button onClick={handleClose} className="btn-secondary text-xs">
                🔒 Close to New Bets
              </button>
            )}
            <button onClick={() => setShowResolve(!showResolve)} className="btn-primary text-xs">
              <CheckCircle size={13} /> Resolve Bet
            </button>
            <button onClick={handleCancel} className="btn-danger text-xs">
              <XCircle size={13} /> Cancel & Refund
            </button>
          </div>

          {showResolve && (
            <div className="bg-dark-700 rounded-lg p-4 space-y-3 animate-fade-in">
              <p className="text-sm font-medium">Which outcome won?</p>
              <div className="space-y-2">
                {outcomes.map(o => (
                  <label key={o.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="resolve"
                      value={o.id}
                      checked={resolveOutcome === String(o.id)}
                      onChange={e => setResolveOutcome(e.target.value)}
                      className="accent-schmekel-500"
                    />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: o.color }} />
                    <span className="text-sm group-hover:text-dark-100 transition-colors">{o.label}</span>
                  </label>
                ))}
              </div>
              <textarea
                className="input text-xs"
                placeholder="Resolution notes (optional)..."
                value={resolveNotes}
                onChange={e => setResolveNotes(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleResolve}
                  disabled={resolving || !resolveOutcome}
                  className="btn-primary text-sm"
                >
                  {resolving ? 'Resolving...' : '✅ Confirm Resolution'}
                </button>
                <button onClick={() => setShowResolve(false)} className="btn-secondary text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resolve notes (if resolved) */}
      {bet.status === 'resolved' && bet.resolve_notes && (
        <div className="card mb-4 border-schmekel-800">
          <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Resolution Notes</p>
          <p className="text-sm text-dark-200">{bet.resolve_notes}</p>
          {bet.resolved_at && (
            <p className="text-xs text-dark-400 mt-1">
              Resolved {format(new Date(bet.resolved_at), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      )}

      {/* Comments */}
      <div className="card">
        <h2 className="font-semibold mb-4 text-sm text-dark-300 uppercase tracking-wider">
          Comments ({comments.length})
        </h2>

        {comments.length === 0 && (
          <p className="text-dark-400 text-sm text-center py-4">No comments yet. Be the first!</p>
        )}

        <div className="space-y-3 mb-4">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <Link to={`/profile/${c.user_id}`} className="flex-shrink-0">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="w-8 h-8 rounded-full border border-dark-600 hover:border-dark-400 transition-colors" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-xs">
                    {c.username[0]}
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <Link to={`/profile/${c.user_id}`} className="text-xs font-medium text-dark-300 hover:text-schmekel-400 transition-colors">
                    {c.username}
                  </Link>
                  <span className="text-xs text-dark-500">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-dark-200 mt-0.5 break-words">{c.body}</p>
              </div>
              {user?.id === c.user_id && (
                <button
                  onClick={() => handleDeleteComment(c.id)}
                  className="btn-ghost p-1 text-dark-500 hover:text-red-400 self-start"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        {user ? (
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="Add a comment..."
              value={comment}
              maxLength={1000}
              onChange={e => setComment(e.target.value)}
            />
            <button
              type="submit"
              disabled={commenting || !comment.trim()}
              className="btn-primary px-3"
            >
              <Send size={14} />
            </button>
          </form>
        ) : (
          <p className="text-sm text-dark-400 text-center">
            <a href="/auth/steam" className="text-schmekel-400 hover:underline">Sign in</a> to comment
          </p>
        )}
      </div>
    </div>
  )
}
