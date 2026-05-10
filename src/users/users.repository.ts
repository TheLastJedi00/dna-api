import { Injectable } from '@nestjs/common';
import { firestore } from '../firebase/firebase.module';
import { User } from './entities/user.entity';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import * as admin from 'firebase-admin';
import { OrderByDirection } from 'firebase-admin/firestore';
import { CreateUserDto } from './dto/create-user.dto';

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
    return new User(data as CreateUserDto, id);
  }

  async findAllActiveUsers(
    orderBy: string,
    direction: string,
  ) {
    const snap = await this.db.where('isActive', '==', true).get();

      if(snap.empty){
        return []
      }

      const users = snap.docs.map(s => {
        const data = s.data()
        return new User(data as CreateUserDto)
      })

      return users
  }
}
