import { NotFoundException, Controller, Get, Inject, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PluginContextService } from '../../services/plugin-context.service.js';
import { StorefrontService } from './storefront.service.js';

@ApiTags('storefront')
@Controller('storefront')
export class StorefrontController {
  constructor(
    @Inject(StorefrontService)
    private readonly storefrontService: StorefrontService,
    @Inject(PluginContextService)
    private readonly pluginContextService: PluginContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get storefront overview data for the current tenant.' })
  getStorefront(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const storefront = this.storefrontService.getStorefront(tenantContext);

    return {
      ...storefront,
      plugins: this.pluginContextService.describeForTenant(tenantContext).plugins,
    };
  }

  @Get('products')
  @ApiOperation({ summary: 'List storefront products for the current tenant.' })
  listProducts(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      products: this.storefrontService.listProducts(tenantContext),
    };
  }

  @Get('products/:productId')
  @ApiOperation({ summary: 'Get one storefront product by product ID.' })
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
