import { Injectable } from '@nestjs/common';
import { CreateHumanDesignDto } from './dto/create-human-design.dto';
import { UpdateHumanDesignDto } from './dto/update-human-design.dto';

@Injectable()
export class HumanDesignService {
  create(createHumanDesignDto: CreateHumanDesignDto) {
    return 'This action adds a new humanDesign';
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
