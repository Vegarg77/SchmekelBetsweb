import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApi, apiFetch } from '../hooks/useApi'
import toast from 'react-hot-toast'
import { PlusCircle, Trash2, HelpCircle } from 'lucide-react'

const OUTCOME_COLORS = ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899']

const TEMPLATES = [
  {
    label: '1v1 Challenge',
    emoji: '⚔️',
    title: 'I bet I can [do X] before [opponent] can',
    outcomes: ['I win', 'Opponent wins'],
    description: '',
  },
  {
    label: 'Yes/No',
    emoji: '🤔',
    title: 'Will [event] happen?',
    outcomes: ['Yes', 'No'],
    description: '',
  },
  {
    label: 'Race',
    emoji: '🏁',
    title: 'Who will [finish X] first?',
    outcomes: ['Player 1', 'Player 2', 'Tie'],
    description: '',
  },
  {
    label: 'Custom',
    emoji: '✨',
    title: '',
    outcomes: ['', ''],
    description: '',
  },
]

export default function CreateBetPage() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const { data: catData } = useApi('/api/bets/categories')

  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [categoryId,  setCategoryId]  = useState('')
  const [outcomes,    setOutcomes]    = useState([
    { label: '', color: OUTCOME_COLORS[0] },
    { label: '', color: OUTCOME_COLORS[1] },
  ])
  const [minWager,    setMinWager]    = useState(1)
  const [maxWager,    setMaxWager]    = useState('')
  const [closesAt,    setClosesAt]    = useState('')
  const [isPrivate,   setIsPrivate]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)

  if (!user) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🔒</div>
        <p className="text-dark-300 text-lg">Sign in to create a bet</p>
      </div>
    )
  }

  const applyTemplate = (t) => {
    if (t.title) setTitle(t.title)
    setDescription(t.description || '')
    setOutcomes(
      t.outcomes.map((label, i) => ({
        label,
        color: OUTCOME_COLORS[i % OUTCOME_COLORS.length],
      }))
    )
  }

  const addOutcome = () => {
    if (outcomes.length >= 6) return
    setOutcomes([...outcomes, { label: '', color: OUTCOME_COLORS[outcomes.length % OUTCOME_COLORS.length] }])
  }

  const removeOutcome = (i) => {
    if (outcomes.length <= 2) return
    setOutcomes(outcomes.filter((_, idx) => idx !== i))
  }

  const updateOutcome = (i, field, value) => {
    const next = [...outcomes]
    next[i] = { ...next[i], [field]: value }
    setOutcomes(next)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return toast.error('Title is required')
    if (outcomes.some(o => !o.label.trim())) return toast.error('All outcome labels required')
    if (new Set(outcomes.map(o => o.label.trim())).size !== outcomes.length)
      return toast.error('Outcome labels must be unique')

    setSubmitting(true)
    try {
      const data = await apiFetch('/api/bets', {
        method: 'POST',
        body: JSON.stringify({
          title:       title.trim(),
          description: description.trim() || undefined,
          category_id: categoryId || undefined,
          outcomes:    outcomes.map(o => ({ label: o.label.trim(), color: o.color })),
          min_wager:   parseInt(minWager) || 1,
          max_wager:   maxWager ? parseInt(maxWager) : undefined,
          closes_at:   closesAt || undefined,
          is_private:  isPrivate,
        }),
      })
      toast.success('Bet created! 🎲')
      navigate(`/bets/${data.bet.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PlusCircle className="text-schmekel-400" size={24} /> Create a Bet
        </h1>
        <p className="text-dark-400 text-sm mt-1">Set up your prediction market</p>
      </div>

      {/* Templates */}
      <div className="card mb-6">
        <p className="text-sm text-dark-400 mb-3 font-medium">Quick Templates</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.label}
              onClick={() => applyTemplate(t)}
              className="btn-secondary text-xs py-1.5"
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="label">
            Bet Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. I bet I can 360 no-scope you"
            maxLength={256}
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
          <p className="text-xs text-dark-400 mt-1">{title.length}/256</p>
        </div>

        {/* Description */}
        <div>
          <label className="label">Description / Rules (optional)</label>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="Add context, rules, or conditions..."
            maxLength={1000}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Category */}
        <div>
          <label className="label">Category</label>
          <select
            className="input"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
          >
            <option value="">No category</option>
            {catData?.categories?.map(c => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Outcomes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">
              Outcomes <span className="text-red-400">*</span>
              <span className="text-dark-400 font-normal ml-1">(2–6)</span>
            </label>
            {outcomes.length < 6 && (
              <button type="button" onClick={addOutcome} className="btn-ghost text-xs py-1">
                <PlusCircle size={13} /> Add outcome
              </button>
            )}
          </div>
          <div className="space-y-2">
            {outcomes.map((o, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="color"
                  value={o.color}
                  onChange={e => updateOutcome(i, 'color', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                  title="Pick a color"
                />
                <input
                  type="text"
                  className="input flex-1"
                  placeholder={`Outcome ${i + 1}${i === 0 ? ' (e.g. Yes / I Win)' : i === 1 ? ' (e.g. No / They Win)' : ''}`}
                  value={o.label}
                  maxLength={128}
                  onChange={e => updateOutcome(i, 'label', e.target.value)}
                  required
                />
                {outcomes.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOutcome(i)}
                    className="btn-ghost p-2 text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Wager limits */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Min Wager (Schmekels)</label>
            <input
              type="number"
              className="input"
              min={1}
              value={minWager}
              onChange={e => setMinWager(e.target.value)}
            />
          </div>
          <div>
            <label className="label flex items-center gap-1">
              Max Wager
              <span title="Leave blank for unlimited" className="text-dark-500 cursor-help">
                <HelpCircle size={12} />
              </span>
            </label>
            <input
              type="number"
              className="input"
              min={1}
              placeholder="Unlimited"
              value={maxWager}
              onChange={e => setMaxWager(e.target.value)}
            />
          </div>
        </div>

        {/* Close date */}
        <div>
          <label className="label flex items-center gap-1">
            Close Date (optional)
            <span title="No new bets accepted after this date" className="text-dark-500 cursor-help">
              <HelpCircle size={12} />
            </span>
          </label>
          <input
            type="datetime-local"
            className="input"
            value={closesAt}
            min={new Date().toISOString().slice(0, 16)}
            onChange={e => setClosesAt(e.target.value)}
          />
        </div>

        {/* Private toggle */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={isPrivate}
              onChange={e => setIsPrivate(e.target.checked)}
            />
            <div className={`w-10 h-5 rounded-full transition-colors ${isPrivate ? 'bg-schmekel-600' : 'bg-dark-600'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPrivate ? 'translate-x-5' : ''}`} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium group-hover:text-dark-100 transition-colors">Private bet</p>
            <p className="text-xs text-dark-400">Only accessible via direct link</p>
          </div>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full py-3 text-base justify-center"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </span>
          ) : (
            '🎲 Create Bet'
          )}
        </button>
      </form>
    </div>
  )
}
