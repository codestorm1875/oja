import { Injectable } from '@nestjs/common';

export type DiscountType = 'percentage' | 'fixed' | 'coupon';

export type DiscountRule = {
  id: string;
  code: string;
  name: string;
  type: DiscountType;
  value: number;
  active: boolean;
};

export type DiscountEvaluation = {
  subtotal: number;
  discount: number;
  total: number;
  appliedRules: DiscountRule[];
};

const DEFAULT_RULES: DiscountRule[] = [
  {
    id: 'welcome-10',
    code: 'WELCOME10',
    name: 'Welcome 10%',
    type: 'percentage',
    value: 10,
    active: true,
  },
  {
    id: 'loyalty-500',
    code: 'LOYALTY500',
    name: 'Loyalty Credit',
    type: 'fixed',
    value: 500,
    active: true,
  },
  {
    id: 'acme-free-shipping',
    code: 'FREESHIP',
    name: 'Free Shipping Coupon',
    type: 'coupon',
    value: 300,
    active: true,
  },
];

const RULES_BY_TENANT: Record<string, DiscountRule[]> = {
  tenant_acme: [
    {
      id: 'acme-15',
      code: 'ACME15',
      name: 'Acme VIP 15%',
      type: 'percentage',
      value: 15,
      active: true,
    },
    {
      id: 'acme-250',
      code: 'ACME250',
      name: 'Acme Fixed Credit',
      type: 'fixed',
      value: 250,
      active: true,
    },
  ],
  tenant_beta: [
    {
      id: 'beta-12',
      code: 'BETA12',
      name: 'Beta Starter 12%',
      type: 'percentage',
      value: 12,
      active: true,
    },
    {
      id: 'beta-200',
      code: 'BETA200',
      name: 'Beta Credit',
      type: 'fixed',
      value: 200,
      active: true,
    },
  ],
};

@Injectable()
export class DiscountsService {
  private readonly rulesByTenant = new Map<string, DiscountRule[]>();

  constructor() {
    for (const [tenantId, rules] of Object.entries(RULES_BY_TENANT)) {
      this.rulesByTenant.set(tenantId, rules.map((rule) => ({ ...rule })));
    }
  }

  listRules(tenantId: string): DiscountRule[] {
    return this.getTenantRules(tenantId).map((rule) => ({ ...rule }));
  }

  evaluate(tenantId: string, subtotal: number, code?: string): DiscountEvaluation {
    if (subtotal < 0) {
      throw new Error('Subtotal must be greater than or equal to zero');
    }

    const rules = this.getTenantRules(tenantId).filter((rule) => rule.active);
    const appliedRules: DiscountRule[] = [];

    let discount = 0;

    for (const rule of rules) {
      if (rule.type === 'coupon' && code && rule.code !== code) {
        continue;
      }

      if (rule.type === 'percentage') {
        discount += Math.floor(subtotal * (rule.value / 100));
        appliedRules.push(rule);
        continue;
      }

      if (rule.type === 'fixed') {
        discount += rule.value;
        appliedRules.push(rule);
        continue;
      }

      if (rule.type === 'coupon' && code === rule.code) {
        discount += rule.value;
        appliedRules.push(rule);
      }
    }

    const cappedDiscount = Math.min(discount, subtotal);

    return {
      subtotal,
      discount: cappedDiscount,
      total: subtotal - cappedDiscount,
      appliedRules,
    };
  }

  private getTenantRules(tenantId: string): DiscountRule[] {
    if (!this.rulesByTenant.has(tenantId)) {
      this.rulesByTenant.set(
        tenantId,
        (RULES_BY_TENANT[tenantId] ?? DEFAULT_RULES).map((rule) => ({ ...rule })),
      );
    }

    return this.rulesByTenant.get(tenantId) ?? [];
  }
}