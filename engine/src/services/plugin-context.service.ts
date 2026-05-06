import { Injectable } from '@nestjs/common';
import type { PluginDefinition, PluginManifest } from '../plugins/types.js';
import { PluginRegistryService } from './plugin-registry.service.js';
import { PluginEventBusService } from './event-bus.service.js';
import {
  TenantConfig,
  TenantConfigService,
} from './tenant-config.service.js';

export type PluginTenantContext = {
  id: string;
  slug: string;
};

export type PluginContextSummary = {
  tenant: {
    id: string;
    slug: string;
    config: TenantConfig;
  };
  enabledPlugins: string[];
  plugins: PluginManifest[];
};

export type PluginContext = PluginContextSummary & {
  emitEvent: (
    type: string,
    payload: Record<string, unknown>,
    pluginId?: string,
  ) => void;
};

@Injectable()
export class PluginContextService {
  constructor(
    private readonly tenantConfigService: TenantConfigService,
    private readonly pluginRegistryService: PluginRegistryService,
    private readonly eventBusService: PluginEventBusService,
  ) { }

  createForTenant(tenant: PluginTenantContext): PluginContext {
    const tenantConfig = this.tenantConfigService.getTenantConfig(tenant.id);
    const plugins = this.pluginRegistryService.listForTenant(tenant.id);

    return {
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        config: tenantConfig,
      },
      enabledPlugins: tenantConfig.enabledPlugins,
      plugins: plugins.map((plugin: PluginDefinition) => plugin.manifest),
      emitEvent: (type, payload, pluginId) => {
        this.eventBusService.publish({
          type,
          tenantId: tenant.id,
          pluginId,
          payload,
          timestamp: new Date().toISOString(),
        });
      },
    };
  }

  describeForTenant(tenant: PluginTenantContext): PluginContextSummary {
    const context = this.createForTenant(tenant);

    return {
      tenant: context.tenant,
      enabledPlugins: context.enabledPlugins,
      plugins: context.plugins,
    };
  }
}