import { NotFoundException, Controller, Get, Inject, Param, Req } from '@nestjs/common';
import { PluginContextService } from '../../services/plugin-context.service.js';
import { StorefrontService } from './storefront.service.js';

@Controller('storefront')
export class StorefrontController {
  constructor(
    @Inject(StorefrontService)
    private readonly storefrontService: StorefrontService,
    @Inject(PluginContextService)
    private readonly pluginContextService: PluginContextService,
  ) {}

  @Get()
  getStorefront(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const storefront = this.storefrontService.getStorefront(tenantContext);

    return {
      ...storefront,
      plugins: this.pluginContextService.describeForTenant(tenantContext).plugins,
    };
  }

  @Get('products')
  listProducts(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      products: this.storefrontService.listProducts(tenantContext),
    };
  }

  @Get('products/:productId')
  getProduct(@Req() req: any, @Param('productId') productId: string): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const product = this.storefrontService.getProduct(tenantContext, productId);

    if (!product) {
      throw new NotFoundException(`Storefront product ${productId} not found`);
    }

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      product,
    };
  }
}
