#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] Validate card data"
node tools/validate_cards_v2.js data/smart10/cards.en.json

echo "[2/4] Run backend tests"
(cd backend && mvn -q test)

echo "[3/4] Build frontend"
(cd frontend && npm ci && npm run lint && npm run build)

echo "[4/4] Manual verification checklist"
echo "- Start stack: docker compose up -d && make dev"
echo "- Open UI: http://localhost:5173"
echo "- Verify topic list loads"
echo "- Start round and answer one question"
echo "- Verify /api/cards/random and /api/topics responses"
