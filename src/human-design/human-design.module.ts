import { Module } from '@nestjs/common';
import { HumanDesignService } from './human-design.service';
import { HumanDesignController } from './human-design.controller';
import { HumanDesignRepository } from './human-design.repository';

@Module({
  controllers: [HumanDesignController],
  providers: [HumanDesignService, HumanDesignRepository],
})
export class HumanDesignModule {}
