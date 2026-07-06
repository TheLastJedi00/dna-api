import { Injectable } from '@nestjs/common';
import { CreateAstrologyDto } from './dto/create-astrology.dto';
import { UpdateAstrologyDto } from './dto/update-astrology.dto';
import { AstrologyRepository } from './astrology.repository';
import { Astrology } from './entities/astrology.entity';
import { PillarService } from '../common/pillar.service';

@Injectable()
export class AstrologyService extends PillarService<
  Astrology,
  CreateAstrologyDto,
  UpdateAstrologyDto
> {
  constructor(repository: AstrologyRepository) {
    super(repository, 'astrology');
  }

  protected instantiate(dto: CreateAstrologyDto): Astrology {
    return new Astrology(dto);
  }
}
