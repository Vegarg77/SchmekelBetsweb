require('dotenv').config()

const express      = require('express')
const session      = require('express-session')
const pgSession    = require('connect-pg-simple')(session)
const passport     = require('./config/passport')
const helmet       = require('helmet')
const morgan       = require('morgan')
const path         = require('path')
const db           = require('./config/database')

const authRouter        = require('./routes/auth')
const betsRouter        = require('./routes/bets')
const usersRouter       = require('./routes/users')
const leaderboardRouter = require('./routes/leaderboard')

const app  = express()
const PORT = process.env.PORT || 3001
const isProd = process.env.NODE_ENV === 'production'

// ─── Security / logging ───────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "'unsafe-inline'"],
        styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
        imgSrc:     ["'self'", 'data:', 'https:', 'http:'],
        connectSrc: ["'self'"],
      },
    },
  })
)
app.use(morgan(isProd ? 'combined' : 'dev'))

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── Sessions ─────────────────────────────────────────────────────────────────
app.use(
  session({
    store: new pgSession({
      pool: db,
      tableName: 'session',
      createTableIfMissing: false,
    }),
    secret:            process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave:            false,
    saveUninitialized: false,
    cookie: {
      secure:   isProd,
      httpOnly: true,
      maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: isProd ? 'lax' : 'lax',
    },
  })
)

// ─── Passport ────────────────────────────────────────────────────────────────
app.use(passport.initialize())
app.use(passport.session())

// ─── Trust proxy (for nginx) ──────────────────────────────────────────────────
if (isProd) app.set('trust proxy', 1)

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/auth',            authRouter)
app.use('/api/bets',        betsRouter)
app.use('/api/users',       usersRouter)
app.use('/api/leaderboard', leaderboardRouter)

// ─── Serve React build ────────────────────────────────────────────────────────
const publicDir = path.join(__dirname, 'public')
app.use(express.static(publicDir))
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🪙  SchmekelBets running on http://localhost:${PORT}`)
})

module.exports = app
