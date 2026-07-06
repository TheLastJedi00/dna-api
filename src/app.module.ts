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
import { DnaStatusModule } from './dna-status/dna-status.module';
import { NumerologyModule } from './numerology/numerology.module';
import { AstrologyModule } from './astrology/astrology.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate-limit em memória por instância. O storage compartilhado (Redis)
    // entre réplicas do Cloud Run é adicionado na Fase 3 (T3.3).
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
    ]),
    HumanDesignModule,
    UsersModule,
    FirebaseModule,
    SupplyModule,
    PromptsModule,
    AuthModule,
    DnaStatusModule,
    NumerologyModule,
    AstrologyModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
