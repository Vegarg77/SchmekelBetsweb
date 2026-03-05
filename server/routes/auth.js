const router   = require('express').Router()
const passport = require('../config/passport')

// Kick off Steam OpenID login
router.get('/steam', passport.authenticate('steam', { failureRedirect: '/' }))

// Steam redirects back here
router.get(
  '/steam/return',
  passport.authenticate('steam', { failureRedirect: '/?login=failed' }),
  (_req, res) => res.redirect('/')
)

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' })
    res.json({ ok: true })
  })
})

// Current user info
router.get('/me', (req, res) => {
  if (!req.user) return res.json({ user: null })
  const { id, username, avatar_url, schmekels, win_count, loss_count, total_wagered, created_at } = req.user
  res.json({ user: { id, username, avatar_url, schmekels, win_count, loss_count, total_wagered, created_at } })
})

module.exports = router
