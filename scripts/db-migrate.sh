#!/usr/bin/env bash
set -euo pipefail

source scripts/load-env.sh
load_env_file "${ENV_FILE:-.env}"

: "${DATABASE_URL:?DATABASE_URL is required. Copy .env.example to .env or set DATABASE_URL.}"

MIGRATIONS_DIR="${MIGRATIONS_DIR:-db/migrations}"

database_name_from_url() {
  local url="$1"
  local without_query="${url%%\?*}"
  local name="${without_query##*/}"

  if [ -z "$name" ] || [ "$name" = "$without_query" ]; then
    echo "DATABASE_URL must include a database name" >&2
    exit 1
  fi

  if [[ ! "$name" =~ ^[A-Za-z0-9_]+$ ]]; then
    echo "database name must contain only letters, numbers, and underscores: $name" >&2
    exit 1
  fi

  printf '%s' "$name"
}

maintenance_url_from_database_url() {
  local url="$1"
  local query=""
  local base="$url"

  if [[ "$url" == *\?* ]]; then
    query="?${url#*\?}"
    base="${url%%\?*}"
  fi

  printf '%s/postgres%s' "${base%/*}" "$query"
}

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

DATABASE_NAME="$(database_name_from_url "$DATABASE_URL")"
MAINTENANCE_DATABASE_URL="$(maintenance_url_from_database_url "$DATABASE_URL")"

if ! pg_isready -d "$MAINTENANCE_DATABASE_URL" >/dev/null 2>&1; then
  echo "database server is not reachable; start infra with npm run dev:infra or set DATABASE_URL" >&2
  exit 1
fi

if ! psql "$MAINTENANCE_DATABASE_URL" -tAc "SELECT 1 FROM pg_database WHERE datname = '$DATABASE_NAME'" | grep -qx '1'; then
  echo "Creating database $DATABASE_NAME"
  psql "$MAINTENANCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DATABASE_NAME\""
fi

if ! pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; then
  echo "database is not reachable after creation: $DATABASE_NAME" >&2
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
