import { Injectable } from '@nestjs/common';
import { pluginRegistry } from '../plugins/registry.js';
import type { PluginDefinition } from '../plugins/types.js';
import { TenantConfigService } from './tenant-config.service.js';

@Injectable()
export class PluginRegistryService {
  constructor(private readonly tenantConfigService: TenantConfigService) {}

  listAll(): PluginDefinition[] {
    return pluginRegistry;
  }

  listForTenant(tenantId: string): PluginDefinition[] {
    const enabledPlugins = new Set(
      this.tenantConfigService.getTenantConfig(tenantId).enabledPlugins,
    );

    return pluginRegistry.filter((plugin) => enabledPlugins.has(plugin.id));
  }
}
