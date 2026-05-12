import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { AuditLogService } from '../../services/audit-log.service.js';
import { PluginContextService } from '../../services/plugin-context.service.js';
import { WebhooksService, type WebhookFailureMode } from './webhooks.service.js';

type RegisterWebhookBody = {
  url?: string;
  eventTypes?: string[];
  failureMode?: WebhookFailureMode;
};

type TestWebhookBody = {
  eventType?: string;
  payload?: Record<string, unknown>;
};

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly pluginContextService: PluginContextService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  listWebhooks(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      webhooks: this.webhooksService.listWebhooks(tenantContext.id),
      deliveries: this.webhooksService.listDeliveries(tenantContext.id),
    };
  }

  @Get(':webhookId')
  getWebhook(@Req() req: any, @Param('webhookId') webhookId: string): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const webhook = this.webhooksService.getWebhook(tenantContext.id, webhookId);

    if (!webhook) {
      throw new BadRequestException(`Webhook ${webhookId} not found`);
    }

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      webhook,
      deliveries: this.webhooksService
        .listDeliveries(tenantContext.id)
        .filter((delivery) => delivery.webhookId === webhookId),
    };
  }

  @Post()
  registerWebhook(@Req() req: any, @Body() body: RegisterWebhookBody): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const url = String(body.url ?? '').trim();

    if (!url) {
      throw new BadRequestException('url is required');
    }

    const webhook = this.webhooksService.registerWebhook({
      tenantId: tenantContext.id,
      url,
      eventTypes: body.eventTypes,
      failureMode: body.failureMode,
    });
    this.auditLogService.record({
      tenantId: tenantContext.id,
      action: 'webhook.registered',
      source: 'platform',
      actor: 'admin',
      target: webhook.id,
      metadata: {
        url: webhook.url,
        eventTypes: webhook.eventTypes,
        failureMode: webhook.failureMode,
      },
    });

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      webhook,
    };
  }

  @Post(':webhookId/test')
  testWebhook(
    @Req() req: any,
    @Param('webhookId') webhookId: string,
    @Body() body: TestWebhookBody,
  ): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const payload = body.payload ?? { scope: 'platform', source: 'webhooks-controller' };
    const delivery = this.webhooksService.sendTestDelivery(
      tenantContext.id,
      webhookId,
      payload,
      body.eventType ?? 'webhook.test',
    );
    this.auditLogService.record({
      tenantId: tenantContext.id,
      action: 'webhook.test_delivery.sent',
      source: 'platform',
      actor: 'admin',
      target: webhookId,
      metadata: {
        deliveryId: delivery.id,
        eventType: delivery.eventType,
        status: delivery.status,
      },
    });

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      delivery,
    };
  }

  @Delete(':webhookId')
  removeWebhook(@Req() req: any, @Param('webhookId') webhookId: string): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const removed = this.webhooksService.removeWebhook(tenantContext.id, webhookId);

    if (!removed) {
      throw new BadRequestException(`Webhook ${webhookId} not found`);
    }
    this.auditLogService.record({
      tenantId: tenantContext.id,
      action: 'webhook.removed',
      source: 'platform',
      actor: 'admin',
      target: webhookId,
    });

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      removed,
    };
  }
}
