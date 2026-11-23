import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { Auth, TEMP_PASSWORD_TTL_MS } from './entities/auth.entity';
import { BcryptService } from './bcrypt.service';
import { FirebaseAuthAdapter } from '../firebase/firebase-auth.adapter';

/** Erro do Admin SDK do Firebase: traz um `code` como `auth/user-not-found`. */
function firebaseErrorCode(e: unknown): string | undefined {
  return typeof e === 'object' && e !== null && 'code' in e
    ? String(e.code)
    : undefined;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly bcyptService: BcryptService,
    private readonly firebaseAuth: FirebaseAuthAdapter,
  ) {}

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

  /**
   * A senha definida no cadastro **já nasce provisória** (spec 005): vale para o
   * login, mas o usuário é obrigado a trocá-la no primeiro acesso, e até lá ela
   * fica visível em texto plano para quem o cadastrou.
   */
  async create(data, roles: string[]) {
    const compareEmail = await this.repository.findByEmail(data.email);
    if (compareEmail) {
      throw new ConflictException('Email já cadastrado.');
    }
    const hashPass = await this.bcyptService.hash(data.password);
    const auth = new Auth({
      ...data,
      password: hashPass,
      roles: roles,
      mustChangePassword: true,
      tempPassword: data.password,
      tempPasswordExpiresAt: this.tempPasswordDeadline(),
    });
    const created = await this.repository.create(auth);
    return created;
  }

  /** Prazo da senha provisória a partir de agora (ISO 8601). */
  private tempPasswordDeadline(): string {
    return new Date(Date.now() + TEMP_PASSWORD_TTL_MS).toISOString();
  }

  /**
   * Redefinição pelo painel: o gestor digita a senha, ela passa a valer para o
   * login e fica visível para ele até o usuário definir a própria.
   */
  async setTempPassword(id: string, password: string): Promise<void> {
    const auth = await this.repository.findById(id);
    if (!auth) {
      throw new NotFoundException(`Credenciais do ID ${id} não encontradas.`);
    }
    await this.repository.update(id, {
      password: await this.bcyptService.hash(password),
      mustChangePassword: true,
      tempPassword: password,
      tempPasswordExpiresAt: this.tempPasswordDeadline(),
    });
  }

  /** Credenciais de um id, para compor o detalhe do usuário. */
  async findCredentialsById(id: string) {
    return await this.repository.findById(id);
  }

  /**
   * E-mail de acesso de um id. Usado para identificar quem cadastrou uma
   * Maestra quando o criador não tem perfil em `users` (caso do Manager).
   */
  async findEmailById(id: string): Promise<string | null> {
    const auth = await this.repository.findById(id);
    return auth?.email ?? null;
  }
}
