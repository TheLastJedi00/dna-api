import { ConflictException, Injectable } from '@nestjs/common';
import { FirebaseAuthAdapter } from '../firebase/firebase-auth.adapter';

/** Erro do Admin SDK do Firebase: traz um `code` como `auth/user-not-found`. */
function firebaseErrorCode(e: unknown): string | undefined {
  return typeof e === 'object' && e !== null && 'code' in e
    ? String(e.code)
    : undefined;
}

/**
 * Situação do acesso de uma conta, para o gestor (spec 010):
 * - `invite_pending`: nunca entrou (ainda não definiu a senha pelo convite)
 * - `email_unverified`: já entrou, mas não confirmou o e-mail
 * - `active`: e-mail confirmado
 */
export type AccessStatus = 'invite_pending' | 'email_unverified' | 'active';

export interface AccountInfo {
  email: string | null;
  accessStatus: AccessStatus;
}

@Injectable()
export class AuthService {
  constructor(private readonly firebaseAuth: FirebaseAuthAdapter) {}

  /**
   * Cadastro por **convite** (spec 010): a conta nasce no Firebase Auth **sem
   * senha** e com o e-mail não verificado; a pessoa define a senha pelo link
   * "Defina sua senha", que o front dispara logo depois. As roles vão como
   * custom claim (é de lá que o `AuthGuard` as lê). Se as claims falharem, a
   * conta é desfeita — uma conta sem roles não serve para nada.
   */
  async createAccount(email: string, roles: string[]): Promise<{ id: string }> {
    let uid: string;
    try {
      ({ uid } = await this.firebaseAuth.createUser({
        email,
        emailVerified: false,
      }));
    } catch (e) {
      if (firebaseErrorCode(e) === 'auth/email-already-exists') {
        throw new ConflictException('Email já cadastrado.');
      }
      throw e;
    }
    try {
      await this.firebaseAuth.setCustomUserClaims(uid, { roles });
    } catch (e) {
      await this.removeAccount(uid);
      throw e;
    }
    return { id: uid };
  }

  /** Apaga a conta do Firebase Auth. Conta inexistente não é erro (idempotente). */
  async removeAccount(id: string): Promise<void> {
    try {
      await this.firebaseAuth.deleteUser(id);
    } catch (e) {
      if (firebaseErrorCode(e) !== 'auth/user-not-found') {
        throw e;
      }
    }
  }

  /** E-mail e status do acesso, lidos do Firebase. `null` se não há conta. */
  async findAccount(id: string): Promise<AccountInfo | null> {
    let record: Awaited<ReturnType<FirebaseAuthAdapter['getUser']>>;
    try {
      record = await this.firebaseAuth.getUser(id);
    } catch (e) {
      if (firebaseErrorCode(e) === 'auth/user-not-found') {
        return null;
      }
      throw e;
    }
    let accessStatus: AccessStatus = 'active';
    if (!record.emailVerified) {
      accessStatus = record.metadata.lastSignInTime
        ? 'email_unverified'
        : 'invite_pending';
    }
    return { email: record.email ?? null, accessStatus };
  }

  /**
   * E-mail de acesso de vários ids de uma vez, para identificar quem cadastrou
   * um usuário quando o criador não tem perfil em `users` (caso do Manager).
   * Quem não tem conta (ex.: excluiu a própria conta) fica fora do mapa.
   */
  async findEmailsByIds(ids: string[]): Promise<Map<string, string>> {
    const emails = new Map<string, string>();
    if (ids.length === 0) {
      return emails;
    }
    const records = await this.firebaseAuth.getUsers(ids);
    for (const record of records) {
      if (record.email) {
        emails.set(record.uid, record.email);
      }
    }
    return emails;
  }
}
