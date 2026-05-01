export type TenantConfig = {
  currency: string;
  region: string;
};

const TENANT_CONFIGS: Record<string, TenantConfig> = {
  tenant_acme: {
    currency: 'USD',
    region: 'us-east-1',
  },
  tenant_beta: {
    currency: 'EUR',
    region: 'eu-west-1',
  },
};

export function getTenantConfig(tenantId: string): TenantConfig {
  return TENANT_CONFIGS[tenantId] ?? {
    currency: 'USD',
    region: 'us-east-1',
  };
}
