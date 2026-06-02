import { Module } from '@nestjs/common';
import { AstrologyService } from './astrology.service';
import { AstrologyController } from './astrology.controller';
import { AstrologyRepository } from './astrology.repository';

@Module({
  controllers: [AstrologyController],
  providers: [AstrologyService, AstrologyRepository],
  exports:  [AstrologyService]
})
export class AstrologyModule {}
