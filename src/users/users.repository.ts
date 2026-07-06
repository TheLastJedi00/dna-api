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
    if (!snap.exists) {
      return null;
    }
    const data = snap.data();
    if (data === undefined) {
      return null;
    }
    // Preserva o documento completo, incluindo roles e isActive.
    const user = new User(data as CreateUserDto, id, data.roles);
    user.isActive = data.isActive ?? true;
    return user;
  }

  /**
   * Lista usuários ativos com role USER, ordenados.
   * Requer índice composto no Firestore: isActive (==) + roles (array-contains)
   * + <orderBy>. Ex.: (isActive ASC, roles ARRAY, fullName ASC).
   */
  async findAllActiveUsers(orderBy: string, direction: string) {
    const snap = await this.db
      .where('isActive', '==', true)
      .where('roles', 'array-contains', 'USER')
      .orderBy(orderBy, direction as OrderByDirection)
      .get();

    if (snap.empty) {
      return [];
    }

    const users = snap.docs.map((s) => {
      const data = s.data();
      const user = new User(data as CreateUserDto, data.id, data.roles);
      user.isActive = data.isActive ?? true;
      return user;
    });

    return users;
  }

  async update(id: string, user: User) {
    await this.db.doc(id).set(instanceToPlain(user));
    return user;
  }
}
