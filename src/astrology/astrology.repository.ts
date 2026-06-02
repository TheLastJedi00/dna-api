import { firestore } from '../firebase/firebase.module';
import { Astrology } from './entities/astrology.entity';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class AstrologyRepository {
  private readonly db: admin.firestore.CollectionReference;

  constructor() {
    this.db = firestore.collection('astrology');
  }

  async create(astrology: Astrology): Promise<void> {
    try {
      const plain = instanceToPlain(astrology);
      await this.db.doc(astrology.id).set(plain);
    } catch (e) {
      throw new Error('[Repository Error]: ' + e);
    }
  }

  async findById(id: string): Promise<Astrology | null> {
    const snap = await this.db.doc(id).get();
    if (!snap.exists) {
      return null;
    }
    return plainToInstance(Astrology, snap.data());
  }

  async findByUserId(userId: string): Promise<Astrology | null> {
    const snap = await this.db.where('userId', '==', userId).limit(1).get();
    if (snap.empty) {
      return null;
    }
    return plainToInstance(Astrology, snap.docs[0].data());
  }

  async update(id: string, partial: Partial<Astrology>): Promise<void> {
    try {
      await this.db.doc(id).update(instanceToPlain(partial) as { [key: string]: any });
    } catch (e) {
      throw new Error('[Repository Error]: ' + e);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.doc(id).delete();
    } catch (e) {
      throw new Error('[Repository Error]: ' + e);
    }
  }
}
