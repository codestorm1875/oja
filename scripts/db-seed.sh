#!/usr/bin/env bash
set -euo pipefail

source scripts/load-env.sh
load_env_file "${ENV_FILE:-.env}"

: "${DATABASE_URL:?DATABASE_URL is required. Copy .env.example to .env or set DATABASE_URL.}"

SEED_FILE="${SEED_FILE:-db/seeds/dev.sql}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to run database seeds" >&2
  exit 1
fi

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "pg_isready is required to check database readiness" >&2
  exit 1
fi

if [ ! -f "$SEED_FILE" ]; then
  echo "seed file not found: $SEED_FILE" >&2
  exit 1
fi

if ! pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; then
  echo "database is not reachable; start infra with pnpm run dev:infra or set DATABASE_URL" >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SEED_FILE"
