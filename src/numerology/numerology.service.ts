import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNumerologyDto } from './dto/create-numerology.dto';
import { UpdateNumerologyDto } from './dto/update-numerology.dto';
import { NumerologyRepository } from './numerology.repository';
import { Numerology } from './entities/numerology.entity';

@Injectable()
export class NumerologyService {
  constructor(private readonly repository: NumerologyRepository) {}

  async create(dto: CreateNumerologyDto) {
    try {
      const obj = new Numerology(dto);
      await this.repository.create(obj);
    } catch(e) {
      throw new Error(`[Service Error] ${e}`);
    }
  }

  findAll() {
    return `This action returns all numerology`;
  }

  async findOne(id: string) {
    const data = await this.repository.findById(id);
    if (!data) {
      throw new NotFoundException(`Doc with ID ${id} not found in numerology collection.`);
    }
    return data;
  }

  async findOneByUser(userId: string) {
    const data = await this.repository.findByUserId(userId);
    if (!data) {
      throw new NotFoundException(`Doc with User ID ${userId} not found in numerology collection.`);
    }
    return data;
  }

  async checkExistence(userId: string){
    const search = await this.repository.findByUserId(userId);
    return !!search
  }

  async update(id: string, dto: UpdateNumerologyDto) {
    await this.findOne(id);
    return this.repository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.repository.delete(id);
  }
}

