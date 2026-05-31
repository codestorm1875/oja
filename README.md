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
