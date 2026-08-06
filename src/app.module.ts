import { Module } from '@nestjs/common';
import { HumanDesignModule } from './human-design/human-design.module';
import { UsersModule } from './users/users.module';
import { FirebaseModule } from './firebase/firebase.module';
import { SupplyModule } from './supply/supply.module';
import { PromptsModule } from './prompts/prompts.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { RedisModule } from './redis/redis.module';
import { HealthController } from './health/health.controller';
import { DnaStatusModule } from './dna-status/dna-status.module';
import { NumerologyModule } from './numerology/numerology.module';
import { AstrologyModule } from './astrology/astrology.module';
import { AnalystsModule } from './analysts/analysts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    // Rate-limit compartilhado via Redis entre réplicas do Cloud Run quando
    // REDIS_URL está definido; sem Redis, cai para o storage em memória.
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const url = process.env.REDIS_URL;
        return {
          throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
          storage: url
            ? new ThrottlerStorageRedisService(url)
            : undefined,
        };
      },
    }),
    HumanDesignModule,
    UsersModule,
    FirebaseModule,
    SupplyModule,
    PromptsModule,
    AuthModule,
    DnaStatusModule,
    NumerologyModule,
    AstrologyModule,
    AnalystsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
