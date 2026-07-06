import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAstrologyDto } from './dto/create-astrology.dto';
import { UpdateAstrologyDto } from './dto/update-astrology.dto';
import { AstrologyRepository } from './astrology.repository';
import { Astrology } from './entities/astrology.entity';

@Injectable()
export class AstrologyService {
  constructor(private readonly repository: AstrologyRepository) {}

  async create(dto: CreateAstrologyDto) {
    try {
      const obj = new Astrology(dto);
      await this.repository.create(obj);
    } catch(e) {
      throw new Error(`[Service Error] ${e}`);
    }
  }

  async findOne(id: string) {
    const data = await this.repository.findById(id);
    if (!data) {
      throw new NotFoundException(`Doc with ID ${id} not found in astrology collection.`);
    }
    return data;
  }

  async findOneByUser(userId: string) {
    const data = await this.repository.findByUserId(userId);
    if (!data) {
      throw new NotFoundException(`Doc with User ID ${userId} not found in astrology collection.`);
    }
    return data;
  }

  async checkExistence(userId: string){
    const search = await this.repository.findByUserId(userId);
    return !!search
  }

  async update(id: string, dto: UpdateAstrologyDto) {
    await this.findOne(id);
    return this.repository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.repository.delete(id);
  }
}
