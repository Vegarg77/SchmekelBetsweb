const router = require('express').Router()
const db     = require('../config/database')

// GET /api/leaderboard?type=balance|wins|wagered
router.get('/', async (req, res) => {
  const { type = 'balance' } = req.query

  const orderMap = {
    balance: 'u.schmekels DESC',
    wins:    'u.win_count DESC',
    wagered: 'u.total_wagered DESC',
  }
  const order = orderMap[type] || orderMap.balance

  try {
    const { rows } = await db.query(
      `SELECT u.id, u.username, u.avatar_url, u.schmekels,
              u.win_count, u.loss_count, u.total_wagered,
              CASE WHEN (u.win_count + u.loss_count) > 0
                   THEN ROUND(u.win_count::numeric / (u.win_count + u.loss_count) * 100, 1)
                   ELSE 0
              END AS win_rate,
              (SELECT COUNT(*) FROM bets WHERE creator_id = u.id) AS bets_created,
              (SELECT COUNT(*) FROM user_achievements WHERE user_id = u.id) AS achievement_count
       FROM users u
       ORDER BY ${order}
       LIMIT 50`
    )
    res.json({ leaderboard: rows, type })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
