import { Controller, Get, Inject, NotFoundException, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PluginContextService } from '../../services/plugin-context.service.js';
import { TenantConfigService } from '../../services/tenant-config.service.js';
import { OrderService } from './order.service.js';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(OrderService)
    private readonly orderService: OrderService,
    @Inject(TenantConfigService)
    private readonly tenantConfigService: TenantConfigService,
    @Inject(PluginContextService)
    private readonly pluginContextService: PluginContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List recent orders for the current tenant.' })
  listOrders(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      orders: this.orderService.listOrders(tenantContext.id),
    };
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get one order by order ID.' })
  getOrder(@Req() req: any, @Param('orderId') orderId: string): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const order = this.orderService.getOrder(tenantContext.id, orderId);

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return {
      tenant: this.pluginContextService.describeForTenant(tenantContext).tenant,
      order,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create an order from the default checkout quote scaffold.' })
  createOrder(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const tenantConfig = this.tenantConfigService.getTenantConfig(tenantContext.id);
    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const order = this.orderService.createOrder(tenantContext.id, tenantConfig.currency);

    pluginContext.emitEvent(
      'order.created',
      {
        orderId: order.id,
        total: order.totalSnapshot,
        status: order.status,
      },
      'orders',
    );

    return {
      tenant: pluginContext.tenant,
      order,
    };
  }
}
