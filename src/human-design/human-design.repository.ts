import { firestore } from '../firebase/firebase.module';
import { HumanDesign } from './entities/human-design.model';
import { instanceToPlain } from 'class-transformer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HumanDesignRepository {
  private readonly db = firestore.collection('human-design');

  create(dh: HumanDesign) {
    try {
      const plain = instanceToPlain(dh);
      this.db.doc(dh.id).set(plain);
    } catch (e) {
      throw new Error('[Repository Error]: ' + e);
    }
  }
}
