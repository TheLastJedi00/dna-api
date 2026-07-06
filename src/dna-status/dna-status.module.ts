import { Module } from '@nestjs/common';
import { DnaStatusService } from './dna-status.service';
import { DnaStatusController } from './dna-status.controller';
import { HumanDesignModule } from '../human-design/human-design.module';
import { NumerologyModule } from 'src/numerology/numerology.module';
import { AstrologyModule } from 'src/astrology/astrology.module';

@Module({
  imports: [HumanDesignModule, NumerologyModule, AstrologyModule],
  controllers: [DnaStatusController],
  providers: [DnaStatusService],
})
export class DnaStatusModule {}
