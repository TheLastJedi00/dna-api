import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CentrosEnergeticosDto {
  @IsString({ each: true })
  definidos!: string[];
  @IsString({ each: true })
  indefinidos!: string[];
  @IsString({ each: true })
  abertos!: string[];
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
  @ValidateNested({ each: true })
  @Type(() => PontosAtivacaoDto)
  personalidade!: PontosAtivacaoDto;
  @ValidateNested({ each: true })
  @Type(() => PontosAtivacaoDto)
  desenho!: PontosAtivacaoDto;
}

export class CruzEncarnacaoDto {
  @IsString()
  angulo!: string;
  @IsString()
  cruz!: string;
  @IsString()
  portoes!: string;
  @IsString()
  quarto_de_cruz!: string;
}

export class CreateHumanDesignDto {
  @IsString()
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
  @IsString()
  assinatura!: string;
  @IsString()
  tema_do_nao_ser!: string;
  @IsString()
  autoridade!: string;
  @IsString()
  perfil!: string;
  @ValidateNested({ each: true })
  @Type(() => CentrosEnergeticosDto)
  centros_energeticos!: CentrosEnergeticosDto;
  @ValidateNested({ each: true })
  @Type(() => CanalDto)
  @IsArray()
  canais!: CanalDto[];
  @ValidateNested({ each: true })
  @Type(() => AtivacoesDto)
  ativacoes!: AtivacoesDto;
  @ValidateNested({ each: true })
  @Type(() => CruzEncarnacaoDto)
  encarnacao!: CruzEncarnacaoDto;
}
