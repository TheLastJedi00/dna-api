import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config';
import './firebase/firebase.module';

async function bootstrap() {
  const origin = process.env.DEV_ORIGIN;
  const port = process.env.PORT ?? 8080;

  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: origin ? [origin] : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });
  await app.listen(port);
}
bootstrap();
