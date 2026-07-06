import { InternalServerErrorException } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import * as admin from 'firebase-admin';
import { firestore } from './firebase.module';

type Ctor<T> = new (...args: any[]) => T;

/**
 * CRUD base para coleções do Firestore cujo documento tem `id` e `userId`.
 * Centraliza o boilerplate (instanceToPlain/plainToInstance) e o tratamento
 * de erro preservando a causa. Repositórios de pilar apenas informam a coleção
 * e a entidade.
 */
export abstract class BaseFirestoreRepository<T extends { id: string }> {
  protected readonly db: admin.firestore.CollectionReference;

  constructor(
    collection: string,
    private readonly entity: Ctor<T>,
  ) {
    this.db = firestore.collection(collection);
  }

  async create(item: T): Promise<void> {
    try {
      await this.db.doc(item.id).set(instanceToPlain(item));
    } catch (e) {
      throw new InternalServerErrorException('Erro ao gravar documento.', {
        cause: e as Error,
      });
    }
  }

  async findById(id: string): Promise<T | null> {
    const snap = await this.db.doc(id).get();
    if (!snap.exists) {
      return null;
    }
    return plainToInstance(this.entity, snap.data());
  }

  async findByUserId(userId: string): Promise<T | null> {
    const snap = await this.db.where('userId', '==', userId).limit(1).get();
    if (snap.empty) {
      return null;
    }
    return plainToInstance(this.entity, snap.docs[0].data());
  }

  async update(id: string, partial: Partial<T>): Promise<void> {
    try {
      await this.db
        .doc(id)
        .update(instanceToPlain(partial) as { [key: string]: any });
    } catch (e) {
      throw new InternalServerErrorException('Erro ao atualizar documento.', {
        cause: e as Error,
      });
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.doc(id).delete();
    } catch (e) {
      throw new InternalServerErrorException('Erro ao remover documento.', {
        cause: e as Error,
      });
    }
  }
}
