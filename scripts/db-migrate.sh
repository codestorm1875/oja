#!/usr/bin/env bash
set -euo pipefail

source scripts/load-env.sh
load_env_file "${ENV_FILE:-.env}"

: "${DATABASE_URL:?DATABASE_URL is required. Copy .env.example to .env or set DATABASE_URL.}"

MIGRATIONS_DIR="${MIGRATIONS_DIR:-db/migrations}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to run database migrations" >&2
  exit 1
fi

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "pg_isready is required to check database readiness" >&2
  exit 1
fi

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "migrations directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

if ! pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; then
  echo "database is not reachable; start infra with npm run dev:infra or set DATABASE_URL" >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"

for migration in "$MIGRATIONS_DIR"/*.sql; do
  if [ ! -f "$migration" ]; then
    continue
  fi

  version="$(basename "$migration")"
  already_applied="$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM schema_migrations WHERE version = '$version'")"

  if [ "$already_applied" = "1" ]; then
    echo "Skipping $version"
    continue
  fi

  echo "Applying $version"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations (version) VALUES ('$version')"
done
