import { Injectable } from '@nestjs/common';
import { firestore } from '../firebase/firebase.module';
import { User } from './entities/user.entity';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import * as admin from 'firebase-admin';
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
   * Devolve todas as Maestras com a role informada como entidades completas.
   * Consulta apenas por `roles array-contains <role>` (índice de array
   * automático do Firestore); status/busca/ordenação/paginação ficam no service
   * (em memória), evitando exigir índice composto. Adequado ao volume esperado.
   */
  async findAllWithRole(role: string): Promise<User[]> {
    const snap = await this.db.where('roles', 'array-contains', role).get();

    if (snap.empty) {
      return [];
    }

    return snap.docs.map((s) => {
      const data = s.data();
      const user = new User(data as CreateUserDto, data.id, data.roles);
      user.isActive = data.isActive ?? true;
      return user;
    });
  }

  /**
   * Persiste o estado completo da entidade (sobrescreve o documento) e devolve
   * a instância gravada. `await` garantido antes do retorno; nenhum campo é
   * descartado porque `user` é a entidade completa carregada em `findById`.
   */
  async update(id: string, user: User): Promise<User> {
    await this.db.doc(id).set(instanceToPlain(user));
    return user;
  }
}
