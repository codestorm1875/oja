import { BadRequestException, Controller, Get, Inject, Query, Req } from '@nestjs/common';
import { PluginContextService } from '../../services/plugin-context.service.js';
import { TenantConfigService } from '../../services/tenant-config.service.js';
import { CartService } from '../cart/cart.service.js';
import { CheckoutService } from './checkout.service.js';

@Controller('checkout')
export class CheckoutController {
  constructor(
    @Inject(CheckoutService)
    private readonly checkoutService: CheckoutService,
    @Inject(CartService)
    private readonly cartService: CartService,
    @Inject(TenantConfigService)
    private readonly tenantConfigService: TenantConfigService,
    @Inject(PluginContextService)
    private readonly pluginContextService: PluginContextService,
  ) {}

  @Get('quote')
  quote(@Req() req: any, @Query('cartId') cartId?: string): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const tenantConfig = this.tenantConfigService.getTenantConfig(tenantContext.id);
    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const cart = cartId ? this.cartService.getCart(tenantContext.id, cartId) : null;

    if (cartId && !cart) {
      throw new BadRequestException(`Cart ${cartId} not found`);
    }

    if (cart && cart.items.length === 0) {
      throw new BadRequestException(`Cart ${cart.id} has no items`);
    }

    const quote = cart
      ? this.checkoutService.createQuoteFromItems(
          tenantContext.id,
          cart.currency,
          cart.items,
          cart.id,
        )
      : this.checkoutService.createQuote(tenantContext.id, tenantConfig.currency);

    pluginContext.emitEvent(
      'checkout.quote.created',
      {
        cartId: quote.cartId,
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
