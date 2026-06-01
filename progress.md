# Progress

## Overall Completion

- Prototype scaffold completion: 82%
- Production backend completion: early stage
- Status: core plugin runtime, main commerce slices, OpenAPI setup, and early platform APIs are in place. The next major work is persistence, real checkout orchestration, provider integrations, email/notification jobs, durable queues, and observability.

## Done

- Root workspace scaffold added for Go and NestJS.
- Local infra config added for PostgreSQL and Redis.
- Engine health endpoint added and wired through NestJS.
- Gateway proxy added for `/engine/*` routes.
- API-key based tenant resolution added in the gateway.
- Gateway tenant lookup now loads from `gateway/tenants.json` instead of a hardcoded directory.
- Tenant context propagation added in the engine.
- Tenant config lookup added in the engine via `engine/tenants.json`.
- Engine tenant/plugin config lookup now loads from PostgreSQL when `DATABASE_URL` is set.
- Plugin registry now uses manifest-bearing plugin definitions with dependency metadata.
- Plugin registry now validates dependency graphs and resolves transitive plugin requirements.
- Event bus and sandboxed plugin context layers are in place.
- First real catalog plugin slice is in place with tenant-aware product listing.
- Cart plugin slice is in place with in-memory cart creation and item mutations.
- Cart creation now requires a session or customer owner and merges repeated creates into the existing active cart.
- Checkout plugin slice is in place with tenant-aware quoting and checkout event emission.
- Checkout quotes can now be generated from a specific cart ID.
- Checkout now has a POST pipeline scaffold for cart validation, inventory reservation, payment intent creation, order creation, events, and reservation rollback on failure.
- Order management slice is in place with tenant-aware order creation and lookup.
- Inventory slice is in place with tenant-aware stock tracking and reservations.
- Discount engine slice is in place with tenant-aware discount evaluation.
- Payment abstraction slice is in place with tenant-aware payment intents.
- Payment provider adapter interface and mock adapter registry are in place.
- Webhook platform slice is in place with tenant-aware registration and delivery fanout.
- Webhook registrations now generate signing secrets and delivery records include HMAC signature metadata.
- Webhook delivery retry scheduling and dead-letter scaffolding are in place with a manual retry-due endpoint.
- Notification platform slice is in place with a mock email provider adapter and test email endpoint.
- Admin API slice is in place with tenant, plugin, and event snapshots.
- Storefront API slice is in place with tenant-aware public catalog endpoints.
- Webhook fanout is attached to the in-process plugin event bus at engine bootstrap.
- Audit log slice is in place for plugin events and webhook platform mutations, with admin API access.
- Gateway Redis-backed rate limiting is in place for tenant-scoped `/engine/*` traffic.
- Gateway code split into `internal/auth` and `internal/proxy` packages.
- Engine code split into controller, middleware, and service folders.
- OpenAPI/Swagger output is wired into the engine as the foundation for SDK generation.
- Feature checklist added in `FEATURE_CHECKLIST.md`.
- Initial PostgreSQL schema added with RLS, indexes, commerce tables, webhook/email delivery tables, and outbox support.
- Development seed data added for the current fixture tenants and enabled plugins.
- Local database migration and seed scripts added.
- Gateway can now load environment files and resolve tenants from PostgreSQL using hashed API keys.
- Gateway API-key lookup now uses a database function so tenant resolution can happen safely before request RLS context is known.
- Engine tenant/plugin config lookup now uses a database function for bootstrap runtime configuration.
- Smoke tests pass for direct engine access and gateway proxy access.

## In Progress

- Moving from in-memory prototype slices toward PostgreSQL and Redis-backed persistence.
- Tightening the backend architecture around durable events, provider adapters, workers, and notifications.
- Keeping the project checklist aligned with `build.md` as implementation continues.

## Next

1. Add Redis-backed cart sessions and cart persistence.
2. Add durable webhook persistence and worker-backed HTTP delivery.
3. Add checkout idempotency and durable order/payment persistence.
4. Wire real payment and email providers.

## Remaining Work

### Phase 1 - Core Engine

- Remove fixture tenant config files after all local workflows use PostgreSQL.
- Config schema validation.
- Per-tenant plugin config persistence.
- Critical vs non-critical plugin failure policy.
- Real plugin lifecycle hooks.

### Phase 2 - Core Plugins

- Redis-backed cart sessions and durable cart persistence.
- Replace in-memory plugin state with PostgreSQL and Redis-backed stores.
- Expand checkout pipeline scaffold into durable production workflow.
- Product CRUD, variants, categories, attributes, price tiers, images, and soft deletes.
- Order lifecycle FSM and durable order snapshots.
- Inventory reservation TTL and multi-warehouse support.
- Discount expiry windows, usage limits, and checkout integration.
- Real payment provider adapters for Stripe, Paystack, and Flutterwave.

### Phase 3 - Platform Layer

- SDK generation.
- Webhook delivery retries, signatures, and dead-letter handling.
- Durable queue/worker architecture for webhooks, email, retries, and reservation expiry.
- Email and notification platform with provider adapters, templates, delivery tracking, and retries.
- Admin authentication and authorization.
- Store management endpoints.

### Phase 4 - Performance and Observability

- Prometheus metrics.
- OpenTelemetry tracing.
- Structured logging.
- Cache warming.
- Load testing.
- Runtime health checks for PostgreSQL and Redis.
- Graceful shutdown for gateway, engine, and workers.
