import { Module } from '@nestjs/common';
import { HumanDesignModule } from './human-design/human-design.module';

@Module({
  imports: [HumanDesignModule],
  controllers: [],
})
export class AppModule {}
