import { firestore } from '../firebase/firebase.module';
import { HumanDesign } from './entities/human-design.model';
import { instanceToPlain } from 'class-transformer';
import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin'

@Injectable()
export class HumanDesignRepository {
  private readonly db: admin.firestore.CollectionReference;
  constructor() {
    this.db = firestore.collection('human-design')
  }

  async create(dh: HumanDesign) {
    try {
      const plain = instanceToPlain(dh);
      await this.db.doc(dh.id).set(plain);
    } catch (e) {
      throw new Error('[Repository Error]: ' + e);
    }
  }
}
