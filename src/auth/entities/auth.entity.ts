import { randomUUID } from 'crypto';

/**
 * Documento da coleção `auth`: fonte de verdade da autenticação.
 *
 * `tempPassword` guarda a senha em **texto plano** enquanto ela for provisória,
 * para que quem cadastrou o usuário possa repassá-la (spec 005). É credencial em
 * claro: nunca sai no login, no `/users/me` nem em listagem — só no endpoint de
 * detalhe, para quem tem posse do usuário — e é apagada assim que a senha
 * definitiva é definida.
 */
export class Auth {
  id: string = randomUUID();
  email!: string;
  password!: string;
  roles!: string[];
  /** true enquanto a senha em uso for provisória (cadastro ou redefinição). */
  mustChangePassword = false;
  /** Senha provisória em texto plano; `null` assim que o usuário define a dele. */
  tempPassword?: string | null;

  constructor(partial: Partial<Auth>) {
    return Object.assign(this, partial);
  }
}
