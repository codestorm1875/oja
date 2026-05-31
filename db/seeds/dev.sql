-- Development seed data matching the current fixture tenants.
-- API keys are stored with pgcrypto hashes so gateway work can move away from raw keys.

INSERT INTO tenants (id, slug, name, default_currency, region)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'acme', 'Acme Store', 'USD', 'us-east-1'),
  ('00000000-0000-0000-0000-000000000002', 'beta', 'Beta Store', 'EUR', 'eu-west-1')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO stores (tenant_id, name, slug, default_currency)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Acme Store', 'acme', 'USD'),
  ('00000000-0000-0000-0000-000000000002', 'Beta Store', 'beta', 'EUR')
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO api_keys (tenant_id, name, key_hash, key_prefix, scopes)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Acme development key',
  crypt('test-key-acme', gen_salt('bf')),
  'test-key',
  ARRAY['engine']
WHERE NOT EXISTS (
  SELECT 1 FROM api_keys
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
    AND name = 'Acme development key'
);

INSERT INTO api_keys (tenant_id, name, key_hash, key_prefix, scopes)
SELECT
  '00000000-0000-0000-0000-000000000002',
  'Beta development key',
  crypt('test-key-beta', gen_salt('bf')),
  'test-key',
  ARRAY['engine']
WHERE NOT EXISTS (
  SELECT 1 FROM api_keys
  WHERE tenant_id = '00000000-0000-0000-0000-000000000002'
    AND name = 'Beta development key'
);

INSERT INTO plugins (tenant_id, plugin_name, enabled, critical)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'catalog', true, true),
  ('00000000-0000-0000-0000-000000000001', 'inventory', true, true),
  ('00000000-0000-0000-0000-000000000001', 'cart', true, true),
  ('00000000-0000-0000-0000-000000000001', 'checkout', true, true),
  ('00000000-0000-0000-0000-000000000001', 'discounts', true, false),
  ('00000000-0000-0000-0000-000000000001', 'payments', true, true),
  ('00000000-0000-0000-0000-000000000001', 'orders', true, true),
  ('00000000-0000-0000-0000-000000000002', 'catalog', true, true),
  ('00000000-0000-0000-0000-000000000002', 'inventory', true, true),
  ('00000000-0000-0000-0000-000000000002', 'cart', true, true),
  ('00000000-0000-0000-0000-000000000002', 'checkout', true, true),
  ('00000000-0000-0000-0000-000000000002', 'payments', true, true),
  ('00000000-0000-0000-0000-000000000002', 'orders', true, true)
ON CONFLICT (tenant_id, plugin_name) DO NOTHING;

INSERT INTO plugin_configs (tenant_id, plugin_name, config, enabled)
SELECT tenant_id, plugin_name, '{}', enabled
FROM plugins
ON CONFLICT (tenant_id, plugin_name) DO NOTHING;
