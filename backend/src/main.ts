import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { getEnvironmentConfig } from './config/environments';

async function seedDefaultTenant(app: any) {
  try {
    const ds = app.get(DataSource);
    await ds.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        settings JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await ds.query(`
      INSERT INTO tenants (id, name, slug, settings)
      VALUES ('a0000000-0000-0000-0000-000000000001', 'Connecteed Default', 'connecteed', '{"plan":"enterprise"}')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('[seed] Default tenant ensured');
  } catch (e: any) {
    console.warn('[seed] Could not seed default tenant:', e.message);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await seedDefaultTenant(app);

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
