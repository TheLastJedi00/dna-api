import { NotFoundException } from '@nestjs/common';
import { BaseFirestoreRepository } from '../firebase/base-firestore.repository';

/**
 * Regra comum dos três pilares (human-design, numerology, astrology):
 * create/findOne/findOneByUser/checkExistence/update/remove.
 * Cada serviço concreto informa o repositório, o nome da coleção (para as
 * mensagens de erro) e como instanciar a entidade a partir do DTO de criação.
 */
export abstract class PillarService<
  TEntity extends { id: string },
  TCreateDto,
  TUpdateDto,
> {
  constructor(
    protected readonly repository: BaseFirestoreRepository<TEntity>,
    protected readonly collectionName: string,
  ) {}

  protected abstract instantiate(dto: TCreateDto): TEntity;

  async create(dto: TCreateDto): Promise<void> {
    const obj = this.instantiate(dto);
    await this.repository.create(obj);
  }

  async findOne(id: string): Promise<TEntity> {
    const data = await this.repository.findById(id);
    if (!data) {
      throw new NotFoundException(
        `Doc with ID ${id} not found in ${this.collectionName} collection.`,
      );
    }
    return data;
  }

  async findOneByUser(userId: string): Promise<TEntity> {
    const data = await this.repository.findByUserId(userId);
    if (!data) {
      throw new NotFoundException(
        `Doc with User ID ${userId} not found in ${this.collectionName} collection.`,
      );
    }
    return data;
  }

  async checkExistence(userId: string): Promise<boolean> {
    return !!(await this.repository.findByUserId(userId));
  }

  async update(id: string, dto: TUpdateDto): Promise<void> {
    await this.findOne(id);
    return this.repository.update(id, dto as Partial<TEntity>);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    return this.repository.delete(id);
  }
}
