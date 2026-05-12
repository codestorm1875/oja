import { Injectable } from '@nestjs/common';
import { CheckoutService } from '../checkout/checkout.service.js';

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'fulfilled' | 'returned';

export type OrderItemSnapshot = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderSnapshot = {
  id: string;
  tenantId: string;
  status: OrderStatus;
  subtotalSnapshot: number;
  discountSnapshot: number;
  taxSnapshot: number;
  totalSnapshot: number;
  currency: string;
  items: OrderItemSnapshot[];
  createdAt: string;
};

@Injectable()
export class OrderService {
  private readonly ordersByTenant = new Map<string, OrderSnapshot[]>();

  constructor(private readonly checkoutService: CheckoutService) {}

  listOrders(tenantId: string): OrderSnapshot[] {
    return [...(this.ordersByTenant.get(tenantId) ?? [])];
  }

  getOrder(tenantId: string, orderId: string): OrderSnapshot | null {
    return this.listOrders(tenantId).find((order) => order.id === orderId) ?? null;
  }

  createOrder(tenantId: string, currency: string): OrderSnapshot {
    const quote = this.checkoutService.createQuote(tenantId, currency);
    const order: OrderSnapshot = {
      id: `order_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      tenantId,
      status: 'confirmed',
      subtotalSnapshot: quote.subtotal,
      discountSnapshot: quote.discount,
      taxSnapshot: quote.tax,
      totalSnapshot: quote.total,
      currency: quote.currency,
      items: quote.items.map((item) => ({ ...item })),
      createdAt: new Date().toISOString(),
    };

    const orders = this.ordersByTenant.get(tenantId) ?? [];
    this.ordersByTenant.set(tenantId, [order, ...orders]);

    return order;
  }
}