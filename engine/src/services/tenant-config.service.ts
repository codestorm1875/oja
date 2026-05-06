import { Injectable } from '@nestjs/common';

export type TenantConfig = {
  currency: string;
  region: string;
  enabledPlugins: string[];
};

const TENANT_CONFIGS: Record<string, TenantConfig> = {
  tenant_acme: {
    currency: 'USD',
    region: 'us-east-1',
    enabledPlugins: [
      'catalog',
      'inventory',
      'cart',
      'checkout',
      'discounts',
      'payments',
      'orders',
    ],
  },
  tenant_beta: {
    currency: 'EUR',
    region: 'eu-west-1',
    enabledPlugins: [
      'catalog',
      'inventory',
      'cart',
      'checkout',
      'payments',
      'orders',
    ],
  },
};

const DEFAULT_TENANT_CONFIG: TenantConfig = {
  currency: 'USD',
  region: 'us-east-1',
  enabledPlugins: ['catalog'],
};

@Injectable()
export class TenantConfigService {
  getTenantConfig(tenantId: string): TenantConfig {
    return TENANT_CONFIGS[tenantId] ?? DEFAULT_TENANT_CONFIG;
  }
}
