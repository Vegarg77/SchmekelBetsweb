# 🪙 SchmekelBets

A fun, friend-group prediction market where you bet **Schmekels** — a completely
made-up currency — on anything you can dream up.

> "I bet you 15 Schmekels I can 360 no-scope you." — Create the bet.
> Friends wager. Someone wins. Someone loses. Everyone has a great time.

---

## Features

| Feature | Description |
|---------|-------------|
| 🔐 Steam Login | Sign in with your Steam account — no passwords |
| 🪙 Schmekels | 100 free Schmekels on signup, +10 every day |
| 🎲 Bet Creation | 2–6 outcomes, optional close date, min/max wager |
| 📊 Parimutuel Payout | Winners split the full pool proportionally to their stake |
| 💬 Comments | Talk smack on any bet |
| 😂 Reactions | React with 8 emojis per bet |
| 🏆 Leaderboard | Richest, most wins, most wagered |
| 🏅 Achievements | 10 achievements to unlock |
| 📅 Daily Bonus | Claim 10 free Schmekels daily |
| 📦 Categories | Gaming, IRL, Sports, Esports, Food, Movies/TV, Misc |
| 🔒 Private Bets | Share-link-only bets for your group |

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Auth**: Steam OpenID via Passport.js
- **Process manager**: PM2
- **Reverse proxy**: nginx

---

## Quick Start (Ubuntu 24.04)

### 1. Get a Steam API Key

Go to https://steamcommunity.com/dev/apikey and register your domain.

### 2. Clone the repo onto your server

```bash
git clone <your-repo-url> /opt/schmekelbets
cd /opt/schmekelbets
```

### 3. Run the setup script (as root)

```bash
sudo bash scripts/setup.sh yourdomain.com
```

This will:
- Install Node.js 20, PostgreSQL 16, nginx, PM2
- Create the database and run the schema
- Generate a `.env` file with a random session secret
- Build the frontend
- Configure nginx as a reverse proxy
- Start the app with PM2

### 4. Edit the generated `.env`

```bash
nano /opt/schmekelbets/.env
```

Set these values:
```dotenv
BASE_URL=http://yourdomain.com        # or https:// if using SSL
STEAM_API_KEY=your_key_here
```

### 5. Restart the app

```bash
pm2 restart schmekelbets
```

### 6. (Optional) Enable HTTPS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

After getting a cert, update `.env`:
```dotenv
BASE_URL=https://yourdomain.com
```
And restart again.

---

## Manual Setup (no script)

```bash
# 1. Install deps
npm run install:all

# 2. Set up .env (copy from .env.example)
cp .env.example .env
# Edit .env with your values

# 3. Create PostgreSQL database
createdb schmekelbets
psql schmekelbets < database/schema.sql

# 4. Build the frontend
npm run build

# 5. Start
npm start
```

---

## Deployment Commands

```bash
# Start
pm2 start ecosystem.config.js --env production

# Update (after pulling new code)
bash scripts/update.sh

# View logs
pm2 logs schmekelbets

# Restart
pm2 restart schmekelbets
```

---

## How Bets Work

1. **Create** — Anyone can create a bet with 2–6 possible outcomes
2. **Wager** — Other users pick an outcome and stake Schmekels
3. **Close** — Creator can close betting (or set an auto-close date)
4. **Resolve** — Creator picks the winning outcome
5. **Payout** — Winners split the entire pool proportionally to their stake

### Payout example
- Total pool: 100 Schmekels
- You bet 30 on "Yes", total on "Yes" side = 60
- Your share of the winning side: 30/60 = 50%
- Your payout: 50% × 100 = **50 Schmekels** (profit: +20)

---

## Project Structure

```
schmekelbets/
├── server/
│   ├── index.js              # Express app entry point
│   ├── config/
│   │   ├── database.js       # PostgreSQL pool
│   │   └── passport.js       # Steam OAuth
│   ├── middleware/
│   │   └── auth.js           # requireAuth middleware
│   └── routes/
│       ├── auth.js           # /auth/*
│       ├── bets.js           # /api/bets/*
│       ├── users.js          # /api/users/*
│       └── leaderboard.js    # /api/leaderboard
├── client/
│   └── src/
│       ├── pages/            # Route-level components
│       ├── components/       # Reusable UI components
│       ├── context/          # AuthContext
│       └── hooks/            # useApi, apiFetch
├── database/
│   └── schema.sql            # Full PostgreSQL schema
└── scripts/
    ├── setup.sh              # One-time server setup
    └── update.sh             # Redeploy script
```

---

## Ideas for Future Features

- **Friend groups / rooms** — Create a private group, only members can see/bet
- **Steam game integration** — Auto-link bets to specific Steam games
- **Streaks** — Track win/loss streaks with bonus Schmekels
- **Weekly Schmekel grants** — Auto-grant Schmekels each week so nobody runs dry
- **Bet templates** — Save and reuse your favourite bet formats
- **Discord notifications** — Webhook alerts when someone bets or resolves
- **Time-limited flash bets** — Bet closes in 60 seconds, high stakes
- **Spectator odds** — Non-bettors can vote on expected outcome without wagering
