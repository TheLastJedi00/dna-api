import { Module } from '@nestjs/common';
import { DnaStatusService } from './dna-status.service';
import { DnaStatusController } from './dna-status.controller';
import { HumanDesignModule } from '../human-design/human-design.module';

@Module({
  imports: [HumanDesignModule],
  controllers: [DnaStatusController],
  providers: [DnaStatusService],
})
export class DnaStatusModule {}
