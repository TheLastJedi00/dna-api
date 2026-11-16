import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PRONOUNS } from '../pronoun';
import type { Pronoun } from '../pronoun';

export class UserLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class CreateUserDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserLoginDto)
  login?: UserLoginDto;

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
