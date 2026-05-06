import { Controller, Get, Req } from '@nestjs/common';
import { PluginRegistryService } from '../services/plugin-registry.service.js';
import { TenantConfigService } from '../services/tenant-config.service.js';

@Controller()
export class HealthController {
  constructor(
    private readonly tenantConfigService: TenantConfigService,
    private readonly pluginRegistryService: PluginRegistryService,
  ) {}

  @Get('/healthz')
  healthz(@Req() req: any): { status: string; tenant: unknown; plugins: unknown } {
    const tenantContext = req.tenantContext ?? null;
    const config = tenantContext
      ? this.tenantConfigService.getTenantConfig(tenantContext.id)
      : null;
    const plugins = tenantContext
      ? this.pluginRegistryService.listForTenant(tenantContext.id)
      : this.pluginRegistryService.listAll();

    return {
      status: 'ok',
      tenant: tenantContext ? { ...tenantContext, config } : null,
      plugins,
    };
  }
}
