import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Cadastro de Analista: nome + e-mail de acesso. Diferente do usuário, o
 * Analista não tem mapa natal — por isso nada de birthDate/birthTime/birthPlace
 * (o `whitelist` do ValidationPipe global descarta o que vier a mais). Sem
 * senha: o acesso é definido pelo convite por e-mail (spec 010).
 */
export class CreateAnalystDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail({}, { message: 'Formato de e-mail inválido.' })
  email!: string;
}
