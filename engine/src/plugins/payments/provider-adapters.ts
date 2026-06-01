import type { PaymentProvider, PaymentStatus } from './payments.service.js';

export type ProviderPaymentIntent = {
  provider: PaymentProvider;
  reference: string;
  status: PaymentStatus;
};

export type CreateProviderIntentInput = {
  tenantId: string;
  amount: number;
  currency: string;
  orderId?: string;
};

export type PaymentProviderAdapter = {
  readonly provider: PaymentProvider;
  readonly supportedCurrencies: string[];
  createIntent(input: CreateProviderIntentInput): ProviderPaymentIntent;
  authorize(reference: string): ProviderPaymentIntent;
  capture(reference: string): ProviderPaymentIntent;
  refund(reference: string): ProviderPaymentIntent;
};

class MockPaymentProviderAdapter implements PaymentProviderAdapter {
  constructor(
    readonly provider: PaymentProvider,
    readonly supportedCurrencies: string[],
  ) {}

  createIntent(): ProviderPaymentIntent {
    return {
      provider: this.provider,
      reference: `${this.provider}_${Math.random().toString(36).slice(2, 10)}`,
      status: 'pending',
    };
  }

  authorize(reference: string): ProviderPaymentIntent {
    return {
      provider: this.provider,
      reference,
      status: 'authorized',
    };
  }

  capture(reference: string): ProviderPaymentIntent {
    return {
      provider: this.provider,
      reference,
      status: 'captured',
    };
  }

  refund(reference: string): ProviderPaymentIntent {
    return {
      provider: this.provider,
      reference,
      status: 'refunded',
    };
  }
}

export const paymentProviderAdapters: PaymentProviderAdapter[] = [
  new MockPaymentProviderAdapter('stripe', ['USD', 'EUR']),
  new MockPaymentProviderAdapter('paystack', ['NGN', 'USD']),
  new MockPaymentProviderAdapter('flutterwave', ['NGN', 'USD', 'EUR']),
];
