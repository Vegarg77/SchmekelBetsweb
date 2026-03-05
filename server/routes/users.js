const router = require('express').Router()
const db     = require('../config/database')
const { requireAuth } = require('../middleware/auth')

// GET /api/users/:id - public profile
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.username, u.avatar_url, u.schmekels,
              u.win_count, u.loss_count, u.total_wagered, u.created_at,
              (SELECT COUNT(*) FROM bets WHERE creator_id = u.id) AS bets_created,
              (SELECT COUNT(*) FROM bet_placements WHERE user_id = u.id) AS bets_placed
       FROM users u
       WHERE u.id = $1`,
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'User not found' })

    const achievements = await db.query(
      `SELECT a.key, a.name, a.description, a.emoji, ua.earned_at
       FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id = $1
       ORDER BY ua.earned_at DESC`,
      [req.params.id]
    )

    res.json({ user: rows[0], achievements: achievements.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/users/daily-bonus - claim daily Schmekel bonus
router.post('/daily-bonus', requireAuth, async (req, res) => {
  const userId = req.user.id
  const today  = new Date().toISOString().split('T')[0]

  try {
    const { rows } = await db.query('SELECT daily_claimed FROM users WHERE id = $1', [userId])
    if (rows[0].daily_claimed && rows[0].daily_claimed.toISOString().startsWith(today)) {
      return res.status(400).json({ error: 'Already claimed today', nextClaim: tomorrow() })
    }

    const BONUS = 10
    const result = await db.query(
      `UPDATE users
       SET schmekels    = schmekels + $1,
           daily_claimed = CURRENT_DATE
       WHERE id = $2
       RETURNING schmekels`,
      [BONUS, userId]
    )

    await db.query(
      `INSERT INTO transactions (user_id, type, amount, balance_after, note)
       VALUES ($1, 'daily_bonus', $2, $3, 'Daily bonus claimed')`,
      [userId, BONUS, result.rows[0].schmekels]
    )

    await checkAchievements(userId)

    res.json({ ok: true, bonus: BONUS, newBalance: result.rows[0].schmekels })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/users/:id/bets - bets created by user
router.get('/:id/bets', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.id, b.title, b.status, b.created_at,
              COALESCE(SUM(bp.amount), 0) AS total_pool,
              COUNT(DISTINCT bp.id) AS placement_count
       FROM bets b
       LEFT JOIN bet_placements bp ON bp.bet_id = b.id
       WHERE b.creator_id = $1
       GROUP BY b.id
       ORDER BY b.created_at DESC
       LIMIT 20`,
      [req.params.id]
    )
    res.json({ bets: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/users/:id/placements - bets the user has placed
router.get('/:id/placements', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT bp.id, bp.amount, bp.payout, bp.placed_at,
              b.id AS bet_id, b.title AS bet_title, b.status AS bet_status,
              bo.label AS outcome_label
       FROM bet_placements bp
       JOIN bets b ON b.id = bp.bet_id
       JOIN bet_outcomes bo ON bo.id = bp.outcome_id
       WHERE bp.user_id = $1
       ORDER BY bp.placed_at DESC
       LIMIT 50`,
      [req.params.id]
    )
    res.json({ placements: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/users/:id/transactions
router.get('/:id/transactions', requireAuth, async (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  try {
    const { rows } = await db.query(
      `SELECT type, amount, balance_after, note, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.params.id]
    )
    res.json({ transactions: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

async function checkAchievements(userId) {
  try {
    const { rows: [u] } = await db.query(
      'SELECT schmekels, win_count, loss_count FROM users WHERE id = $1',
      [userId]
    )
    const betsCreated = (await db.query(
      'SELECT COUNT(*) FROM bets WHERE creator_id = $1', [userId]
    )).rows[0].count

    const candidates = []
    if (u.schmekels >= 1000)         candidates.push('schmekel_rich')
    if (u.schmekels <= 0)            candidates.push('broke')
    if (u.win_count >= 10)           candidates.push('prophet')
    if (parseInt(betsCreated) >= 5)  candidates.push('creator')

    for (const key of candidates) {
      const ach = await db.query('SELECT id FROM achievements WHERE key = $1', [key])
      if (!ach.rows[0]) continue
      await db.query(
        `INSERT INTO user_achievements (user_id, achievement_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, ach.rows[0].id]
      )
    }
  } catch (_) { /* non-critical */ }
}

module.exports = router
