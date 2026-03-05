const router = require('express').Router()
const db     = require('../config/database')
const { requireAuth } = require('../middleware/auth')

// ─── List / Search ───────────────────────────────────────────────────────────

// GET /api/bets?status=open&category=1&page=1&limit=20&q=search
router.get('/', async (req, res) => {
  const { status = 'open', category, page = 1, limit = 20, q, sort = 'newest' } = req.query

  const offset = (parseInt(page) - 1) * parseInt(limit)
  const params = []
  const conditions = ['b.is_private = FALSE']

  if (status && status !== 'all') {
    params.push(status)
    conditions.push(`b.status = $${params.length}`)
  }
  if (category) {
    params.push(category)
    conditions.push(`b.category_id = $${params.length}`)
  }
  if (q) {
    params.push(`%${q}%`)
    conditions.push(`(b.title ILIKE $${params.length} OR b.description ILIKE $${params.length})`)
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

  const orderMap = {
    newest:  'b.created_at DESC',
    oldest:  'b.created_at ASC',
    hottest: 'total_pool DESC',
    closing: 'b.closes_at ASC NULLS LAST',
  }
  const order = orderMap[sort] || orderMap.newest

  try {
    params.push(parseInt(limit), offset)
    const { rows } = await db.query(
      `SELECT b.id, b.title, b.description, b.status, b.closes_at, b.created_at,
              b.min_wager, b.max_wager, b.is_private,
              c.name AS category_name, c.emoji AS category_emoji,
              u.username AS creator_name, u.avatar_url AS creator_avatar, u.id AS creator_id,
              COALESCE(SUM(bp.amount), 0) AS total_pool,
              COUNT(DISTINCT bp.id) AS placement_count,
              COUNT(DISTINCT bp.user_id) AS unique_bettors,
              JSON_AGG(
                JSON_BUILD_OBJECT('id', bo.id, 'label', bo.label, 'color', bo.color,
                  'total', COALESCE(ot.outcome_total, 0))
                ORDER BY bo.id
              ) AS outcomes
       FROM bets b
       LEFT JOIN categories c ON c.id = b.category_id
       LEFT JOIN users u ON u.id = b.creator_id
       LEFT JOIN bet_placements bp ON bp.bet_id = b.id
       LEFT JOIN bet_outcomes bo ON bo.bet_id = b.id
       LEFT JOIN (
         SELECT outcome_id, SUM(amount) AS outcome_total
         FROM bet_placements GROUP BY outcome_id
       ) ot ON ot.outcome_id = bo.id
       ${where}
       GROUP BY b.id, c.name, c.emoji, u.username, u.avatar_url, u.id
       ORDER BY ${order}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    // total count for pagination
    const countParams = params.slice(0, params.length - 2)
    const { rows: countRows } = await db.query(
      `SELECT COUNT(DISTINCT b.id) FROM bets b ${where}`,
      countParams
    )

    res.json({
      bets: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countRows[0].count) / parseInt(limit)),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/bets/categories
router.get('/categories', async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM categories ORDER BY name')
  res.json({ categories: rows })
})

// GET /api/bets/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*,
              c.name AS category_name, c.emoji AS category_emoji,
              u.username AS creator_name, u.avatar_url AS creator_avatar, u.id AS creator_id
       FROM bets b
       LEFT JOIN categories c ON c.id = b.category_id
       LEFT JOIN users u ON u.id = b.creator_id
       WHERE b.id = $1`,
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Bet not found' })

    const outcomes = await db.query(
      `SELECT bo.id, bo.label, bo.color,
              COALESCE(SUM(bp.amount), 0) AS total,
              COUNT(bp.id) AS count
       FROM bet_outcomes bo
       LEFT JOIN bet_placements bp ON bp.outcome_id = bo.id
       WHERE bo.bet_id = $1
       GROUP BY bo.id
       ORDER BY bo.id`,
      [req.params.id]
    )

    const comments = await db.query(
      `SELECT cm.id, cm.body, cm.created_at,
              u.username, u.avatar_url, u.id AS user_id
       FROM comments cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.bet_id = $1
       ORDER BY cm.created_at ASC`,
      [req.params.id]
    )

    const reactions = await db.query(
      `SELECT emoji, COUNT(*) AS count,
              BOOL_OR(user_id = $2) AS reacted_by_me
       FROM reactions
       WHERE bet_id = $1
       GROUP BY emoji`,
      [req.params.id, req.user?.id || 0]
    )

    // If user is logged in, fetch their placement
    let myPlacement = null
    if (req.user) {
      const mp = await db.query(
        'SELECT * FROM bet_placements WHERE user_id = $1 AND bet_id = $2',
        [req.user.id, req.params.id]
      )
      myPlacement = mp.rows[0] || null
    }

    res.json({
      bet: rows[0],
      outcomes: outcomes.rows,
      comments: comments.rows,
      reactions: reactions.rows,
      myPlacement,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ─── Create ───────────────────────────────────────────────────────────────────

// POST /api/bets
router.post('/', requireAuth, async (req, res) => {
  const { title, description, category_id, outcomes, min_wager, max_wager, closes_at, is_private } = req.body

  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' })
  if (!outcomes || outcomes.length < 2 || outcomes.length > 6)
    return res.status(400).json({ error: 'Need 2–6 outcomes' })

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const { rows: [bet] } = await client.query(
      `INSERT INTO bets (creator_id, category_id, title, description, min_wager, max_wager, closes_at, is_private)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user.id,
        category_id || null,
        title.trim(),
        description?.trim() || null,
        min_wager || 1,
        max_wager || null,
        closes_at || null,
        is_private || false,
      ]
    )

    const COLORS = ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899']
    for (let i = 0; i < outcomes.length; i++) {
      const label = outcomes[i].label || outcomes[i]
      if (!label || !label.trim()) continue
      await client.query(
        'INSERT INTO bet_outcomes (bet_id, label, color) VALUES ($1, $2, $3)',
        [bet.id, label.trim(), outcomes[i].color || COLORS[i % COLORS.length]]
      )
    }

    await client.query('COMMIT')

    // Check creator achievement
    await checkCreatorAchievement(req.user.id)

    res.status(201).json({ bet })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Failed to create bet' })
  } finally {
    client.release()
  }
})

// ─── Place a wager ────────────────────────────────────────────────────────────

// POST /api/bets/:id/place
router.post('/:id/place', requireAuth, async (req, res) => {
  const { outcome_id, amount } = req.body
  const betId = parseInt(req.params.id)
  const userId = req.user.id

  if (!amount || amount < 1) return res.status(400).json({ error: 'Amount must be at least 1' })

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // Lock the bet row
    const { rows: [bet] } = await client.query(
      'SELECT * FROM bets WHERE id = $1 FOR UPDATE',
      [betId]
    )
    if (!bet) return res.status(404).json({ error: 'Bet not found' })
    if (bet.status !== 'open') return res.status(400).json({ error: 'Bet is not open' })
    if (bet.closes_at && new Date(bet.closes_at) < new Date())
      return res.status(400).json({ error: 'Bet has closed' })
    if (bet.creator_id === userId)
      return res.status(400).json({ error: "You can't bet on your own bet" })

    // Check outcome belongs to this bet
    const { rows: [outcome] } = await client.query(
      'SELECT * FROM bet_outcomes WHERE id = $1 AND bet_id = $2',
      [outcome_id, betId]
    )
    if (!outcome) return res.status(400).json({ error: 'Invalid outcome' })

    // Check for existing placement
    const { rows: existing } = await client.query(
      'SELECT id FROM bet_placements WHERE user_id = $1 AND bet_id = $2',
      [userId, betId]
    )
    if (existing.length > 0) return res.status(400).json({ error: 'Already placed a bet on this' })

    if (bet.min_wager && amount < bet.min_wager)
      return res.status(400).json({ error: `Minimum wager is ${bet.min_wager} Schmekels` })
    if (bet.max_wager && amount > bet.max_wager)
      return res.status(400).json({ error: `Maximum wager is ${bet.max_wager} Schmekels` })

    // Lock and deduct from user balance
    const { rows: [user] } = await client.query(
      'SELECT schmekels FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    )
    if (user.schmekels < amount)
      return res.status(400).json({ error: 'Insufficient Schmekels' })

    const newBalance = user.schmekels - amount
    await client.query(
      'UPDATE users SET schmekels = $1, total_wagered = total_wagered + $2 WHERE id = $3',
      [newBalance, amount, userId]
    )

    // Record placement
    const { rows: [placement] } = await client.query(
      'INSERT INTO bet_placements (user_id, bet_id, outcome_id, amount) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, betId, outcome_id, amount]
    )

    // Log transaction
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, note)
       VALUES ($1, 'bet_placed', $2, $3, $4, $5)`,
      [userId, -amount, newBalance, betId, `Bet on "${bet.title}"`]
    )

    await client.query('COMMIT')

    // Check first-bet achievement
    await checkFirstBetAchievement(userId)

    res.json({ placement, newBalance })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Failed to place bet' })
  } finally {
    client.release()
  }
})

// ─── Resolve ──────────────────────────────────────────────────────────────────

// POST /api/bets/:id/resolve
router.post('/:id/resolve', requireAuth, async (req, res) => {
  const { winning_outcome_id, resolve_notes } = req.body
  const betId  = parseInt(req.params.id)
  const userId = req.user.id

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const { rows: [bet] } = await client.query(
      'SELECT * FROM bets WHERE id = $1 FOR UPDATE',
      [betId]
    )
    if (!bet) return res.status(404).json({ error: 'Bet not found' })
    if (bet.creator_id !== userId)
      return res.status(403).json({ error: 'Only the creator can resolve' })
    if (bet.status === 'resolved')
      return res.status(400).json({ error: 'Already resolved' })
    if (!['open', 'closed'].includes(bet.status))
      return res.status(400).json({ error: 'Cannot resolve this bet' })

    const { rows: [outcome] } = await client.query(
      'SELECT * FROM bet_outcomes WHERE id = $1 AND bet_id = $2',
      [winning_outcome_id, betId]
    )
    if (!outcome) return res.status(400).json({ error: 'Invalid outcome' })

    // Get all placements
    const { rows: allPlacements } = await client.query(
      'SELECT * FROM bet_placements WHERE bet_id = $1',
      [betId]
    )

    const totalPool = allPlacements.reduce((s, p) => s + p.amount, 0)
    const winners   = allPlacements.filter(p => p.outcome_id === parseInt(winning_outcome_id))
    const winnerPool = winners.reduce((s, p) => s + p.amount, 0)

    // Parimutuel payout: winner gets back their share of total pool
    for (const placement of allPlacements) {
      if (placement.outcome_id === parseInt(winning_outcome_id)) {
        const payout = winnerPool > 0
          ? Math.floor((placement.amount / winnerPool) * totalPool)
          : 0

        await client.query(
          'UPDATE bet_placements SET payout = $1 WHERE id = $2',
          [payout, placement.id]
        )

        const { rows: [u] } = await client.query(
          'UPDATE users SET schmekels = schmekels + $1, win_count = win_count + 1 WHERE id = $2 RETURNING schmekels',
          [payout, placement.user_id]
        )

        await client.query(
          `INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, note)
           VALUES ($1, 'bet_won', $2, $3, $4, $5)`,
          [placement.user_id, payout, u.schmekels, betId, `Won bet: "${bet.title}"`]
        )
      } else {
        await client.query(
          'UPDATE bet_placements SET payout = 0 WHERE id = $1',
          [placement.id]
        )
        await client.query(
          'UPDATE users SET loss_count = loss_count + 1 WHERE id = $1',
          [placement.user_id]
        )
      }
    }

    // Mark bet resolved
    await client.query(
      `UPDATE bets SET status = 'resolved', winning_outcome_id = $1,
       resolve_notes = $2, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [winning_outcome_id, resolve_notes || null, betId]
    )

    await client.query('COMMIT')

    // Check win achievements for each winner
    for (const w of winners) {
      await checkWinAchievements(w.user_id)
    }

    res.json({ ok: true, totalPool, winners: winners.length })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Failed to resolve bet' })
  } finally {
    client.release()
  }
})

// ─── Cancel ───────────────────────────────────────────────────────────────────

// POST /api/bets/:id/cancel
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const betId  = parseInt(req.params.id)
  const userId = req.user.id

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const { rows: [bet] } = await client.query(
      'SELECT * FROM bets WHERE id = $1 FOR UPDATE', [betId]
    )
    if (!bet) return res.status(404).json({ error: 'Bet not found' })
    if (bet.creator_id !== userId)
      return res.status(403).json({ error: 'Only the creator can cancel' })
    if (!['open', 'closed'].includes(bet.status))
      return res.status(400).json({ error: 'Cannot cancel this bet' })

    // Refund all bettors
    const { rows: placements } = await client.query(
      'SELECT * FROM bet_placements WHERE bet_id = $1', [betId]
    )
    for (const p of placements) {
      const { rows: [u] } = await client.query(
        'UPDATE users SET schmekels = schmekels + $1 WHERE id = $2 RETURNING schmekels',
        [p.amount, p.user_id]
      )
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, note)
         VALUES ($1, 'bet_refund', $2, $3, $4, $5)`,
        [p.user_id, p.amount, u.schmekels, betId, `Refund: "${bet.title}" was cancelled`]
      )
    }

    await client.query(
      "UPDATE bets SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [betId]
    )
    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Failed to cancel bet' })
  } finally {
    client.release()
  }
})

// POST /api/bets/:id/close  (stop accepting new bets)
router.post('/:id/close', requireAuth, async (req, res) => {
  const betId  = parseInt(req.params.id)
  const { rows: [bet] } = await db.query('SELECT * FROM bets WHERE id = $1', [betId])
  if (!bet) return res.status(404).json({ error: 'Bet not found' })
  if (bet.creator_id !== req.user.id)
    return res.status(403).json({ error: 'Only the creator can close' })
  if (bet.status !== 'open')
    return res.status(400).json({ error: 'Bet is not open' })

  await db.query("UPDATE bets SET status = 'closed', updated_at = NOW() WHERE id = $1", [betId])
  res.json({ ok: true })
})

// ─── Comments ─────────────────────────────────────────────────────────────────

// POST /api/bets/:id/comments
router.post('/:id/comments', requireAuth, async (req, res) => {
  const { body } = req.body
  if (!body || !body.trim() || body.trim().length > 1000)
    return res.status(400).json({ error: 'Comment must be 1–1000 characters' })

  try {
    const { rows: [comment] } = await db.query(
      `INSERT INTO comments (bet_id, user_id, body) VALUES ($1, $2, $3)
       RETURNING id, body, created_at`,
      [req.params.id, req.user.id, body.trim()]
    )
    await checkCommentAchievement(req.user.id)
    res.status(201).json({
      comment: {
        ...comment,
        username:   req.user.username,
        avatar_url: req.user.avatar_url,
        user_id:    req.user.id,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to post comment' })
  }
})

// DELETE /api/bets/:id/comments/:commentId
router.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
  const { rows: [c] } = await db.query('SELECT * FROM comments WHERE id = $1', [req.params.commentId])
  if (!c) return res.status(404).json({ error: 'Comment not found' })
  if (c.user_id !== req.user.id)
    return res.status(403).json({ error: 'Not your comment' })
  await db.query('DELETE FROM comments WHERE id = $1', [req.params.commentId])
  res.json({ ok: true })
})

// ─── Reactions ────────────────────────────────────────────────────────────────

// POST /api/bets/:id/react
router.post('/:id/react', requireAuth, async (req, res) => {
  const ALLOWED = ['🔥', '😂', '🤑', '💀', '👀', '🎉', '😬', '🤔']
  const { emoji } = req.body
  if (!ALLOWED.includes(emoji)) return res.status(400).json({ error: 'Invalid emoji' })

  try {
    // Toggle: insert if not exists, delete if exists
    const { rows: existing } = await db.query(
      'SELECT id FROM reactions WHERE bet_id = $1 AND user_id = $2 AND emoji = $3',
      [req.params.id, req.user.id, emoji]
    )

    if (existing.length > 0) {
      await db.query('DELETE FROM reactions WHERE id = $1', [existing[0].id])
      res.json({ action: 'removed' })
    } else {
      await db.query(
        'INSERT INTO reactions (bet_id, user_id, emoji) VALUES ($1, $2, $3)',
        [req.params.id, req.user.id, emoji]
      )
      res.json({ action: 'added' })
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to react' })
  }
})

// ─── Achievement helpers ──────────────────────────────────────────────────────

async function grantAchievement(userId, key) {
  try {
    const { rows: [a] } = await db.query('SELECT id FROM achievements WHERE key = $1', [key])
    if (!a) return
    await db.query(
      'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [userId, a.id]
    )
  } catch (_) {}
}

async function checkFirstBetAchievement(userId) {
  const { rows } = await db.query(
    'SELECT COUNT(*) FROM bet_placements WHERE user_id = $1', [userId]
  )
  if (parseInt(rows[0].count) >= 1) await grantAchievement(userId, 'first_bet')
}

async function checkWinAchievements(userId) {
  await grantAchievement(userId, 'first_win')
  const { rows: [u] } = await db.query('SELECT win_count, schmekels FROM users WHERE id = $1', [userId])
  if (u.win_count >= 10) await grantAchievement(userId, 'prophet')
  if (u.schmekels >= 1000) await grantAchievement(userId, 'schmekel_rich')
  if (u.schmekels <= 0) await grantAchievement(userId, 'broke')
}

async function checkCreatorAchievement(userId) {
  const { rows } = await db.query('SELECT COUNT(*) FROM bets WHERE creator_id = $1', [userId])
  if (parseInt(rows[0].count) >= 5) await grantAchievement(userId, 'creator')
}

async function checkCommentAchievement(userId) {
  const { rows } = await db.query('SELECT COUNT(*) FROM comments WHERE user_id = $1', [userId])
  if (parseInt(rows[0].count) >= 10) await grantAchievement(userId, 'social')
}

module.exports = router
