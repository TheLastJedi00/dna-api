import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/** Senha provisória digitada pelo gestor (Manager ou Analista) na redefinição. */
export class TempPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
