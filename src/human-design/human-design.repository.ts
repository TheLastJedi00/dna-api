import { firestore } from '../firebase/firebase.module';
import { HumanDesign } from './entities/human-design.model';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { Injectable, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class HumanDesignRepository {
  private readonly db: admin.firestore.CollectionReference;
  constructor() {
    this.db = firestore.collection('human-design');
  }

  async create(dh: HumanDesign) {
    try {
      const plain = instanceToPlain(dh);
      await this.db.doc(dh.id).set(plain);
    } catch (e) {
      throw new Error('[Repository Error]: ' + e);
    }
  }

  async findById(id: string) {
      const snap = await this.db.doc(id).get();
      if (!snap.exists) {
        return null;
      }
      const data = snap.data();
      return plainToInstance(HumanDesign, data);
  }

  async findByUserId(userId: string) {
    const snap = await this.db.where('userId', '==', userId).limit(1).get();
    if (snap.empty) {
      return null;
    }
    let data = snap.docs[0].data();
    return plainToInstance(HumanDesign, data);
  }
}
