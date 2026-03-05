const passport   = require('passport')
const SteamStrategy = require('passport-steam').Strategy
const db         = require('./database')

passport.use(
  new SteamStrategy(
    {
      returnURL: `${process.env.BASE_URL}/auth/steam/return`,
      realm:     process.env.BASE_URL,
      apiKey:    process.env.STEAM_API_KEY,
    },
    async (_identifier, profile, done) => {
      try {
        const steamId  = profile.id
        const username = profile.displayName
        const avatar   = profile.photos?.[2]?.value || profile.photos?.[0]?.value || null

        // Upsert the user
        const result = await db.query(
          `INSERT INTO users (steam_id, username, avatar_url, last_seen)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (steam_id) DO UPDATE
             SET username   = EXCLUDED.username,
                 avatar_url = EXCLUDED.avatar_url,
                 last_seen  = NOW()
           RETURNING *`,
          [steamId, username, avatar]
        )

        const user = result.rows[0]

        // Award signup bonus + log transaction if this is a brand-new user
        if (result.rows[0].schmekels === 100 && result.rows[0].win_count === 0) {
          const txCheck = await db.query(
            'SELECT id FROM transactions WHERE user_id = $1 AND type = $2',
            [user.id, 'signup_bonus']
          )
          if (txCheck.rows.length === 0) {
            await db.query(
              `INSERT INTO transactions (user_id, type, amount, balance_after, note)
               VALUES ($1, 'signup_bonus', 100, 100, 'Welcome to SchmekelBets!')`,
              [user.id]
            )
          }
        }

        return done(null, user)
      } catch (err) {
        return done(err)
      }
    }
  )
)

passport.serializeUser((user, done) => done(null, user.id))

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id])
    done(null, result.rows[0] || null)
  } catch (err) {
    done(err)
  }
})

module.exports = passport
