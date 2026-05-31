# Database

Schema, migrations, and seed data live here.

## Layout

- `migrations/` - ordered SQL migrations for PostgreSQL.
- `seeds/` - development seed data.

## Current Files

- `migrations/001_initial_schema.sql` - initial multi-tenant commerce schema with RLS, core commerce tables, webhook/email delivery tables, indexes, and outbox support.
- `seeds/dev.sql` - development tenants, stores, API key hashes, and enabled plugins matching the current fixture tenants.

## Local Usage

Start local infrastructure first:

```bash
npm run dev:infra
```

Apply the migration and dev seed with `psql`:

```bash
psql postgresql://oja:oja@localhost:5432/oja -f db/migrations/001_initial_schema.sql
psql postgresql://oja:oja@localhost:5432/oja -f db/seeds/dev.sql
```

Tenant-owned tables have row-level security policies that expect the app to set `app.tenant_id` for each request transaction:

```sql
SELECT set_config('app.tenant_id', '<tenant-uuid>', true);
```
