import { BadRequestException, Controller, Get, Inject, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PluginContextService } from '../../services/plugin-context.service.js';
import { DiscountsService } from './discounts.service.js';

@ApiTags('discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(
    @Inject(DiscountsService)
    private readonly discountsService: DiscountsService,
    @Inject(PluginContextService)
    private readonly pluginContextService: PluginContextService,
  ) {}

  @Get('rules')
  @ApiOperation({ summary: 'List discount rules for the current tenant.' })
  listRules(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      rules: this.discountsService.listRules(tenantContext.id),
    };
  }

  @Get('evaluate')
  @ApiOperation({ summary: 'Evaluate tenant discount rules against a subtotal and optional code.' })
  evaluate(
    @Req() req: any,
    @Query('subtotal') subtotalValue?: string,
    @Query('code') code?: string,
  ): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const subtotal = Number(subtotalValue ?? '0');

    if (!Number.isFinite(subtotal) || subtotal < 0) {
      throw new BadRequestException('subtotal must be a non-negative number');
    }

    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const evaluation = this.discountsService.evaluate(tenantContext.id, subtotal, code);

    pluginContext.emitEvent(
      'discounts.evaluated',
      {
        subtotal: evaluation.subtotal,
        discount: evaluation.discount,
        total: evaluation.total,
        appliedRules: evaluation.appliedRules.map((rule) => rule.code),
      },
      'discounts',
    );

    return {
      tenant: pluginContext.tenant,
      evaluation,
    };
  }
}
