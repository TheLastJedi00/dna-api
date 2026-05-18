import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PerfilNumerologicoDto {
  @IsNumber()
  motivacao!: number;
  @IsNumber()
  impressao!: number;
  @IsNumber()
  expressao!: number;
  @IsNumber()
  destino!: number;
  @IsNumber()
  missao!: number;
  @IsNumber()
  data_natalicia!: number;
  @IsNumber()
  numero_psiquico!: number;
  @IsNumber()
  talento_oculto!: number;
}

export class PeriodoNumerologicoDto {
  @IsNumber()
  inicio!: number;
  fim!: number | string;
  @IsNumber()
  numero!: number;
}

export class AnoPessoalDto {
  @IsNumber()
  numero!: number;
  @IsString()
  validade!: string;
}

export class AnoPessoalDataDto {
  @ValidateNested()
  @Type(() => AnoPessoalDto)
  atual!: AnoPessoalDto;

  @ValidateNested()
  @Type(() => AnoPessoalDto)
  proximo!: AnoPessoalDto;
}

export class ExtrasNumerologicosDto {
  @IsArray()
  @IsNumber({}, { each: true })
  tendencias_ocultas!: number[];

  @IsNumber()
  respostas_subconscientes!: number;

  @IsArray()
  @IsNumber({}, { each: true })
  numeros_favoraveis!: number[];
}

export class CreateNumerologyDto {
  @IsString()
  userId!: string;

  @ValidateNested()
  @Type(() => PerfilNumerologicoDto)
  perfil!: PerfilNumerologicoDto;

  @ValidateNested({ each: true })
  @Type(() => PeriodoNumerologicoDto)
  @IsArray()
  ciclos_de_vida!: PeriodoNumerologicoDto[];

  @ValidateNested({ each: true })
  @Type(() => PeriodoNumerologicoDto)
  @IsArray()
  desafios!: PeriodoNumerologicoDto[];

  @ValidateNested({ each: true })
  @Type(() => PeriodoNumerologicoDto)
  @IsArray()
  momentos_decisivos!: PeriodoNumerologicoDto[];

  @ValidateNested()
  @Type(() => AnoPessoalDataDto)
  ano_pessoal!: AnoPessoalDataDto;

  @ValidateNested()
  @Type(() => ExtrasNumerologicosDto)
  extras!: ExtrasNumerologicosDto;
}

