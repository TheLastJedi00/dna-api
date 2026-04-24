import { Injectable } from '@nestjs/common';
import { CreateHumanDesignDto } from './dto/create-human-design.dto';
import { UpdateHumanDesignDto } from './dto/update-human-design.dto';
import { HumanDesign } from './entities/human-design.entity';
import { HumanDesignRepository } from './human-design.repository';

@Injectable()
export class HumanDesignService {
  constructor(private readonly repository: HumanDesignRepository) {}

  create(createHumanDesignDto: CreateHumanDesignDto) {
    try {
      const entity = new HumanDesign(createHumanDesignDto);
      this.repository.create(entity);
      return 'This action adds a new humanDesign';
    } catch (e) {
      throw Error("[Service Error]" + e)
    }
  }

  findAll() {
    return `This action returns all humanDesign`;
  }

  findOne(id: number) {
    return `This action returns a #${id} humanDesign`;
  }

  update(id: number, updateHumanDesignDto: UpdateHumanDesignDto) {
    return `This action updates a #${id} humanDesign`;
  }

  remove(id: number) {
    return `This action removes a #${id} humanDesign`;
  }
}
