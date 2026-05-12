import { Module } from '@nestjs/common';
import { HumanDesignModule } from './human-design/human-design.module';
import { UsersModule } from './users/users.module';
import { FirebaseModule } from './firebase/firebase.module';
import { SupplyModule } from './supply/supply.module';
import { PromptsModule } from './prompts/prompts.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { DnaStatusModule } from './dna-status/dna-status.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HumanDesignModule,
    UsersModule,
    FirebaseModule,
    SupplyModule,
    PromptsModule,
    AuthModule,
    DnaStatusModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
