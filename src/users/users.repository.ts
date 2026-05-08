import { Injectable } from '@nestjs/common';
import { firestore } from '../firebase/firebase.module';
import { User } from './entities/user.entity';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import * as admin from 'firebase-admin';
import { OrderByDirection } from 'firebase-admin/firestore';

@Injectable()
export class UsersRepository {
  private readonly db: admin.firestore.CollectionReference;
  constructor() {
    this.db = firestore.collection('users');
  }

  async create(user: User) {
    try {
      const plain = instanceToPlain(user);
      await this.db.doc(user.id).set(plain);
    } catch (e) {
      throw new Error('[Repository Error]: ' + e);
    }
  }

  async findById(id: string) {
    const snap = await this.db.doc(id).get();
    if (!snap) {
      return null;
    }
    const data = snap.data();
    return plainToInstance(User, { id: id, ...data });
  }

  async findAllActiveUsers(
    page: number,
    limit: number,
    orderBy: string,
    direction: string,
  ) {
    const snap = await this.db
      .orderBy(orderBy, direction as OrderByDirection)
      .offset((page-1)*limit)
      .limit(limit)
      .get();
  }
}
