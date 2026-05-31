import { Controller, Get, Inject, Req } from '@nestjs/common';
import { PluginContextService } from '../../services/plugin-context.service.js';
import { TenantConfigService } from '../../services/tenant-config.service.js';
import { CheckoutService } from './checkout.service.js';

@Controller('checkout')
export class CheckoutController {
  constructor(
    @Inject(CheckoutService)
    private readonly checkoutService: CheckoutService,
    @Inject(TenantConfigService)
    private readonly tenantConfigService: TenantConfigService,
    @Inject(PluginContextService)
    private readonly pluginContextService: PluginContextService,
  ) {}

  @Get('quote')
  quote(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const tenantConfig = this.tenantConfigService.getTenantConfig(tenantContext.id);
    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const quote = this.checkoutService.createQuote(tenantContext.id, tenantConfig.currency);

    pluginContext.emitEvent(
      'checkout.quote.created',
      {
        subtotal: quote.subtotal,
        discount: quote.discount,
        tax: quote.tax,
        total: quote.total,
      },
      'checkout',
    );

    return {
      tenant: pluginContext.tenant,
      quote,
    };
  }
}
