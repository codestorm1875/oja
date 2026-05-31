import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { PluginContextService } from '../../services/plugin-context.service.js';
import { TenantConfigService } from '../../services/tenant-config.service.js';
import { CartService } from './cart.service.js';

type CreateCartBody = {
  customerId?: string;
  sessionId?: string;
  items?: CartItemBody[];
};

type CartItemBody = {
  productId?: string;
  quantity?: number;
};

@Controller('cart')
export class CartController {
  constructor(
    @Inject(CartService)
    private readonly cartService: CartService,
    @Inject(TenantConfigService)
    private readonly tenantConfigService: TenantConfigService,
    @Inject(PluginContextService)
    private readonly pluginContextService: PluginContextService,
  ) {}

  @Get()
  listCarts(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      carts: this.cartService.listCarts(tenantContext.id),
    };
  }

  @Post()
  createCart(@Req() req: any, @Body() body: CreateCartBody = {}): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const tenantConfig = this.tenantConfigService.getTenantConfig(tenantContext.id);
    const items = this.parseCartItems(body.items);
    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const cart = this.runCartMutation(() =>
      this.cartService.createCart({
        tenantId: tenantContext.id,
        currency: tenantConfig.currency,
        customerId: body.customerId,
        sessionId: body.sessionId,
        items,
      }),
    );

    pluginContext.emitEvent(
      'cart.created',
      {
        cartId: cart.id,
        itemCount: cart.items.length,
      },
      'cart',
    );

    return {
      tenant: pluginContext.tenant,
      cart,
    };
  }

  @Get(':cartId')
  getCart(@Req() req: any, @Param('cartId') cartId: string): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const cart = this.cartService.getCart(tenantContext.id, cartId);

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      cart,
    };
  }

  @Post(':cartId/items')
  addItem(
    @Req() req: any,
    @Param('cartId') cartId: string,
    @Body() body: CartItemBody = {},
  ): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const productId = String(body.productId ?? '').trim();
    const quantity = Number(body.quantity ?? 1);

    if (!productId) {
      throw new BadRequestException('productId is required');
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('quantity must be a positive number');
    }

    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const cart = this.runCartMutation(() =>
      this.cartService.addItem({
        tenantId: tenantContext.id,
        cartId,
        productId,
        quantity,
      }),
    );

    pluginContext.emitEvent(
      'cart.item.added',
      { cartId, productId, quantity },
      'cart',
    );

    return {
      tenant: pluginContext.tenant,
      cart,
    };
  }

  @Patch(':cartId/items/:productId')
  updateItem(
    @Req() req: any,
    @Param('cartId') cartId: string,
    @Param('productId') productId: string,
    @Body() body: CartItemBody = {},
  ): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const quantity = Number(body.quantity);

    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new BadRequestException('quantity must be greater than or equal to zero');
    }

    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const cart = this.runCartMutation(() =>
      this.cartService.updateItemQuantity(
        tenantContext.id,
        cartId,
        productId,
        quantity,
      ),
    );

    pluginContext.emitEvent(
      'cart.item.updated',
      { cartId, productId, quantity },
      'cart',
    );

    return {
      tenant: pluginContext.tenant,
      cart,
    };
  }

  @Delete(':cartId/items/:productId')
  removeItem(
    @Req() req: any,
    @Param('cartId') cartId: string,
    @Param('productId') productId: string,
  ): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const cart = this.runCartMutation(() =>
      this.cartService.removeItem(tenantContext.id, cartId, productId),
    );

    pluginContext.emitEvent(
      'cart.item.removed',
      { cartId, productId },
      'cart',
    );

    return {
      tenant: pluginContext.tenant,
      cart,
    };
  }

  private runCartMutation<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'cart mutation failed',
      );
    }
  }

  private parseCartItems(items?: CartItemBody[]): Array<{
    productId: string;
    quantity: number;
  }> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('items must include at least one cart item');
    }

    return items.map((item, index) => {
      const productId = String(item.productId ?? '').trim();
      const quantity = Number(item.quantity ?? 1);

      if (!productId) {
        throw new BadRequestException(`items[${index}].productId is required`);
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException(
          `items[${index}].quantity must be a positive number`,
        );
      }

      return {
        productId,
        quantity,
      };
    });
  }
}
