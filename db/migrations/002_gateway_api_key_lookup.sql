-- Gateway-safe API-key lookup.
-- The gateway cannot set app.tenant_id before resolving an API key, so this
-- function performs the narrow lookup through a SECURITY DEFINER boundary.

CREATE OR REPLACE FUNCTION lookup_tenant_by_api_key(raw_api_key TEXT)
RETURNS TABLE (
  tenant_id UUID,
  slug VARCHAR(128)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH matched_key AS (
    SELECT ak.id AS api_key_id, t.id AS tenant_id, t.slug
    FROM api_keys ak
    INNER JOIN tenants t ON t.id = ak.tenant_id
    WHERE ak.revoked_at IS NULL
      AND ak.key_hash = crypt(raw_api_key, ak.key_hash)
    LIMIT 1
  ),
  updated_key AS (
    UPDATE api_keys
    SET last_used_at = now()
    WHERE id IN (SELECT api_key_id FROM matched_key)
    RETURNING id
  )
  SELECT matched_key.tenant_id, matched_key.slug
  FROM matched_key;
END;
$$;
