import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import 'dotenv/config';
import './firebase/firebase.module';

async function bootstrap() {
  const origin = process.env.DEV_ORIGIN;
  const port = process.env.PORT ?? 8080;

  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: origin ? [origin] : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
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
