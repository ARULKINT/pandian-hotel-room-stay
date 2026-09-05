#!/usr/bin/env bash
# Redeploy script — run this ON THE VPS after the initial setup in
# deploy/vps-alternative/README.md is done once. Pulls the latest code,
# rebuilds the frontend, and reloads the backend without downtime.
#
# Usage: ./deploy/vps-alternative/deploy.sh

set -euo pipefail
cd "$(dirname "$0")/../.."

echo "==> Pulling latest code"
git pull

echo "==> Installing backend dependencies"
(cd backend && npm ci --omit=dev)

echo "==> Installing frontend dependencies and building"
(cd frontend && npm ci && npm run build)

echo "==> Reloading backend (zero-downtime)"
pm2 reload deploy/vps-alternative/ecosystem.config.js

echo "==> Reloading nginx (picks up new static build immediately, no restart needed)"
sudo nginx -t && sudo systemctl reload nginx

echo "==> Done. Tail logs with: pm2 logs pandian-hotel-api"
