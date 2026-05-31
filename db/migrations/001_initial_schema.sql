-- Oja initial PostgreSQL schema.
-- This migration establishes the durable multi-tenant data model described in build.md.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  default_currency CHAR(3) NOT NULL DEFAULT 'USD',
  region VARCHAR(64) NOT NULL DEFAULT 'us-east-1',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(128) NOT NULL,
  default_currency CHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug),
  CONSTRAINT stores_status_check CHECK (status IN ('active', 'disabled'))
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix VARCHAR(32) NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['engine'],
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plugin_name VARCHAR(128) NOT NULL,
  version VARCHAR(64) NOT NULL DEFAULT '0.1.0',
  enabled BOOLEAN NOT NULL DEFAULT true,
  critical BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, plugin_name)
);

CREATE TABLE plugin_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plugin_name VARCHAR(128) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, plugin_name)
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug),
  CONSTRAINT products_status_check CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE TABLE variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(128),
  title VARCHAR(255) NOT NULL,
  price_amount BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sku),
  CONSTRAINT variants_price_amount_check CHECK (price_amount >= 0),
  CONSTRAINT variants_status_check CHECK (status IN ('active', 'disabled', 'archived'))
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE product_categories (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text VARCHAR(255),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  warehouse_code VARCHAR(128) NOT NULL DEFAULT 'default',
  available INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, variant_id, warehouse_code),
  CONSTRAINT inventory_available_check CHECK (available >= 0),
  CONSTRAINT inventory_reserved_check CHECK (reserved >= 0)
);

CREATE TABLE inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  cart_id UUID,
  order_id UUID,
  quantity INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  CONSTRAINT inventory_reservations_quantity_check CHECK (quantity > 0),
  CONSTRAINT inventory_reservations_status_check CHECK (status IN ('active', 'released', 'consumed', 'expired'))
);

CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id VARCHAR(128),
  session_id VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  currency CHAR(3) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT carts_status_check CHECK (status IN ('active', 'merged', 'checked_out', 'abandoned'))
);

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES variants(id),
  quantity INTEGER NOT NULL,
  unit_price_snapshot BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, variant_id),
  CONSTRAINT cart_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT cart_items_unit_price_snapshot_check CHECK (unit_price_snapshot >= 0)
);

ALTER TABLE inventory_reservations
  ADD CONSTRAINT inventory_reservations_cart_id_fkey
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE SET NULL;

CREATE TABLE discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(128),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL,
  value BIGINT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code),
  CONSTRAINT discounts_type_check CHECK (type IN ('percentage', 'fixed', 'coupon', 'bogo')),
  CONSTRAINT discounts_value_check CHECK (value >= 0)
);

CREATE TABLE discount_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  rule_type VARCHAR(64) NOT NULL,
  rule JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE discount_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  order_id UUID,
  customer_id VARCHAR(128),
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cart_id UUID REFERENCES carts(id),
  customer_id VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  currency CHAR(3) NOT NULL,
  subtotal_snapshot BIGINT NOT NULL,
  discount_snapshot BIGINT NOT NULL DEFAULT 0,
  tax_snapshot BIGINT NOT NULL DEFAULT 0,
  total_snapshot BIGINT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_status_check CHECK (status IN ('pending', 'confirmed', 'processing', 'fulfilled', 'returned', 'cancelled')),
  CONSTRAINT orders_amounts_check CHECK (
    subtotal_snapshot >= 0 AND
    discount_snapshot >= 0 AND
    tax_snapshot >= 0 AND
    total_snapshot >= 0
  )
);

ALTER TABLE inventory_reservations
  ADD CONSTRAINT inventory_reservations_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE discount_usages
  ADD CONSTRAINT discount_usages_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID,
  variant_id UUID,
  product_name_snapshot VARCHAR(255) NOT NULL,
  variant_title_snapshot VARCHAR(255),
  sku_snapshot VARCHAR(128),
  quantity INTEGER NOT NULL,
  unit_price_snapshot BIGINT NOT NULL,
  line_total_snapshot BIGINT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT order_items_amounts_check CHECK (
    unit_price_snapshot >= 0 AND
    line_total_snapshot >= 0
  )
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  provider VARCHAR(64) NOT NULL,
  provider_reference VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  amount BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  raw_response JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider, provider_reference),
  UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT payments_status_check CHECK (status IN ('pending', 'authorized', 'captured', 'failed', 'refunded')),
  CONSTRAINT payments_amount_check CHECK (amount > 0)
);

CREATE TABLE fulfillments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  provider VARCHAR(128),
  tracking_number VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fulfillments_status_check CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'))
);

CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  event_types TEXT[] NOT NULL DEFAULT ARRAY['*'],
  secret_hash TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  http_status SMALLINT,
  attempts SMALLINT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  dead_lettered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT webhook_deliveries_status_check CHECK (status IN ('pending', 'delivered', 'failed', 'dead')),
  CONSTRAINT webhook_deliveries_attempts_check CHECK (attempts >= 0)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action VARCHAR(128) NOT NULL,
  source VARCHAR(64) NOT NULL,
  actor VARCHAR(255) NOT NULL DEFAULT 'system',
  plugin_name VARCHAR(128),
  target VARCHAR(255),
  diff JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  attempts SMALLINT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outbox_events_status_check CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'dead')),
  CONSTRAINT outbox_events_attempts_check CHECK (attempts >= 0)
);

CREATE TABLE email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID REFERENCES outbox_events(id) ON DELETE SET NULL,
  provider VARCHAR(64) NOT NULL,
  recipient TEXT NOT NULL,
  template_name VARCHAR(128) NOT NULL,
  subject TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  provider_message_id VARCHAR(255),
  attempts SMALLINT NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_deliveries_status_check CHECK (status IN ('pending', 'sent', 'failed', 'dead')),
  CONSTRAINT email_deliveries_attempts_check CHECK (attempts >= 0)
);

CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_plugins_tenant_enabled ON plugins(tenant_id, enabled);
CREATE INDEX idx_plugin_configs_tenant_enabled ON plugin_configs(tenant_id, enabled);
CREATE INDEX idx_products_tenant_status ON products(tenant_id, status);
CREATE INDEX idx_products_tenant_store_status ON products(tenant_id, store_id, status);
CREATE INDEX idx_variants_product_id ON variants(product_id);
CREATE INDEX idx_categories_tenant_parent ON categories(tenant_id, parent_id);
CREATE INDEX idx_product_categories_category_id ON product_categories(category_id);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_inventory_levels_tenant_variant ON inventory_levels(tenant_id, variant_id);
CREATE INDEX idx_inventory_reservations_status_expires ON inventory_reservations(status, expires_at);
CREATE INDEX idx_carts_tenant_status_updated ON carts(tenant_id, status, updated_at DESC);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_discounts_tenant_active ON discounts(tenant_id, active);
CREATE INDEX idx_discount_rules_discount_id ON discount_rules(discount_id);
CREATE INDEX idx_discount_usages_discount_id ON discount_usages(discount_id);
CREATE INDEX idx_orders_tenant_status_created ON orders(tenant_id, status, created_at DESC);
CREATE INDEX idx_orders_pending ON orders(tenant_id, created_at DESC) WHERE status = 'pending';
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_payments_tenant_provider_reference ON payments(tenant_id, provider_reference);
CREATE INDEX idx_fulfillments_order_id ON fulfillments(order_id);
CREATE INDEX idx_webhooks_tenant_enabled ON webhooks(tenant_id, enabled);
CREATE INDEX idx_webhook_deliveries_status_retry ON webhook_deliveries(status, next_retry_at);
CREATE INDEX idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_outbox_events_status_next_attempt ON outbox_events(status, next_attempt_at);
CREATE INDEX idx_email_deliveries_status_retry ON email_deliveries(status, next_retry_at);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_stores ON stores
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_api_keys ON api_keys
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_plugins ON plugins
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_plugin_configs ON plugin_configs
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_products ON products
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_variants ON variants
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_categories ON categories
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_product_categories ON product_categories
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_product_images ON product_images
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_inventory_levels ON inventory_levels
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_inventory_reservations ON inventory_reservations
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_carts ON carts
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_cart_items ON cart_items
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_discounts ON discounts
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_discount_rules ON discount_rules
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_discount_usages ON discount_usages
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_orders ON orders
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_order_items ON order_items
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_payments ON payments
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_fulfillments ON fulfillments
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_webhooks ON webhooks
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_webhook_deliveries ON webhook_deliveries
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_outbox_events ON outbox_events
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_email_deliveries ON email_deliveries
  USING (tenant_id::TEXT = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::TEXT = current_setting('app.tenant_id', true));
