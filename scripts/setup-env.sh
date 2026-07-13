#!/usr/bin/env bash
# Kapar dev-environment bootstrap — idempotent. Works in two worlds:
#   1. Local machine with Docker: postgres runs via docker-compose.
#   2. Cloud/CI containers without a Docker daemon: system postgres via apt
#      (verified working in the Claude cloud session environment 2026-07-12).
# Then: migrations + seed, so `npm run -w server dev` serves the catalogue.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "── Kapar setup ──"

if [ ! -d node_modules ]; then
  echo "→ npm install (workspaces)"
  npm install
fi

start_docker_pg() {
  docker compose up -d postgres
  echo "→ waiting for postgres (docker)…"
  for _ in $(seq 1 30); do
    docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

start_system_pg() {
  if ! command -v psql >/dev/null 2>&1; then
    echo "→ installing postgresql via apt"
    apt-get update -qq && apt-get install -y -qq postgresql
  fi
  service postgresql start >/dev/null 2>&1 || pg_ctlcluster 16 main start || true
  for _ in $(seq 1 15); do
    sudo -u postgres psql -c 'SELECT 1' >/dev/null 2>&1 && break
    sleep 1
  done
  sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" >/dev/null
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='kapar'" | grep -q 1 \
    || sudo -u postgres createdb kapar
}

if docker info >/dev/null 2>&1; then
  echo "→ postgres via docker compose"
  start_docker_pg || { echo "docker postgres failed; falling back to system postgres"; start_system_pg; }
else
  echo "→ no docker daemon; postgres via system service"
  start_system_pg
fi

export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/kapar}"
echo "→ migrate + seed ($DATABASE_URL)"
npm run -w server db:migrate
npm run -w server db:seed

echo "── done ──"
echo "server:  npm run -w server dev              (http://localhost:3000)"
echo "app:     EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start --web"
echo "         (add --offline in the cloud environment — api.expo.dev is blocked)"
