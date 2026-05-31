import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { PluginContextService } from '../../services/plugin-context.service.js';
import { TenantConfigService } from '../../services/tenant-config.service.js';
import { CartService } from '../cart/cart.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { OrderService } from '../orders/order.service.js';
import { PaymentProvider, PaymentsService } from '../payments/payments.service.js';
import { CheckoutService } from './checkout.service.js';

type CheckoutBody = {
  cartId?: string;
  paymentProvider?: PaymentProvider;
};

@Controller('checkout')
export class CheckoutController {
  constructor(
    @Inject(CheckoutService)
    private readonly checkoutService: CheckoutService,
    @Inject(CartService)
    private readonly cartService: CartService,
    @Inject(InventoryService)
    private readonly inventoryService: InventoryService,
    @Inject(PaymentsService)
    private readonly paymentsService: PaymentsService,
    @Inject(OrderService)
    private readonly orderService: OrderService,
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

  @Post()
  checkout(@Req() req: any, @Body() body: CheckoutBody = {}): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const cartId = String(body.cartId ?? '').trim();

    if (!cartId) {
      throw new BadRequestException('cartId is required');
    }

    const cart = this.cartService.getCart(tenantContext.id, cartId);
    if (!cart) {
      throw new BadRequestException(`Cart ${cartId} not found`);
    }

    if (cart.items.length === 0) {
      throw new BadRequestException(`Cart ${cartId} has no items`);
    }

    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const quote = this.checkoutService.createQuoteFromItems(
      tenantContext.id,
      cart.currency,
      cart.items,
      cart.id,
    );
    const reservations: Array<{ productId: string; quantity: number }> = [];

    try {
      for (const item of quote.items) {
        this.inventoryService.reserve(tenantContext.id, item.productId, item.quantity);
        reservations.push({
          productId: item.productId,
          quantity: item.quantity,
        });
      }

      pluginContext.emitEvent(
        'checkout.inventory.reserved',
        { cartId, itemCount: reservations.length },
        'checkout',
      );

      const paymentIntent = this.paymentsService.createIntent({
        tenantId: tenantContext.id,
        amount: quote.total,
        currency: quote.currency,
        provider: body.paymentProvider,
      });
      const order = this.orderService.createOrderFromQuote(quote);

      pluginContext.emitEvent(
        'payment.intent.created',
        {
          intentId: paymentIntent.id,
          provider: paymentIntent.provider,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          orderId: order.id,
        },
        'payments',
      );
      pluginContext.emitEvent(
        'order.created',
        {
          orderId: order.id,
          cartId,
          total: order.totalSnapshot,
          status: order.status,
        },
        'orders',
      );
      pluginContext.emitEvent(
        'checkout.completed',
        {
          cartId,
          orderId: order.id,
          paymentIntentId: paymentIntent.id,
          total: quote.total,
        },
        'checkout',
      );

      return {
        tenant: pluginContext.tenant,
        checkout: {
          cartId,
          quote,
          reservations,
          paymentIntent,
          order,
        },
      };
    } catch (error) {
      for (const reservation of reservations.reverse()) {
        this.inventoryService.release(
          tenantContext.id,
          reservation.productId,
          reservation.quantity,
        );
      }

      pluginContext.emitEvent(
        'checkout.failed',
        {
          cartId,
          reason: error instanceof Error ? error.message : 'checkout failed',
        },
        'checkout',
      );

      throw new BadRequestException(
        error instanceof Error ? error.message : 'checkout failed',
      );
    }
  }
}
