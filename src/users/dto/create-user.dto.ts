import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PRONOUNS } from '../pronoun';
import type { Pronoun } from '../pronoun';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  /** E-mail de acesso. A senha não vem mais no cadastro: vai por convite. */
  @IsEmail({}, { message: 'Formato de e-mail inválido.' })
  email!: string;

  @IsString()
  @IsNotEmpty()
  birthDate!: string;

  @IsString()
  @IsNotEmpty()
  birthTime!: string;

  @IsString()
  @IsNotEmpty()
  birthPlace!: string;

  /** Ramo/segmento da empresa. Texto livre. */
  @IsOptional()
  @IsString()
  businessArea?: string;

  /** Ausente => `'feminino'` (retro-compatibilidade). */
  @IsOptional()
  @IsString()
  @IsIn(PRONOUNS)
  pronoun?: Pronoun;
}
