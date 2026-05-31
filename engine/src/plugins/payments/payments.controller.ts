import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { PluginContextService } from '../../services/plugin-context.service.js';
import { PaymentsService, PaymentProvider } from './payments.service.js';

type CreatePaymentIntentBody = {
  amount?: number;
  currency?: string;
  orderId?: string;
  provider?: PaymentProvider;
};

@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject(PaymentsService)
    private readonly paymentsService: PaymentsService,
    @Inject(PluginContextService)
    private readonly pluginContextService: PluginContextService,
  ) {}

  @Get('providers')
  listProviders(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      providers: this.paymentsService.listProviders(tenantContext.id),
    };
  }

  @Get('intents')
  listIntents(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      intents: this.paymentsService.listIntents(tenantContext.id),
    };
  }

  @Get('intents/:intentId')
  getIntent(@Req() req: any, @Param('intentId') intentId: string): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const intent = this.paymentsService.getIntent(tenantContext.id, intentId);

    if (!intent) {
      throw new BadRequestException(`Payment intent ${intentId} not found`);
    }

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      intent,
    };
  }

  @Post('intents')
  createIntent(@Req() req: any, @Body() body: CreatePaymentIntentBody): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const amount = Number(body.amount ?? 0);
    const currency = String(body.currency ?? 'USD');

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }

    if (!currency) {
      throw new BadRequestException('currency is required');
    }

    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const intent = this.paymentsService.createIntent({
      tenantId: tenantContext.id,
      amount,
      currency,
      orderId: body.orderId,
      provider: body.provider,
    });

    pluginContext.emitEvent(
      'payment.intent.created',
      {
        intentId: intent.id,
        provider: intent.provider,
        amount: intent.amount,
        currency: intent.currency,
      },
      'payments',
    );

    return {
      tenant: pluginContext.tenant,
      intent,
    };
  }

  @Post('intents/:intentId/authorize')
  authorizeIntent(@Req() req: any, @Param('intentId') intentId: string): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const intent = this.paymentsService.authorizeIntent(tenantContext.id, intentId);

    pluginContext.emitEvent(
      'payment.intent.authorized',
      { intentId, status: intent.status },
      'payments',
    );

    return {
      tenant: pluginContext.tenant,
      intent,
    };
  }

  @Post('intents/:intentId/capture')
  captureIntent(@Req() req: any, @Param('intentId') intentId: string): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const intent = this.paymentsService.captureIntent(tenantContext.id, intentId);

    pluginContext.emitEvent(
      'payment.intent.captured',
      { intentId, status: intent.status },
      'payments',
    );

    return {
      tenant: pluginContext.tenant,
      intent,
    };
  }

  @Post('intents/:intentId/refund')
  refundIntent(@Req() req: any, @Param('intentId') intentId: string): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const intent = this.paymentsService.refundIntent(tenantContext.id, intentId);

    pluginContext.emitEvent(
      'payment.intent.refunded',
      { intentId, status: intent.status },
      'payments',
    );

    return {
      tenant: pluginContext.tenant,
      intent,
    };
  }
}
