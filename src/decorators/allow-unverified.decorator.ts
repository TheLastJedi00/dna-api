import { SetMetadata } from '@nestjs/common';

export const ALLOW_UNVERIFIED_KEY = 'allowUnverified';

/**
 * Libera a rota para quem ainda **não confirmou o e-mail** (spec 010). Por
 * padrão o `AuthGuard` responde 403 a essas contas; só o que a pessoa precisa
 * para resolver a pendência fica aberto: ler o próprio perfil e excluir a conta.
 */
export const AllowUnverified = () => SetMetadata(ALLOW_UNVERIFIED_KEY, true);
