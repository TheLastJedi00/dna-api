import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Edição de Maestra: apenas os campos de perfil. `login`/`roles` não são
 * editáveis por aqui (fonte de verdade de autorização é o documento `auth`).
 * `ValidationPipe` global com `whitelist` descarta qualquer campo fora destes.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  birthTime?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  birthPlace?: string;
}
