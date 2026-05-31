-- Engine-safe tenant/plugin config lookup.
-- The engine needs tenant configuration during bootstrap before handling a
-- tenant-scoped request, so this function exposes only the runtime config shape.

CREATE OR REPLACE FUNCTION list_engine_tenant_configs()
RETURNS TABLE (
  id UUID,
  currency CHAR(3),
  region VARCHAR(64),
  enabled_plugins TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.default_currency,
    t.region,
    COALESCE(
      array_remove(array_agg(p.plugin_name::TEXT ORDER BY p.plugin_name) FILTER (WHERE p.enabled), NULL),
      ARRAY[]::TEXT[]
    ) AS enabled_plugins
  FROM tenants t
  LEFT JOIN plugins p ON p.tenant_id = t.id
  GROUP BY t.id, t.default_currency, t.region, t.slug
  ORDER BY t.slug;
END;
$$;
