import { Controller, Get, Req } from '@nestjs/common';
import { getTenantConfig } from '../services/tenant-config.service.js';

@Controller()
export class HealthController {
  @Get('/healthz')
  healthz(@Req() req: any): { status: string; tenant: unknown } {
    const tenantContext = req.tenantContext ?? null;
    const config = tenantContext
      ? getTenantConfig(tenantContext.id)
      : null;

    return {
      status: 'ok',
      tenant: tenantContext ? { ...tenantContext, config } : null,
    };
  }
}

