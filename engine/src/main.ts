import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { AuditLogService } from './services/audit-log.service.js';
import { PluginEventBusService } from './services/event-bus.service.js';
import { WebhooksService } from './platform/webhooks/webhooks.service.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const eventBus = app.get(PluginEventBusService);
  app.get(WebhooksService).attachEventBus(eventBus);
  app.get(AuditLogService).attachEventBus(eventBus);

  const port = Number(process.env.ENGINE_PORT ?? 3000);

  await app.listen(port);
  console.log(`Engine listening on port ${port}`);
}

void bootstrap();
