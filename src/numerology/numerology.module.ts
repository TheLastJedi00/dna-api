import { Module } from '@nestjs/common';
import { NumerologyService } from './numerology.service';
import { NumerologyController } from './numerology.controller';
import { NumerologyRepository } from './numerology.repository';

@Module({
  controllers: [NumerologyController],
  providers: [NumerologyService, NumerologyRepository],
  exports: [NumerologyService],
})
export class NumerologyModule {}

