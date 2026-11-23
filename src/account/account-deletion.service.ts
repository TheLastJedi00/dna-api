import {
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountDataRepository } from './account-data.repository';
import { AuthService } from '../auth/auth.service';
import { CacheService } from '../redis/cache.service';
import { RequestAuth } from '../auth/entities/request-auth';

/** Janela de "login recente" exigida para excluir a conta. */
export const RECENT_LOGIN_SECONDS = 5 * 60;

/** Relógio em segundos; injetável para teste. */
export const NOW_SECONDS = Symbol('NOW_SECONDS');
export type NowSeconds = () => number;

/**
 * Exclusão da própria conta (LGPD, spec 010). Hard delete: dados dos pilares,
 * supplies (inclui o Plano Perfeito), perfil, doc legado `auth`, cache e, por
 * último, a conta no Firebase Auth. A conta de login sai por último para que
 * uma falha no meio deixe a pessoa ainda capaz de entrar e tentar de novo — e
 * cada passo é idempotente, então repetir termina o serviço.
 *
 * Usuários cadastrados por quem se exclui continuam: o `createdBy` fica órfão
 * e a listagem mostra o criador como nulo ("Conta removida" no front).
 */
@Injectable()
export class AccountDeletionService {
  private readonly now: NowSeconds;

  constructor(
    private readonly data: AccountDataRepository,
    private readonly auth: AuthService,
    private readonly cache: CacheService,
    @Optional() @Inject(NOW_SECONDS) now?: NowSeconds,
  ) {
    this.now = now ?? (() => Math.floor(Date.now() / 1000));
  }

  async deleteOwnAccount(requester: RequestAuth): Promise<void> {
    // O front reautentica (pede a senha) logo antes: isso renova o auth_time.
    // Um token antigo, esquecido num navegador aberto, não basta.
    if (this.now() - requester.authTime > RECENT_LOGIN_SECONDS) {
      throw new UnauthorizedException(
        'Confirme sua senha para excluir a conta.',
      );
    }
    const id = requester.id;
    const supplyModules = await this.data.findSupplyModules(id);

    await this.data.deleteUserData(id);
    await this.cache.del(
      ...supplyModules.map(
        ({ pillar, module }) => `supply:${pillar}:${module}:${id}`,
      ),
      `dna-status:${id}`,
    );
    await this.auth.removeAccount(id);
  }
}
