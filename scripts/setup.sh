#!/usr/bin/env bash
# =============================================================================
# SchmekelBets - Ubuntu 24.04 Setup Script
# Run as root or with sudo once on a fresh server
# Usage: sudo bash scripts/setup.sh
# =============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RESET='\033[0m'

info()  { echo -e "${GREEN}[info]${RESET}  $*"; }
warn()  { echo -e "${YELLOW}[warn]${RESET}  $*"; }
title() { echo -e "\n${BOLD}=== $* ===${RESET}"; }

# ─── 1. Update system ────────────────────────────────────────────────────────
title "Updating system packages"
apt-get update -y && apt-get upgrade -y

# ─── 2. Install Node.js 20 LTS ───────────────────────────────────────────────
title "Installing Node.js 20"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
info "Node $(node -v) | npm $(npm -v)"

# ─── 3. Install PostgreSQL 16 ────────────────────────────────────────────────
title "Installing PostgreSQL"
apt-get install -y postgresql postgresql-contrib

# ─── 4. Create DB + user ─────────────────────────────────────────────────────
title "Setting up PostgreSQL database"
DB_NAME="schmekelbets"
DB_USER="schmekelbets"
DB_PASS=$(openssl rand -hex 16)

sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || \
  warn "User ${DB_USER} already exists"
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || \
  warn "Database ${DB_NAME} already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

info "DB created: ${DB_NAME} / user: ${DB_USER}"

# ─── 5. Install nginx ────────────────────────────────────────────────────────
title "Installing nginx"
apt-get install -y nginx
systemctl enable nginx

# ─── 6. Install PM2 ──────────────────────────────────────────────────────────
title "Installing PM2"
npm install -g pm2

# ─── 7. Write the .env if it doesn't exist ───────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

if [ ! -f "${APP_DIR}/.env" ]; then
  SESSION_SECRET=$(openssl rand -hex 32)
  cat > "${APP_DIR}/.env" << EOF
PORT=3001
NODE_ENV=production
BASE_URL=http://localhost

STEAM_API_KEY=REPLACE_WITH_YOUR_STEAM_API_KEY

SESSION_SECRET=${SESSION_SECRET}

DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
EOF
  info ".env created at ${APP_DIR}/.env"
  warn "Edit ${APP_DIR}/.env and set STEAM_API_KEY and BASE_URL!"
else
  warn ".env already exists — skipping"
fi

# ─── 8. Load schema ──────────────────────────────────────────────────────────
title "Loading database schema"
sudo -u postgres psql -d "${DB_NAME}" -f "${APP_DIR}/database/schema.sql"
info "Schema loaded"

# ─── 9. Install npm deps + build ─────────────────────────────────────────────
title "Installing dependencies and building"
cd "${APP_DIR}"
npm run setup

# ─── 10. Configure nginx ──────────────────────────────────────────────────────
title "Configuring nginx"
DOMAIN=${1:-_}
cat > /etc/nginx/sites-available/schmekelbets << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/schmekelbets /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
info "nginx configured"

# ─── 11. Start with PM2 ───────────────────────────────────────────────────────
title "Starting SchmekelBets with PM2"
cd "${APP_DIR}"
pm2 start server/index.js --name schmekelbets --env production
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo ""
echo -e "${BOLD}${GREEN}✅ SchmekelBets setup complete!${RESET}"
echo ""
echo "Next steps:"
echo "  1. Edit .env and set your STEAM_API_KEY"
echo "  2. Set BASE_URL in .env to your domain/IP  (e.g. http://your.server.ip)"
echo "  3. Run: pm2 restart schmekelbets"
echo ""
echo "  Optional: set up HTTPS with: sudo certbot --nginx -d yourdomain.com"
echo ""
