import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';
import { AuditLogService } from './services/audit-log.service.js';
import { PluginEventBusService } from './services/event-bus.service.js';
import { WebhooksService } from './platform/webhooks/webhooks.service.js';
import { loadEnvFile } from './utils/load-env.js';

function setupOpenAPI(app: Awaited<ReturnType<typeof NestFactory.create>>): void {
  const config = new DocumentBuilder()
    .setTitle('Oja Commerce Engine')
    .setDescription('Tenant-aware plugin commerce runtime API.')
    .setVersion('0.1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
      },
      'api-key',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.security = [{ 'api-key': [] }];

  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'openapi.json',
  });
}

async function bootstrap(): Promise<void> {
  loadEnvFile(process.env.ENV_FILE ?? '.env');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const eventBus = app.get(PluginEventBusService);
  app.get(WebhooksService).attachEventBus(eventBus);
  app.get(AuditLogService).attachEventBus(eventBus);
  setupOpenAPI(app);

  const port = Number(process.env.ENGINE_PORT ?? 3000);

  await app.listen(port);
  console.log(`Engine listening on port ${port}`);
}

void bootstrap();
