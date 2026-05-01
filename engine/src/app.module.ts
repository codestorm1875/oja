import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HealthController } from './controllers/health.controller.js';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware.js';

@Module({
  providers: [TenantContextMiddleware],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}


