import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { getEnvironmentConfig } from './config/environments';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  const envConfig = getEnvironmentConfig();
  app.enableCors({
    origin: process.env.FRONTEND_URL || envConfig.corsOrigin,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`CRM Connecteed API running on port ${port}`);
}

bootstrap();
