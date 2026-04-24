import { Injectable } from '@nestjs/common';
import { CreateHumanDesignDto } from './dto/create-human-design.dto';
import { UpdateHumanDesignDto } from './dto/update-human-design.dto';
import { HumanDesignRepository } from './human-design.repository';
import { HumanDesign } from './entities/human-design.model';

@Injectable()
export class HumanDesignService {
  constructor(private readonly repository: HumanDesignRepository){}

  create(dto: CreateHumanDesignDto) {
    try {
      const obj = new HumanDesign(dto)
      this.repository.create(obj)
    } catch {
      throw Error;
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
