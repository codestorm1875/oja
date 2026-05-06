import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HealthController } from './controllers/health.controller.js';
import { PluginEventBusService } from './services/event-bus.service.js';
import { PluginContextService } from './services/plugin-context.service.js';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware.js';
import { PluginRegistryService } from './services/plugin-registry.service.js';
import { TenantConfigService } from './services/tenant-config.service.js';

@Module({
  providers: [
    TenantContextMiddleware,
    TenantConfigService,
    PluginRegistryService,
    PluginEventBusService,
    PluginContextService,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}

