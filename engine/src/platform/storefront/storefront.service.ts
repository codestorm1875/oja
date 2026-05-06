import { Injectable } from '@nestjs/common';
import { PluginContextService, type PluginTenantContext } from '../../services/plugin-context.service.js';
import { CatalogService } from '../../plugins/catalog/catalog.service.js';

@Injectable()
export class StorefrontService {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly pluginContextService: PluginContextService,
  ) {}

  getStorefront(tenant: PluginTenantContext): {
    tenant: ReturnType<PluginContextService['describeForTenant']>['tenant'];
    featuredProducts: ReturnType<CatalogService['listProducts']>;
    products: ReturnType<CatalogService['listProducts']>;
  } {
    const pluginContext = this.pluginContextService.createForTenant(tenant);
    const products = this.catalogService.listProducts(tenant.id);

    pluginContext.emitEvent(
      'storefront.page.viewed',
      {
        productCount: products.length,
        featuredCount: products.slice(0, 3).length,
      },
      'storefront',
    );

    return {
      tenant: pluginContext.tenant,
      featuredProducts: products.slice(0, 3),
      products,
    };
  }

  listProducts(tenant: PluginTenantContext): ReturnType<CatalogService['listProducts']> {
    return this.catalogService.listProducts(tenant.id);
  }

  getProduct(tenant: PluginTenantContext, productId: string) {
    return this.catalogService.getProduct(tenant.id, productId);
  }
}