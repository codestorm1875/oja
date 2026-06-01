import { Injectable } from '@nestjs/common';
import {
  emailProviderAdapters,
  type EmailDeliveryStatus,
  type EmailProvider,
  type EmailProviderAdapter,
} from './email-adapters.js';

export type EmailDelivery = {
  id: string;
  tenantId: string;
  provider: EmailProvider;
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
  status: EmailDeliveryStatus;
  providerMessageId: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

type SendEmailInput = {
  tenantId: string;
  to: string;
  subject: string;
  template: string;
  data?: Record<string, unknown>;
  provider?: EmailProvider;
};

@Injectable()
export class NotificationsService {
  private readonly deliveriesByTenant = new Map<string, EmailDelivery[]>();
  private readonly adaptersByProvider = new Map<EmailProvider, EmailProviderAdapter>(
    emailProviderAdapters.map((adapter) => [adapter.provider, adapter]),
  );

  listEmailProviders(): Array<{ provider: EmailProvider }> {
    return [...this.adaptersByProvider.keys()].map((provider) => ({ provider }));
  }

  listEmailDeliveries(tenantId: string): EmailDelivery[] {
    return [...(this.deliveriesByTenant.get(tenantId) ?? [])];
  }

  sendEmail(input: SendEmailInput): EmailDelivery {
    if (!input.to.trim()) {
      throw new Error('email recipient is required');
    }

    if (!input.subject.trim()) {
      throw new Error('email subject is required');
    }

    if (!input.template.trim()) {
      throw new Error('email template is required');
    }

    const provider = input.provider ?? 'mock';
    const adapter = this.getRequiredAdapter(provider);
    const now = new Date().toISOString();

    try {
      const providerResult = adapter.send({
        tenantId: input.tenantId,
        to: input.to,
        subject: input.subject,
        template: input.template,
        data: input.data ?? {},
      });
      const delivery: EmailDelivery = {
        id: `email_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        tenantId: input.tenantId,
        provider: providerResult.provider,
        to: input.to,
        subject: input.subject,
        template: input.template,
        data: input.data ?? {},
        status: providerResult.status,
        providerMessageId: providerResult.providerMessageId,
        attempts: 1,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      };

      this.storeDelivery(delivery);
      return delivery;
    } catch (error) {
      const delivery: EmailDelivery = {
        id: `email_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        tenantId: input.tenantId,
        provider,
        to: input.to,
        subject: input.subject,
        template: input.template,
        data: input.data ?? {},
        status: 'failed',
        providerMessageId: '',
        attempts: 1,
        lastError: error instanceof Error ? error.message : 'email delivery failed',
        createdAt: now,
        updatedAt: now,
      };

      this.storeDelivery(delivery);
      return delivery;
    }
  }

  private getRequiredAdapter(provider: EmailProvider): EmailProviderAdapter {
    const adapter = this.adaptersByProvider.get(provider);

    if (!adapter) {
      throw new Error(`Email provider ${provider} is not registered`);
    }

    return adapter;
  }

  private storeDelivery(delivery: EmailDelivery): void {
    const deliveries = this.deliveriesByTenant.get(delivery.tenantId) ?? [];
    this.deliveriesByTenant.set(
      delivery.tenantId,
      [delivery, ...deliveries].slice(0, 100),
    );
  }
}
