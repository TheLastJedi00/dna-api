import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/** Senha definitiva escolhida pelo próprio usuário. */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
