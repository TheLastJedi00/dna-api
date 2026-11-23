import { Injectable } from '@nestjs/common';
import { getFirestore } from '../firebase/firebase.module';
import { toFirestoreData } from '../firebase/to-firestore';
import { User } from './entities/user.entity';
import { plainToInstance } from 'class-transformer';
import * as admin from 'firebase-admin';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersRepository {
  private readonly db: admin.firestore.CollectionReference;
  constructor() {
    this.db = getFirestore().collection('users');
  }

  async create(user: User) {
    try {
      await this.db.doc(user.id).set(toFirestoreData(user));
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
    return this.toEntity(data, id);
  }

  /** Devolve apenas os documentos cujos ids foram pedidos (ignora inexistentes). */
  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return [];
    }
    const snaps = await Promise.all(ids.map((id) => this.db.doc(id).get()));
    return snaps
      .filter((snap) => snap.exists && snap.data() !== undefined)
      .map((snap) => this.toEntity(snap.data()!, snap.id));
  }

  /**
   * Devolve todos os perfis com a role informada (usuários = USER, Analistas =
   * ANALYST) como entidades completas. Consulta apenas por `roles
   * array-contains <role>` (índice de array automático do Firestore);
   * status/busca/ordenação/paginação ficam no service (em memória), evitando
   * exigir índice composto. Adequado ao volume esperado.
   */
  async findAllWithRole(role: string): Promise<User[]> {
    const snap = await this.db.where('roles', 'array-contains', role).get();

    if (snap.empty) {
      return [];
    }

    return snap.docs.map((s) => this.toEntity(s.data(), s.id));
  }

  /**
   * Monta a entidade a partir do documento cru, sem descartar campos
   * (`roles`, `isActive`, `createdBy`, `email`). Usa o id do próprio documento,
   * que é a chave real — o campo `id` do payload pode não existir.
   */
  private toEntity(data: admin.firestore.DocumentData, id: string): User {
    const user = new User(data, id, data.roles);
    user.isActive = data.isActive ?? true;
    user.createdBy = data.createdBy;
    user.email = data.email;
    return user;
  }

  /**
   * Persiste o estado completo da entidade (sobrescreve o documento) e devolve
   * a instância gravada. `await` garantido antes do retorno; nenhum campo é
   * descartado porque `user` é a entidade completa carregada em `findById`.
   */
  async update(id: string, user: User): Promise<User> {
    // Documentos antigos voltam sem createdBy/email/businessArea (undefined).
    await this.db.doc(id).set(toFirestoreData(user));
    return user;
  }
}
