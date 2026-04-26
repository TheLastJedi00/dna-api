import { Module } from '@nestjs/common';
import { HumanDesignModule } from './human-design/human-design.module';
import { UsersModule } from './users/users.module';
import { FirebaseModule } from './firebase/firebase.module';
import { SupplyModule } from './supply/supply.module';
import { PromptsModule } from './prompts/prompts.module';

@Module({
  imports: [HumanDesignModule, UsersModule, FirebaseModule, SupplyModule, PromptsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
