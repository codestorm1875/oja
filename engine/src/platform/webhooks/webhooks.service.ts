import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import { PluginEventBusService, type PluginEvent } from '../../services/event-bus.service.js';

export type WebhookFailureMode = 'none' | 'always';
export type WebhookDeliveryStatus = 'delivered' | 'failed' | 'dead';

export type WebhookRegistration = {
  id: string;
  tenantId: string;
  url: string;
  eventTypes: string[];
  secretPrefix: string;
  failureMode: WebhookFailureMode;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type StoredWebhookRegistration = WebhookRegistration & {
  secret: string;
};

export type RegisteredWebhook = WebhookRegistration & {
  signingSecret: string;
};

export type WebhookDelivery = {
  id: string;
  tenantId: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  attempts: number;
  httpStatus: number;
  signature: string;
  signatureTimestamp: string;
  signatureHeader: string;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  deadLetteredAt: string | null;
  createdAt: string;
};

type RegisterWebhookInput = {
  tenantId: string;
  url: string;
  eventTypes?: string[];
  failureMode?: WebhookFailureMode;
};

@Injectable()
export class WebhooksService {
  private readonly webhooksByTenant = new Map<string, StoredWebhookRegistration[]>();
  private readonly deliveriesByTenant = new Map<string, WebhookDelivery[]>();
  private eventBusService: PluginEventBusService | null = null;

  attachEventBus(eventBusService: PluginEventBusService): void {
    if (this.eventBusService) {
      return;
    }

    this.eventBusService = eventBusService;
    this.eventBusService.subscribe('*', (event) => this.handleEvent(event));
  }

  listWebhooks(tenantId: string): WebhookRegistration[] {
    return (this.webhooksByTenant.get(tenantId) ?? []).map((webhook) =>
      this.toPublicWebhook(webhook),
    );
  }

  listDeliveries(tenantId: string): WebhookDelivery[] {
    return [...(this.deliveriesByTenant.get(tenantId) ?? [])];
  }

  getWebhook(tenantId: string, webhookId: string): WebhookRegistration | null {
    return this.listWebhooks(tenantId).find((webhook) => webhook.id === webhookId) ?? null;
  }

  registerWebhook(input: RegisterWebhookInput): RegisteredWebhook {
    if (!input.url.trim()) {
      throw new Error('Webhook url is required');
    }

    const now = new Date().toISOString();
    const secret = this.generateSecret();
    const webhook: StoredWebhookRegistration = {
      id: `wh_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      tenantId: input.tenantId,
      url: input.url,
      eventTypes: this.normalizeEventTypes(input.eventTypes),
      secret,
      secretPrefix: secret.slice(0, 12),
      failureMode: input.failureMode ?? 'none',
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    this.storeWebhook(webhook);
    return {
      ...this.toPublicWebhook(webhook),
      signingSecret: secret,
    };
  }

  removeWebhook(tenantId: string, webhookId: string): boolean {
    const webhooks = this.webhooksByTenant.get(tenantId) ?? [];
    const nextWebhooks = webhooks.filter((webhook) => webhook.id !== webhookId);

    if (nextWebhooks.length === webhooks.length) {
      return false;
    }

    this.webhooksByTenant.set(tenantId, nextWebhooks);
    return true;
  }

  sendTestDelivery(
    tenantId: string,
    webhookId: string,
    payload: Record<string, unknown>,
    eventType = 'webhook.test',
  ): WebhookDelivery {
    const webhook = this.getRequiredWebhook(tenantId, webhookId);

    return this.createDelivery(webhook, eventType, payload, true);
  }

  snapshot(tenantId: string): { webhooks: WebhookRegistration[]; deliveries: WebhookDelivery[] } {
    return {
      webhooks: this.listWebhooks(tenantId),
      deliveries: this.listDeliveries(tenantId),
    };
  }

  private handleEvent(event: PluginEvent): void {
    const webhooks = this.webhooksByTenant.get(event.tenantId) ?? [];

    for (const webhook of webhooks) {
      if (!webhook.enabled) {
        continue;
      }

      if (!this.matchesEventType(webhook, event.type)) {
        continue;
      }

      this.createDelivery(webhook, event.type, event.payload);
    }
  }

  private createDelivery(
    webhook: StoredWebhookRegistration,
    eventType: string,
    payload: Record<string, unknown>,
    forceDelivery = false,
  ): WebhookDelivery {
    const now = new Date().toISOString();
    const shouldFail = webhook.failureMode === 'always' && !forceDelivery;
    const attempts = shouldFail ? 3 : 1;
    const signatureTimestamp = String(Math.floor(Date.now() / 1000));
    const signature = this.signPayload(webhook.secret, signatureTimestamp, {
      eventType,
      payload,
    });
    const delivery: WebhookDelivery = {
      id: `whd_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      tenantId: webhook.tenantId,
      webhookId: webhook.id,
      eventType,
      payload,
      status: shouldFail ? 'dead' : 'delivered',
      attempts,
      httpStatus: shouldFail ? 503 : 200,
      signature,
      signatureTimestamp,
      signatureHeader: `t=${signatureTimestamp},v1=${signature}`,
      nextRetryAt: shouldFail ? new Date(Date.now() + 60_000).toISOString() : null,
      deliveredAt: shouldFail ? null : now,
      deadLetteredAt: shouldFail ? now : null,
      createdAt: now,
    };

    this.storeDelivery(delivery);
    return delivery;
  }

  private getRequiredWebhook(tenantId: string, webhookId: string): StoredWebhookRegistration {
    const webhook = (this.webhooksByTenant.get(tenantId) ?? []).find(
      (entry) => entry.id === webhookId,
    );

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    return webhook;
  }

  private matchesEventType(webhook: StoredWebhookRegistration, eventType: string): boolean {
    return webhook.eventTypes.includes('*') || webhook.eventTypes.includes(eventType);
  }

  private normalizeEventTypes(eventTypes?: string[]): string[] {
    const normalized = (eventTypes ?? []).map((eventType) => eventType.trim()).filter(Boolean);

    return normalized.length > 0 ? normalized : ['*'];
  }

  private storeWebhook(webhook: StoredWebhookRegistration): void {
    const webhooks = this.webhooksByTenant.get(webhook.tenantId) ?? [];
    this.webhooksByTenant.set(webhook.tenantId, [webhook, ...webhooks]);
  }

  private storeDelivery(delivery: WebhookDelivery): void {
    const deliveries = this.deliveriesByTenant.get(delivery.tenantId) ?? [];
    this.deliveriesByTenant.set(delivery.tenantId, [delivery, ...deliveries].slice(0, 100));
  }

  private toPublicWebhook(webhook: StoredWebhookRegistration): WebhookRegistration {
    const { secret: _secret, ...publicWebhook } = webhook;
    return publicWebhook;
  }

  private generateSecret(): string {
    return `whsec_${randomBytes(24).toString('hex')}`;
  }

  private signPayload(
    secret: string,
    timestamp: string,
    payload: Record<string, unknown>,
  ): string {
    return createHmac('sha256', secret)
      .update(`${timestamp}.${JSON.stringify(payload)}`)
      .digest('hex');
  }
}
