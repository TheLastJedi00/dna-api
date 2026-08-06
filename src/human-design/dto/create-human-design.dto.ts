import {
  IsArray,
  IsIn,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ANGULOS,
  GRUPOS_DE_DESTINO,
  QUARTOS_DE_CRUZ,
  TIPOS_AURICOS,
} from '../human-design.constants';

export class CentrosEnergeticosDto {
  @IsString()
  definidos!: string;
  @IsString()
  indefinidos!: string;
  @IsString()
  abertos!: string;
}

export class CanalDto {
  @IsString()
  id!: string;
  @IsString()
  nome!: string;
}

export class PontosAtivacaoDto {
  @IsNumber()
  sol!: number;
  @IsNumber()
  terra!: number;
  @IsNumber()
  lua!: number;
}

export class AtivacoesDto {
  @ValidateNested()
  @Type(() => PontosAtivacaoDto)
  personalidade!: PontosAtivacaoDto;
  @ValidateNested()
  @Type(() => PontosAtivacaoDto)
  desenho!: PontosAtivacaoDto;
}

export class CruzEncarnacaoDto {
  @IsString()
  @IsIn(ANGULOS)
  angulo!: string;
  @IsString()
  @IsIn(GRUPOS_DE_DESTINO)
  grupo_de_destino!: string;
  @IsString()
  cruz!: string;
  @IsString()
  portoes!: string;
  @IsString()
  @IsIn(QUARTOS_DE_CRUZ)
  quarto_de_cruz!: string;
}

export class CreateHumanDesignDto {
  @IsString()
  userId!: string;
  @IsString()
  @IsIn(TIPOS_AURICOS)
  tipo_aurico!: string;
  @IsString()
  aura!: string;
  @IsString()
  energia!: string;
  @IsString()
  palavra_chave!: string;
  @IsString()
  estrategia!: string;
  @IsString()
  assinatura!: string;
  @IsString()
  tema_do_nao_ser!: string;
  @IsString()
  autoridade!: string;
  @IsString()
  perfil!: string;

  @ValidateNested()
  @Type(() => CentrosEnergeticosDto)
  centros_energeticos!: CentrosEnergeticosDto;

  @ValidateNested({ each: true })
  @Type(() => CanalDto)
  @IsArray()
  canais!: CanalDto[];

  @ValidateNested()
  @Type(() => AtivacoesDto)
  ativacoes!: AtivacoesDto;

  @ValidateNested()
  @Type(() => CruzEncarnacaoDto)
  encarnacao!: CruzEncarnacaoDto;
}
