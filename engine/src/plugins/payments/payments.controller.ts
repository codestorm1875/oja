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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PluginContextService } from '../../services/plugin-context.service.js';
import { PaymentsService, PaymentProvider } from './payments.service.js';

type CreatePaymentIntentBody = {
  amount?: number;
  currency?: string;
  orderId?: string;
  provider?: PaymentProvider;
};

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject(PaymentsService)
    private readonly paymentsService: PaymentsService,
    @Inject(PluginContextService)
    private readonly pluginContextService: PluginContextService,
  ) {}

  @Get('providers')
  @ApiOperation({ summary: 'List registered payment providers and supported currencies.' })
  listProviders(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      providers: this.paymentsService.listProviders(tenantContext.id),
    };
  }

  @Get('intents')
  @ApiOperation({ summary: 'List payment intents for the current tenant.' })
  listIntents(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      intents: this.paymentsService.listIntents(tenantContext.id),
    };
  }

  @Get('intents/:intentId')
  @ApiOperation({ summary: 'Get one payment intent by intent ID.' })
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
  @ApiOperation({ summary: 'Create a payment intent through the configured provider adapter.' })
  createIntent(@Req() req: any, @Body() body: CreatePaymentIntentBody = {}): unknown {
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
    const intent = this.runPaymentMutation(() =>
      this.paymentsService.createIntent({
        tenantId: tenantContext.id,
        amount,
        currency,
        orderId: body.orderId,
        provider: body.provider,
      }),
    );

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
  @ApiOperation({ summary: 'Authorize a payment intent through its provider adapter.' })
  authorizeIntent(@Req() req: any, @Param('intentId') intentId: string): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const intent = this.runPaymentMutation(() =>
      this.paymentsService.authorizeIntent(tenantContext.id, intentId),
    );

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
  @ApiOperation({ summary: 'Capture a payment intent through its provider adapter.' })
  captureIntent(@Req() req: any, @Param('intentId') intentId: string): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const intent = this.runPaymentMutation(() =>
      this.paymentsService.captureIntent(tenantContext.id, intentId),
    );

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
  @ApiOperation({ summary: 'Refund a payment intent through its provider adapter.' })
  refundIntent(@Req() req: any, @Param('intentId') intentId: string): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const intent = this.runPaymentMutation(() =>
      this.paymentsService.refundIntent(tenantContext.id, intentId),
    );

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

  private runPaymentMutation<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'payment mutation failed',
      );
    }
  }
}
