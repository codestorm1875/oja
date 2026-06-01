import { BadRequestException, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PluginContextService } from '../../services/plugin-context.service.js';
import { InventoryService } from './inventory.service.js';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(
    @Inject(InventoryService)
    private readonly inventoryService: InventoryService,
    @Inject(PluginContextService)
    private readonly pluginContextService: PluginContextService,
  ) {}

  @Get('stock')
  @ApiOperation({ summary: 'List inventory stock levels for the current tenant.' })
  listStock(@Req() req: any): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const pluginContext = this.pluginContextService.createForTenant(tenantContext);

    return {
      tenant: pluginContext.tenant,
      stock: this.inventoryService.listStock(tenantContext.id),
    };
  }

  @Post('reserve/:productId')
  @ApiOperation({ summary: 'Reserve inventory for a product.' })
  reserve(
    @Req() req: any,
    @Param('productId') productId: string,
    @Query('quantity') quantityValue?: string,
  ): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const quantity = Number(quantityValue ?? '1');

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('quantity must be a positive number');
    }

    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const reservation = this.inventoryService.reserve(tenantContext.id, productId, quantity);
    const lowStockItems = this.inventoryService.getLowStockItems(tenantContext.id);

    if (lowStockItems.some((item) => item.productId === productId)) {
      pluginContext.emitEvent(
        'inventory.low',
        {
          productId,
          remaining: reservation.available,
        },
        'inventory',
      );
    }

    pluginContext.emitEvent(
      'inventory.reserved',
      {
        productId,
        quantity,
        available: reservation.available,
        reserved: reservation.reserved,
      },
      'inventory',
    );

    return {
      tenant: pluginContext.tenant,
      reservation,
    };
  }

  @Post('release/:productId')
  @ApiOperation({ summary: 'Release previously reserved inventory for a product.' })
  release(
    @Req() req: any,
    @Param('productId') productId: string,
    @Query('quantity') quantityValue?: string,
  ): unknown {
    const tenantContext = req.tenantContext ?? { id: 'tenant_acme', slug: 'default' };
    const quantity = Number(quantityValue ?? '1');

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('quantity must be a positive number');
    }

    const pluginContext = this.pluginContextService.createForTenant(tenantContext);
    const release = this.inventoryService.release(tenantContext.id, productId, quantity);

    pluginContext.emitEvent(
      'inventory.released',
      {
        productId,
        quantity,
        available: release.available,
        reserved: release.reserved,
      },
      'inventory',
    );

    return {
      tenant: pluginContext.tenant,
      release,
    };
  }
}
