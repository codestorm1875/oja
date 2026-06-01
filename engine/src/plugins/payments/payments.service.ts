import { Injectable } from '@nestjs/common';
import {
  paymentProviderAdapters,
  type PaymentProviderAdapter,
} from './provider-adapters.js';

export type PaymentProvider = 'stripe' | 'paystack' | 'flutterwave';

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';

export type PaymentIntent = {
  id: string;
  tenantId: string;
  orderId?: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reference: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentProviderSummary = {
  provider: PaymentProvider;
  supportedCurrencies: string[];
};

type TenantPaymentConfig = {
  provider: PaymentProvider;
  supportedCurrencies: string[];
};

const DEFAULT_PROVIDER_CONFIG: TenantPaymentConfig = {
  provider: 'stripe',
  supportedCurrencies: ['USD'],
};

const PROVIDER_BY_TENANT: Record<string, TenantPaymentConfig> = {
  tenant_acme: {
    provider: 'stripe',
    supportedCurrencies: ['USD'],
  },
  tenant_beta: {
    provider: 'paystack',
    supportedCurrencies: ['EUR', 'USD'],
  },
};

@Injectable()
export class PaymentsService {
  private readonly intentsByTenant = new Map<string, PaymentIntent[]>();
  private readonly adaptersByProvider = new Map<PaymentProvider, PaymentProviderAdapter>(
    paymentProviderAdapters.map((adapter) => [adapter.provider, adapter]),
  );

  listProviders(tenantId: string): PaymentProviderSummary[] {
    const config = this.getTenantConfig(tenantId);

    return [
      config.provider,
      ...[...this.adaptersByProvider.keys()].filter((provider) => provider !== config.provider),
    ].map((provider) => {
      const adapter = this.getRequiredAdapter(provider);

      return {
        provider,
        supportedCurrencies: adapter.supportedCurrencies,
      };
    });
  }

  listIntents(tenantId: string): PaymentIntent[] {
    return [...(this.intentsByTenant.get(tenantId) ?? [])];
  }

  getIntent(tenantId: string, intentId: string): PaymentIntent | null {
    return this.listIntents(tenantId).find((intent) => intent.id === intentId) ?? null;
  }

  createIntent(params: {
    tenantId: string;
    amount: number;
    currency: string;
    orderId?: string;
    provider?: PaymentProvider;
  }): PaymentIntent {
    if (params.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const tenantConfig = this.getTenantConfig(params.tenantId);
    const provider = params.provider ?? tenantConfig.provider;
    const adapter = this.getRequiredAdapter(provider);

    if (!adapter.supportedCurrencies.includes(params.currency)) {
      throw new Error(`Provider ${provider} does not support ${params.currency}`);
    }

    const providerIntent = adapter.createIntent(params);
    const now = new Date().toISOString();
    const intent: PaymentIntent = {
      id: `pay_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      tenantId: params.tenantId,
      orderId: params.orderId,
      provider,
      amount: params.amount,
      currency: params.currency,
      status: providerIntent.status,
      reference: providerIntent.reference,
      createdAt: now,
      updatedAt: now,
    };

    this.storeIntent(params.tenantId, intent);
    return intent;
  }

  authorizeIntent(tenantId: string, intentId: string): PaymentIntent {
    const intent = this.getRequiredIntent(tenantId, intentId);
    const providerIntent = this.getRequiredAdapter(intent.provider).authorize(intent.reference);
    intent.status = providerIntent.status;
    intent.updatedAt = new Date().toISOString();
    return intent;
  }

  captureIntent(tenantId: string, intentId: string): PaymentIntent {
    const intent = this.getRequiredIntent(tenantId, intentId);
    const providerIntent = this.getRequiredAdapter(intent.provider).capture(intent.reference);
    intent.status = providerIntent.status;
    intent.updatedAt = new Date().toISOString();
    return intent;
  }

  refundIntent(tenantId: string, intentId: string): PaymentIntent {
    const intent = this.getRequiredIntent(tenantId, intentId);
    const providerIntent = this.getRequiredAdapter(intent.provider).refund(intent.reference);
    intent.status = providerIntent.status;
    intent.updatedAt = new Date().toISOString();
    return intent;
  }

  private getTenantConfig(tenantId: string): TenantPaymentConfig {
    return PROVIDER_BY_TENANT[tenantId] ?? DEFAULT_PROVIDER_CONFIG;
  }

  private getRequiredAdapter(provider: PaymentProvider): PaymentProviderAdapter {
    const adapter = this.adaptersByProvider.get(provider);

    if (!adapter) {
      throw new Error(`Payment provider ${provider} is not registered`);
    }

    return adapter;
  }

  private getRequiredIntent(tenantId: string, intentId: string): PaymentIntent {
    const intent = this.getIntent(tenantId, intentId);

    if (!intent) {
      throw new Error(`Payment intent ${intentId} not found`);
    }

    return intent;
  }

  private storeIntent(tenantId: string, intent: PaymentIntent): void {
    const intents = this.intentsByTenant.get(tenantId) ?? [];
    this.intentsByTenant.set(tenantId, [intent, ...intents]);
  }
}
