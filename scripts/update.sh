#!/usr/bin/env bash
# =============================================================================
# SchmekelBets - Update / redeploy script
# Run from the project directory: bash scripts/update.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

cd "${APP_DIR}"

echo "📦 Pulling latest code..."
git pull

echo "📦 Installing dependencies..."
npm install
cd client && npm install && cd ..

echo "🔨 Building frontend..."
cd client && npm run build && cd ..

echo "♻️  Restarting server..."
pm2 restart schmekelbets

echo "✅ Update complete!"
pm2 status schmekelbets
