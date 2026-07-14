import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { UserLoginDto } from '../../users/dto/create-user.dto';

/**
 * Cadastro de Analista: nome + credenciais de acesso. Diferente da Maestra, o
 * Analista não tem mapa natal — por isso nada de birthDate/birthTime/birthPlace
 * (o `whitelist` do ValidationPipe global descarta o que vier a mais).
 */
export class CreateAnalystDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ValidateNested()
  @Type(() => UserLoginDto)
  login!: UserLoginDto;
}
