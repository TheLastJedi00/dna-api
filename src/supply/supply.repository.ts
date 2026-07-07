import { Injectable } from '@nestjs/common';
import { Supply, Topic } from './entities/supply.entity';
import * as admin from 'firebase-admin';
import { firestore } from '../firebase/firebase.module';
import { instanceToPlain, plainToClass, plainToInstance } from 'class-transformer';

@Injectable()
export class SupplyRepository {
  private readonly db: admin.firestore.CollectionReference;
  constructor() {
    this.db = firestore.collection('supplies');
  }

  async create(supply: Supply) {
    const plain = instanceToPlain(supply);
    await this.db.doc(supply.id).set(plain);
    return supply;
  }

  async checkSupplyByUserId(userId: string, pillar: string) {
    const snap = await this.db
      .where('userId', '==', userId)
      .where('pillar', '==', pillar)
      .limit(1)
      .get();
    if (snap.empty) {
      return false;
    }
    return true;
  }

  async findById(id: string) {
    const snap = await this.db.doc(id).get();
    if (!snap) {
      return null;
    }
    const data = snap.data();
    if (data === undefined) {
      return null;
    }
    return new Supply(
      data.pillar,
      data.module,
      data.userId,
      data.topics.map((m) => m as Topic),
    );
  }

  async findByUserAndPillar(userId, pillar){
    const snap = await this.db.where('pillar','==',pillar).where('userId','==',userId).get();
    if(snap.empty){
      return null;
    }
    const supplies = snap.docs.map((d) => {
      return plainToInstance(Supply, d.data());
    });
    return supplies;
  }
}
