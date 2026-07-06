import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateHumanDesignDto } from './dto/create-human-design.dto';
import { UpdateHumanDesignDto } from './dto/update-human-design.dto';
import { HumanDesignRepository } from './human-design.repository';
import { HumanDesign } from './entities/human-design.model';

@Injectable()
export class HumanDesignService {
  constructor(private readonly repository: HumanDesignRepository) {}

  async create(dto: CreateHumanDesignDto) {
    const obj = new HumanDesign(dto);
    await this.repository.create(obj);
  }

  async findOne(id: string) {
    const data = await this.repository.findById(id);
    if (!data) {
      throw new NotFoundException(`Doc with ID ${id} not found in human-design collection.`);
    }
    return data;
  }

  async findOneByUser(userId: string) {
    const data = await this.repository.findByUserId(userId);
    if (!data) {
      throw new NotFoundException(`Doc with User ID ${userId} not found in human-design collection.`);
    }
    return data;
  }

  async checkExistence(userId: string){
    const search = await this.repository.findByUserId(userId);
    return !!search
  }

  async update(id: string, dto: UpdateHumanDesignDto) {
    await this.findOne(id);
    return this.repository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.repository.delete(id);
  }
}
