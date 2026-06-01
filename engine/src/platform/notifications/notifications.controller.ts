import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import { AuditLogService } from '../../services/audit-log.service.js';
import { PluginContextService } from '../../services/plugin-context.service.js';
import { type EmailProvider } from './email-adapters.js';
import { NotificationsService } from './notifications.service.js';

type SendTestEmailBody = {
  to?: string;
  subject?: string;
  template?: string;
  data?: Record<string, unknown>;
  provider?: EmailProvider;
};

@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
    @Inject(PluginContextService)
    private readonly pluginContextService: PluginContextService,
    @Inject(AuditLogService)
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('email/providers')
  listEmailProviders(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      providers: this.notificationsService.listEmailProviders(),
    };
  }

  @Get('email/deliveries')
  listEmailDeliveries(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      deliveries: this.notificationsService.listEmailDeliveries(tenantContext.id),
    };
  }

  @Post('email/test')
  sendTestEmail(@Req() req: any, @Body() body: SendTestEmailBody = {}): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const to = String(body.to ?? '').trim();
    const subject = String(body.subject ?? 'Oja test email').trim();
    const template = String(body.template ?? 'test.email').trim();

    if (!to) {
      throw new BadRequestException('to is required');
    }

    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const delivery = this.runNotificationMutation(() =>
      this.notificationsService.sendEmail({
        tenantId: tenantContext.id,
        to,
        subject,
        template,
        data: body.data,
        provider: body.provider,
      }),
    );

    pluginContext.emitEvent(
      'notification.email.sent',
      {
        deliveryId: delivery.id,
        provider: delivery.provider,
        status: delivery.status,
        template: delivery.template,
      },
      'notifications',
    );
    this.auditLogService.record({
      tenantId: tenantContext.id,
      action: 'notification.email.sent',
      source: 'platform',
      actor: 'admin',
      target: delivery.id,
      metadata: {
        provider: delivery.provider,
        status: delivery.status,
        template: delivery.template,
      },
    });

    return {
      tenant: pluginContext.tenant,
      delivery,
    };
  }

  private runNotificationMutation<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'notification mutation failed',
      );
    }
  }
}
