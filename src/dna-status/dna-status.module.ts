import { Module } from '@nestjs/common';
import { DnaStatusService } from './dna-status.service';
import { DnaStatusController } from './dna-status.controller';
import { HumanDesignModule } from '../human-design/human-design.module';
import { Numerology } from 'src/numerology/entities/numerology.entity';
import { NumerologyModule } from 'src/numerology/numerology.module';

@Module({
  imports: [HumanDesignModule, NumerologyModule],
  controllers: [DnaStatusController],
  providers: [DnaStatusService],
})
export class DnaStatusModule {}
