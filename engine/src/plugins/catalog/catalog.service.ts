import { Injectable } from '@nestjs/common';

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  active: boolean;
};

const DEFAULT_CATALOG: CatalogProduct[] = [
  {
    id: 'catalog-tee',
    name: 'Oja Tee',
    slug: 'oja-tee',
    price: 2500,
    currency: 'USD',
    active: true,
  },
  {
    id: 'catalog-mug',
    name: 'Oja Mug',
    slug: 'oja-mug',
    price: 1800,
    currency: 'USD',
    active: true,
  },
];

const CATALOG_BY_TENANT: Record<string, CatalogProduct[]> = {
  tenant_acme: [
    {
      id: 'acme-hoodie',
      name: 'Acme Hoodie',
      slug: 'acme-hoodie',
      price: 4200,
      currency: 'USD',
      active: true,
    },
    {
      id: 'acme-sticker',
      name: 'Acme Sticker Pack',
      slug: 'acme-sticker-pack',
      price: 900,
      currency: 'USD',
      active: true,
    },
  ],
  tenant_beta: [
    {
      id: 'beta-notebook',
      name: 'Beta Notebook',
      slug: 'beta-notebook',
      price: 3200,
      currency: 'EUR',
      active: true,
    },
    {
      id: 'beta-pin',
      name: 'Beta Pin',
      slug: 'beta-pin',
      price: 700,
      currency: 'EUR',
      active: true,
    },
  ],
};

@Injectable()
export class CatalogService {
  listProducts(tenantId: string): CatalogProduct[] {
    return [...(CATALOG_BY_TENANT[tenantId] ?? DEFAULT_CATALOG)];
  }

  getProduct(tenantId: string, productId: string): CatalogProduct | null {
    const product = this.listProducts(tenantId).find(
      (entry) => entry.id === productId,
    );

    return product ?? null;
  }
}