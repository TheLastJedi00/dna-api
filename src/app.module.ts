import { Module } from '@nestjs/common';
import { HumanDesignModule } from './human-design/human-design.module';
import { UsersModule } from './users/users.module';
import { FirebaseModule } from './firebase/firebase.module';

@Module({
  imports: [HumanDesignModule, UsersModule, FirebaseModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
