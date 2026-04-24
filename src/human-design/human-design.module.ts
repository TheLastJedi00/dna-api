import { Module } from '@nestjs/common';
import { HumanDesignService } from './human-design.service';
import { HumanDesignController } from './human-design.controller';

@Module({
  controllers: [HumanDesignController],
  providers: [HumanDesignService],
})
export class HumanDesignModule {}
