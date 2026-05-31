import { Inject, Injectable } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service.js';

export type CartStatus = 'active' | 'checked_out' | 'abandoned';

export type CartItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  lineTotal: number;
};

export type Cart = {
  id: string;
  tenantId: string;
  status: CartStatus;
  currency: string;
  customerId?: string;
  sessionId?: string;
  items: CartItem[];
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

type CreateCartInput = {
  tenantId: string;
  currency: string;
  customerId?: string;
  sessionId?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

type AddItemInput = {
  tenantId: string;
  cartId: string;
  productId: string;
  quantity: number;
};

const CART_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class CartService {
  private readonly cartsByTenant = new Map<string, Cart[]>();

  constructor(
    @Inject(CatalogService)
    private readonly catalogService: CatalogService,
  ) {}

  createCart(input: CreateCartInput): Cart {
    if (input.items.length === 0) {
      throw new Error('cart must include at least one item');
    }

    const items = input.items.map((item) =>
      this.createCartItem(input.tenantId, item.productId, item.quantity),
    );
    const now = new Date();
    const cart: Cart = {
      id: `cart_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      tenantId: input.tenantId,
      status: 'active',
      currency: input.currency,
      customerId: input.customerId,
      sessionId: input.sessionId,
      items,
      expiresAt: new Date(now.getTime() + CART_TTL_MS).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.storeCart(cart);
    return this.cloneCart(cart);
  }

  listCarts(tenantId: string): Cart[] {
    return this.getTenantCarts(tenantId).map((cart) => this.cloneCart(cart));
  }

  getCart(tenantId: string, cartId: string): Cart | null {
    const cart = this.getTenantCarts(tenantId).find((entry) => entry.id === cartId);
    return cart ? this.cloneCart(cart) : null;
  }

  addItem(input: AddItemInput): Cart {
    if (input.quantity <= 0) {
      throw new Error('quantity must be a positive number');
    }

    const cart = this.getRequiredCart(input.tenantId, input.cartId);
    const nextItem = this.createCartItem(
      input.tenantId,
      input.productId,
      input.quantity,
    );

    const existingItem = cart.items.find((item) => item.productId === input.productId);
    if (existingItem) {
      existingItem.quantity += input.quantity;
      existingItem.lineTotal = existingItem.unitPrice * existingItem.quantity;
    } else {
      cart.items.push(nextItem);
    }

    this.touchCart(cart);
    return this.cloneCart(cart);
  }

  updateItemQuantity(
    tenantId: string,
    cartId: string,
    productId: string,
    quantity: number,
  ): Cart {
    if (quantity < 0) {
      throw new Error('quantity must be greater than or equal to zero');
    }

    const cart = this.getRequiredCart(tenantId, cartId);
    const existingItem = cart.items.find((item) => item.productId === productId);

    if (!existingItem) {
      throw new Error(`Cart item ${productId} not found`);
    }

    if (quantity === 0) {
      cart.items = cart.items.filter((item) => item.productId !== productId);
    } else {
      existingItem.quantity = quantity;
      existingItem.lineTotal = existingItem.unitPrice * quantity;
    }

    this.touchCart(cart);
    return this.cloneCart(cart);
  }

  removeItem(tenantId: string, cartId: string, productId: string): Cart {
    return this.updateItemQuantity(tenantId, cartId, productId, 0);
  }

  private getTenantCarts(tenantId: string): Cart[] {
    return this.cartsByTenant.get(tenantId) ?? [];
  }

  private getRequiredCart(tenantId: string, cartId: string): Cart {
    const cart = this.getTenantCarts(tenantId).find((entry) => entry.id === cartId);

    if (!cart) {
      throw new Error(`Cart ${cartId} not found`);
    }

    if (cart.status !== 'active') {
      throw new Error(`Cart ${cartId} is not active`);
    }

    return cart;
  }

  private storeCart(cart: Cart): void {
    const carts = this.cartsByTenant.get(cart.tenantId) ?? [];
    this.cartsByTenant.set(cart.tenantId, [cart, ...carts]);
  }

  private createCartItem(
    tenantId: string,
    productId: string,
    quantity: number,
  ): CartItem {
    if (quantity <= 0) {
      throw new Error('quantity must be a positive number');
    }

    const product = this.catalogService.getProduct(tenantId, productId);

    if (!product || !product.active) {
      throw new Error(`Catalog product ${productId} not found`);
    }

    return {
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: product.price,
      currency: product.currency,
      lineTotal: product.price * quantity,
    };
  }

  private touchCart(cart: Cart): void {
    cart.updatedAt = new Date().toISOString();
  }

  private cloneCart(cart: Cart): Cart {
    return {
      ...cart,
      items: cart.items.map((item) => ({ ...item })),
    };
  }
}
