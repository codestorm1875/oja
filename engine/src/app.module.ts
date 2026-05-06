import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HealthController } from './controllers/health.controller.js';
import { PluginEventBusService } from './services/event-bus.service.js';
import { PluginContextService } from './services/plugin-context.service.js';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware.js';
import { PluginRegistryService } from './services/plugin-registry.service.js';
import { TenantConfigService } from './services/tenant-config.service.js';
import { CatalogController } from './plugins/catalog/catalog.controller.js';
import { CatalogService } from './plugins/catalog/catalog.service.js';
import { CheckoutController } from './plugins/checkout/checkout.controller.js';
import { CheckoutService } from './plugins/checkout/checkout.service.js';
import { OrdersController } from './plugins/orders/orders.controller.js';
import { OrderService } from './plugins/orders/order.service.js';
import { InventoryController } from './plugins/inventory/inventory.controller.js';
import { InventoryService } from './plugins/inventory/inventory.service.js';
import { DiscountsController } from './plugins/discounts/discounts.controller.js';
import { DiscountsService } from './plugins/discounts/discounts.service.js';
import { PaymentsController } from './plugins/payments/payments.controller.js';
import { PaymentsService } from './plugins/payments/payments.service.js';
import { WebhooksController } from './platform/webhooks/webhooks.controller.js';
import { WebhooksService } from './platform/webhooks/webhooks.service.js';

@Module({
  providers: [
    TenantContextMiddleware,
    TenantConfigService,
    PluginRegistryService,
    PluginEventBusService,
    PluginContextService,
    CatalogService,
    CheckoutService,
    OrderService,
    InventoryService,
    DiscountsService,
    PaymentsService,
    WebhooksService,
  ],
  controllers: [
    HealthController, 
    CatalogController, 
    CheckoutController, 
    OrdersController, 
    InventoryController, 
    DiscountsController, 
    PaymentsController, 
    WebhooksController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}

