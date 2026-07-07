import { Injectable } from '@nestjs/common';
import { CreateHumanDesignDto } from './dto/create-human-design.dto';
import { UpdateHumanDesignDto } from './dto/update-human-design.dto';
import { HumanDesignRepository } from './human-design.repository';
import { HumanDesign } from './entities/human-design.model';
import { PillarService } from '../common/pillar.service';

@Injectable()
export class HumanDesignService extends PillarService<
  HumanDesign,
  CreateHumanDesignDto,
  UpdateHumanDesignDto
> {
  constructor(repository: HumanDesignRepository) {
    super(repository, 'human-design');
  }

  protected instantiate(dto: CreateHumanDesignDto): HumanDesign {
    return new HumanDesign(dto);
  }
}
