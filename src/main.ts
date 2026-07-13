import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import 'dotenv/config';
import './firebase/firebase.module';

async function bootstrap() {
  // O header Origin do navegador nunca traz barra final, então normalizamos.
  const origins = process.env.ALLOWED_ORIGINS
    ?.split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const port = process.env.PORT ?? 8080;

  if (!origins?.length) {
    Logger.warn(
      'ALLOWED_ORIGINS vazio — CORS bloqueará todas as origens.',
      'Bootstrap',
    );
  }

  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: origins?.length ? origins : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Page-Size', 'X-Total-Pages'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(port);
}
bootstrap();
