import { Controller, Get, Req } from '@nestjs/common';
import { PluginEventBusService } from '../services/event-bus.service.js';
import { PluginContextService } from '../services/plugin-context.service.js';
import { PluginRegistryService } from '../services/plugin-registry.service.js';
import { TenantConfigService } from '../services/tenant-config.service.js';

@Controller()
export class HealthController {
  constructor(
    private readonly tenantConfigService: TenantConfigService,
    private readonly pluginRegistryService: PluginRegistryService,
    private readonly pluginContextService: PluginContextService,
    private readonly pluginEventBusService: PluginEventBusService,
  ) { }

  @Get('/healthz')
  healthz(
    @Req() req: any,
  ): {
    status: string;
    tenant: unknown;
    plugins: unknown;
    pluginContext: unknown;
    eventBus: unknown;
  } {
    const tenantContext = req.tenantContext ?? null;
    const config = tenantContext
      ? this.tenantConfigService.getTenantConfig(tenantContext.id)
      : null;
    const plugins = tenantContext
      ? this.pluginRegistryService.listForTenant(tenantContext.id)
      : this.pluginRegistryService.listAll();
    const pluginContext = tenantContext
      ? this.pluginContextService.describeForTenant(tenantContext)
      : null;

    return {
      status: 'ok',
      tenant: tenantContext ? { ...tenantContext, config } : null,
      plugins,
      pluginContext,
      eventBus: this.pluginEventBusService.snapshot(),
    };
  }
}
