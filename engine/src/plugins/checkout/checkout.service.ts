import { Injectable } from '@nestjs/common';

export type CheckoutLineItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CheckoutQuote = {
  tenantId: string;
  cartId?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  items: CheckoutLineItem[];
};

export type CheckoutQuoteInputItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type CheckoutCatalogEntry = {
  id: string;
  name: string;
  price: number;
  currency: string;
};

const CATALOG_BY_TENANT: Record<string, CheckoutCatalogEntry[]> = {
  tenant_acme: [
    { id: 'acme-hoodie', name: 'Acme Hoodie', price: 4200, currency: 'USD' },
    { id: 'acme-sticker', name: 'Acme Sticker Pack', price: 900, currency: 'USD' },
  ],
  tenant_beta: [
    { id: 'beta-notebook', name: 'Beta Notebook', price: 3200, currency: 'EUR' },
    { id: 'beta-pin', name: 'Beta Pin', price: 700, currency: 'EUR' },
  ],
};

const DEFAULT_CATALOG: CheckoutCatalogEntry[] = [
  { id: 'catalog-tee', name: 'Oja Tee', price: 2500, currency: 'USD' },
  { id: 'catalog-mug', name: 'Oja Mug', price: 1800, currency: 'USD' },
];

const DEFAULT_CART: Record<string, Array<{ productId: string; quantity: number }>> = {
  tenant_acme: [
    { productId: 'acme-hoodie', quantity: 1 },
    { productId: 'acme-sticker', quantity: 2 },
  ],
  tenant_beta: [
    { productId: 'beta-notebook', quantity: 1 },
    { productId: 'beta-pin', quantity: 3 },
  ],
};

@Injectable()
export class CheckoutService {
  createQuote(tenantId: string, currency: string): CheckoutQuote {
    const catalog = CATALOG_BY_TENANT[tenantId] ?? DEFAULT_CATALOG;
    const cart = DEFAULT_CART[tenantId] ?? [
      { productId: catalog[0].id, quantity: 1 },
    ];

    const items = cart.map((entry) => {
      const product = catalog.find((catalogEntry) => catalogEntry.id === entry.productId);

      if (!product) {
        throw new Error(`Missing catalog entry for ${entry.productId}`);
      }

      const lineTotal = product.price * entry.quantity;

      return {
        productId: product.id,
        name: product.name,
        quantity: entry.quantity,
        unitPrice: product.price,
        lineTotal,
      };
    });

    return this.createQuoteFromItems(tenantId, currency, items);
  }

  createQuoteFromItems(
    tenantId: string,
    currency: string,
    items: CheckoutQuoteInputItem[],
    cartId?: string,
  ): CheckoutQuote {
    const quoteItems = items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.unitPrice * item.quantity,
    }));

    const subtotal = quoteItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = Math.floor(subtotal * 0.1);
    const taxableAmount = subtotal - discount;
    const tax = Math.floor(taxableAmount * 0.075);
    const total = taxableAmount + tax;

    return {
      tenantId,
      cartId,
      subtotal,
      discount,
      tax,
      total,
      currency,
      items: quoteItems,
    };
  }
}
