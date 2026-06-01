# Oja

Plugin-based ecommerce engine scaffold.

## Layout

- `gateway/` - Go HTTP gateway
- `engine/` - NestJS plugin runtime
- `worker/` - Go webhook worker
- `sdk/` - generated TypeScript client
- `db/` - database migrations and schema work
- `infra/` - local and deployment infrastructure
- `tests/` - integration and load tests

## Environment

Use `.env.example` for local development defaults:

```bash
cp .env.example .env
```

Use `.env.production.example` as the production template. Real `.env` and `.env.production` files are ignored by git and must not contain committed secrets.

When `DATABASE_URL` is set, the gateway resolves API keys from PostgreSQL using hashed keys in the `api_keys` table. Without `DATABASE_URL`, it falls back to the local `gateway/tenants.json` fixture.

When `DATABASE_URL` is set, the engine loads tenant/plugin configuration from PostgreSQL during bootstrap. Without `DATABASE_URL`, it falls back to the local `engine/tenants.json` fixture.

Swagger is available at `/docs`. Use the Authorize button with `X-API-Key` values such as `test-key-acme` for local testing.
