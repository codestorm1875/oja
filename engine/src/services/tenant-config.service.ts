import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

export type TenantConfig = {
  currency: string;
  region: string;
  enabledPlugins: string[];
};

type TenantConfigRecord = TenantConfig & {
  id: string;
};

export type TenantConfigSnapshot = {
  id: string;
  currency: string;
  region: string;
  enabledPlugins: string[];
};

const DEFAULT_TENANT_CONFIG: TenantConfig = {
  currency: 'USD',
  region: 'us-east-1',
  enabledPlugins: ['catalog'],
};

const TENANT_CONFIG_PATH_CANDIDATES = [
  process.env.ENGINE_TENANTS_FILE,
  'tenants.json',
  'engine/tenants.json',
].filter((candidate): candidate is string => Boolean(candidate));

function resolveTenantConfigPath(): string {
  for (const candidate of TENANT_CONFIG_PATH_CANDIDATES) {
    const resolvedPath = isAbsolute(candidate)
      ? candidate
      : resolve(process.cwd(), candidate);

    if (existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  return resolve(process.cwd(), TENANT_CONFIG_PATH_CANDIDATES[0]);
}

@Injectable()
export class TenantConfigService {
  private readonly tenantConfigs = new Map<string, TenantConfig>();
  private readonly tenantIds = new Set<string>();

  constructor() {
    this.loadTenantConfigs();
  }

  private loadTenantConfigs(): void {
    const configPath = resolveTenantConfigPath();
    const rawContents = readFileSync(configPath, 'utf8');
    const records = JSON.parse(rawContents) as TenantConfigRecord[];

    for (const record of records) {
      this.tenantIds.add(record.id);
      this.tenantConfigs.set(record.id, {
        currency: record.currency,
        region: record.region,
        enabledPlugins: record.enabledPlugins,
      });
    }
  }

  listTenantIds(): string[] {
    return [...this.tenantIds];
  }

  listTenantConfigs(): TenantConfigSnapshot[] {
    return this.listTenantIds().map((tenantId) => ({
      id: tenantId,
      ...this.getTenantConfig(tenantId),
    }));
  }

  getTenantConfig(tenantId: string): TenantConfig {
    return this.tenantConfigs.get(tenantId) ?? DEFAULT_TENANT_CONFIG;
  }
}
