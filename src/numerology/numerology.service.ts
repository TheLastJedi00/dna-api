import { Injectable } from '@nestjs/common';
import { CreateNumerologyDto } from './dto/create-numerology.dto';
import { UpdateNumerologyDto } from './dto/update-numerology.dto';
import { NumerologyRepository } from './numerology.repository';
import { Numerology } from './entities/numerology.entity';
import { PillarService } from '../common/pillar.service';

@Injectable()
export class NumerologyService extends PillarService<
  Numerology,
  CreateNumerologyDto,
  UpdateNumerologyDto
> {
  constructor(repository: NumerologyRepository) {
    super(repository, 'numerology');
  }

  protected instantiate(dto: CreateNumerologyDto): Numerology {
    return new Numerology(dto);
  }
}
