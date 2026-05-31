# Database

Schema, migrations, and seed data live here.

## Layout

- `migrations/` - ordered SQL migrations for PostgreSQL.
- `seeds/` - development seed data.

## Current Files

- `migrations/001_initial_schema.sql` - initial multi-tenant commerce schema with RLS, core commerce tables, webhook/email delivery tables, indexes, and outbox support.
- `migrations/002_gateway_api_key_lookup.sql` - gateway-safe hashed API-key lookup function for tenant resolution before tenant RLS context is known.
- `migrations/003_engine_tenant_config_lookup.sql` - engine-safe tenant/plugin config lookup function for bootstrap runtime configuration.
- `seeds/dev.sql` - development tenants, stores, API key hashes, and enabled plugins matching the current fixture tenants.

## Local Usage

Create a local environment file:

```bash
cp .env.example .env
```

Start local infrastructure first:

```bash
pnpm run dev:infra
```

Apply migrations and dev seed:

```bash
pnpm run db:setup
```

The scripts load `DATABASE_URL` from `.env` by default. You can override the env file with `ENV_FILE=.env.production pnpm run db:migrate`.
`db:migrate` connects through the maintenance `postgres` database first and creates the target database from `DATABASE_URL` when it does not exist.

The local `.env` and real `.env.production` files are ignored by git. Commit only `.env.example` and `.env.production.example`.

You can also run them separately:

```bash
pnpm run db:migrate
pnpm run db:seed
```

Tenant-owned tables have row-level security policies that expect the app to set `app.tenant_id` for each request transaction:

```sql
SELECT set_config('app.tenant_id', '<tenant-uuid>', true);
```
