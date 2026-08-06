import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Edição de Analista: só o nome. E-mail/senha vivem no documento `auth` (fonte
 * de verdade da autorização) e não são editáveis por aqui; status é alternado
 * pelas rotas de desativar/reativar.
 */
export class UpdateAnalystDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;
}
