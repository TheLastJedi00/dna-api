import { IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PontoAstrologicoDto {
  @IsString()
  signo!: string;

  @IsNumber()
  casaAstrologica!: number;

  @IsOptional()
  @IsString()
  planetas!: string | null;
}

export class ElementosDto {
  @IsNumber()
  fogo!: number;

  @IsNumber()
  terra!: number;

  @IsNumber()
  ar!: number;

  @IsNumber()
  agua!: number;
}

export class TriadeAstrologicaDto {
  @ValidateNested()
  @Type(() => PontoAstrologicoDto)
  sol!: PontoAstrologicoDto;

  @ValidateNested()
  @Type(() => PontoAstrologicoDto)
  ascendente!: PontoAstrologicoDto;

  @ValidateNested()
  @Type(() => PontoAstrologicoDto)
  lua!: PontoAstrologicoDto;
}

export class CreateAstrologyDto {
  @IsString()
  userId!: string;

  @ValidateNested()
  @Type(() => TriadeAstrologicaDto)
  triadeAstrologica!: TriadeAstrologicaDto;

  @ValidateNested()
  @Type(() => PontoAstrologicoDto)
  meioDoCeu!: PontoAstrologicoDto;

  @ValidateNested()
  @Type(() => PontoAstrologicoDto)
  dinheiro!: PontoAstrologicoDto;

  @ValidateNested()
  @Type(() => PontoAstrologicoDto)
  comunicacao!: PontoAstrologicoDto;

  @ValidateNested()
  @Type(() => ElementosDto)
  elementos!: ElementosDto;
}
