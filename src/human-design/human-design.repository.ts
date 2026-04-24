import { db as firestore } from 'src/firebase/firebase.module';
import { HumanDesign } from './entities/human-design.entity';
import { Injectable } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class HumanDesignRepository {
  db = firestore.collection('human-design');

  create(hd: HumanDesign) {
    try {
      const plain = instanceToPlain(hd);
      this.db.doc(hd.id).set(plain);
    } catch (e) {
      throw Error('[Repository Error]' + e);
    }
  }
}
