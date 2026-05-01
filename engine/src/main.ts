import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  const port = Number(process.env.ENGINE_PORT ?? 3000);

  await app.listen(port);
  console.log(`Engine listening on port ${port}`);
}

void bootstrap();

