import { Injectable } from '@nestjs/common';
import type { auth } from 'firebase-admin';
import { getFirebaseAuth } from './firebase.module';

/**
 * Único ponto da API que fala com o **Firebase Auth** (Admin SDK). Serviços e
 * guards dependem desta classe, nunca do `firebase-admin` direto, para que os
 * testes troquem o Firebase por um mock via injeção de dependência.
 */
@Injectable()
export class FirebaseAuthAdapter {
  private get auth(): auth.Auth {
    return getFirebaseAuth();
  }

  /** Valida o ID token emitido pelo SDK web. `checkRevoked` consulta a revogação. */
  verifyIdToken(token: string, checkRevoked = true) {
    return this.auth.verifyIdToken(token, checkRevoked);
  }

  createUser(props: auth.CreateRequest) {
    return this.auth.createUser(props);
  }

  setCustomUserClaims(uid: string, claims: Record<string, unknown>) {
    return this.auth.setCustomUserClaims(uid, claims);
  }

  getUser(uid: string) {
    return this.auth.getUser(uid);
  }

  /** Busca vários de uma vez (até 100 por chamada do SDK; aqui fatiado). */
  async getUsers(uids: string[]): Promise<auth.UserRecord[]> {
    const users: auth.UserRecord[] = [];
    for (let i = 0; i < uids.length; i += 100) {
      const chunk = uids.slice(i, i + 100).map((uid) => ({ uid }));
      const result = await this.auth.getUsers(chunk);
      users.push(...result.users);
    }
    return users;
  }

  deleteUser(uid: string) {
    return this.auth.deleteUser(uid);
  }

  importUsers(
    users: auth.UserImportRecord[],
    options?: auth.UserImportOptions,
  ) {
    return this.auth.importUsers(users, options);
  }
}
