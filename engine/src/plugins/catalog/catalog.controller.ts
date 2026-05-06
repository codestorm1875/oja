import { Controller, Get, NotFoundException, Param, Req } from '@nestjs/common';
import { PluginContextService } from '../../services/plugin-context.service.js';
import { CatalogService } from './catalog.service.js';

@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly pluginContextService: PluginContextService,
  ) { }

  @Get('products')
  listProducts(@Req() req: any): {
    tenant: unknown;
    products: unknown;
  } {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const pluginContext = this.pluginContextService.createForTenant(tenantContext);

    pluginContext.emitEvent(
      'catalog.products.listed',
      { count: this.catalogService.listProducts(tenantContext.id).length },
      'catalog',
    );

    return {
      tenant: pluginContext.tenant,
      products: this.catalogService.listProducts(tenantContext.id),
    };
  }

  @Get('products/:productId')
  getProduct(@Req() req: any, @Param('productId') productId: string): {
    tenant: unknown;
    product: unknown;
  } {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const product = this.catalogService.getProduct(tenantContext.id, productId);

    if (!product) {
      throw new NotFoundException(`Catalog product ${productId} not found`);
    }

    pluginContext.emitEvent(
      'catalog.product.viewed',
      { productId },
      'catalog',
    );

    return {
      tenant: pluginContext.tenant,
      product,
    };
  }
}