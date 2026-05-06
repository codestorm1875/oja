import { Injectable } from '@nestjs/common';

export type InventoryStock = {
  productId: string;
  name: string;
  available: number;
  reserved: number;
  lowStockThreshold: number;
};

export type InventoryReservation = {
  productId: string;
  quantity: number;
  available: number;
  reserved: number;
};

const DEFAULT_STOCK: InventoryStock[] = [
  {
    productId: 'catalog-tee',
    name: 'Oja Tee',
    available: 18,
    reserved: 2,
    lowStockThreshold: 5,
  },
  {
    productId: 'catalog-mug',
    name: 'Oja Mug',
    available: 9,
    reserved: 1,
    lowStockThreshold: 4,
  },
];

const STOCK_BY_TENANT: Record<string, InventoryStock[]> = {
  tenant_acme: [
    {
      productId: 'acme-hoodie',
      name: 'Acme Hoodie',
      available: 12,
      reserved: 3,
      lowStockThreshold: 4,
    },
    {
      productId: 'acme-sticker',
      name: 'Acme Sticker Pack',
      available: 42,
      reserved: 6,
      lowStockThreshold: 10,
    },
  ],
  tenant_beta: [
    {
      productId: 'beta-notebook',
      name: 'Beta Notebook',
      available: 15,
      reserved: 1,
      lowStockThreshold: 5,
    },
    {
      productId: 'beta-pin',
      name: 'Beta Pin',
      available: 30,
      reserved: 4,
      lowStockThreshold: 8,
    },
  ],
};

@Injectable()
export class InventoryService {
  private readonly stockByTenant = new Map<string, InventoryStock[]>();

  constructor() {
    for (const [tenantId, stock] of Object.entries(STOCK_BY_TENANT)) {
      this.stockByTenant.set(tenantId, stock.map((item) => ({ ...item })));
    }
  }

  listStock(tenantId: string): InventoryStock[] {
    return this.getTenantStock(tenantId).map((item) => ({ ...item }));
  }

  reserve(tenantId: string, productId: string, quantity: number): InventoryReservation {
    if (quantity <= 0) {
      throw new Error('Reservation quantity must be greater than zero');
    }

    const stock = this.getStockItem(tenantId, productId);
    if (stock.available < quantity) {
      throw new Error(`Insufficient stock for ${productId}`);
    }

    stock.available -= quantity;
    stock.reserved += quantity;

    return {
      productId,
      quantity,
      available: stock.available,
      reserved: stock.reserved,
    };
  }

  release(tenantId: string, productId: string, quantity: number): InventoryReservation {
    if (quantity <= 0) {
      throw new Error('Release quantity must be greater than zero');
    }

    const stock = this.getStockItem(tenantId, productId);
    if (stock.reserved < quantity) {
      throw new Error(`Cannot release more stock than reserved for ${productId}`);
    }

    stock.available += quantity;
    stock.reserved -= quantity;

    return {
      productId,
      quantity,
      available: stock.available,
      reserved: stock.reserved,
    };
  }

  getLowStockItems(tenantId: string): InventoryStock[] {
    return this.getTenantStock(tenantId).filter(
      (item) => item.available <= item.lowStockThreshold,
    );
  }

  private getTenantStock(tenantId: string): InventoryStock[] {
    if (!this.stockByTenant.has(tenantId)) {
      this.stockByTenant.set(
        tenantId,
        (STOCK_BY_TENANT[tenantId] ?? DEFAULT_STOCK).map((item) => ({ ...item })),
      );
    }

    return this.stockByTenant.get(tenantId) ?? [];
  }

  private getStockItem(tenantId: string, productId: string): InventoryStock {
    const stock = this.getTenantStock(tenantId).find(
      (item) => item.productId === productId,
    );

    if (!stock) {
      throw new Error(`Inventory item ${productId} not found`);
    }

    return stock;
  }
}