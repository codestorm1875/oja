# Oja Feature Checklist

This document tracks the planned feature set from `build.md` against the current implementation. A checked item means the feature exists in the repo in a usable scaffold/prototype form. Items that still need production hardening stay unchecked.

## Current Status

- [x] Root workspace scaffold for Go gateway, NestJS engine, Go worker, SDK, DB, infra, and tests.
- [x] Local PostgreSQL and Redis Docker Compose config.
- [x] NestJS engine application shell.
- [x] Go gateway application shell.
- [x] Go worker application shell.
- [x] Initial database schema, migration, and dev seed data.
- [x] Local migration and seed scripts.
- [x] Environment templates with ignored local and production secret files.
- [x] Gateway-safe PostgreSQL API-key lookup function.
- [x] Engine-safe PostgreSQL tenant/plugin config lookup function.
- [ ] Production migration runner and rollback workflow.
- [ ] Durable backend persistence across engine modules.
- [ ] End-to-end integration test suite.
- [ ] Load test scripts.

## Core Engine

- [x] Health endpoint.
- [x] Tenant context middleware in the engine.
- [x] Tenant config lookup from `engine/tenants.json`.
- [x] Tenant/plugin config lookup from PostgreSQL when `DATABASE_URL` is set.
- [x] Gateway API-key tenant resolution from `gateway/tenants.json`.
- [x] Gateway PostgreSQL tenant lookup with hashed API-key verification.
- [x] Gateway tenant context propagation to the engine.
- [x] Plugin registry with manifest-bearing plugin definitions.
- [x] Plugin dependency validation.
- [x] Transitive plugin dependency resolution.
- [x] In-process event bus.
- [x] Sandboxed plugin context with tenant data and event emission.
- [x] Recent event snapshot support.
- [x] Hashed API-key verification in the gateway.
- [x] Engine tenant config persistence in PostgreSQL.
- [ ] API key rotation and revocation.
- [ ] Per-tenant plugin config persistence.
- [ ] Plugin config schema declaration and validation.
- [ ] Critical vs non-critical plugin failure policy.
- [ ] Real plugin lifecycle hooks.

## Catalog Plugin

- [x] Tenant-aware product listing.
- [x] Tenant-aware product lookup.
- [ ] Product CRUD.
- [ ] Variants.
- [ ] Categories.
- [ ] Attributes.
- [ ] Price tiers.
- [ ] Product images.
- [ ] Soft deletes.
- [ ] Search indexing.
- [ ] PostgreSQL-backed catalog store.

## Cart And Sessions

- [x] Cart plugin manifest.
- [x] In-memory cart service.
- [x] Cart controller.
- [x] Session-owned carts.
- [ ] Persistent customer carts.
- [ ] Redis-backed cart sessions.
- [ ] Cart TTL.
- [x] Cart item add/update/remove.
- [x] Merge repeated cart creation into existing active owner cart.
- [ ] Cart merge on login.
- [ ] Cart validation against catalog and inventory.

## Checkout Engine

- [x] Tenant-aware quote endpoint.
- [x] Checkout quote event emission.
- [x] Checkout quote from cart ID.
- [x] Checkout pipeline scaffold.
- [x] Cart validation step.
- [x] Inventory reservation step.
- [ ] Discount evaluation step wired into checkout.
- [x] Tax calculation step.
- [x] Payment initiation step.
- [x] Order creation on successful payment.
- [x] Reservation release on failure.
- [ ] Plugin hook execution during checkout.
- [ ] Idempotent checkout attempts.
- [x] Checkout error recovery scaffold.

## Orders

- [x] Tenant-aware order creation scaffold.
- [x] Tenant-aware order listing.
- [x] Tenant-aware order lookup.
- [x] Order price snapshot shape.
- [ ] PostgreSQL-backed orders.
- [ ] Order lifecycle FSM: pending, confirmed, processing, fulfilled, returned.
- [ ] Order status transitions with validation.
- [ ] Order items table and immutable purchase snapshots.
- [ ] Fulfillments.
- [ ] Returns.
- [ ] Order event publishing.

## Inventory

- [x] Tenant-aware stock listing.
- [x] In-memory stock reservation.
- [x] In-memory stock release.
- [x] Low-stock item lookup.
- [ ] PostgreSQL-backed inventory levels.
- [ ] Multi-warehouse inventory.
- [ ] Reservation TTL.
- [ ] Reservation expiry worker.
- [ ] Optimistic locking or equivalent concurrency control.
- [ ] Low-stock alerts.
- [ ] Inventory event publishing.

## Discounts

- [x] Tenant-aware discount rule listing.
- [x] Percentage discounts.
- [x] Fixed amount discounts.
- [x] Coupon-style discounts.
- [x] Discount cap at subtotal.
- [ ] PostgreSQL-backed discounts.
- [ ] BOGO rules.
- [ ] Rule conditions.
- [ ] Expiry windows.
- [ ] Usage limits.
- [ ] Per-customer usage tracking.
- [ ] Discount usage persistence.
- [ ] Checkout integration.

## Payments And Providers

- [x] Payment plugin manifest.
- [x] Payment provider type abstraction for Stripe, Paystack, and Flutterwave.
- [x] Tenant-aware fake payment intents.
- [x] Provider currency checks.
- [x] Intent authorize/capture/refund state changes.
- [x] Provider adapter interface.
- [x] Mock provider adapter registry.
- [ ] Stripe adapter.
- [ ] Paystack adapter.
- [ ] Flutterwave adapter.
- [ ] Tenant payment config persistence.
- [ ] Secret management for provider credentials.
- [ ] Provider idempotency keys.
- [ ] Provider webhook verification.
- [ ] Payment state machine guards.
- [ ] Payment persistence.
- [ ] Payment failure handling.
- [ ] Refund persistence and reconciliation.

## Webhooks

- [x] Webhook registration scaffold.
- [x] Tenant-aware webhook listing.
- [x] Tenant-aware webhook removal.
- [x] Event type filtering.
- [x] In-process event fanout.
- [x] Simulated webhook delivery records.
- [x] Test delivery endpoint behavior.
- [ ] Real HTTP webhook delivery.
- [ ] Webhook signing.
- [ ] Retry scheduling with exponential backoff.
- [ ] Dead-letter queue.
- [ ] Durable webhook registration persistence.
- [ ] Durable delivery persistence.
- [ ] Worker-backed delivery processing.
- [ ] Webhook delivery metrics.

## Email And Notifications

- [x] Notification module or plugin.
- [x] Email provider adapter interface.
- [x] Mock email provider adapter.
- [x] Test email endpoint.
- [ ] Primary email provider adapter.
- [ ] SMTP fallback adapter.
- [ ] Transactional email templates.
- [ ] Tenant-specific template overrides.
- [ ] Email job queue.
- [ ] Email delivery persistence.
- [ ] Email retry and failure tracking.
- [ ] Order confirmation emails.
- [ ] Payment failure emails.
- [ ] Inventory low-stock emails.
- [ ] Webhook failure emails.

## Platform APIs

- [x] Admin API snapshot.
- [x] Admin tenant listing.
- [x] Admin tenant detail.
- [x] Admin audit log listing.
- [x] Storefront overview endpoint.
- [x] Storefront product listing.
- [x] Storefront product lookup.
- [x] OpenAPI/Swagger setup.
- [ ] Admin authentication and authorization.
- [ ] Admin mutation endpoints.
- [ ] Store management endpoints.
- [ ] Public/private route separation.
- [ ] SDK generation from OpenAPI.
- [ ] Published TypeScript SDK.
- [ ] Optional GraphQL storefront API.

## Audit Logs

- [x] In-memory audit log service.
- [x] Plugin event audit logging.
- [x] Platform mutation audit logging scaffold.
- [x] Admin audit log access.
- [ ] PostgreSQL-backed audit logs.
- [ ] Actor identity model.
- [ ] Mutation diffs.
- [ ] Audit log filtering and pagination.
- [ ] Audit retention policy.

## Gateway

- [x] `/healthz` endpoint.
- [x] `/engine/*` reverse proxy.
- [x] API-key auth middleware.
- [x] Tenant header injection.
- [x] Redis-backed rate limiting.
- [x] Tenant/path scoped rate limit keys.
- [x] Rate limit response headers.
- [x] Gateway package split into auth, proxy, and ratelimit internals.
- [x] Hashed API key lookup.
- [x] PostgreSQL-backed tenant lookup.
- [ ] Request ID injection.
- [ ] CORS policy.
- [ ] Structured gateway logging.
- [ ] Gateway metrics.
- [x] Gateway env loader tests.
- [ ] Gateway auth database integration tests.
- [ ] Gateway proxy tests.

## Worker And Queues

- [x] Worker binary scaffold.
- [ ] Queue technology decision finalized.
- [ ] Webhook delivery worker.
- [ ] Email worker.
- [ ] Inventory reservation expiry worker.
- [ ] Retry worker.
- [ ] Dead-letter processing.
- [ ] Queue depth metrics.
- [ ] Graceful shutdown.

## Persistence And Data Model

- [x] PostgreSQL schema.
- [x] Row-level security.
- [x] `tenant_id` on every tenant-owned table.
- [ ] Tenant session setting for RLS.
- [x] Stores table.
- [x] Products table.
- [x] Variants table.
- [x] Categories tables.
- [x] Inventory levels table.
- [x] Orders table.
- [x] Order items table.
- [x] Payments table.
- [x] Fulfillments table.
- [x] Carts table.
- [x] Cart items table.
- [x] Discounts table.
- [x] Discount rules table.
- [x] Discount usages table.
- [x] Webhooks table.
- [x] Webhook deliveries table.
- [x] API keys table.
- [x] Plugins table.
- [x] Plugin configs table.
- [x] Audit logs table.
- [x] Outbox events table.
- [x] Email deliveries table.
- [x] Critical indexes from `build.md`.

## Observability And Operations

- [ ] Prometheus metrics endpoint.
- [ ] Request latency metrics.
- [ ] Plugin hook duration metrics.
- [ ] Queue depth metrics.
- [ ] OpenTelemetry tracing.
- [ ] Distributed traces across gateway, engine, and workers.
- [ ] Structured JSON logging.
- [ ] Trace IDs.
- [ ] Tenant context in logs.
- [ ] Cache warming.
- [ ] Runtime health checks for PostgreSQL and Redis.
- [ ] Graceful shutdown in engine.
- [ ] Graceful shutdown in gateway.
- [ ] Deployment configuration.

## Testing

- [x] Gateway rate limit unit tests.
- [x] Engine TypeScript typecheck passes through local `tsc`.
- [x] Go package tests pass with `GOCACHE=/tmp/oja-go-build`.
- [ ] Engine unit tests.
- [ ] Plugin service tests.
- [ ] Checkout pipeline tests.
- [ ] Payment provider contract tests.
- [ ] Webhook delivery tests.
- [ ] Email delivery tests.
- [ ] Database integration tests.
- [ ] Gateway auth tests.
- [ ] End-to-end smoke test scripts.
- [ ] k6 load tests.

## Documentation

- [x] Architecture and engineering playbook in `build.md`.
- [x] Progress tracker in `progress.md`.
- [x] Root README scaffold.
- [x] Infra README scaffold.
- [x] DB README scaffold.
- [x] SDK README scaffold.
- [x] Integration tests README scaffold.
- [x] Load tests README scaffold.
- [x] Feature checklist.
- [ ] Updated progress numbers based on production readiness.
- [ ] API usage examples.
- [ ] Local development guide.
- [ ] Provider setup guide.
- [ ] Webhook signing guide.
- [ ] Email setup guide.
- [ ] Database migration guide.
